"""Família 3, segunda base — co-movimento dos setores na bolsa dos EUA.

Fonte: Kenneth R. French Data Library (Dartmouth), "49 Industry Portfolios" (retorno
mensal ponderado pelo valor de mercado, base CRSP) e "Fama/French 3 Factors" (retorno do
mercado). Arquivos brutos com impressão digital no JSON de saída.

Mesma conta da base do IBGE (scripts/comovimento_pib.py), trocando a taxa:
  x_t = retorno mensal do setor em % (já é variação; não se sobrepõe, então n_ef ≈ n)
  Pearson, Spearman, n efetivo de Bartlett (8 defasagens), IC 95% de Fisher,
  parcial tirando o MERCADO inteiro (Mkt−RF + RF), e teste sem a pandemia (2020–2021).
Janela: jan/1996 a set/2026, a mesma do PIB trimestral do IBGE.

Leitura: duas ações setoriais que se movem juntas mesmo depois de tirar o mercado
dividem algum risco comum (juros, petróleo, consumo, regulação). Não é dependência.
"""
import hashlib
import io
import json
import math
import sys
import zipfile
from pathlib import Path

import numpy as np
from scipy import stats

sys.path.insert(0, str(Path(__file__).resolve().parent))
from comovimento_pib import ic_fisher, n_efetivo, pearson_manual  # noqa: E402

AQUI = Path(__file__).resolve().parent.parent
BRUTO = Path(sys.argv[1])
SAIDA = AQUI / "saida" / "comovimento_bolsa.json"
INICIO, FIM = 199601, 202609

SETORES = [
    ("Agric", "Agricultura", ["Agro"]),
    ("Drugs", "Farmacêutica", ["Saúde"]),
    ("Hlth", "Serviços de saúde", ["Saúde"]),
    ("MedEq", "Equipamento médico", ["Saúde"]),
    ("Chems", "Química", ["Química"]),
    ("Cnstr", "Construção", ["Engenharia"]),
    ("BldMt", "Materiais de construção", ["Engenharia"]),
    ("Mach", "Máquinas", ["Engenharia"]),
    ("Oil", "Petróleo e gás", ["Petróleo e Mineração"]),
    ("Mines", "Mineração", ["Petróleo e Mineração"]),
    ("Util", "Energia, gás e água", ["Águas", "Energia"]),
    ("Telcm", "Telecomunicações", ["Telecom"]),
    ("Softw", "Software", ["IA e Cibersegurança"]),
    ("Chips", "Semicondutores", ["IA e Cibersegurança", "Quântica"]),
    ("BusSv", "Serviços às empresas", ["Jurídica", "Marketing", "Segurança"]),
    ("Trans", "Transporte", ["B2B", "Cadeia distributiva"]),
    ("Whlsl", "Atacado", ["B2B", "Cadeia distributiva"]),
    ("Rtail", "Varejo", ["Cadeia distributiva"]),
    ("Banks", "Bancos", ["Finanças"]),
    ("Insur", "Seguros", ["Finanças"]),
    ("Fin", "Outras finanças", ["Finanças"]),
    ("RlEst", "Imobiliário", []),
    ("Guns", "Defesa", ["Segurança"]),
]


def ler_csv_do_zip(caminho_zip, nome_bloco):
    z = zipfile.ZipFile(caminho_zip)
    texto = z.read(z.namelist()[0]).decode("latin-1")
    linhas = texto.splitlines()
    i = next(k for k, l in enumerate(linhas) if nome_bloco in l) if nome_bloco else 0
    while not linhas[i].lstrip().startswith(","):
        i += 1
    cab = [c.strip() for c in linhas[i].split(",")]
    dados = {}
    for l in linhas[i + 1:]:
        partes = [p.strip() for p in l.split(",")]
        if len(partes) < 2 or not partes[0].isdigit() or len(partes[0]) != 6:
            break
        dados[int(partes[0])] = dict(zip(cab[1:], map(float, partes[1:])))
    return dados


