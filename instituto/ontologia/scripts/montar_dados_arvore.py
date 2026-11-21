"""Junta as saídas conferidas num único arquivo de dados para o desenho interativo (saida/arvore-dados.json)."""
import json, numpy as np
z = np.load('saida/ibge_2015_intermediarios.npz', allow_pickle=True)
le = json.load(open('saida/leontief_ibge_2015.json')); me = json.load(open('saida/memoria_ibge_2015.json')); si = json.load(open('saida/sobreposicao_interna.json'))
r = lambda m, d=6: [[float(f'{v:.{d}g}') if v else 0 for v in row] for row in np.asarray(m).tolist()]
nicho_de = {}
for f in me['fichas']:
    for a in f['atividades']: nicho_de.setdefault(a['cod'], []).append(f['nicho'])
dados = {
  'rodada': 4, 'data': '2026-11-21',
  'familias': [
    {'n': 1, 'nome': 'Dependência econômica', 'estado': 'feito', 'selo': 'calculado por nós', 'fonte': le['fonte'], 'pares': 67 * 66},
    {'n': 2, 'nome': 'Proximidade produtiva', 'estado': 'próxima rodada', 'fonte': 'Atlas de Complexidade Econômica (Harvard Growth Lab)'},
    {'n': 3, 'nome': 'Movimento de mercado', 'estado': 'próxima rodada', 'fonte': 'B3, FRED, Banco Mundial'},
    {'n': 4, 'nome': 'Mercados de previsão', 'estado': 'próxima rodada', 'fonte': 'Polymarket, Kalshi, Manifold'},
    {'n': 5, 'nome': 'Ligação entre ciências', 'estado': 'próxima rodada', 'fonte': 'OpenAlex'},
    {'n': 6, 'nome': 'Literatura', 'estado': 'em andamento', 'fonte': 'teses, artigos e white papers'},
    {'n': 7, 'nome': 'Sobreposição interna', 'estado': 'feito', 'selo': 'calculado por nós', 'fonte': si['fonte'], 'pares': len(si['pares'])},
  ],
  'ibge': {
    'fonte': le['fonte'], 'url': le['url'], 'sha256': le['sha256_arquivo'], 'baixado_em': le['baixado_em'], 'formula': le['formula'],
    'leitura_A': le['leitura_A'], 'leitura_L': le['leitura_L'], 'casos': le['casos'], 'conferencia': le['conferencia'],
    'formula_ligacoes': me['formula_ligacoes'],
    'cod': le['codigos'], 'nome': le['atividades'], 'A': r(z['A']), 'L': r(z['L']),
    'D': r(z['D']), 'Un': r(z['Un'], 7), 'g': [round(float(v), 1) for v in z['g']],
    'prod': [f'{c} {n}' for c, n in zip(z['prod_cod'], z['prod_nome'])],
    'ligacoes': me['ligacoes'], 'nicho_de': nicho_de,
  },
  'fichas': me['fichas'], 'sem_correspondencia': me['sem_correspondencia'],
  'interno': {k: si[k] for k in ('fonte', 'formula', 'aviso', 'ferramentas_por_nicho', 'itens_sem_endereco', 'pares', 'conferencia', 'sha256_arquivo')},
}
ex = json.load(open('saida/exiobase_2019.json')); lit = json.load(open('literatura/registro.json'))
PT = {4: 'Soja e oleaginosas', 8: 'Pecuária bovina', 20: 'Extração de petróleo', 56: 'Refino de petróleo', 108: 'Distribuição de eletricidade',
      111: 'Água (captação e distribuição)', 112: 'Construção', 116: 'Atacado', 117: 'Varejo', 120: 'Transporte terrestre', 125: 'Apoio ao transporte',
      126: 'Correio e telecom', 127: 'Intermediação financeira', 132: 'Informática', 133: 'Pesquisa e desenvolvimento', 134: 'Serviços às empresas (jurídico, consultoria)',
      135: 'Administração pública', 136: 'Educação', 137: 'Saúde e assistência social', 151: 'Tratamento de esgoto'}
