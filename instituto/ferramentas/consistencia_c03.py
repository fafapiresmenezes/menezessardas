# C03: consistência da ontologia v0.7 (OWL RL + SHACL) e changelog.
import json,datetime
from rdflib import Graph,Namespace,RDF,RDFS,OWL
from pyshacl import validate
import owlrl
T=Namespace('https://instituto-theye.vercel.app/o/')
g=Graph(); g.parse('site/ontologia-locacao-v07.ttl',format='turtle'); n0=len(g)
SH='''@prefix sh: <http://www.w3.org/ns/shacl#> . @prefix t: <https://instituto-theye.vercel.app/o/> .
@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> . @prefix dcterms: <http://purl.org/dc/terms/> .
t:NormaShape a sh:NodeShape ; sh:targetClass t:Norma ;
  sh:property [ sh:path rdfs:label ; sh:minCount 1 ] ; sh:property [ sh:path dcterms:source ; sh:minCount 1 ] ; sh:property [ sh:path dcterms:description ; sh:minCount 1 ] .
t:PrecedenteShape a sh:NodeShape ; sh:targetClass t:Precedente ;
  sh:property [ sh:path dcterms:source ; sh:minCount 1 ] ; sh:property [ sh:path t:precedente_interpreta ; sh:minCount 1 ; sh:class t:Norma ] .
t:TeseShape a sh:NodeShape ; sh:targetClass t:Tese ; sh:property [ sh:path t:tese_funda_em ; sh:minCount 1 ; sh:class t:Norma ] .
t:AssuntoShape a sh:NodeShape ; sh:targetClass t:Assunto ; sh:property [ sh:path t:assunto_remete_a ; sh:class t:Norma ] .
'''
ok,_,txt=validate(g,shacl_graph=SH,data_graph_format='turtle',shacl_graph_format='turtle',inference='rdfs')
r=Graph(); r+=g; owlrl.DeductiveClosure(owlrl.OWLRL_Semantics).expand(r)
# inconsistências OWL: indivíduo em classes disjuntas, ou tipo owl:Nothing
nothing=list(r.subjects(RDF.type,OWL.Nothing))
# relações: domínio/alcance violados (indivíduo inferido em classe incompatível com seu tipo declarado)
classes=set(g.subjects(RDF.type,OWL.Class))
viol=[]
for p in g.subjects(RDF.type,OWL.ObjectProperty):
    rng=g.value(p,RDFS.range)
    if rng is None: continue
    for s,o in g.subject_objects(p):
        decl=set(g.objects(o,RDF.type))&classes
        if decl and rng not in decl and not any((c,RDFS.subClassOf,rng) in r for c in decl): viol.append((str(s),str(p),str(o)))
res={'data':datetime.datetime.now(datetime.UTC).isoformat(timespec='minutes'),'triplas':n0,'triplas_apos_OWL_RL':len(r),'shacl_conforme':ok,'owl_nothing':len(nothing),'violacoes_dominio_alcance':len(viol),'exemplos':viol[:5]}
print(json.dumps(res,ensure_ascii=False))
if not ok: print(txt[:2000])
json.dump(res,open('site/consistencia-v07.json','w'),ensure_ascii=False,indent=1)
