# C01: ontologia locação v0.7 em OWL/Turtle (v0.6 + propostas do U14).
import json,hashlib
from rdflib import Graph,Namespace,Literal,URIRef
from rdflib.namespace import RDF,RDFS,OWL,XSD,DCTERMS,SKOS
o=json.load(open('/home/claude/menezessardas/instituto/ontologia-locacao-v06.json'))
B='https://instituto-theye.vercel.app/o/'; T=Namespace(B); g=Graph()
for p,n in [('theye',T),('owl',OWL),('rdfs',RDFS),('dcterms',DCTERMS),('skos',SKOS)]: g.bind(p,n)
ont=URIRef(B.rstrip('/'))
g.add((ont,RDF.type,OWL.Ontology)); g.add((ont,OWL.versionInfo,Literal('0.7.0-locacao')))
g.add((ont,DCTERMS.title,Literal('Ontologia de locação do Instituto THEYE',lang='pt')))
g.add((ont,DCTERMS.created,Literal('2026-11-01',datatype=XSD.date))); g.add((ont,DCTERMS.license,URIRef('https://creativecommons.org/licenses/by/4.0/')))
g.add((ont,DCTERMS.source,Literal('v0.6 sha256 '+hashlib.sha256(open('/home/claude/menezessardas/instituto/ontologia-locacao-v06.json','rb').read()).hexdigest())))
C={'Tribunal':'Tribunal','OrgaoJulgador':'Órgão julgador','ClasseProcessual':'Classe processual (TPU-CNJ)','Assunto':'Assunto (TPU-CNJ)','Processo':'Processo judicial','TipoDeParte':'Tipo de parte','Movimento':'Movimento processual','Decisao':'Decisão','Tese':'Tese jurídica','Precedente':'Precedente (súmula ou tema)','Norma':'Dispositivo normativo','Contrato':'Contrato de locação','Imovel':'Imóvel','HipoteseJuridica':'Hipótese jurídica pré-registrada','PrevisaoJuridica':'Previsão jurídica selada',
   'Prazo':'Prazo (data-limite com norma de origem) [v0.7]','Garantia':'Garantia locatícia (art. 37) [v0.7]','Documento':'Documento do imóvel ou contrato [v0.7]'}
for c,l in C.items(): g.add((T[c],RDF.type,OWL.Class)); g.add((T[c],RDFS.label,Literal(l,lang='pt')))
R={'tramita_em':('Processo','OrgaoJulgador'),'pertence_a':('OrgaoJulgador','Tribunal'),'tem_classe':('Processo','ClasseProcessual'),'trata_de':('Processo','Assunto'),'envolve':('Processo','TipoDeParte'),'resulta_em':('Processo','Decisao'),'invoca':('Processo','Tese'),'aplica':('Decisao','Precedente'),'vincula':('Precedente','Tese'),'fundamenta':('Norma','Tese'),'regula':('Norma','Contrato'),'objeto_de':('Imovel','Contrato'),'testa':('HipoteseJuridica','PrevisaoJuridica'),'preve':('PrevisaoJuridica','Decisao'),
   'assunto_remete_a':('Assunto','Norma'),'tese_funda_em':('Tese','Norma'),'precedente_interpreta':('Precedente','Norma'),
   'aditiva_de':('Contrato','Contrato'),'sublocacao_de':('Contrato','Contrato'),'garantido_por':('Contrato','Garantia'),'prazo_de':('Prazo',None),'fixado_por':('Prazo','Norma'),'documento_de':('Documento',None)}
for r,(d,a) in R.items():
    g.add((T[r],RDF.type,OWL.ObjectProperty)); g.add((T[r],RDFS.domain,T[d]))
    if a: g.add((T[r],RDFS.range,T[a]))
g.add((T.prazo_de,RDFS.comment,Literal('Alvo: Contrato, Imovel ou Processo',lang='pt'))); g.add((T.documento_de,RDFS.comment,Literal('Alvo: Contrato ou Imovel',lang='pt')))
for v,n in [('fianca','37-II'),('caucao','37-I'),('seguro','37-III'),('cessao_fiduciaria','37-IV')]:
    i=T['garantia-'+v]; g.add((i,RDF.type,T.Garantia)); g.add((i,RDFS.label,Literal(v))); g.add((i,RDFS.seeAlso,T['N-8245-37']))
for v in ['locador','locatario','fiador','sublocatario']:
    i=T['parte-'+v]; g.add((i,RDF.type,T.TipoDeParte)); g.add((i,RDFS.label,Literal(v)))
for d in ['IPTU','Habite-se','Alvara','AVCB']: g.add((T['doc-'+d],RDF.type,OWL.Class)); g.add((T['doc-'+d],RDFS.subClassOf,T.Documento))
for n in o['normas']:
    i=T[n['id']]; g.add((i,RDF.type,T.Norma)); g.add((i,RDFS.label,Literal('Lei 8.245/91, art. '+n['artigo'],lang='pt'))); g.add((i,DCTERMS.description,Literal(n['ementa'],lang='pt')))
    if n.get('urn'): g.add((i,SKOS.exactMatch,Literal(n['urn'])))
    g.add((i,DCTERMS.source,URIRef(n['fonte'])))
for p in o['precedentes']:
    i=T[p['id']]; g.add((i,RDF.type,T.Precedente)); g.add((i,RDFS.label,Literal(f"{p['orgao']} {p['especie']}",lang='pt'))); g.add((i,DCTERMS.description,Literal(p['tese'],lang='pt'))); g.add((i,DCTERMS.source,URIRef(p['fonte'])))
    for n in p['normas']: g.add((i,T.precedente_interpreta,T[n]))
for t in o['teses']:
    i=T[t['id']]; g.add((i,RDF.type,T.Tese)); g.add((i,RDFS.label,Literal(t['tese'],lang='pt')))
    for n in t['normas']: g.add((i,T.tese_funda_em,T[n]))
for cod,m in o['mapa_assunto_tpu'].items():
    i=T['tpu-assunto-'+cod]; g.add((i,RDF.type,T.Assunto)); g.add((i,SKOS.notation,Literal(cod)))
    for n in m['normas']: g.add((i,T.assunto_remete_a,T[n]))
# exemplo do U14: aditivo e fiador (Súmula 214)
g.add((T['P-STJ-S214'],RDFS.comment,Literal('Usada na relação aditiva_de: o fiador só responde pelo aditivo a que anuiu.',lang='pt')))
out='/home/claude/menezessardas/instituto/site/ontologia-locacao-v07.ttl'
g.serialize(out,format='turtle')
g2=Graph(); g2.parse(out,format='turtle')
# checagem: todo objeto de relação aponta para nó declarado
und=[str(o_) for s,p,o_ in g2 if str(p).startswith(B) and isinstance(o_,URIRef) and str(o_).startswith(B) and (o_,RDF.type,None) not in g2]
print(len(g2),'triplas', sum(1 for _ in g2.subjects(RDF.type,OWL.Class)),'classes', sum(1 for _ in g2.subjects(RDF.type,OWL.ObjectProperty)),'relações','nós sem tipo:',len(set(und)), set(und) and list(set(und))[:5])