idx = ex['indices_nichos']; sub = lambda m: [[m[i][j] for j in idx] for i in idx]
nicho_ex = {j: n for n, js in ex['nichos'].items() for j in js}
dados['mundo'] = {k: ex[k] for k in ('fonte', 'url', 'sha256_zip_conferido_com_o_publicado', 'baixado_em', 'unidade', 'formula', 'aviso_angola', 'conferencia')}
dados['mundo'].update({'setores': [{'i': j, 'en': ex['setores'][j], 'pt': PT[j], 'nicho': nicho_ex[j]} for j in idx],
  'A': sub(ex['mundo']['A']), 'L': sub(ex['mundo']['L']), 'Z': ex['mundo']['Z_nichos_milhoes_eur'], 'x': [ex['mundo']['producao_milhoes_eur'][j] for j in idx],
  'regioes': {'BR': 'Brasil', 'WF': 'Resto da África (inclui Angola)', 'ZA': 'África do Sul', 'CN': 'China', 'US': 'Estados Unidos'}, 'por_regiao': ex['por_regiao']})
dados['literatura'] = lit
dados['familias'][0]['fonte'] += ' + ' + ex['fonte'].split(' (')[0]
dados['familias'][5]['estado'] = 'em andamento'; dados['familias'][5]['fonte'] = f"{sum(1 for r in lit['registro'] if r['selo'] == 'da literatura')} estudos lidos e conferidos"
co = json.load(open('saida/comovimento_pib.json')); ci = json.load(open('saida/ciencias_arxiv.json')); mp = json.load(open('saida/mercados_previsao.json'))
def normaliza(c, ref, pux, per):
    out = {k: c[k] for k in ('nome', 'aviso', 'fonte', 'metodo', 'setores', 'conferencia')}
    out['periodos'] = c[per]; out['ref'] = ref
    out['taxas'] = {k: [round(v, 5) for v in vs] for k, vs in c['taxas'].items()}
    ren = {'parcial_sem_pib': 'parcial', 'parcial_sem_mercado': 'parcial', 'r_a_pib': 'r_a_ref', 'r_b_pib': 'r_b_ref', 'r_a_mercado': 'r_a_ref', 'r_b_mercado': 'r_b_ref',
           'puxado_por_poucos_trimestres': 'puxado', 'puxado_por_poucos_meses': 'puxado'}
    out['pares'] = [{ren.get(k, k): ([r4(x) for x in v] if isinstance(v, list) else r4(v)) for k, v in p_.items()} for p_ in c['pares']]
    return out
r4 = lambda v: None if v is None else (round(v, 6) if isinstance(v, float) else v)
cb = json.load(open('saida/comovimento_bolsa.json'))
dados['comovimento'] = {'ibge': normaliza(co, 'PIB inteiro', 'puxado_por_poucos_trimestres', 'trimestres_das_taxas'),
                        'bolsa': normaliza(cb, 'mercado inteiro (bolsa)', 'puxado_por_poucos_meses', 'periodos')}
if __import__('os').path.exists('saida/atlas_proximidade.json'):
    dados['proximidade'] = json.load(open('saida/atlas_proximidade.json'))
    dados['proximidade'].pop('registros_sha256', None)
    _px = dados['proximidade']
    dados['familias'][1].update({'estado': 'feito', 'selo': _px['selo'], 'fonte': f"Harvard Atlas, {_px['fonte']['produtos']} produtos, {_px['fonte']['paises']} países, {_px['fonte']['anos'][0]}–{_px['fonte']['anos'][1]} · conferência parcial", 'pares': len(_px['pares'])})
dados['ciencias'] = {k: ci[k] for k in ('nome', 'aviso', 'fonte', 'metodo', 'areas', 'pares', 'conferencia')}
dados['mercados'] = {k: mp[k] for k in ('nome', 'aviso', 'coletado_utc', 'filtros', 'mercados')}
dados['mercados']['setor'] = json.load(open('literatura/setor_mercados_previsao.json'))
dados['mercados']['marcados_como_esporte'] = mp.get('marcados_como_esporte', 0)
dados['variaveis'] = json.load(open('saida/catalogo_variaveis.json'))
F = {f['n']: f for f in dados['familias']}
F[3].update({'nome': 'Movimento conjunto', 'estado': 'feito', 'selo': 'calculado por nós', 'fonte': 'IBGE, PIB trimestral 1996–2026 (12 setores) + bolsa dos EUA, 1996–2026 (23 setores)', 'pares': len(co['pares']) + len(cb['pares'])})
F[4].update({'estado': 'feito', 'selo': 'dado de terceiros', 'fonte': f"Polymarket e Kalshi, {len(mp['mercados'])} mercados (não é predição nossa)"})
F[5].update({'estado': 'feito', 'selo': 'calculado por nós', 'fonte': f"arXiv, {len(ci['areas'])} áreas da ciência", 'pares': len(ci['pares'])})
s = json.dumps(dados, ensure_ascii=False, separators=(',', ':'))
open('saida/arvore-dados.json', 'w').write(s); print(len(s) // 1024, 'KB')
