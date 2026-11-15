# -*- coding: utf-8 -*-
# Gera a vertical de saúde do THEYE (fase S): catálogo, acervo, consultores com prompt pronto e a corrente
# SHA-256 que lastreia cada prompt.
# Uso: python3 saude/ferramentas/gerar_saude.py   (grava em saude/ e em src/lib/saude/)
import hashlib, json, os, re, sys, unicodedata
sys.path.insert(0, os.path.dirname(__file__))
from dados_especialidades import ESPECIALIDADES  # noqa: E402
from dados_acervo import QS_MEDICINA_2025, ESCOLAS_BRASIL, GRADUACAO, SKILLS_DADOS, PROGRAMAS_DOUTORADO  # noqa: E402

RAIZ = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
DATA = '13/11/2026'
# Gênese da corrente dos prompts: o último elo do trilho do plano mestre v4 quando a saúde começou
# (passo A28-arquivos-por-escritorio). Assim a corrente da saúde fica pendurada na corrente do projeto.
GENESE = '023a912b0784ebe6f1b6a252a2a023a901e6308fd9a8db2408311dbf46adae6b'


def slug(s):
    s = unicodedata.normalize('NFKD', s).encode('ascii', 'ignore').decode()
    return re.sub(r'[^a-z0-9]+', '-', s.lower()).strip('-')


def sha(obj):
    return hashlib.sha256(json.dumps(obj, ensure_ascii=False, sort_keys=True).encode()).hexdigest()


def sha_txt(t):
    return hashlib.sha256(t.encode()).hexdigest()


def linhas(bloco):
    return [l.strip() for l in bloco.strip().splitlines() if l.strip()]


# ------------------------------------------------------------------ escolas
escolas_mundo = []
for l in linhas(QS_MEDICINA_2025):
    pos, nome, pais = l.split('|')
    escolas_mundo.append({'posicao_qs_2025': pos, 'nome': nome, 'pais': pais})
escolas_brasil = []
for l in linhas(ESCOLAS_BRASIL):
    nome, uf = l.split('|')
    escolas_brasil.append({'nome': nome, 'uf': uf, 'conferido': False})
assert len(escolas_mundo) == 100, len(escolas_mundo)
assert len(escolas_brasil) == 50, len(escolas_brasil)
assert len({e['nome'] for e in escolas_brasil}) == 50, 'escola repetida'

# ------------------------------------------------------------------ especialidades, módulos e artigos
especialidades, modulos, artigos = [], [], []
for cod, e in ESPECIALIDADES.items():
    mods = []
    for l in linhas(e['modulos']):
        nome, topicos = [p.strip() for p in l.split('::')]
        mid = f'{cod}-{slug(nome)}'
        m = {'id': mid, 'nome': nome, 'especialidade': cod, 'topicos': [t.strip() for t in topicos.split(';') if t.strip()]}
        mods.append(m)
        modulos.append(m)
    arts = []
    for l in linhas(e['artigos']):
        ano, revista, titulo, autor = [p.strip() for p in l.split('|')]
        a = {'id': f'{cod}-{len(arts) + 1:02d}', 'especialidade': cod, 'ano': int(ano), 'periodico': revista,
             'estudo': titulo, 'primeiro_autor': autor, 'doi': None, 'conferido': False}
        arts.append(a)
        artigos.append(a)
    especialidades.append({
        'id': cod, 'nome': e['nome'], 'acesso': e['acesso'], 'anos_residencia': e['anos'], 'sociedade': e['sociedade'],
        'diretrizes': e['diretrizes'], 'bibliografia': e['biblio'], 'modulos': [m['id'] for m in mods],
        'artigos': [a['id'] for a in arts],
    })
assert len(especialidades) == 55, len(especialidades)
assert len({m['id'] for m in modulos}) == len(modulos), 'módulo repetido'

