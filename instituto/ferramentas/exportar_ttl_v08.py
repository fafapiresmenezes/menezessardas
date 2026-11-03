# Passo D14 (I-04): ontologia v0.8 = v0.7 + função do imóvel e documentos exigidos, com a norma de origem.
# Roda de /home/claude/menezessardas/instituto.
import json, hashlib, datetime, re, unicodedata
from rdflib import Graph, Namespace, Literal, URIRef, RDF, RDFS, OWL, XSD
from rdflib.namespace import DCTERMS, SKOS

T = Namespace('https://instituto-theye.vercel.app/o/')
V7 = 'site/ontologia-locacao-v07.ttl'
V8 = 'site/ontologia-locacao-v08.ttl'

g = Graph()
g.parse(V7, format='turtle')
n7 = len(g)
sha7 = hashlib.sha256(open(V7, 'rb').read()).hexdigest()

dados = json.load(open('dados/documentos-imovel.json'))


def ident(t):
    t = unicodedata.normalize('NFKD', t).encode('ascii', 'ignore').decode()
    return re.sub(r'-+', '-', re.sub(r'[^A-Za-z0-9]+', '-', t)).strip('-')[:60]


# Classes novas: função do imóvel e exigência documental.
g.add((T.FuncaoDoImovel, RDF.type, OWL.Class))
g.add((T.FuncaoDoImovel, RDFS.label, Literal('Função do imóvel na locação [v0.8]', lang='pt')))
g.add((T.ExigenciaDocumental, RDF.type, OWL.Class))
g.add((T.ExigenciaDocumental, RDFS.label, Literal('Exigência de documento por função [v0.8]', lang='pt')))

for p, dom, rng, lab in [
    ('exige_documento', T.FuncaoDoImovel, T.ExigenciaDocumental, 'liga a função do imóvel à exigência documental'),
    ('exigencia_de_documento', T.ExigenciaDocumental, T.Documento, 'documento que a exigência cobra'),
    ('exigencia_fundada_em', T.ExigenciaDocumental, T.Norma, 'norma que fundamenta a exigência'),
    ('imovel_tem_funcao', T.Imovel, T.FuncaoDoImovel, 'função declarada do imóvel'),
]:
    g.add((T[p], RDF.type, OWL.ObjectProperty))
    g.add((T[p], RDFS.domain, dom))
    g.add((T[p], RDFS.range, rng))
    g.add((T[p], RDFS.label, Literal(lab, lang='pt')))

g.add((T.exigencia_obrigatoria_quando, RDF.type, OWL.DatatypeProperty))
g.add((T.exigencia_obrigatoria_quando, RDFS.domain, T.ExigenciaDocumental))
g.add((T.exigencia_obrigatoria_quando, RDFS.range, XSD.string))

docs, normas, exig = set(), {}, 0
for f in dados['funcoes']:
    fu = T['func-' + f['id']]
    g.add((fu, RDF.type, OWL.Class))
    g.add((fu, RDFS.subClassOf, T.FuncaoDoImovel))
    g.add((fu, RDFS.label, Literal(f['nome'], lang='pt')))
    g.add((fu, DCTERMS.description, Literal(f['resumo'], lang='pt')))
    for d in f['documentos']:
        di = T['doc-' + ident(d['doc'])]
        if di not in docs:
            g.add((di, RDF.type, OWL.Class))
            g.add((di, RDFS.subClassOf, T.Documento))
            g.add((di, RDFS.label, Literal(d['doc'], lang='pt')))
            docs.add(di)
        # Norma: nó próprio por texto da norma, com fonte; reaproveitado entre funções.
        ni = T['N-doc-' + ident(d['norma'])]
        if ni not in normas:
            g.add((ni, RDF.type, T.Norma))
            g.add((ni, RDFS.label, Literal(d['norma'], lang='pt')))
            g.add((ni, DCTERMS.description, Literal(d['porque'], lang='pt')))
            g.add((ni, DCTERMS.source, URIRef(d['url'])))
            normas[ni] = 1
        ei = T['exig-' + f['id'] + '-' + ident(d['doc'])]
        g.add((ei, RDF.type, T.ExigenciaDocumental))
        g.add((ei, RDFS.label, Literal(f['nome'] + ': ' + d['doc'], lang='pt')))
        g.add((ei, T.exigencia_de_documento, di))
        g.add((ei, T.exigencia_fundada_em, ni))
        g.add((ei, T.exigencia_obrigatoria_quando, Literal(d['quando'])))
        g.add((ei, DCTERMS.description, Literal('Quem providencia: ' + d['quem'], lang='pt')))
        g.add((fu, T.exige_documento, ei))
        g.add((di, T.documento_de, T.Imovel))
        exig += 1

ont = URIRef('https://instituto-theye.vercel.app/o')
for p in [OWL.versionInfo, DCTERMS.source, DCTERMS.created]:
    g.remove((ont, p, None))
g.add((ont, OWL.versionInfo, Literal('0.8.0-locacao')))
g.add((ont, DCTERMS.source, Literal('v0.7 sha256 ' + sha7)))
g.add((ont, DCTERMS.created, Literal(datetime.date.today().isoformat(), datatype=XSD.date)))

g.serialize(destination=V8, format='turtle')
sha8 = hashlib.sha256(open(V8, 'rb').read()).hexdigest()
res = {'v07_triplas': n7, 'v08_triplas': len(g), 'funcoes': len(dados['funcoes']), 'documentos': len(docs),
       'normas_documentais': len(normas), 'exigencias': exig, 'sha256_v08': sha8, 'v07_sha256': sha7,
       'gerado_em': datetime.datetime.now(datetime.UTC).isoformat(timespec='minutes')}
json.dump(res, open('site/ontologia-v08-resumo.json', 'w'), ensure_ascii=False, indent=1)
print(json.dumps(res, ensure_ascii=False))
