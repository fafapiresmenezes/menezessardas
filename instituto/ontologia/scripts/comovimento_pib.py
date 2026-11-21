"""Família 3 — co-movimento entre setores do PIB trimestral do IBGE.

Fonte: IBGE, Contas Nacionais Trimestrais, Tabela 1620 (SIDRA), variável 583
"Série encadeada do índice de volume trimestral (Base: média 1995 = 100)".
Arquivo bruto: bruto/ibge_sidra_1620_volume_trimestral.json (hash no JSON de saída).

O que se mede (e o que NÃO se mede):
  * Mede se dois setores crescem e encolhem JUNTOS. Isso é co-movimento.
  * NÃO mede quem depende de quem (isso é a família 1, Leontief).
  * Correlação alta pode vir de um terceiro fator comum (o ciclo do PIB inteiro).
    Por isso também calculamos a correlação PARCIAL, tirando o PIB.

Conta, passo a passo:
  1. g_t = ln(I_t) - ln(I_{t-4})  (crescimento sobre o mesmo trimestre do ano
     anterior; tira a sazonalidade sem ajuste estatístico nenhum).
  2. Pearson r = Σ(x-x̄)(y-ȳ) / sqrt(Σ(x-x̄)² Σ(y-ȳ)²).
  3. Spearman ρ = Pearson das posições (ranks).
  4. As taxas g_t se sobrepõem (cada uma usa 4 trimestres), então os pontos NÃO
     são independentes. Tamanho efetivo de amostra (Bartlett, 1935):
       n_ef = n / (1 + 2 Σ_{k=1..K} ρx(k) ρy(k)),  K = 8 trimestres.
  5. Intervalo de 95% por Fisher: z = atanh(r), ep = 1/sqrt(n_ef - 3),
     IC = tanh(z ± 1,959964·ep).
  6. Correlação parcial dado o PIB: r_xy.p = (r_xy - r_xp r_yp)/sqrt((1-r_xp²)(1-r_yp²)),
     com n_ef - 1 no erro-padrão.
  7. Regra de amostra fraca: n_ef < 36 ⇒ selo "fraco".
  8. Robustez: Pearson de novo SEM os trimestres de 2020T1 a 2021T4 (pandemia).
     Se |Pearson − Spearman| > 0,2 ou |Pearson − sem pandemia| > 0,2, o par leva o
     aviso "puxado por poucos trimestres".

Conferência independente: Pearson refeito por numpy.corrcoef, Spearman refeito por
scipy.stats.spearmanr; o programa para se a diferença passar de 1e-12.
"""
import hashlib
import json
import math
import sys
from pathlib import Path

import numpy as np
from scipy import stats

AQUI = Path(__file__).resolve().parent.parent
BRUTO = AQUI / "bruto" / "ibge_sidra_1620_volume_trimestral.json"
SAIDA = AQUI / "saida" / "comovimento_pib.json"

SETORES = [
    ("90687", "Agropecuária", ["Agro"]),
    ("90692", "Indústrias extrativas", ["Petróleo e Mineração"]),
    ("90693", "Indústrias de transformação", ["Saúde (fármacos)", "B2B"]),
    ("90695", "Eletricidade, gás, água, esgoto e resíduos", ["Águas", "Energia"]),
    ("90694", "Construção", ["Engenharia"]),
    ("90697", "Comércio", ["B2B", "Cadeia distributiva"]),
    ("90698", "Transporte, armazenagem e correio", ["B2B", "Cadeia distributiva"]),
    ("90699", "Informação e comunicação", ["IA e Cibersegurança", "Telecom"]),
    ("90700", "Atividades financeiras e seguros", ["Finanças"]),
    ("90702", "Atividades imobiliárias", []),
    ("90701", "Outras atividades de serviços", ["Jurídica", "Marketing", "Segurança"]),
    ("90703", "Administração, saúde e educação públicas", ["Contratos públicos", "Saúde", "Educação"]),
]
PIB = "90707"
K_LAGS = 8
Z95 = stats.norm.ppf(0.975)


