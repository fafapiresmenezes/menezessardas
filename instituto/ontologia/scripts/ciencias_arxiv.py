"""Família 5 — ligação entre ciências, contada no arXiv.

Fonte: API pública do arXiv (https://export.arxiv.org/api/query), contagem
"opensearch:totalResults". Cada artigo do arXiv tem uma categoria principal e pode
ser listado em outras; um artigo listado em A e em B conta como ponte A–B.

Conta, número por número:
  n_A   = artigos com categoria A
  n_AB  = artigos com A e B ao mesmo tempo
  Cosseno de Salton  = n_AB / √(n_A · n_B)
  Jaccard            = n_AB / (n_A + n_B − n_AB)
  Parte de A que encosta em B = n_AB / n_A   (assimétrico: quanto de A precisa de B)

O que NÃO é: não é dependência econômica, é proximidade de conhecimento
(quem publica junto). Mudança no tempo: as contagens crescem todo dia; a data da
coleta fica gravada.

Categorias-apelido (rodada 5, achado da revisão): o arXiv guarda cada artigo só pelo nome
PRINCIPAL da categoria, e a busca pelo apelido dá 0 (cat:stat.TH, cat:q-fin.EC, cat:math.IT,
cat:math.MP e cat:cs.SY dão 0). Por isso cada área soma os nomes principais que lhe pertencem:
  Matemática  = math.* OU math-ph (= math.MP) OU cs.IT (= math.IT)
  Estatística = stat.* OU math.ST (= stat.TH)
  Finanças    = q-fin.* OU econ.GN (= q-fin.EC)
  (cs.SY = eess.SY já está em eess.*; cs.NA = math.NA já está em math.*)

Conferência independente (troca a da rodada 3, que não testava nada porque o E é comutativo):
inclusão e exclusão em 6 pares. Pergunta-se também "A OU B" e confere-se
  n(A OU B) = n_A + n_B − n_AB
que só bate se o arXiv contar as três perguntas sobre o mesmo conjunto de artigos.
Ritmo: 1 pergunta a cada 3,5 s (regra de uso do arXiv).
"""
import hashlib
import json
import re
import sys
import time
import urllib.request
from datetime import datetime, timezone
from itertools import combinations
from pathlib import Path

AQUI = Path(__file__).resolve().parent.parent
BRUTO = AQUI / "bruto" / "arxiv_r5"  # rodada 3 ficou em bruto/arxiv
SAIDA = AQUI / "saida" / "ciencias_arxiv.json"
BASE = "https://export.arxiv.org/api/query?max_results=1&search_query="

AREAS = [
    ("mat", "Matemática", "%28cat:math.*+OR+cat:math-ph+OR+cat:cs.IT%29", ["Matemática"]),
    ("fis", "Física (geral e aplicada)", "cat:physics.*", ["Física"]),
    ("cm", "Matéria condensada", "cat:cond-mat*", ["Física", "Quântica"]),
    ("qu", "Física e computação quântica", "cat:quant-ph", ["Quântica"]),
    ("cr", "Criptografia e segurança", "cat:cs.CR", ["IA e Cibersegurança", "Segurança"]),
    ("ia", "Inteligência artificial", "cat:cs.AI", ["IA e Cibersegurança"]),
    ("ml", "Aprendizado de máquina", "cat:cs.LG", ["IA e Cibersegurança"]),
    ("lo", "Lógica em computação (ontologia formal)", "cat:cs.LO", ["Ontologia"]),
    ("st", "Estatística", "%28cat:stat.*+OR+cat:math.ST%29", ["Predição e calibragem"]),
    ("ec", "Economia", "cat:econ.*", ["B2B", "Contratos públicos", "Cadeia distributiva"]),
    ("fi", "Finanças quantitativas", "%28cat:q-fin.*+OR+cat:econ.GN%29", ["Finanças"]),
    ("bi", "Biologia quantitativa", "cat:q-bio.*", ["Saúde", "Agro"]),
    ("ee", "Engenharia elétrica e sistemas", "cat:eess.*", ["Engenharia", "Energia", "Telecom"]),
    ("cy", "Computação e sociedade (direito e políticas)", "cat:cs.CY", ["Jurídica"]),
]
INCL_EXCL = [("qu", "cr"), ("mat", "qu"), ("ml", "st"), ("ec", "fi"), ("ml", "bi"), ("ia", "lo")]