graduacao = []
for l in linhas(GRADUACAO):
    nome, topicos = [p.strip() for p in l.split('::')]
    graduacao.append({'id': 'grad-' + slug(nome), 'nome': nome, 'topicos': [t.strip() for t in topicos.split(';')]})

skills = []
for l in linhas(SKILLS_DADOS):
    nome, faz, fontes = [p.strip() for p in l.split('::')]
    skills.append({'id': 'dados-' + slug(nome), 'nome': nome, 'faz': faz, 'fontes': [f.strip() for f in fontes.split(';')]})

programas = []
for l in linhas(PROGRAMAS_DOUTORADO):
    univ, prog, area = l.split('|')
    programas.append({'universidade': univ, 'programa': prog, 'area_capes': area, 'nota_capes': 'a conferir na Plataforma Sucupira',
                      'busca_teses': f'Catálogo de Teses da CAPES: instituição "{univ}", programa "{prog}", nível doutorado, ordenar por ano'})

META_ARTIGOS = 500

# Busca pronta para completar o acervo quando a rede liberar PubMed/OpenAlex: os mais citados de cada
# especialidade entre ensaio clínico, metanálise e diretriz. Termo MeSH em inglês.
MESH = {
 'acupuntura': 'Acupuncture Therapy', 'alergia': 'Allergy and Immunology', 'anestesio': 'Anesthesiology', 'angio': 'Vascular Diseases',
 'cardio': 'Cardiology', 'cir-cardio': 'Cardiac Surgical Procedures', 'cir-mao': 'Hand', 'cir-cabeca': 'Head and Neck Neoplasms',
 'cir-digestivo': 'Digestive System Surgical Procedures', 'cir-geral': 'General Surgery', 'cir-onco': 'Surgical Oncology',
 'cir-ped': 'Pediatrics', 'cir-plastica': 'Surgery, Plastic', 'cir-toracica': 'Thoracic Surgical Procedures', 'cir-vascular': 'Vascular Surgical Procedures',
 'clinica': 'Internal Medicine', 'colo': 'Colorectal Surgery', 'dermato': 'Dermatology', 'endocrino': 'Endocrinology',
 'endoscopia': 'Endoscopy, Gastrointestinal', 'gastro': 'Gastroenterology', 'genetica': 'Genetics, Medical', 'geriatria': 'Geriatrics',
 'go': 'Obstetrics', 'hemato': 'Hematology', 'homeopatia': 'Homeopathy', 'infecto': 'Communicable Diseases', 'mastologia': 'Breast Neoplasms',
 'emergencia': 'Emergency Medicine', 'mfc': 'Family Practice', 'trabalho': 'Occupational Medicine', 'trafego': 'Accidents, Traffic',
 'esporte': 'Sports Medicine', 'fisiatria': 'Physical and Rehabilitation Medicine', 'intensiva': 'Critical Care', 'legal': 'Forensic Medicine',
 'nuclear': 'Nuclear Medicine', 'preventiva': 'Preventive Medicine', 'nefro': 'Nephrology', 'neurocirurgia': 'Neurosurgery',
 'neuro': 'Neurology', 'nutrologia': 'Nutrition Therapy', 'oftalmo': 'Ophthalmology', 'onco': 'Medical Oncology',
 'orto': 'Orthopedics', 'otorrino': 'Otolaryngology', 'patologia': 'Pathology, Surgical', 'lab': 'Clinical Laboratory Techniques',
 'pediatria': 'Pediatrics', 'pneumo': 'Pulmonary Medicine', 'psiquiatria': 'Psychiatry', 'radiologia': 'Radiology', 'radioterapia': 'Radiation Oncology',
 'reumato': 'Rheumatology', 'uro': 'Urology',
}
assert set(MESH) == set(ESPECIALIDADES), set(ESPECIALIDADES) ^ set(MESH)
VAGAS = META_ARTIGOS // 55 + 1
buscas_acervo = [{
    'especialidade': cod,
    'vagas_restantes': max(0, VAGAS - sum(1 for a in artigos if a['especialidade'] == cod)),
    'pubmed': f'"{MESH[cod]}"[MeSH] AND (randomized controlled trial[pt] OR meta-analysis[pt] OR practice guideline[pt])',
    'ordem': 'mais citados (OpenAlex cited_by_count), depois o mais recente',
} for cod in ESPECIALIDADES]
META_TESES_POR_ESPECIALIDADE = 3