def autocorr(x, k):
    x = x - x.mean()
    return float(np.sum(x[k:] * x[:-k]) / np.sum(x * x))


def n_efetivo(x, y):
    soma = sum(autocorr(x, k) * autocorr(y, k) for k in range(1, K_LAGS + 1))
    # teto em n (rodada 5): autocorrelações de sinais opostos podem dar n/(1+2Σ) > n, o que daria
    # intervalo de confiança mais estreito que o de dados independentes; isso não se aceita.
    return min(float(len(x)), len(x) / (1 + 2 * soma)), soma


def pearson_manual(x, y):
    dx, dy = x - x.mean(), y - y.mean()
    return float(np.sum(dx * dy) / math.sqrt(np.sum(dx * dx) * np.sum(dy * dy)))


def ic_fisher(r, n_ef, perda=0):
    if n_ef - 3 - perda <= 0:
        return None
    z = math.atanh(r)
    ep = 1 / math.sqrt(n_ef - 3 - perda)
    return [math.tanh(z - Z95 * ep), math.tanh(z + Z95 * ep)], z, ep


def main():
    bruto = BRUTO.read_bytes()
    linhas = json.loads(bruto)[1:]
    series = {}
    for l in linhas:
        series.setdefault(l["D4C"], {})[l["D3C"]] = float(l["V"])
    trimestres = sorted(next(iter(series.values())).keys())
    for c, s in series.items():
        assert sorted(s.keys()) == trimestres, f"série {c} com trimestres faltando"
    codigos = [s[0] for s in SETORES] + [PIB]
    I = {c: np.array([series[c][t] for t in trimestres]) for c in codigos}
    g = {c: np.log(I[c][4:]) - np.log(I[c][:-4]) for c in codigos}
    tri_g = trimestres[4:]
    n = len(tri_g)

    fora = np.array([not ("202001" <= t <= "202104") for t in tri_g])
    pares = []
    max_dif_p = max_dif_s = 0.0
    for i, (ci, ni, _) in enumerate(SETORES):
        for j, (cj, nj, _) in enumerate(SETORES):
            if j <= i:
                continue
            x, y, p = g[ci], g[cj], g[PIB]
            r = pearson_manual(x, y)
            r_np = float(np.corrcoef(x, y)[0, 1])
            rho = pearson_manual(stats.rankdata(x), stats.rankdata(y))
            rho_sp = float(stats.spearmanr(x, y).statistic)
            max_dif_p = max(max_dif_p, abs(r - r_np))
            max_dif_s = max(max_dif_s, abs(rho - rho_sp))
            nef, soma = n_efetivo(x, y)
            ic, z, ep = ic_fisher(r, nef)
            rxp, ryp = pearson_manual(x, p), pearson_manual(y, p)
            rpar = (r - rxp * ryp) / math.sqrt((1 - rxp ** 2) * (1 - ryp ** 2))
            icp = ic_fisher(rpar, nef, perda=1)
            r_sem = pearson_manual(x[fora], y[fora])
            puxado = abs(r - rho) > 0.2 or abs(r - r_sem) > 0.2
            pares.append({
                "a": ci, "b": cj, "nome_a": ni, "nome_b": nj,
                "n": n, "soma_autocorr_cruzada": soma, "n_efetivo": nef,
                "pearson": r, "spearman": rho,
                "fisher_z": z, "erro_padrao_z": ep, "ic95": ic,
                "r_a_pib": rxp, "r_b_pib": ryp,
                "parcial_sem_pib": rpar, "ic95_parcial": icp[0] if icp else None,
                "selo": "fraco" if nef < 36 else "calculado",
                "ic_cruza_zero": ic[0] < 0 < ic[1],
                "pearson_sem_pandemia": r_sem, "n_sem_pandemia": int(fora.sum()),
                "puxado_por_poucos_trimestres": puxado,
            })
    assert max_dif_p < 1e-12 and max_dif_s < 1e-12, (max_dif_p, max_dif_s)

    saida = {
        "familia": 3,
        "nome": "Co-movimento entre setores (PIB trimestral do IBGE)",
        "aviso": "Co-movimento não é dependência. Mostra quem sobe e desce junto; quem depende de quem está na família 1.",
        "fonte": {
            "orgao": "IBGE, Contas Nacionais Trimestrais",
            "tabela": "SIDRA 1620, variável 583 (índice de volume encadeado, média 1995 = 100)",
            "url": "https://apisidra.ibge.gov.br/values/t/1620/n1/all/v/583/p/all/c11255/90687,90692,90693,90695,90694,90697,90698,90699,90700,90702,90701,90703,90707",
            "arquivo": "bruto/ibge_sidra_1620_volume_trimestral.json",
            "sha256": hashlib.sha256(bruto).hexdigest(),
            "primeiro_trimestre": trimestres[0], "ultimo_trimestre": trimestres[-1],
        },
        "metodo": {
            "taxa": "g_t = ln(I_t) − ln(I_{t−4})",
            "pearson": "r = Σ(x−x̄)(y−ȳ) / √(Σ(x−x̄)² · Σ(y−ȳ)²)",
            "spearman": "Pearson das posições",
            "n_efetivo": f"n / (1 + 2 Σ_(k=1..{K_LAGS}) ρx(k)·ρy(k))  (Bartlett 1935)",
            "ic95": "tanh(atanh(r) ± 1,959964 / √(n_ef − 3))",
            "parcial": "(r_xy − r_xp·r_yp) / √((1 − r_xp²)(1 − r_yp²)), p = PIB",
            "aviso_parcial": ("O PIB contém os próprios setores x e y; tirar o PIB tira também um pedaço deles, o que "
                              "puxa a parcial para baixo de forma mecânica. Ler a parcial como piso, não como valor exato."),
            "teto_n_efetivo": "n efetivo limitado a n (nunca mais observações do que as que existem)",
            "regra_fraco": "n_efetivo < 36",
            "robustez": "Pearson sem 2020T1–2021T4; aviso se |r−ρ|>0,2 ou |r−r_sem_pandemia|>0,2",
        },
        "setores": [{"codigo": c, "nome": n_, "nichos": ni} for c, n_, ni in SETORES],
        "taxas": {c: [float(v) for v in g[c]] for c in codigos},
        "trimestres_das_taxas": tri_g,
        "pares": pares,
        "conferencia": {
            "max_dif_pearson_manual_vs_numpy": max_dif_p,
            "max_dif_spearman_manual_vs_scipy": max_dif_s,
            "aprovado": True,
        },
    }
    SAIDA.write_text(json.dumps(saida, ensure_ascii=False, indent=1))
    print(f"n = {n} trimestres de taxa ({tri_g[0]}–{tri_g[-1]}), {len(pares)} pares")
    print("conferência:", saida["conferencia"])
    top = sorted(pares, key=lambda p: -p["pearson"])
    for p in top[:8] + top[-4:]:
        print(f"{p['nome_a'][:28]:28s} × {p['nome_b'][:28]:28s} r={p['pearson']:+.3f} "
              f"ρ={p['spearman']:+.3f} n_ef={p['n_efetivo']:.1f} IC=[{p['ic95'][0]:+.2f},{p['ic95'][1]:+.2f}] "
              f"parcial={p['parcial_sem_pib']:+.3f} semCovid={p['pearson_sem_pandemia']:+.3f} {p['selo']}{' PUXADO' if p['puxado_por_poucos_trimestres'] else ''}")
    print("puxados:", sum(p["puxado_por_poucos_trimestres"] for p in pares), "cruzam zero:", sum(p["ic_cruza_zero"] for p in pares))


if __name__ == "__main__":
    sys.exit(main())
