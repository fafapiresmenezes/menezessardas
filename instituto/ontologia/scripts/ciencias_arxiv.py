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

Conferência independente: 6 pares são perguntados também na ordem inversa
(cat:B AND cat:A); o programa para se a contagem não for idêntica.
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
BRUTO = AQUI / "bruto" / "arxiv"
SAIDA = AQUI / "saida" / "ciencias_arxiv.json"
BASE = "https://export.arxiv.org/api/query?max_results=1&search_query="

AREAS = [
    ("mat", "Matemática", "cat:math.*", ["Matemática"]),
    ("fis", "Física (geral e aplicada)", "cat:physics.*", ["Física"]),
    ("cm", "Matéria condensada", "cat:cond-mat*", ["Física", "Quântica"]),
    ("qu", "Física e computação quântica", "cat:quant-ph", ["Quântica"]),
    ("cr", "Criptografia e segurança", "cat:cs.CR", ["IA e Cibersegurança", "Segurança"]),
    ("ia", "Inteligência artificial", "cat:cs.AI", ["IA e Cibersegurança"]),
    ("ml", "Aprendizado de máquina", "cat:cs.LG", ["IA e Cibersegurança"]),
    ("lo", "Lógica em computação (ontologia formal)", "cat:cs.LO", ["Ontologia"]),
    ("st", "Estatística", "cat:stat.*", ["Predição e calibragem"]),
    ("ec", "Economia", "cat:econ.*", ["B2B", "Contratos públicos", "Cadeia distributiva"]),
    ("fi", "Finanças quantitativas", "cat:q-fin.*", ["Finanças"]),
    ("bi", "Biologia quantitativa", "cat:q-bio.*", ["Saúde", "Agro"]),
    ("ee", "Engenharia elétrica e sistemas", "cat:eess.*", ["Engenharia", "Energia", "Telecom"]),
    ("cy", "Computação e sociedade (direito e políticas)", "cat:cs.CY", ["Jurídica"]),
]
INVERTIDOS = [("qu", "cr"), ("mat", "qu"), ("ml", "st"), ("ec", "fi"), ("ml", "bi"), ("ia", "lo")]


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
    for a, b in INVERTIDOS:
        q = f"{cod[b][2]}+AND+{cod[a][2]}"
        time.sleep(3.5)
        v, url, h = perguntar(q, f"inv_{b}__{a}")
        conf.append({"par": [a, b], "direto": nab[(a, b)], "invertido": v})
        time.sleep(3.5)
    assert all(c["direto"] == c["invertido"] for c in conf), conf
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
        })
    saida = {
        "familia": 5,
        "nome": "Ligação entre ciências (artigos listados em duas áreas no arXiv)",
        "aviso": "Proximidade de conhecimento, não dependência. Contagens crescem todo dia; valem para a data da coleta.",
        "fonte": {"orgao": "arXiv (Cornell University)", "api": "https://export.arxiv.org/api/query",
                  "coleta_inicio_utc": inicio, "coleta_fim_utc": fim,
                  "arquivos": "bruto/arxiv/*.xml (uma resposta por pergunta)"},
        "metodo": {"cosseno": "n_AB / √(n_A·n_B)", "jaccard": "n_AB / (n_A + n_B − n_AB)",
                   "parte": "n_AB / n_A",
                   "observacao": "cat:math.* não inclui math-ph (física matemática), que é arquivo próprio."},
        "areas": [{"codigo": c, "nome": nm, "consulta": q, "nichos": ni, "n": n[c]} for c, nm, q, ni in AREAS],
        "pares": pares,
        "registros": regs,
        "conferencia": {"pares_invertidos": conf, "aprovado": True},
    }
    SAIDA.write_text(json.dumps(saida, ensure_ascii=False, indent=1))
    for p in sorted(pares, key=lambda p: -p["cosseno"])[:12]:
        print(f"{p['a']}-{p['b']} n_ab={p['n_ab']} cos={p['cosseno']:.4f}")


if __name__ == "__main__":
    main()
