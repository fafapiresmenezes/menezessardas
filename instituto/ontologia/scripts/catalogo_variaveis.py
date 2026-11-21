"""Etapa 2 — catálogo de variáveis, com o TIPO de cada uma, gerado a partir das saídas conferidas.

Cada linha do catálogo é um tipo de variável (ex.: "coeficiente técnico A[i,j]"), com:
  família, nome, símbolo, tipo estatístico, unidade, faixa possível, fonte, período,
  granularidade, quantas instâncias (valores) existem nos nossos dados e o selo.

Tipos usados (escala de medida de Stevens, 1946, mais os tipos de dado):
  razão contínua     — zero verdadeiro, pode multiplicar (ex.: reais, euros, dias)
  proporção          — razão contínua presa entre 0 e 1 (ex.: coeficiente técnico, φ)
  correlação         — entre −1 e 1, sem unidade
  índice relativo    — razão contra uma média (ex.: ligação de Rasmussen, média = 1)
  contagem           — número inteiro de coisas (artigos, países, produtos)
  binária            — 0 ou 1
  probabilidade de mercado — preço de 0 a 1 de terceiros, NÃO calibrado por nós
  categórica         — rótulo (setor, nicho, região)
  da literatura      — número copiado da fonte, com o tipo que a fonte dá

Nenhum número é digitado aqui: as contagens de instâncias saem dos arquivos.
"""
import json
from pathlib import Path

import numpy as np

S = Path(__file__).resolve().parent.parent / "saida"
L = Path(__file__).resolve().parent.parent / "literatura"
j = lambda n: json.load(open(S / n))

le, me, ex = j("leontief_ibge_2015.json"), j("memoria_ibge_2015.json"), j("exiobase_2019.json")
co, cb, ci = j("comovimento_pib.json"), j("comovimento_bolsa.json"), j("ciencias_arxiv.json")
mp, si, px = j("mercados_previsao.json"), j("sobreposicao_interna.json"), j("atlas_proximidade.json")
lit = json.load(open(L / "registro.json"))["registro"]
setor = json.load(open(L / "setor_mercados_previsao.json"))

n67 = len(le["codigos"])
nprod = len(np.load(S / "ibge_2015_intermediarios.npz", allow_pickle=True)["prod_cod"])
n_ex = len(ex["regioes"]) * len(ex["setores"])
cat = []


def v(familia, nome, simbolo, tipo, unidade, faixa, fonte, periodo, granularidade, instancias, selo="calculado por nós", obs=""):
    cat.append({"familia": familia, "nome": nome, "simbolo": simbolo, "tipo": tipo, "unidade": unidade, "faixa": faixa,
                "fonte": fonte, "periodo": periodo, "granularidade": granularidade, "instancias": instancias,
                "selo": selo, "obs": obs})


