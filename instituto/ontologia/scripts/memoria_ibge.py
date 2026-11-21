"""Memória de cálculo da Família 1 para os setores dos nichos do Instituto.
Para cada par (i -> j): A[i,j] = Σ_p D[i,p] · Un[p,j] / g[j], listando os produtos que mais pesam;
L[i,j] decomposto em rodadas: 1ª rodada = A, 2ª = A², resto = L - I - A - A².
Também os índices de ligação de Rasmussen-Hirschman de todas as 67 atividades."""
import json, numpy as np
z = np.load('saida/ibge_2015_intermediarios.npz', allow_pickle=True)
Vt, Un, q, g, D, A, L = (z[k] for k in ('Vt', 'Un', 'q', 'g', 'D', 'A', 'L'))
cod, nome, pcod, pnome = (list(z[k]) for k in ('cod', 'nome', 'prod_cod', 'prod_nome'))
N = len(cod); I = np.eye(N); A2 = A @ A
ix = {c: k for k, c in enumerate(cod)}

FICHAS = [  # nicho -> atividades do IBGE (nível 67) e o que a correspondência deixa de fora
 ('Jurídica', ['6980'], 'A atividade do IBGE junta advocacia, contabilidade, consultoria e sedes de empresas.'),
 ('Águas e Saneamento', ['3680'], 'Junta água, esgoto e gestão de resíduos.'),
 ('Engenharia', ['7180', '4180'], 'Serviços de engenharia e P&D (7180) e a obra em si (4180), mostrados separados.'),
 ('Saúde', ['8691', '8692', '2100'], 'Saúde pública, saúde privada e indústria farmacêutica, separados. Psicologia e psiquiatria estão dentro de saúde privada e não se separam.'),
 ('Contratos Públicos', ['8400'], 'Administração pública inteira; contratação pública não é atividade própria na matriz.'),
 ('Petróleo', ['0680', '1991'], 'Extração (0680) e refino (1991), separados.'),
 ('Cadeia distributiva B2B', ['4580', '4900', '5280'], 'Comércio, transporte terrestre e armazenagem, separados.'),
 ('Agro', ['0191', '0192'], 'Agricultura e pecuária, separados.'),
 ('Marketing e Publicidade', ['7380'], 'A atividade 7380 junta publicidade, pesquisa de mercado e outros serviços técnicos.'),
 ('Ontologia/IA e Cibersegurança', ['6280'], 'Desenvolvimento de sistemas e serviços de informação; IA e ciber não se separam na matriz.'),
 ('Segurança', ['8000'], 'Vigilância, segurança e investigação.'),
 ('Energia', ['3500'], 'Energia elétrica, gás natural e outras utilidades.'),
 ('Telecom (base do Geo)', ['6100'], 'Geolocalização não tem atividade própria; espalha-se por 6100, 6280 e 7180.'),
 ('Finanças (base de Fundos)', ['6480'], 'Intermediação financeira e seguros.'),
 ('Educação', ['8591', '8592'], 'Pública e privada, separados.'),
]
SEM_CORRESPONDENCIA = {
 'Imbono (Angola)': 'Matriz do Brasil não descreve Angola: entra pela base mundial (EXIOBASE, região Resto da África).',
 'Marca e Site': 'Produto interno do Instituto, não é setor da economia.',
 'Jogo': 'Produto interno do Instituto, não é setor da economia.',
 'Geolocalização': 'Sem atividade própria; ver Telecom, 6280 e 7180.',
 'Computação quântica, Física, Matemática': 'Áreas da ciência: entram pela Família 5 (citações).',
 'Ambiental e Carbono': 'Sem atividade própria; entram pela base mundial com contas ambientais (EXIOBASE).',
}
setores = sorted({c for _, cs, _ in FICHAS for c in cs}, key=lambda c: ix[c])

def memoria(i, j):
    contrib = D[i, :] * Un[:, j] / g[j]
    top = np.argsort(-contrib)[:3]
    return {
      'de': cod[i], 'para': cod[j],
      'A': round(float(A[i, j]), 6), 'L': round(float(L[i, j]), 6),
      'conta_A': f'A = Σ_p D[{cod[i]},p] × Un[p,{cod[j]}] / g[{cod[j]}], g[{cod[j]}] = R$ {g[j]:,.0f} milhões',
      'produtos_que_mais_pesam': [{'produto': f'{pcod[p]} {pnome[p]}', 'participacao_D': round(float(D[i, p]), 6),
                                   'uso_Un_milhoes': round(float(Un[p, j]), 1), 'parcela_de_A': round(float(contrib[p]), 6)} for p in top if contrib[p] > 0],
      'soma_das_parcelas': round(float(contrib.sum()), 6),
      'rodadas_L': {'efeito_inicial_I': float(I[i, j]), 'rodada_1_A': round(float(A[i, j]), 6),
                    'rodada_2_A2': round(float(A2[i, j]), 6), 'demais_rodadas': round(float(L[i, j] - I[i, j] - A[i, j] - A2[i, j]), 6)},
    }
pares = [memoria(ix[a], ix[b]) for a in setores for b in setores if a != b]
for p in pares:  # conferência interna da memória: parcelas somam A; rodadas somam L
    assert abs(p['soma_das_parcelas'] - p['A']) < 2e-6, p
    r = p['rodadas_L']; assert abs(r['efeito_inicial_I'] + r['rodada_1_A'] + r['rodada_2_A2'] + r['demais_rodadas'] - p['L']) < 5e-6, p

Lbar = L.mean()
BL = L.mean(axis=0) / Lbar   # para trás: quanto a atividade j puxa as outras
FL = L.mean(axis=1) / Lbar   # para frente: quanto a atividade i é puxada
ligacoes = [{'cod': cod[k], 'atividade': nome[k], 'para_tras': round(float(BL[k]), 4), 'para_frente': round(float(FL[k]), 4),
             'setor_chave': bool(BL[k] > 1 and FL[k] > 1)} for k in range(N)]
json.dump({'familia': 1, 'selo': 'calculado por nós', 'fonte': 'IBGE MIP 2015 nível 67',
  'formula_ligacoes': 'Para trás U_j = (Σ_i L_ij / n) / (Σ_ij L_ij / n²); para frente U_i = (Σ_j L_ij / n) / (Σ_ij L_ij / n²) (Rasmussen 1956, Hirschman 1958). Acima de 1 = acima da média.',
  'fichas': [{'nicho': n, 'atividades': [{'cod': c, 'nome': nome[ix[c]]} for c in cs], 'limite': lim} for n, cs, lim in FICHAS],
  'sem_correspondencia': SEM_CORRESPONDENCIA, 'pares': pares, 'ligacoes': ligacoes}, open('saida/memoria_ibge_2015.json', 'w'), ensure_ascii=False, indent=1)
print(len(setores), 'atividades,', len(pares), 'pares; setores-chave:', sum(l['setor_chave'] for l in ligacoes))
top = sorted(pares, key=lambda p: -p['A'])[:12]
for p in top: print(p['de'], '->', p['para'], 'A', p['A'], 'L', p['L'], p['produtos_que_mais_pesam'][0]['produto'][:50])
for c in setores: l = ligacoes[ix[c]]; print(c, l['atividade'][:40], l['para_tras'], l['para_frente'])
