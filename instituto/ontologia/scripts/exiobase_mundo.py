"""Família 1, base mundial: EXIOBASE 3.9.6, ano 2019, indústria x indústria (49 regiões x 163 setores).
Conferências: (1) nossa A = Z / x contra a A publicada no próprio pacote; (2) resíduo de (I - A)·L - I na inversão completa;
(3) na tabela mundial agregada, L por inversão contra L por soma de rodadas. Saída: saida/exiobase_2019.json.
Uso: python3 scripts/exiobase_mundo.py <pasta com Z.txt, A.txt, x.txt>"""
import sys, json, hashlib, time, numpy as np, pandas as pd
P = sys.argv[1]; t0 = time.time()
ler = lambda f: pd.read_csv(f'{P}/{f}', sep='\t', header=None, skiprows=3, dtype=np.float64, usecols=range(2, 2 + 7987), engine='c').to_numpy()
xi = pd.read_csv(f'{P}/x.txt', sep='\t', index_col=[0, 1])
reg = list(dict.fromkeys(xi.index.get_level_values(0))); sec = list(dict.fromkeys(xi.index.get_level_values(1)))
R, S = len(reg), len(sec); n = R * S
x = xi.iloc[:, 0].to_numpy(); Z = ler('Z.txt'); print('Z lido', round(time.time() - t0), 's', flush=True)
A = np.divide(Z, x[None, :], out=np.zeros_like(Z), where=x[None, :] > 0)
Apub = ler('A.txt'); difA = float(np.abs(A - Apub).max()); del Apub; print('difA', difA, flush=True)
I = np.eye(n); L = np.linalg.solve(I - A, I); res = float(np.abs((I - A) @ L - I).max()); del I; print('L ok, resíduo', res, round(time.time() - t0), 's', flush=True)

# tabela mundial agregada por setor (soma sobre regiões fornecedoras e compradoras)
Zw = Z.reshape(R, S, R, S).sum(axis=(0, 2)); xw = x.reshape(R, S).sum(axis=0)
Aw = np.divide(Zw, xw[None, :], out=np.zeros_like(Zw), where=xw[None, :] > 0)
Iw = np.eye(S); Lw = np.linalg.inv(Iw - Aw); Ls, t, k = Iw.copy(), Iw.copy(), 0
while np.abs(t).max() > 1e-14 and k < 5000: t = t @ Aw; Ls += t; k += 1
difW = float(np.abs(Lw - Ls).max())

SETORES = {'Jurídica e consultoria': [134], 'Águas e Saneamento': [111, 151], 'Engenharia': [112, 133], 'Saúde': [137],
  'Contratos Públicos': [135], 'Petróleo': [20, 56], 'Cadeia distributiva B2B': [116, 117, 120, 125], 'Agro': [4, 8],
  'Ontologia/IA e Cibersegurança': [132], 'Telecom (base do Geo)': [126], 'Finanças': [127], 'Energia': [108], 'Educação': [136]}
idx = sorted({s for v in SETORES.values() for s in v})
def bloco_regiao(r):  # cadeia completa por R$ 1 de demanda final do setor j na região r, somando fornecedores de todas as regiões
    cols = [reg.index(r) * S + j for j in idx]
    tot = L[:, cols].reshape(R, S, len(idx)).sum(axis=0)                     # setor fornecedor (mundo todo) x comprador
    dom = L[reg.index(r) * S:(reg.index(r) + 1) * S, cols]                    # só fornecedores da própria região
    Ad = A[reg.index(r) * S:(reg.index(r) + 1) * S, cols]
    return {'L_total': tot[idx].round(6).tolist(), 'L_dentro_da_regiao': dom[idx].round(6).tolist(), 'A_dentro_da_regiao': Ad[idx].round(6).tolist(),
            # o total inclui o R$ 1,00 inicial da própria demanda (diagonal de I em L = I + A + A² + ...), que é sempre da região
            'parte_da_cadeia_fora_da_regiao': [round(float(1 - dom[:, c].sum() / tot[:, c].sum()), 4) for c in range(len(idx))],
            # mesma parte, contando só os insumos (tira o R$ 1,00 inicial dos dois lados): 1 - (D - 1) / (T - 1)
            'parte_dos_insumos_fora_da_regiao': [round(float(1 - (dom[:, c].sum() - 1) / (tot[:, c].sum() - 1)), 4) for c in range(len(idx))],
            'soma_coluna_L_total': [round(float(tot[:, c].sum()), 6) for c in range(len(idx))],
            'soma_coluna_L_dentro': [round(float(dom[:, c].sum()), 6) for c in range(len(idx))],
            'producao_milhoes_eur': [round(float(x[reg.index(r) * S + j]), 1) for j in idx]}
sha = {f: hashlib.sha256(open(f'{P}/{f}', 'rb').read()).hexdigest() for f in ('Z.txt', 'A.txt', 'x.txt')}
json.dump({'familia': 1, 'nome': 'Dependência econômica, base mundial', 'selo': 'calculado por nós',
  'fonte': 'EXIOBASE 3.9.6, 2019, indústria x indústria (Stadler et al., consórcio EXIOBASE; Zenodo 15689391)',
  'url': 'https://zenodo.org/records/15689391/files/IOT_2019_ixi.zip', 'sha256_zip_conferido_com_o_publicado': '01f566a58cc6390a632d37695be84515fbe97c8db03674226b64c06feb40252e',
  'sha256_arquivos': sha, 'baixado_em': '2026-11-21', 'unidade': 'milhões de euros, preços básicos',
  'formula': 'A = Z / x ; L = (I - A)^-1 (49 regiões x 163 setores = 7987 linhas). Mundo agregado: Zw = Σ regiões Z, xw = Σ regiões x, Aw = Zw / xw, Lw = (I - Aw)^-1',
  'aviso_angola': 'Angola não tem tabela própria: está dentro de WF (Resto da África). Números de WF descrevem a região, não Angola.',
  'conferencia': {'max_dif_A_nossa_vs_A_publicada': difA, 'max_residuo_(I-A)L-I_completo': res, 'max_dif_Lw_inversao_vs_serie': difW,
                  'termos_serie_mundo': k, 'aprovado': bool(difA < 1e-9 and res < 1e-8 and difW < 1e-10)},
  'regioes': reg, 'setores': sec, 'nichos': SETORES, 'indices_nichos': idx,
  'mundo': {'A': np.round(Aw, 6).tolist(), 'L': np.round(Lw, 6).tolist(), 'producao_milhoes_eur': xw.round(1).tolist(),
            'Z_nichos_milhoes_eur': Zw[np.ix_(idx, idx)].round(2).tolist()},
  'por_regiao': {r: bloco_regiao(r) for r in ('BR', 'WF', 'US', 'CN', 'ZA')}},
  open('saida/exiobase_2019.json', 'w'), ensure_ascii=False)
print(json.dumps({'difA': difA, 'res': res, 'difW': difW, 'k': k}), round(time.time() - t0), 's')