def main():
    z49, zm = BRUTO / "ff49.zip", BRUTO / "ffmkt.zip"
    ind = ler_csv_do_zip(z49, "Average Value Weighted Returns -- Monthly")
    mkt = ler_csv_do_zip(zm, None)
    meses = [m for m in sorted(ind) if INICIO <= m <= FIM]
    assert meses[0] == INICIO and meses[-1] == FIM, (meses[0], meses[-1])
    for m in meses:
        for c, _, _ in SETORES:
            assert ind[m][c] > -99, f"dado faltando {c} {m}"
    x = {c: np.array([ind[m][c] for m in meses]) for c, _, _ in SETORES}
    mk = np.array([mkt[m]["Mkt-RF"] + mkt[m]["RF"] for m in meses])
    fora = np.array([not (202001 <= m <= 202112) for m in meses])
    n = len(meses)
    pares, dp, ds = [], 0.0, 0.0
    for i, (ci, ni, _) in enumerate(SETORES):
        for j, (cj, nj, _) in enumerate(SETORES):
            if j <= i:
                continue
            a, b = x[ci], x[cj]
            r = pearson_manual(a, b)
            rho = pearson_manual(stats.rankdata(a), stats.rankdata(b))
            dp = max(dp, abs(r - float(np.corrcoef(a, b)[0, 1])))
            ds = max(ds, abs(rho - float(stats.spearmanr(a, b).statistic)))
            nef, soma = n_efetivo(a, b)
            ic, z, ep = ic_fisher(r, nef)
            ra, rb = pearson_manual(a, mk), pearson_manual(b, mk)
            rp = (r - ra * rb) / math.sqrt((1 - ra ** 2) * (1 - rb ** 2))
            icp = ic_fisher(rp, nef, perda=1)
            r_sem = pearson_manual(a[fora], b[fora])
            pares.append({"a": ci, "b": cj, "nome_a": ni, "nome_b": nj, "n": n,
                          "soma_autocorr_cruzada": soma, "n_efetivo": nef, "pearson": r, "spearman": rho,
                          "fisher_z": z, "erro_padrao_z": ep, "ic95": ic, "r_a_mercado": ra, "r_b_mercado": rb,
                          "parcial_sem_mercado": rp, "ic95_parcial": icp[0] if icp else None,
                          "selo": "fraco" if nef < 36 else "calculado", "ic_cruza_zero": ic[0] < 0 < ic[1],
                          "pearson_sem_pandemia": r_sem, "n_sem_pandemia": int(fora.sum()),
                          "puxado_por_poucos_meses": abs(r - rho) > 0.2 or abs(r - r_sem) > 0.2})
    assert dp < 1e-12 and ds < 1e-12
    saida = {
        "familia": 3, "base": "bolsa dos EUA",
        "nome": "Co-movimento dos setores na bolsa dos EUA (retorno mensal)",
        "aviso": "Co-movimento não é dependência. A coluna 'sem mercado' tira o sobe-e-desce comum da bolsa inteira; o que sobra é risco que os dois setores dividem.",
        "fonte": {"orgao": "Kenneth R. French Data Library, Tuck School of Business, Dartmouth (base CRSP)",
                  "arquivos": {"49_Industry_Portfolios_CSV.zip": hashlib.sha256(z49.read_bytes()).hexdigest(),
                               "F-F_Research_Data_Factors_CSV.zip": hashlib.sha256(zm.read_bytes()).hexdigest()},
                  "url": "https://mba.tuck.dartmouth.edu/pages/faculty/ken.french/data_library.html",
                  "primeiro_mes": meses[0], "ultimo_mes": meses[-1]},
        "metodo": {"taxa": "retorno mensal ponderado pelo valor de mercado, em %",
                   "parcial": "tira o retorno do mercado (Mkt−RF + RF)",
                   "resto": "igual à base do IBGE: Pearson, Spearman, n efetivo de Bartlett, IC 95% de Fisher, teste sem 2020–2021"},
        "setores": [{"codigo": c, "nome": n_, "nichos": ni} for c, n_, ni in SETORES],
        "pares": pares,
        "taxas": {c: [round(float(v), 4) for v in x[c]] for c, _, _ in SETORES},
        "periodos": [str(m) for m in meses],
        "conferencia": {"max_dif_pearson_manual_vs_numpy": dp, "max_dif_spearman_manual_vs_scipy": ds, "aprovado": True},
    }
    SAIDA.write_text(json.dumps(saida, ensure_ascii=False, indent=1))
    print(n, "meses,", len(pares), "pares", saida["conferencia"])
    for p in sorted(pares, key=lambda p: -p["parcial_sem_mercado"])[:10]:
        print(f"{p['nome_a']:24s} × {p['nome_b']:24s} r={p['pearson']:+.3f} sem_mercado={p['parcial_sem_mercado']:+.3f} n_ef={p['n_efetivo']:.0f}")


if __name__ == "__main__":
    main()
