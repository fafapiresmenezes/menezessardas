"""Família 7: sobreposição interna. Jaccard = |A∩B| / |A∪B| entre as listas de ferramentas de cada nicho (f5-ferramentas.json).
Ferramenta identificada pelo endereço completo, sem barra final e sem www; itens sem endereço ficam de fora e são contados."""
import hashlib, json, itertools
ARQ = 'bruto/f5-ferramentas.json'
d = json.load(open(ARQ))
def chave(u):
    u = (u or '').strip().lower().rstrip('/')
    for p in ('https://', 'http://'): u = u[len(p):] if u.startswith(p) else u
    return u[4:] if u.startswith('www.') else u
conj, sem_url = {}, {}
for n in d['nichos']:
    urls = [chave(f.get('url')) for f in n.get('ferramentas', [])]
    conj[n['nome']] = sorted({u for u in urls if u})
    sem_url[n['nome']] = sum(1 for u in urls if not u)
pares = []
for a, b in itertools.combinations(conj, 2):
    A, B = set(conj[a]), set(conj[b]); uni = A | B
    pares.append({'a': a, 'b': b, 'em_comum': sorted(A & B), 'uniao': len(uni),
                  'jaccard': round(len(A & B) / len(uni), 4) if uni else 'sem base'})
# conferência: recontagem independente por contagem de ocorrências
from collections import Counter
cont = Counter(u for s in conj.values() for u in s)
total_comum = sum(len(p['em_comum']) for p in pares)
recontagem = sum(c * (c - 1) // 2 for c in cont.values())
assert total_comum == recontagem, (total_comum, recontagem)
json.dump({'familia': 7, 'nome': 'Sobreposição interna (ferramentas em comum)', 'selo': 'calculado por nós', 'rotulo': 'interno',
  'fonte': 'f5-ferramentas.json (rodada 2, 21/11)', 'sha256_arquivo': hashlib.sha256(open(ARQ, 'rb').read()).hexdigest(),
  'formula': 'Jaccard = |A ∩ B| / |A ∪ B| sobre os endereços das ferramentas',
  'aviso': 'Listas de 2 a 8 ferramentas por nicho: índice fraco, mede só o que o Instituto já catalogou, não a economia.',
  'ferramentas_por_nicho': {k: len(v) for k, v in conj.items()}, 'itens_sem_endereco': sem_url,
  'conferencia': {'pares_em_comum_somados': total_comum, 'recontagem_independente': recontagem, 'aprovado': True},
  'pares': pares}, open('saida/sobreposicao_interna.json', 'w'), ensure_ascii=False, indent=1)
print({k: len(v) for k, v in conj.items()}); print([ (p['a'],p['b'],p['jaccard'],p['em_comum']) for p in pares if p['em_comum']])
