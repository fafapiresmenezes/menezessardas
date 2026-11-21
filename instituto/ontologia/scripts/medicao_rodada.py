"""Gera o HTML da medição da rodada a partir das saídas conferidas (nenhum número digitado). Depois vira PDF."""
import json, html, sys
r = int(sys.argv[1]) if len(sys.argv) > 1 else 1
le = json.load(open('saida/leontief_ibge_2015.json')); me = json.load(open('saida/memoria_ibge_2015.json')); si = json.load(open('saida/sobreposicao_interna.json'))
E = html.escape
ETAPAS = [  # (etapa, % feito, como foi medido)
 ('1. Retirar números inventados', 100, '5 de 5 índices antigos retirados'),
 ('2. Setores, fichas e tipos de variável', 60, '15 fichas nicho→IBGE e 6 nichos sem correspondência escritos; catálogo de variáveis com tipo ainda não montado em dado'),
 ('3. Família 7, sobreposição interna', 100, f"{len(si['pares'])} pares de 10 nichos calculados e recontados"),
 ('4. Família 1, dependência econômica', 33, '1 de 3 bases feita (IBGE 2015); EXIOBASE baixando; OCDE bloqueia acesso automático'),
 ('5. Famílias 3 e 4, mercados', 0, 'fontes testadas e abertas; conta não começou'),
 ('6. Famílias 2 e 5, Harvard e OpenAlex', 0, 'fontes testadas; conta não começou'),
 ('7. Família 6, literatura', 0, 'busca começou; nenhum número de tese lido e conferido ainda'),
 ('8. Desenho, segunda conta e carimbo', 30, 'desenho v1 publicado; revisão de adversário e carimbo pendentes'),
]
total = sum(p for _, p, _ in ETAPAS) / len(ETAPAS)
c = le['conferencia']
nome = dict(zip(le['codigos'], le['atividades']))
top = sorted(me['pares'], key=lambda p: -p['A'])[:12]
chave = [l for l in me['ligacoes'] if l['setor_chave']]
nichos = {a['cod'] for f in me['fichas'] for a in f['atividades']}
linhas_top = ''.join(f"<tr><td>{E(nome[p['para']])} ({p['para']})</td><td>{E(nome[p['de']])} ({p['de']})</td><td class=n>{p['A']:.6f}</td><td class=n>{p['L']:.6f}</td><td>{E(p['produtos_que_mais_pesam'][0]['produto'])}: {p['produtos_que_mais_pesam'][0]['parcela_de_A']:.6f}</td></tr>" for p in top)
linhas_chave = ''.join(f"<tr><td>{l['cod']}</td><td>{E(l['atividade'])}{' ◆' if l['cod'] in nichos else ''}</td><td class=n>{l['para_tras']:.4f}</td><td class=n>{l['para_frente']:.4f}</td></tr>" for l in sorted(chave, key=lambda l: -l['para_frente']))
etapas = ''.join(f"<tr><td>{E(n)}</td><td class=n>{p}%</td><td><div class=b><i style='width:{p}%'></i></div></td><td>{E(m)}</td></tr>" for n, p, m in ETAPAS)
sem = ''.join(f"<li><b>{E(k)}</b>: {E(v)}</li>" for k, v in me['sem_correspondencia'].items())
doc = f"""<!doctype html><html lang=pt-BR><meta charset=utf-8><title>Medição árvore rodada {r}</title>
<style>@page{{size:A4;margin:16mm 14mm}}body{{font-family:Inter,Arial,sans-serif;color:#14212b;font-size:10.5pt;line-height:1.45}}h1{{font-family:Georgia,serif;font-size:21pt;margin:0}}h2{{font-size:12.5pt;margin:18px 0 6px;color:#0f7b6c}}
table{{border-collapse:collapse;width:100%;font-size:9pt}}td,th{{border-bottom:1px solid #d9e1e6;padding:4px 5px;text-align:left;vertical-align:top}}th{{font-size:8pt;text-transform:uppercase;color:#5b6b77}}.n{{text-align:right;font-family:'IBM Plex Mono',monospace;white-space:nowrap}}
.b{{width:90px;height:7px;background:#e6eceF;border-radius:4px}}.b i{{display:block;height:7px;background:#0f7b6c;border-radius:4px}}.big{{font-size:30pt;font-family:Georgia,serif;color:#0f7b6c}}.m{{color:#5b6b77}}pre{{background:#f5f7f8;padding:8px;font-size:8.5pt;white-space:pre-wrap}}</style>
<p class=m>Instituto THEYE · Árvore de intercorrelações · Medição da rodada {r} · 21/11/2026</p>
<h1>Plano em <span class=big>{total:.1f}%</span></h1>
<p>Média simples das 8 etapas do plano aprovado por M em 21/11 às 08h27. Cada etapa diz abaixo como a sua porcentagem foi medida.</p>
<h2>Checklist de 0 a 100%</h2><table><tr><th>Etapa</th><th>Feito</th><th></th><th>Como foi medido</th></tr>{etapas}</table>
<h2>Família 1: conferência da conta do IBGE</h2>
<p>Recalculamos a matriz de dependência a partir dos fluxos brutos (Tabelas 01 e 03) e comparamos com o que o próprio IBGE publica (Tabelas 14 e 15).</p>
<pre>{E(le['formula'])}
Maior diferença, nossa A contra Tabela 14 do IBGE ........ {c['max_dif_A_nossa_vs_tabela14']:.1e}
Maior diferença, nossa L contra Tabela 15 do IBGE ........ {c['max_dif_L_nossa_vs_tabela15']:.1e}
L por inversão contra L por soma de {c['termos_da_serie']} rodadas ........ {c['max_dif_L_inversao_vs_serie']:.1e}
Resultado: {'APROVADO' if c['aprovado'] else 'REPROVADO'}
Arquivo: {E(le['url'])}
SHA-256: {le['sha256_arquivo']}</pre>
<h2>As 12 maiores dependências diretas entre os setores dos nichos</h2>
<p class=m>A = compra direta por R$ 1 produzido; L = efeito em cadeia. Selo: calculado por nós. Brasil, 2015, insumo nacional.</p>
<table><tr><th>Quem compra</th><th>De quem</th><th class=n>A</th><th class=n>L</th><th>Produto que mais pesa (parcela de A)</th></tr>{linhas_top}</table>
<h2>Setores-chave da economia brasileira (ligação acima de 1 para trás e para frente)</h2>
<p class=m>{E(me['formula_ligacoes'])} ◆ = setor ligado a um nicho do Instituto.</p>
<table><tr><th>Código</th><th>Atividade</th><th class=n>Para trás</th><th class=n>Para frente</th></tr>{linhas_chave}</table>
<h2>Família 7: sobreposição interna</h2><p>{len(si['pares'])} pares calculados. Só 1 par tem ferramenta em comum (Marca/Site e Engenharia, Jaccard 0,2000, Blender). {E(si['aviso'])}</p>
<h2>Sem base nesta rodada</h2><ul>{sem}</ul>
<h2>Onde ver</h2><p>Desenho interativo: https://claude.ai/artifact/GSqTU6xSXsxjRPpY96Zotg (privado). Scripts e dados: instituto/ontologia/ no repositório.</p>
"""
open(f'saida/MEDICAO-ARVORE-rodada-{r}.html', 'w').write(doc); print(f'{total:.1f}%')
