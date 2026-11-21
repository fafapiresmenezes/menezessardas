"""Junta as saídas conferidas num único arquivo de dados para o desenho interativo (saida/arvore-dados.json)."""
import json, numpy as np
z = np.load('saida/ibge_2015_intermediarios.npz', allow_pickle=True)
le = json.load(open('saida/leontief_ibge_2015.json')); me = json.load(open('saida/memoria_ibge_2015.json')); si = json.load(open('saida/sobreposicao_interna.json'))
r = lambda m, d=6: [[float(f'{v:.{d}g}') if v else 0 for v in row] for row in np.asarray(m).tolist()]
nicho_de = {}
for f in me['fichas']:
    for a in f['atividades']: nicho_de.setdefault(a['cod'], []).append(f['nicho'])
dados = {
  'rodada': 1, 'data': '2026-11-21',
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
s = json.dumps(dados, ensure_ascii=False, separators=(',', ':'))
open('saida/arvore-dados.json', 'w').write(s); print(len(s) // 1024, 'KB')
