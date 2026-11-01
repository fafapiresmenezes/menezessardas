# C02: índice de URIs persistentes /o/<id> a partir do TTL v0.7.
import json
from rdflib import Graph,URIRef,RDF,RDFS,OWL
from rdflib.namespace import DCTERMS,SKOS
B='https://instituto-theye.vercel.app/o/'
g=Graph(); g.parse('site/ontologia-locacao-v07.ttl',format='turtle')
loc=lambda u:str(u)[len(B):] if str(u).startswith(B) else str(u)
nos={}
for s in set(g.subjects()):
    if not str(s).startswith(B): continue
    i=loc(s); t=[loc(o) for o in g.objects(s,RDF.type)]
    tipo='Classe' if str(OWL.Class) in map(str,g.objects(s,RDF.type)) else 'Relação' if str(OWL.ObjectProperty) in map(str,g.objects(s,RDF.type)) else ', '.join(x for x in t if not x.startswith('http'))
    d={'tipo':tipo,'rotulo':str(g.value(s,RDFS.label) or i)}
    for k,p in [('descricao',DCTERMS.description),('comentario',RDFS.comment),('fonte',DCTERMS.source),('urn',SKOS.exactMatch),('codigo',SKOS.notation)]:
        v=g.value(s,p)
        if v is not None: d[k]=str(v)
    for k,p in [('dominio',RDFS.domain),('alcance',RDFS.range),('subclasse_de',RDFS.subClassOf)]:
        v=g.value(s,p)
        if v is not None: d[k]=loc(v)
    lig=[[loc(p),loc(o)] for p,o in g.predicate_objects(s) if str(p).startswith(B)]
    if lig: d['ligacoes']=sorted(lig)
    inv=[[loc(p),loc(x)] for x,p in g.subject_predicates(s) if str(p).startswith(B)]
    if inv: d['citado_por']=sorted(inv)
    nos[i]=d
json.dump({'base':B,'versao':'0.7.0-locacao','nos':dict(sorted(nos.items()))},open('site/o.json','w'),ensure_ascii=False,separators=(',',':'))
print(len(nos))