# ------------------------------------------------------------------ prompts
AVISO = ('Sou apoio ao médico e ao gestor de saúde. Não substituo consulta, exame nem decisão do médico assistente; '
         'conduta clínica é do profissional com CRM ativo. Em emergência, ligue 192 (SAMU).')

REGRAS_CLINICAS = (
    'Regras:\n'
    '1. Responda para o profissional de saúde. Se perceber que fala com paciente leigo, explique em linguagem simples, '
    'não indique dose nem troca de remédio e oriente procurar o médico.\n'
    '2. Toda recomendação vem com a fonte (diretriz, sociedade, ano) e com a força da evidência (GRADE: alta, moderada, baixa, muito baixa). '
    'Separe o que é diretriz, o que é estudo isolado e o que é opinião.\n'
    '3. Cite estudo pelo nome, periódico e ano. Se não tiver certeza do dado, diga que não tem certeza e indique onde conferir; '
    'nunca invente número, dose ou referência.\n'
    '4. Mostre o raciocínio: hipóteses, diagnósticos diferenciais, sinais de alarme e o que mudaria a conduta.\n'
    '5. Dado de paciente é dado sensível (LGPD, art. 11): use só o necessário e nunca peça nome, CPF ou documento.\n'
    '6. Quando a pergunta sair da sua área, diga qual consultor do catálogo deve responder.\n'
    '7. Português simples, frases curtas; termo técnico explicado na primeira vez.\n'
    f'8. Termine sempre com o aviso: "{AVISO}"'
)


def prompt_especialidade(e):
    nomes_mod = [m['nome'] for m in modulos if m['especialidade'] == e['id']]
    estudos = [f'{a["estudo"]} ({a["periodico"]}, {a["ano"]})' for a in artigos if a['especialidade'] == e['id']]
    return (
        f'Você é o consultor-chefe de {e["nome"]} do THEYE Institute.\n'
        f'Formação de referência: residência de {e["anos_residencia"]} anos ({e["acesso"]}), matriz de competências da CNRM; '
        f'sociedade: {e["sociedade"]}.\n'
        f'Módulos que você domina: {"; ".join(nomes_mod)}.\n'
        f'Diretrizes de referência: {"; ".join(e["diretrizes"])}.\n'
        f'Bibliografia: {"; ".join(e["bibliografia"])}.\n'
        + (f'Estudos marcantes que você conhece e cita quando couber: {"; ".join(estudos)}.\n' if estudos else '')
        + REGRAS_CLINICAS
    )


def prompt_modulo(m, e):
    return (
        f'Você é o consultor do THEYE Institute para o módulo "{m["nome"]}" da especialidade {e["nome"]}.\n'
        f'Domínio: {"; ".join(m["topicos"])}.\n'
        f'Diretrizes de referência: {"; ".join(e["diretrizes"])}.\n'
        f'Bibliografia: {"; ".join(e["bibliografia"][:2])}.\n'
        f'Para perguntas da especialidade fora do módulo, chame o consultor-chefe de {e["nome"]}.\n'
        + REGRAS_CLINICAS
    )


def prompt_graduacao(g):
    return (
        f'Você é o professor-consultor do THEYE Institute para "{g["nome"]}" na graduação em medicina '
        '(Diretrizes Curriculares Nacionais, Resolução CNE/CES 3/2014).\n'
        f'Conteúdo: {"; ".join(g["topicos"])}.\n'
        'Ensine pelo método socrático quando o aluno pedir estudo; dê casos curtos, perguntas de prova com gabarito comentado '
        'e a referência do livro-texto.\n' + REGRAS_CLINICAS
    )