def perguntar(q, nome):
    url = BASE + q
    guardado = BRUTO / f"{nome}.xml"
    if guardado.exists():  # resposta desta mesma coleta já gravada: reaproveita sem perguntar de novo
        corpo = guardado.read_bytes()
        m = re.search(rb"<opensearch:totalResults>(\d+)<", corpo)
        return int(m.group(1)), url, hashlib.sha256(corpo).hexdigest()
    for tentativa in range(5):
        try:
            with urllib.request.urlopen(url, timeout=60) as r:
                corpo = r.read()
            m = re.search(rb"<opensearch:totalResults>(\d+)<", corpo)
            if m and b"api/errors" not in corpo:
                (BRUTO / f"{nome}.xml").write_bytes(corpo)
                time.sleep(3.5)
                return int(m.group(1)), url, hashlib.sha256(corpo).hexdigest()
        except Exception as e:  # noqa: BLE001
            print("  erro", nome, e, file=sys.stderr)
        time.sleep(6 * (tentativa + 1))
    raise SystemExit(f"arXiv não respondeu para {q}")


def main():
    BRUTO.mkdir(parents=True, exist_ok=True)
    inicio = datetime.now(timezone.utc).isoformat(timespec="seconds")
    cod = {a[0]: a for a in AREAS}
    n, regs = {}, []
    for c, nome, q, _ in AREAS:
        n[c], url, h = perguntar(q, c)
        regs.append({"consulta": q, "url": url, "total": n[c], "sha256": h})
        print(c, n[c], flush=True)
    nab = {}
    for a, b in combinations([x[0] for x in AREAS], 2):
        q = f"{cod[a][2]}+AND+{cod[b][2]}"
        nab[(a, b)], url, h = perguntar(q, f"{a}__{b}")
        regs.append({"consulta": q, "url": url, "total": nab[(a, b)], "sha256": h})
        print(a, b, nab[(a, b)], flush=True)
    conf = []
    for a, b in INCL_EXCL:
        q = f"%28{cod[a][2]}+OR+{cod[b][2]}%29"
        v, url, h = perguntar(q, f"ou_{a}__{b}")
        regs.append({"consulta": q, "url": url, "total": v, "sha256": h})
        esperado = n[a] + n[b] - nab[(a, b)]
        conf.append({"par": [a, b], "n_a": n[a], "n_b": n[b], "n_ab": nab[(a, b)], "n_a_ou_b": v,
                     "n_a+n_b-n_ab": esperado, "bate": v == esperado})
    aprovado = all(c["bate"] for c in conf)
    print("inclusão e exclusão:", [(c["par"], c["bate"]) for c in conf], flush=True)
    # Categoria compartilhada por definição do arXiv: math.ST (= stat.TH) e econ.GN (= q-fin.EC) pertencem a dois
    # arquivos ao mesmo tempo, então todo artigo delas vira ponte automática. Mostra-se também a ponte SEM a
    # categoria compartilhada do lado de cá (só listagem cruzada de verdade).
    compart = []
    for a_, b_, qa, qb, nome_c in (("mat", "st", cod["mat"][2], "cat:stat.*", "math.ST = stat.TH"),
                                   ("ec", "fi", "cat:econ.*", "cat:q-fin.*", "econ.GN = q-fin.EC")):
        nb_s, url, h = perguntar(qb, f"sem_apelido_{b_}")
        regs.append({"consulta": qb, "url": url, "total": nb_s, "sha256": h})
        na_s = n[a_] if qa == cod[a_][2] else None
        if na_s is None:
            na_s, url, h = perguntar(qa, f"sem_apelido_{a_}")
            regs.append({"consulta": qa, "url": url, "total": na_s, "sha256": h})
        nab_s, url, h = perguntar(f"{qa}+AND+{qb}", f"sem_apelido_{a_}__{b_}")
        regs.append({"consulta": f"{qa}+AND+{qb}", "url": url, "total": nab_s, "sha256": h})
        compart.append({"par": [a_, b_], "categoria_compartilhada": nome_c, "com": {"n_a": n[a_], "n_b": n[b_], "n_ab": nab[(a_, b_)],
                        "cosseno": nab[(a_, b_)] / (n[a_] * n[b_]) ** 0.5},
                        "sem": {"consulta_a": qa, "consulta_b": qb, "n_a": na_s, "n_b": nb_s, "n_ab": nab_s, "cosseno": nab_s / (na_s * nb_s) ** 0.5}})
    # peso da regra de listagem cruzada em Estatística × Aprendizado de máquina
    cruz = {}
    for nome, q in (("stat_ML", "cat:stat.ML"), ("stat_ML_e_cs_LG", "cat:stat.ML+AND+cat:cs.LG")):
        cruz[nome], url, h = perguntar(q, nome)
        regs.append({"consulta": q, "url": url, "total": cruz[nome], "sha256": h})
    # data real de cada resposta = hora em que o arquivo bruto foi gravado
    horas = sorted(f.stat().st_mtime for f in BRUTO.glob("*.xml"))
    inicio = datetime.fromtimestamp(horas[0], timezone.utc).isoformat(timespec="seconds")
    fim = datetime.fromtimestamp(horas[-1], timezone.utc).isoformat(timespec="seconds")

    pares = []
    for (a, b), v in nab.items():
        pares.append({
            "a": a, "b": b, "n_a": n[a], "n_b": n[b], "n_ab": v,
            "cosseno": v / (n[a] * n[b]) ** 0.5,
            "jaccard": v / (n[a] + n[b] - v),
            "parte_de_a_em_b": v / n[a], "parte_de_b_em_a": v / n[b],
            "cosseno_ponte": v / (n[a] * n[b]) ** 0.5, "n_ab_ponte": v,
            "jaccard_ponte": v / (n[a] + n[b] - v), "parte_de_a_em_b_ponte": v / n[a],
        })
    # nos dois pares com categoria compartilhada, a ponte usada no desenho é a SEM a categoria (só listagem cruzada)
    for c in compart:
        par = next(x for x in pares if [x["a"], x["b"]] == c["par"])
        par["cosseno_ponte"] = c["sem"]["cosseno"]
        par["categoria_compartilhada"] = c["categoria_compartilhada"]
        par["n_ab_sem_compartilhada"] = c["sem"]["n_ab"]
        sa, sb, sab = c["sem"]["n_a"], c["sem"]["n_b"], c["sem"]["n_ab"]
        par.update({"n_ab_ponte": sab, "jaccard_ponte": sab / (sa + sb - sab), "parte_de_a_em_b_ponte": sab / sa})
    saida = {
        "familia": 5,
        "nome": "Ligação entre ciências (artigos listados em duas áreas no arXiv)",
        "aviso": "Proximidade de conhecimento, não dependência. Contagens crescem todo dia; valem para a data da coleta.",
        "fonte": {"orgao": "arXiv (Cornell University)", "api": "https://export.arxiv.org/api/query",
                  "coleta_inicio_utc": inicio, "coleta_fim_utc": fim,
                  "arquivos": "bruto/arxiv/*.xml (uma resposta por pergunta)"},
        "metodo": {"cosseno": "n_AB / √(n_A·n_B)", "jaccard": "n_AB / (n_A + n_B − n_AB)",
                   "parte": "n_AB / n_A",
                   "observacao": ("Categorias-apelido somadas (ver consultas): Matemática inclui math-ph e cs.IT; "
                                  "Estatística inclui math.ST; Finanças inclui econ.GN. Um mesmo artigo listado em "
                                  "econ.GN entra em Economia e em Finanças, porque o arXiv o põe nas duas."),
                   "categoria_compartilhada": {"texto": ("Nos pares Matemática × Estatística e Economia × Finanças, uma "
                       "categoria pertence aos dois arquivos por definição do arXiv; todo artigo dela conta como ponte. Abaixo, "
                       "a mesma ponte com e sem essa categoria."), "pares": compart},
                   "aviso_estatistica_ml": {
                       "n_stat_ML": cruz["stat_ML"], "n_stat_ML_e_cs_LG": cruz["stat_ML_e_cs_LG"],
                       "parte": cruz["stat_ML_e_cs_LG"] / cruz["stat_ML"],
                       "texto": ("A maior parte de stat.ML também está listada em cs.LG. A ponte Estatística × "
                                 "Aprendizado de máquina mede, em boa parte, o costume de listar nas duas, não só "
                                 "proximidade espontânea; o motivo exato (regra de moderação) não foi conferido em "
                                 "documento do arXiv por nós.")}},
        "areas": [{"codigo": c, "nome": nm, "consulta": q, "nichos": ni, "n": n[c]} for c, nm, q, ni in AREAS],
        "pares": pares,
        "registros": regs,
        "conferencia": {"inclusao_exclusao": conf, "aprovado": aprovado},
    }
    SAIDA.write_text(json.dumps(saida, ensure_ascii=False, indent=1))
    for p in sorted(pares, key=lambda p: -p["cosseno_ponte"])[:12]:
        print(f"{p['a']}-{p['b']} n_ab={p['n_ab']} cos={p['cosseno']:.4f} ponte={p['cosseno_ponte']:.4f}")


if __name__ == "__main__":
    main()
