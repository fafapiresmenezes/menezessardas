"""Família 1: dependência econômica. Recalcula A = D·Bn e L = (I-A)^-1 a partir dos fluxos brutos do IBGE 2015 (nível 67)
e confere contra as Tabelas 14 e 15 publicadas pelo próprio IBGE. Saída: saida/leontief_ibge_2015.json"""
import hashlib, json, sys
import numpy as np, pandas as pd

ARQ = 'bruto/Matriz_de_Insumo_Produto_2015_Nivel_67.xls'
N = 67
x = pd.ExcelFile(ARQ)

t01 = pd.read_excel(x, '01', header=None)
linhas_prod = [r for r in range(5, len(t01)) if isinstance(t01.iloc[r, 0], str) and t01.iloc[r, 0].strip().isdigit()]
NP = len(linhas_prod)
cab01 = [str(c) for c in t01.iloc[3, :].tolist()]
c_prod01 = next(i for i, c in enumerate(cab01) if c.startswith('0191'))
Vt = t01.iloc[linhas_prod, c_prod01:c_prod01+N].astype(float).to_numpy()          # produto x atividade (produção)

t03 = pd.read_excel(x, '03', header=None)
lin03 = [r for r in range(5, len(t03)) if isinstance(t03.iloc[r, 0], str) and t03.iloc[r, 0].strip().isdigit()]
assert [t03.iloc[r, 0] for r in lin03] == [t01.iloc[r, 0] for r in linhas_prod], 'produtos fora de ordem'
cab03 = [str(c) for c in t03.iloc[3, :].tolist()]
c_ci03 = next(i for i, c in enumerate(cab03) if c.startswith('0191'))
Un = t03.iloc[lin03, c_ci03:c_ci03+N].astype(float).to_numpy()                    # produto x atividade (uso nacional)

q = Vt.sum(axis=1)            # produção por produto
g = Vt.sum(axis=0)            # produção por atividade
D = np.divide(Vt, q[:, None], out=np.zeros_like(Vt), where=q[:, None] != 0).T     # atividade x produto
Bn = Un / g[None, :]
A = D @ Bn
I = np.eye(N)
L1 = np.linalg.inv(I - A)                                                         # caminho 1: inversão direta
L2, termo, k = I.copy(), I.copy(), 0                                              # caminho 2: série de potências
while np.abs(termo).max() > 1e-14 and k < 5000:
    termo = termo @ A; L2 += termo; k += 1

t14 = pd.read_excel(x, '14', header=None); t15 = pd.read_excel(x, '15', header=None)
cod = [str(t14.iloc[r, 0]).strip() for r in range(5, 5+N)]
nome = [str(t14.iloc[r, 1]).strip() for r in range(5, 5+N)]
A_ibge = t14.iloc[5:5+N, 2:2+N].astype(float).to_numpy()
L_ibge = t15.iloc[5:5+N, 2:2+N].astype(float).to_numpy()

conf = {
  'max_dif_A_nossa_vs_tabela14': float(np.abs(A - A_ibge).max()),
  'max_dif_L_nossa_vs_tabela15': float(np.abs(L1 - L_ibge).max()),
  'max_dif_L_inversao_vs_serie': float(np.abs(L1 - L2).max()),
  'termos_da_serie': k,
  'max_residuo_(I-A)L-I': float(np.abs((I - A) @ L1 - I).max()),
}
# a tabela do IBGE vem arredondada a 6 casas: tolerância de 1e-5 cobre o arredondamento
ok = conf['max_dif_A_nossa_vs_tabela14'] < 1e-5 and conf['max_dif_L_nossa_vs_tabela15'] < 1e-5 and conf['max_dif_L_inversao_vs_serie'] < 1e-10
conf['aprovado'] = bool(ok)
sha = hashlib.sha256(open(ARQ, 'rb').read()).hexdigest()
json.dump({
  'familia': 1, 'nome': 'Dependência econômica (Leontief)', 'selo': 'calculado por nós',
  'fonte': 'IBGE, Matriz de Insumo-Produto 2015, nível 67 (Tabelas 01 e 03)',
  'url': 'https://ftp.ibge.gov.br/Contas_Nacionais/Matriz_de_Insumo_Produto/2015/Matriz_de_Insumo_Produto_2015_Nivel_67.xls',
  'sha256_arquivo': sha, 'baixado_em': '2026-11-21',
  'formula': 'Bn = Un / g ; D = V / q ; A = D·Bn ; L = (I - A)^-1',
  'leitura_A': 'A[i][j] = reais comprados da atividade i para produzir 1 real na atividade j (só insumo nacional)',
  'leitura_L': 'L[i][j] = reais produzidos na atividade i, somando toda a cadeia, para entregar 1 real de demanda final da atividade j',
  'casos': f'{NP} produtos x {N} atividades; valor da produção total R$ {g.sum():,.0f} milhões',
  'conferencia': conf,
  'codigos': cod, 'atividades': nome,
  'A': np.round(A, 6).tolist(), 'L': np.round(L1, 6).tolist(),
}, open('saida/leontief_ibge_2015.json', 'w'), ensure_ascii=False)
prod_cod = [str(t03.iloc[r, 0]).strip() for r in lin03]; prod_nome = [str(t03.iloc[r, 1]).strip() for r in lin03]
np.savez('saida/ibge_2015_intermediarios.npz', Vt=Vt, Un=Un, q=q, g=g, D=D, Bn=Bn, A=A, L=L1, cod=cod, nome=nome, prod_cod=prod_cod, prod_nome=prod_nome)
print(json.dumps(conf, indent=1)); print('produtos', NP, 'sha', sha[:16])
sys.exit(0 if ok else 1)