F1, F1w = "1 · Dependência (IBGE)", "1 · Dependência (mundo)"
v(F1, "Produção da atividade", "g", "razão contínua", "R$ milhões", "≥ 0", "IBGE MIP 2015", "2015", "atividade (67)", n67)
v(F1, "Produção do produto", "q", "razão contínua", "R$ milhões", "≥ 0", "IBGE MIP 2015", "2015", f"produto ({nprod})", nprod)
v(F1, "Consumo intermediário nacional", "Un[p,j]", "razão contínua", "R$ milhões", "≥ 0", "IBGE MIP 2015, Tabela 03", "2015", "produto × atividade", nprod * n67)
v(F1, "Parte do mercado do produto", "D[i,p]", "proporção", "sem unidade", "0 a 1", "IBGE MIP 2015, Tabela 01", "2015", "atividade × produto", n67 * nprod)
v(F1, "Coeficiente técnico (compra direta)", "A[i,j]", "proporção", "R$ por R$ 1 produzido", "0 a 1", "conta nossa, conferida com a Tabela 14", "2015", "atividade × atividade", n67 * n67)
v(F1, "Efeito em cadeia (Leontief)", "L[i,j]", "razão contínua", "R$ por R$ 1 de demanda final", "≥ 0 (diagonal ≥ 1)", "conta nossa, conferida com a Tabela 15", "2015", "atividade × atividade", n67 * n67)
v(F1, "Ligação para trás", "BL[j]", "índice relativo", "média da economia = 1", "> 0", "conta nossa (Rasmussen-Hirschman)", "2015", "atividade", n67)
v(F1, "Ligação para frente", "FL[i]", "índice relativo", "média da economia = 1", "> 0", "conta nossa (Rasmussen-Hirschman)", "2015", "atividade", n67)
v(F1, "Setor-chave", "BL>1 e FL>1", "binária", "sim/não", "0 ou 1", "conta nossa", "2015", "atividade", n67)
v(F1, "Parcela de cada produto em A", "D·Un/g", "razão contínua", "R$ por R$ 1", "≥ 0", "conta nossa (memória)", "2015", "par × produto", len(me["pares"]) * nprod)
v(F1w, "Fluxo entre setores e regiões", "Z", "razão contínua", "milhões de euros", "≥ 0", "EXIOBASE 3.9.6", "2019", "região-setor × região-setor", n_ex * n_ex)
v(F1w, "Coeficiente técnico mundial", "A", "proporção", "euro por euro", "0 a 1", "conta nossa, conferida com a A publicada", "2019", "região-setor × região-setor", n_ex * n_ex)
v(F1w, "Efeito em cadeia mundial", "L", "razão contínua", "euro por euro de demanda final", "≥ 0", "conta nossa (inversão completa)", "2019", "região-setor × região-setor", n_ex * n_ex)
v(F1w, "Parte da cadeia vinda de fora da região", "1 − L_dentro/L_total", "proporção", "sem unidade", "0 a 1", "conta nossa", "2019", "região × setor dos nichos", len(ex["por_regiao"]) * len(ex["indices_nichos"]))

F2 = "2 · Proximidade (Harvard)"
v(F2, "Vantagem comparativa revelada", "RCA[c,p]", "índice relativo", "média do mundo = 1", "≥ 0", "Harvard Atlas", "2015–2024", "país-ano × produto", px["fonte"]["observacoes_pais_ano"] * px["fonte"]["produtos"], selo="da fonte")
v(F2, "Exporta com vantagem", "M[c,p]", "binária", "sim/não", "0 ou 1", "conta nossa", "2015–2024", "país-ano × produto", px["fonte"]["observacoes_pais_ano"] * px["fonte"]["produtos"])
v(F2, "Proximidade entre produtos", "φ[i,j]", "proporção", "sem unidade", "0 a 1", "conta nossa (Hidalgo et al. 2007)", "2015–2024", "produto × produto", px["fonte"]["produtos"] ** 2, selo=px["selo"])
v(F2, "Proximidade entre grupos de nichos", "φ̄(A,B)", "proporção", "sem unidade", "0 a 1", "conta nossa", "2015–2024", "nicho × nicho", sum(1 for p in px["pares"] if p["phi_ponderada"] is not None), selo=px["selo"],
  obs=f"{sum(1 for p in px['pares'] if p['phi_ponderada'] is None)} pares sem base (serviços)")

F3 = "3 · Movimento conjunto"
for base, d, per in (("PIB trimestral IBGE", co, "trimestre"), ("bolsa dos EUA", cb, "mês")):
    ns, npar = len(d["setores"]), len(d["pares"])
    nper = d["pares"][0]["n"]
    v(F3, f"Taxa do setor ({base})", "g_t" if d is co else "r_t", "razão contínua", "log-variação anual" if d is co else "% ao mês", "qualquer real", d["fonte"]["orgao"], f"{nper} {per}s", f"setor × {per}", ns * nper)
    for nome, sim, tipo, faixa in (("Correlação de Pearson", "r", "correlação", "−1 a 1"), ("Correlação de Spearman", "ρ", "correlação", "−1 a 1"),
                                   ("Correlação parcial sem o efeito comum", "r_parcial", "correlação", "−1 a 1"), ("Tamanho efetivo da amostra", "n_ef", "razão contínua", "> 0"),
                                   ("Limites do intervalo de 95%", "IC95", "correlação", "−1 a 1"), ("Puxado por poucos períodos", "aviso", "binária", "0 ou 1")):
        v(F3, f"{nome} ({base})", sim, tipo, "sem unidade" if tipo != "razão contínua" else "períodos", faixa, "conta nossa", f"{nper} {per}s", "par de setores", npar * (2 if sim == "IC95" else 1))

