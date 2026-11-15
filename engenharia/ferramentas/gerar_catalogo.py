# -*- coding: utf-8 -*-
# Gera o catálogo de matérias de engenharia (E1) e os consultores por matéria (E3) a partir de dados_catalogo.py.
# Uso: python3 engenharia/ferramentas/gerar_catalogo.py   (grava em engenharia/ e em src/lib/engenharia/)
import hashlib, json, os, re, sys, unicodedata
sys.path.insert(0, os.path.dirname(__file__))
from dados_catalogo import ESCOLAS, RAMOS  # noqa: E402

RAIZ = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
DATA = '12/11/2026'

def slug(s):
    s = unicodedata.normalize('NFKD', s).encode('ascii', 'ignore').decode()
    return re.sub(r'[^a-z0-9]+', '-', s.lower()).strip('-')

def sha(obj):
    return hashlib.sha256(json.dumps(obj, ensure_ascii=False, sort_keys=True).encode()).hexdigest()

materias, vistos = [], set()
for cod, r in RAMOS.items():
    for linha in r['materias'].strip().splitlines():
        partes = [p.strip() for p in linha.split('::')]
        if len(partes) != 3:
            raise SystemExit(f'linha mal formada em {cod}: {linha}')
        nome, topicos, normas = partes
        mid = f'{cod}-{slug(nome)}'
        if mid in vistos:
            raise SystemExit(f'matéria repetida: {mid}')
        vistos.add(mid)
        normas_l = [n.strip() for n in normas.split(';') if n.strip()] or list(r['normas'])
        materias.append({
            'id': mid,
            'nome': nome,
            'ramo': cod,
            'ramo_nome': r['nome'],
            'ementa': [t.strip() for t in topicos.split(';') if t.strip()],
            'normas': normas_l,
            'bibliografia': r['biblio'],
            'escolas': r['escolas'],
            'nomes_originais': {},
            'fonte': {
                'tipo': 'grade de referência montada a partir das matérias equivalentes das escolas listadas',
                'data': DATA,
                'conferido_na_grade_vigente': False,
                'catalogos': {e: ESCOLAS[e][1] for e in r['escolas']},
            },
        })

catalogo = {
    'passo': 'E1 · Catálogo de todas as matérias de engenharia',
    'emitido': DATA,
    'escolas': {k: {'nome': v[0], 'catalogo': v[1]} for k, v in ESCOLAS.items()},
    'ramos': {k: {'nome': v['nome'], 'normas_base': v['normas'], 'bibliografia': v['biblio'], 'escolas': v['escolas']} for k, v in RAMOS.items()},
    'total': len(materias),
    'aviso': ('Grade curricular muda todo ano e cada escola dá um nome diferente: o catálogo junta matérias equivalentes. '
              'Conferência matéria a matéria com a grade vigente de cada escola está marcada como pendente. '
              'Normas citadas só pelo número e título, nunca copiadas.'),
    'materias': materias,
}
catalogo['sha256'] = sha(catalogo['materias'])

AVISO = ('Sou apoio ao engenheiro. Toda conta e toda recomendação minha precisa ser conferida e assinada por profissional '
         'habilitado no Crea, com ART.')

def instrucao(m):
    normas = '; '.join(m['normas'])
    return (
        f'Você é o consultor do THEYE Institute para a matéria "{m["nome"]}" ({m["ramo_nome"]}).\n'
        f'Domínio: {"; ".join(m["ementa"])}.\n'
        f'Normas e leis de referência: {normas}. Cite sempre pelo número e pelo item quando souber o item; '
        'se não tiver certeza do item, diga só o número e avise que o item deve ser conferido. Nunca transcreva o texto da norma.\n'
        f'Bibliografia de referência: {"; ".join(m["bibliografia"][:3])}.\n'
        'Regras:\n'
        '1. Toda resposta numérica mostra a fórmula, os valores substituídos com unidades, o resultado com unidade e o passo a passo.\n'
        '2. Declare as hipóteses (materiais, classes, coeficientes) antes da conta; se faltar dado, peça ou adote valor usual e diga que adotou.\n'
        '3. Separe o que é exigência de norma, o que é boa prática e o que é opinião.\n'
        '4. Quando a pergunta sair da sua matéria, diga qual consultor do catálogo deve responder.\n'
        '5. Português simples, frases curtas; termos técnicos explicados na primeira vez.\n'
        f'6. Termine sempre com o aviso: "{AVISO}"'
    )

consultores = {
    'passo': 'E3 · Um consultor para cada matéria de engenharia',
    'emitido': DATA,
    'total': len(materias),
    'aviso_fixo': AVISO,
    'avaliacao': {'meta': 'acertar ao menos 16 de 20 perguntas com gabarito por ramo antes de liberar', 'estado': 'pendente'},
    'consultores': [{
        'id': 'eng-' + m['id'],
        'nome': f'Consultor de {m["nome"][0].lower() + m["nome"][1:]}',
        'materia': m['id'],
        'ramo': m['ramo'],
        'instrucao': instrucao(m),
    } for m in materias],
}
consultores['sha256'] = sha(consultores['consultores'])

for destino in ('engenharia', 'src/lib/engenharia'):
    os.makedirs(os.path.join(RAIZ, destino), exist_ok=True)
with open(os.path.join(RAIZ, 'engenharia', 'catalogo-materias.json'), 'w', encoding='utf-8') as f:
    json.dump(catalogo, f, ensure_ascii=False, indent=1)
with open(os.path.join(RAIZ, 'engenharia', 'consultores.json'), 'w', encoding='utf-8') as f:
    json.dump(consultores, f, ensure_ascii=False, indent=1)
# versão enxuta para a tela (sem os endereços repetidos de catálogo por matéria)
tela = [{k: m[k] for k in ('id', 'nome', 'ramo', 'ementa', 'normas', 'escolas')} for m in materias]
with open(os.path.join(RAIZ, 'src', 'lib', 'engenharia', 'catalogo.json'), 'w', encoding='utf-8') as f:
    json.dump({'ramos': {k: v['nome'] for k, v in RAMOS.items()}, 'sha256': catalogo['sha256'], 'materias': tela}, f, ensure_ascii=False)

por_ramo = {}
for m in materias:
    por_ramo[m['ramo']] = por_ramo.get(m['ramo'], 0) + 1
print('matérias:', len(materias), '| ramos:', len(RAMOS))
for k, v in por_ramo.items():
    print(f'  {k:12s} {v}')
print('sha256 catálogo:', catalogo['sha256'])
print('sha256 consultores:', consultores['sha256'])