def prompt_skill(s):
    return (
        f'Você é o analista de dados e de inteligência de mercado em saúde do THEYE Institute para "{s["nome"]}".\n'
        f'O que você faz: {s["faz"]}.\n'
        f'Fontes oficiais que você usa: {"; ".join(s["fontes"])}.\n'
        'Regras:\n'
        '1. Todo número sai com fonte, recorte (lugar e período) e data da extração; sem isso, não é número, é estimativa, e você diz.\n'
        '2. Mostre a conta ou a consulta (filtro, tabela, variável) para alguém refazer.\n'
        '3. Separe dado, interpretação e recomendação de negócio.\n'
        '4. Previsão sempre com faixa de incerteza; nunca prometa resultado.\n'
        '5. Só dado agregado ou anonimizado; dado de paciente identificável não entra (LGPD, arts. 11 e 13).\n'
        '6. Nada de recomendação de compra ou venda de ativo: a plataforma não faz isso.\n'
        '7. Português simples; termo técnico explicado na primeira vez.'
    )


esp_por_id = {e['id']: e for e in especialidades}
consultores = []
for e in especialidades:
    consultores.append({'id': f'saude-{e["id"]}', 'tipo': 'especialidade', 'nome': f'Consultor-chefe de {e["nome"]}',
                        'especialidade': e['id'], 'instrucao': prompt_especialidade(e)})
for m in modulos:
    e = esp_por_id[m['especialidade']]
    consultores.append({'id': f'saude-{m["id"]}', 'tipo': 'modulo', 'nome': f'Consultor de {m["nome"][0].lower() + m["nome"][1:]}',
                        'especialidade': e['id'], 'instrucao': prompt_modulo(m, e)})
for g in graduacao:
    consultores.append({'id': f'saude-{g["id"]}', 'tipo': 'graduacao', 'nome': f'Professor de {g["nome"][0].lower() + g["nome"][1:]}',
                        'especialidade': None, 'instrucao': prompt_graduacao(g)})
for s in skills:
    consultores.append({'id': f'saude-{s["id"]}', 'tipo': 'dados', 'nome': s['nome'], 'especialidade': None, 'instrucao': prompt_skill(s)})
assert len({c['id'] for c in consultores}) == len(consultores), 'consultor repetido'

# ------------------------------------------------------------------ corrente SHA-256 dos prompts
# elo = {n, id, sha256_instrucao, anterior}; hash = sha256(anterior + json.dumps(elo, ensure_ascii=False, sort_keys=True))
# (mesma regra do trilho do plano mestre v4).
corrente, anterior = [], GENESE
for i, c in enumerate(consultores, 1):
    elo = {'n': i, 'id': c['id'], 'sha256_instrucao': sha_txt(c['instrucao']), 'anterior': anterior}
    h = hashlib.sha256((anterior + json.dumps(elo, ensure_ascii=False, sort_keys=True)).encode()).hexdigest()
    elo['hash'] = h
    corrente.append(elo)
    c['elo'] = i
    c['hash_elo'] = h
    anterior = h

# ------------------------------------------------------------------ medição
medicao = {
    'especialidades': {'feito': len(especialidades), 'meta': 55},
    'modulos_de_residencia': {'feito': len(modulos), 'meta': None},
    'materias_da_graduacao': {'feito': len(graduacao), 'meta': None},
    'escolas_mundo_qs': {'feito': len(escolas_mundo), 'meta': 100, 'conferido': True},
    'escolas_brasil': {'feito': len(escolas_brasil), 'meta': 50, 'conferido': False},
    'skills_dados_mercado': {'feito': len(skills), 'meta': 20},
    'consultores_com_prompt': {'feito': len(consultores), 'meta': len(consultores)},
    'prompts_na_corrente': {'feito': len(corrente), 'meta': len(consultores)},
    'artigos_de_referencia': {'feito': len(artigos), 'meta': META_ARTIGOS, 'conferidos_com_doi': 0},
    'programas_de_doutorado': {'feito': len(programas), 'meta': None, 'nota_conferida': 0},
    'teses_catalogadas': {'feito': 0, 'meta': META_TESES_POR_ESPECIALIDADE * 55},
}