F4 = "4 · Mercados de previsão"
v(F4, "Preço do Sim", "p", "probabilidade de mercado", "dólar por contrato de 1 dólar", "0 a 1", "Polymarket e Kalshi", mp["coletado_utc"][:10], "mercado", len(mp["mercados"]), selo="dado de terceiros", obs="não é predição do Instituto")
v(F4, "Volume negociado", "V", "razão contínua", "dólares", "≥ 0", "Polymarket e Kalshi", mp["coletado_utc"][:10], "mercado", len(mp["mercados"]), selo="dado de terceiros")
v(F4, "Nicho ligado ao mercado", "nicho", "categórica", "rótulo", "lista de nichos", "regra escrita por termos", mp["coletado_utc"][:10], "mercado", sum(len(m["nichos"]) for m in mp["mercados"]))
v(F4, "Startup comprada", "compra", "categórica", "rótulo e data", "—", "imprensa", "2025–2026", "compra", len(setor["compras"]), selo="da literatura")
v(F4, "Previsão de crescimento do setor", "série", "da literatura", "dólares", "≥ 0", "Bernstein, Citizens, EKG", "2025–2030", "previsão × ano", sum(len(p["serie"]) for p in setor["previsoes"]), selo="da literatura")
v(F4, "Escore de Brier publicado", "Brier", "da literatura", "erro quadrático médio", "0 a 1 (0,25 = cara ou coroa)", "Kalshi Research", "2021–2026", "estudo × recorte", sum(len(e["numeros"]) for e in setor["calibragem"]["estudos"]), selo="da literatura")

F5 = "5 · Ligação entre ciências"
v(F5, "Artigos da área", "n_A", "contagem", "artigos", "≥ 0", "arXiv", ci["fonte"]["coleta_fim_utc"][:10], "área", len(ci["areas"]), selo="da fonte")
v(F5, "Artigos nas duas áreas", "n_AB", "contagem", "artigos", "≥ 0", "arXiv", ci["fonte"]["coleta_fim_utc"][:10], "par de áreas", len(ci["pares"]), selo="da fonte")
for nome, sim in (("Cosseno de Salton", "cos"), ("Jaccard", "J"), ("Parte de A que encosta em B", "n_AB/n_A")):
    v(F5, nome, sim, "proporção", "sem unidade", "0 a 1", "conta nossa", ci["fonte"]["coleta_fim_utc"][:10], "par de áreas", len(ci["pares"]) * (2 if sim == "n_AB/n_A" else 1))

F6 = "6 · Literatura"
for r in lit:
    for n in r.get("numeros", []):
        v(F6, n["o_que"], r["id"], "da literatura", "como na fonte", "—", f"{r['autores']} ({r['ano']})", str(r["ano"]), r.get("direcao", "conferência"), 1, selo=r["selo"])

F7 = "7 · Sobreposição interna"
v(F7, "Ferramentas em comum entre nichos", "|A∩B|", "contagem", "ferramentas", "≥ 0", "f5-ferramentas.json", "21/11/2026", "par de nichos", len(si["pares"]))
v(F7, "Jaccard interno", "J", "proporção", "sem unidade", "0 a 1", "conta nossa", "21/11/2026", "par de nichos", len(si["pares"]))

catalogo = {"regra": "Catálogo gerado das saídas conferidas; nenhuma contagem digitada.", "escala_de_tipos": "Stevens (1946), On the Theory of Scales of Measurement, Science 103:677-680, mais os tipos de dado do projeto",
            "tipos_de_variavel": len({c["tipo"] for c in cat}), "linhas": len(cat),
            "instancias_total": sum(c["instancias"] for c in cat),
            "por_tipo": {t: {"linhas": sum(1 for c in cat if c["tipo"] == t), "instancias": sum(c["instancias"] for c in cat if c["tipo"] == t)} for t in sorted({c["tipo"] for c in cat})},
            "catalogo": cat}
(S / "catalogo_variaveis.json").write_text(json.dumps(catalogo, ensure_ascii=False, indent=1))
print(catalogo["linhas"], "linhas,", catalogo["tipos_de_variavel"], "tipos,", f"{catalogo['instancias_total']:,}", "valores")
for t, d in catalogo["por_tipo"].items():
    print(f"  {t:28s} {d['linhas']:4d} linhas {d['instancias']:>16,} valores")
