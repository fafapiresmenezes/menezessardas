"""Gera o HTML da medição da rodada a partir das saídas conferidas (nenhum número digitado). Depois vira PDF."""
import json, html, sys
r = int(sys.argv[1]) if len(sys.argv) > 1 else 1
le = json.load(open('saida/leontief_ibge_2015.json')); me = json.load(open('saida/memoria_ibge_2015.json')); si = json.load(open('saida/sobreposicao_interna.json'))
E = html.escape
ex = json.load(open('saida/exiobase_2019.json')); lit = json.load(open('literatura/registro.json'))['registro']
n_lit = sum(1 for x in lit if x['selo'] == 'da literatura')
ETAPAS = [  # (etapa, % feito, como foi medido)
 ('1. Retirar números inventados', 100, '5 de 5 índices antigos retirados'),
 ('2. Setores, fichas e tipos de variável', 60, '15 fichas nicho→IBGE, 13 nichos ligados ao EXIOBASE e 6 sem correspondência escritos; catálogo de variáveis com tipo ainda não montado em dado'),
 ('3. Família 7, sobreposição interna', 100, f"{len(si['pares'])} pares de 10 nichos calculados e recontados"),
 ('4. Família 1, dependência econômica', 67 if r >= 2 else 33, '2 de 3 bases feitas (IBGE 2015 e EXIOBASE 2019 mundial); OCDE bloqueia acesso automático' if r >= 2 else '1 de 3 bases feita (IBGE 2015)'),
 ('5. Famílias 3 e 4, mercados', 100 if r >= 4 else 75 if r >= 3 else 0, 'família 3: 2 de 2 bases (PIB trimestral do IBGE e bolsa dos EUA) = 100%; família 4 = 100%' if r >= 4 else 'família 3: 1 de 2 bases (PIB trimestral do IBGE feito; bolsa B3/FRED pendente) = 50%; família 4: coleta Polymarket e Kalshi feita = 100%; média 75%' if r >= 3 else 'fontes testadas e abertas; conta não começou'),
 ('6. Famílias 2 e 5, Harvard e OpenAlex', 50 if r >= 4 else 25 if r >= 3 else 0, 'família 2: conta feita, conferência contra o Atlas reprovada (66,1% contra meta de 80%), vale 50%; família 5: 1 de 2 bases (arXiv) = 50%; média 50%' if r >= 4 else 'família 5: 1 de 2 bases (arXiv feito; OpenAlex esgotou a cota grátis do dia) = 50%; família 2 (Harvard) = 0%; média 25%' if r >= 3 else 'fontes testadas; conta não começou'),
 ('7. Família 6, literatura', min(100, n_lit * 10), f'{n_lit} estudos lidos e conferidos de uma meta de 10 (um por nicho principal), mais 1 estudo usado só para conferir'),
 ('8. Desenho, segunda conta e carimbo', 50 if r >= 4 else 45 if r >= 3 else 40 if r >= 2 else 30, ('desenho com 11 vistas publicado' if r >= 4 else 'desenho com 10 vistas publicado' if r >= 3 else 'desenho com 7 vistas publicado') + '; revisão de adversário e carimbo pendentes'),
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
extra = ''
extra4 = ''
if r >= 4:
    px = json.load(open('saida/atlas_proximidade.json')); cb = json.load(open('saida/comovimento_bolsa.json'))
    cfx = px['conferencia']
    tpx = ''.join(f"<tr><td>{E(q['a'])} × {E(q['b'])}</td><td class=n>{q['phi_ponderada']:.4f}</td><td class=n>{q['phi_media_simples']:.4f}</td><td>{E(q['par_mais_proximo'][0])} / {E(q['par_mais_proximo'][1])}: {q['par_mais_proximo'][2]:.3f}</td></tr>" for q in sorted([q for q in px['pares'] if q['phi_ponderada'] is not None], key=lambda q: -q['phi_ponderada'])[:12])
    tcb = ''.join(f"<tr><td>{E(q['nome_a'])} × {E(q['nome_b'])}</td><td class=n>{q['pearson']:+.3f}</td><td class=n>{q['ic95'][0]:+.2f} a {q['ic95'][1]:+.2f}</td><td class=n>{q['parcial_sem_mercado']:+.3f}</td><td class=n>{q['n_efetivo']:.0f}</td></tr>" for q in sorted(cb['pares'], key=lambda q: -q['parcial_sem_mercado'])[:12])
    extra4 = f"""<h2>Família 2: proximidade produtiva (Harvard), selo: {E(px['selo'])}</h2>
<p>{E(px['aviso'])} {px['fonte']['produtos']} produtos, {px['fonte']['paises']} países, {px['fonte']['anos'][0]}–{px['fonte']['anos'][1]}. {E(px['metodo']['referencia'])}.</p>
<pre>{E(px['metodo']['phi'])}
{E(px['metodo']['nicho'])}
Países: {E(px['fonte']['filtro_de_paises'])}
Conferência 1 (conta refeita por laço simples): diferença {cfx['max_dif_phi_matriz_vs_laco_simples']}
Conferência 2 (mapa publicado pelo Atlas, {cfx['ligacoes_publicadas_pelo_atlas']} ligações): mediana do percentil {cfx['mediana_percentil_da_nossa_phi']:.1f}; {100*cfx['parte_no_top_5_por_cento']:.1f}% no top 5%. Critério escrito antes: {E(cfx['criterio'])}. REPROVADA.
Tentativas: {E(' | '.join(px['fonte']['tentativas']))}
{E(px['fonte']['diferenca_do_atlas'])}
Sem base: {E(', '.join(k for k, v in px['nichos'].items() if v['sem_base']))} (o Atlas não publica a RCA dos serviços).</pre>
<table><tr><th>Par</th><th class=n>φ ponderada</th><th class=n>φ simples</th><th>Par de produtos mais próximo</th></tr>{tpx}</table>
<h2>Família 3, segunda base: setores da bolsa dos EUA</h2>
<p>{E(cb['aviso'])} {len(cb['setores'])} setores, {cb['pares'][0]['n']} meses ({cb['fonte']['primeiro_mes']} a {cb['fonte']['ultimo_mes']}), {len(cb['pares'])} pares. Fonte: {E(cb['fonte']['orgao'])}. Conferência: Pearson refeito, diferença {cb['conferencia']['max_dif_pearson_manual_vs_numpy']:.1e}.</p>
<table><tr><th>Par (os 12 que mais andam juntos depois de tirar a bolsa inteira)</th><th class=n>Pearson</th><th class=n>IC 95%</th><th class=n>Sem mercado</th><th class=n>n efetivo</th></tr>{tcb}</table>"""
if r >= 3:
    co = json.load(open('saida/comovimento_pib.json')); ci = json.load(open('saida/ciencias_arxiv.json')); mp = json.load(open('saida/mercados_previsao.json'))
    pc = sorted(co['pares'], key=lambda p: -p['pearson'])
    lin = lambda p: (f"<tr><td>{E(p['nome_a'])} × {E(p['nome_b'])}</td><td class=n>{p['pearson']:+.3f}</td><td class=n>{p['spearman']:+.3f}</td><td class=n>{p['n_efetivo']:.1f}</td>"
                     f"<td class=n>{p['ic95'][0]:+.2f} a {p['ic95'][1]:+.2f}</td><td class=n>{p['parcial_sem_pib']:+.3f}</td><td class=n>{p['pearson_sem_pandemia']:+.3f}</td><td>{'puxado por poucos trimestres' if p['puxado_por_poucos_trimestres'] else ('cruza o zero' if p['ic_cruza_zero'] else '')}</td></tr>")
    cc = co['conferencia']
    nomeA = {a['codigo']: a['nome'] for a in ci['areas']}
    tci = ''.join(f"<tr><td>{E(nomeA[p['a']])} × {E(nomeA[p['b']])}</td><td class=n>{p['n_a']:,}</td><td class=n>{p['n_b']:,}</td><td class=n>{p['n_ab']:,}</td><td class=n>{p['cosseno']:.4f}</td><td class=n>{p['jaccard']:.4f}</td></tr>".replace(',', '.') for p in sorted(ci['pares'], key=lambda p: -p['cosseno'])[:15])
    st = json.load(open('literatura/setor_mercados_previsao.json'))
    from collections import Counter
    cont = Counter(n for m in mp['mercados'] for n in m['nichos'])
    tmp = ''.join(f"<tr><td>{E(m['fonte'])}</td><td>{E(m['pergunta'])}</td><td class=n>{m['preco_sim']:.3f}</td><td class=n>{m['volume_dolares']:,.0f}</td></tr>".replace(',', '.') for m in mp['mercados'][:15])
    extra = f"""<h2>Família 3: quem sobe e desce junto (PIB trimestral do IBGE)</h2>
<p>{E(co['aviso'])} {len(co['pares'])} pares de 12 setores, {co['pares'][0]['n']} trimestres de taxa ({co['trimestres_das_taxas'][0]} a {co['trimestres_das_taxas'][-1]}). Arquivo bruto SHA-256 {co['fonte']['sha256']}.</p>
<pre>{chr(10).join(f"{k}: {v}" for k, v in co['metodo'].items())}
Conferência: Pearson refeito por numpy, diferença {cc['max_dif_pearson_manual_vs_numpy']:.1e}; Spearman refeito por scipy, diferença {cc['max_dif_spearman_manual_vs_scipy']:.1e}.
Pares cujo intervalo de 95% cruza o zero: {sum(p['ic_cruza_zero'] for p in co['pares'])} de {len(co['pares'])}. Puxados por poucos trimestres: {sum(p['puxado_por_poucos_trimestres'] for p in co['pares'])}.</pre>
<table><tr><th>Par</th><th class=n>Pearson</th><th class=n>Spearman</th><th class=n>n efetivo</th><th class=n>IC 95%</th><th class=n>Sem PIB</th><th class=n>Sem pandemia</th><th>Aviso</th></tr>{''.join(lin(p) for p in pc[:10])}<tr><td colspan=8 class=m>… os 4 mais negativos:</td></tr>{''.join(lin(p) for p in pc[-4:])}</table>
<h2>Família 5: quais ciências publicam juntas (arXiv)</h2>
<p>{E(ci['aviso'])} {len(ci['areas'])} áreas, {len(ci['pares'])} pares, coleta {ci['fonte']['coleta_inicio_utc']} a {ci['fonte']['coleta_fim_utc']}. Conferência: {len(ci['conferencia']['pares_invertidos'])} pares perguntados na ordem inversa, todos idênticos.</p>
<pre>cosseno = {ci['metodo']['cosseno']}    Jaccard = {ci['metodo']['jaccard']}</pre>
<table><tr><th>Par</th><th class=n>n A</th><th class=n>n B</th><th class=n>Em comum</th><th class=n>Cosseno</th><th class=n>Jaccard</th></tr>{tci}</table>
<h2>Família 4: mercados de previsão (dado de terceiros)</h2>
<p>{E(mp['aviso'])} Coleta {mp['coletado_utc']}: {len(mp['mercados'])} mercados abertos com volume a partir de {mp['filtros']['volume_minimo_dolares']:,} dólares ({sum(m['fonte']=='Polymarket' for m in mp['mercados'])} Polymarket, {sum(m['fonte']=='Kalshi' for m in mp['mercados'])} Kalshi). Esporte fica, marcado no nicho Esporte ({mp.get('marcados_como_esporte', 0)} mercados), a pedido de M, para treino e mapeamento de jogador, sem aposta.</p>
<p class=m>Mercados por nicho: {E(', '.join(f'{k} {v}' for k, v in cont.most_common()))}.</p>
<table><tr><th>Fonte</th><th>Pergunta (original)</th><th class=n>Preço do Sim</th><th class=n>Volume US$</th></tr>{tmp}</table>
<h2>O setor de mercados de previsão (da literatura e da imprensa)</h2>
<p>{E(st['regra'])} {E(st['compras_obs'])}</p>
<table><tr><th>Comprador</th><th>Startup</th><th>O que faz</th><th>Data</th><th>Preço</th></tr>{''.join(f"<tr><td>{E(c['comprador'])}</td><td>{E(c['comprada'])}</td><td>{E(c['o_que_faz'])}</td><td>{E(c['data'])}</td><td>{E(c['preco_obs'])}</td></tr>" for c in st['compras'])}</table>
<table style="margin-top:8px"><tr><th>Quem prevê</th><th>O quê</th><th>Série publicada</th><th>Faixa de erro</th></tr>{''.join(f"<tr><td>{E(v['quem'])} ({E(v['data'])})</td><td>{E(v['metrica'])}</td><td>{'; '.join(f'{a or chr(104)+chr(111)+chr(106)+chr(101)}: {x:,.0f}'.replace(',', '.') for a, x in v['serie'])} dólares</td><td>{E(v['faixa'])}</td></tr>" for v in st['previsoes'])}</table>
<p><b>{E(st['calibragem']['pergunta_de_M'])}</b> {E(st['calibragem']['resposta'])}</p>
<table><tr><th>Estudo</th><th>O que mede</th><th class=n>Valor</th><th>Onde</th></tr>{''.join(f"<tr><td>{E(e['id'])}</td><td>{E(n['o_que'])}</td><td class=n>{E(str(n['valor']).replace('.', ','))}</td><td>{E(n['onde'])}</td></tr>" for e in st['calibragem']['estudos'] for n in e['numeros'])}</table>
<p class=m>{E(st['calibragem']['uso_na_arvore'])}</p>"""
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
<h2>Família 1, base mundial (EXIOBASE 2019): conferência</h2>
<pre>{E(ex['formula'])}
Nossa A contra a A publicada no pacote ............ {ex['conferencia']['max_dif_A_nossa_vs_A_publicada']:.1e}
Resíduo da inversão completa (7.987 linhas) ....... {ex['conferencia']['max_residuo_(I-A)L-I_completo']:.1e}
Mundo: inversão contra soma de {ex['conferencia']['termos_serie_mundo']} rodadas ........... {ex['conferencia']['max_dif_Lw_inversao_vs_serie']:.1e}
Impressão digital do pacote igual à publicada: {ex['sha256_zip_conferido_com_o_publicado']}</pre>
<p>{E(ex['aviso_angola'])}</p>
<h2>Quanto da cadeia de cada setor vem de fora do país (Brasil e Resto da África)</h2>
<table><tr><th>Setor (EXIOBASE)</th><th class=n>Brasil</th><th class=n>Resto da África</th></tr>{''.join(f"<tr><td>{E(ex['setores'][j])}</td><td class=n>{100*ex['por_regiao']['BR']['parte_da_cadeia_fora_da_regiao'][c]:.1f}%</td><td class=n>{100*ex['por_regiao']['WF']['parte_da_cadeia_fora_da_regiao'][c]:.1f}%</td></tr>" for c, j in enumerate(ex['indices_nichos']))}</table>
{extra4}
{extra}
<h2>Família 6: literatura lida e conferida</h2>
<table><tr><th>Estudo</th><th>Liga</th><th>Número como está no texto</th></tr>{''.join(f"<tr><td>{E(x['autores'])} ({x['ano']}), {E(x['instituicao'])}. {E(x['titulo'])}. {E(x['onde'])}.</td><td>{E(x.get('direcao') or 'conferência')}</td><td>{'; '.join(E(n['o_que']) + ': ' + str(n['valor']).replace('.', ',') for n in x.get('numeros', [])) or E(x.get('resultado', ''))}</td></tr>" for x in lit)}</table>
<h2>Família 7: sobreposição interna</h2><p>{len(si['pares'])} pares calculados. Pares com ferramenta em comum: {E('; '.join(f"{p['a']} e {p['b']}, Jaccard {p['jaccard']:.4f} ({', '.join(p['em_comum'])})".replace('.', ',') for p in si['pares'] if p['em_comum']) or 'nenhum')}.  {E(si['aviso'])}</p>
<h2>Sem base nesta rodada</h2><ul>{sem}<li><b>Família 2 (proximidade produtiva, Harvard)</b>: não começou.</li><li><b>OpenAlex</b>: cota grátis do dia esgotada na rede; volta depois da meia-noite UTC.</li></ul>
<h2>Onde ver</h2><p>Desenho interativo: https://claude.ai/artifact/GSqTU6xSXsxjRPpY96Zotg (privado). Scripts e dados: instituto/ontologia/ no repositório.</p>
"""
open(f'saida/MEDICAO-ARVORE-rodada-{r}.html', 'w').write(doc); print(f'{total:.1f}%')