catalogo = {
    'passo': 'S1 · Catálogo da saúde: especialidades, grade, escolas e acervo',
    'emitido': DATA,
    'base_legal': 'Resolução CFM 2.472/2026 (55 especialidades, 64 áreas de atuação); Resolução CNE/CES 3/2014 (graduação)',
    'aviso': ('Grade de referência montada a partir da matriz de competências da residência e das escolas listadas; '
              'conferência com a grade vigente de cada escola pendente. Artigos sem DOI conferido. '
              'Nota CAPES dos programas a conferir na Sucupira. Nada aqui é conduta clínica.'),
    'escolas_mundo': escolas_mundo,
    'escolas_brasil': escolas_brasil,
    'especialidades': especialidades,
    'modulos': modulos,
    'graduacao': graduacao,
    'skills_dados': skills,
    'artigos': artigos,
    'programas_doutorado': programas,
    'buscas_acervo': buscas_acervo,
    'medicao': medicao,
}
catalogo['sha256'] = sha({k: catalogo[k] for k in ('especialidades', 'modulos', 'graduacao', 'skills_dados', 'artigos')})

consultores_doc = {
    'passo': 'S3 · Um consultor para cada especialidade, módulo, matéria e skill de dados, com prompt pronto e lastreado',
    'emitido': DATA,
    'total': len(consultores),
    'aviso_fixo': AVISO,
    'regra_da_corrente': 'hash = sha256(anterior + json.dumps({n, id, sha256_instrucao, anterior}, ensure_ascii=False, sort_keys=True))',
    'genese': GENESE,
    'hash_final': anterior,
    'avaliacao': {'meta': 'acertar ao menos 16 de 20 perguntas com gabarito por especialidade, revisadas por médico, antes de liberar', 'estado': 'pendente'},
    'consultores': consultores,
}

os.makedirs(os.path.join(RAIZ, 'saude'), exist_ok=True)
os.makedirs(os.path.join(RAIZ, 'src', 'lib', 'saude'), exist_ok=True)
with open(os.path.join(RAIZ, 'saude', 'catalogo-saude.json'), 'w', encoding='utf-8') as f:
    json.dump(catalogo, f, ensure_ascii=False, indent=1)
with open(os.path.join(RAIZ, 'saude', 'consultores-saude.json'), 'w', encoding='utf-8') as f:
    json.dump(consultores_doc, f, ensure_ascii=False, indent=1)
with open(os.path.join(RAIZ, 'saude', 'corrente-prompts.jsonl'), 'w', encoding='utf-8') as f:
    for elo in corrente:
        f.write(json.dumps(elo, ensure_ascii=False) + '\n')
# versão para a tela: tudo o que a tela mostra, e os prompts inteiros para conferir a corrente no navegador
tela = {k: catalogo[k] for k in ('especialidades', 'modulos', 'graduacao', 'skills_dados', 'artigos', 'programas_doutorado',
                                  'escolas_mundo', 'escolas_brasil', 'medicao')}
tela['genese'] = GENESE
tela['hash_final'] = anterior
tela['consultores'] = [{k: c[k] for k in ('id', 'tipo', 'nome', 'especialidade', 'instrucao', 'elo', 'hash_elo')} for c in consultores]
with open(os.path.join(RAIZ, 'src', 'lib', 'saude', 'saude.json'), 'w', encoding='utf-8') as f:
    json.dump(tela, f, ensure_ascii=False)

for k, v in medicao.items():
    print(f'{k:28s} {v}')
print('sha256 catálogo:', catalogo['sha256'])
print('hash final da corrente:', anterior)
