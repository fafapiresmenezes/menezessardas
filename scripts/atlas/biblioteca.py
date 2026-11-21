import json, collections, re
BASE="/mnt/project-files/engenharia/plano-agentes/atlas/"
TS="/home/user/menezessardas/src/data/agentesEngenharia.ts"
s=open(TS,encoding='utf-8').read(); i=s.index('"porEspecialidade"')
nomes=dict(re.findall(r'"id": "([^"]+)",\s*\n\s*"nome": "([^"]+)"', s[i:s.index('\n}\n',i)]))
VOCAB={
 "estruturas-betao": r"concrete|betão|beton|reinforc|prestress|pré-esforç|rebar steel|slab|beam|column|shear wall|punching|crack width|flexur|compressive strength",
 "estruturas-aco": r"steel (structure|frame|beam|column|connection|member)|aço|metallic structure|composite (beam|column|slab)|bolted|welded joint|buckling|cold-formed|truss|lateral torsional",
 "geotecnia": r"soil|geotechnic|foundation|pile|slope stability|retaining wall|embankment|liquefact|settlement|bearing capacity|tunnel|rock mass|geogrid|consolidat|unsaturated|shear strength of",
 "hidraulica-recursos-hidricos": r"hydraulic|hydrolog|river|flood|rainfall|runoff|watershed|catchment|reservoir|dam (safety|break)|irrigation|groundwater|aquifer|pipe network|open channel|evapotranspirat|streamflow",
 "saneamento": r"wastewater|water treatment|sanitation|sewer|drinking water|effluent|sludge|activated sludge|disinfect|coagulat|membrane (filtration|bioreactor)|water supply|latrine|faecal|potable",
 "transportes-pavimentos": r"pavement|asphalt|road|highway|traffic|transport(ation)? (network|planning|demand)|rail|bridge deck|airport runway|subgrade|bitumen|congestion|travel time|vehicle flow",
 "ambiental-licenciamento": r"environmental (impact|assessment|management|licens)|emission|pollut|air quality|life cycle assessment|biodiversit|resettlement|safeguard|waste management|contaminat|noise|eia\b",
 "electrotecnia-energia": r"power (system|grid|flow|quality|transformer)|electric|photovoltaic|solar|wind (turbine|farm|energy)|transmission line|substation|microgrid|battery|energy storage|load forecast|voltage|distribution network|hydropower",
 "mecanica-instalacoes": r"\bhvac\b|ventilation|air conditioning|refrigerat|heat (exchanger|pump|transfer)|pump|compressor|fire (protection|suppression)|piping|boiler|thermal comfort|duct|turbomachin|mechanical installation",
 "materiais-betao": r"cement|aggregate|pozzolan|fly ash|slag|geopolymer|mortar|durabilit|carbonat|chloride|rheolog|bitumen|timber|masonry|brick|laterit|stabili[sz]ed soil|recycled (aggregate|concrete)|material propert",
 "gestao-construcao-custos": r"construction (management|project|cost|schedul|productivit|delay|safety)|cost estimat|earned value|bill of quantities|procurement|tender|claim|contract (management|administration)|fidic|risk management in|lean construction|project control",
 "petroleo-gas": r"petroleum|oil (and gas|well|reservoir|field)|gas (pipeline|field|processing)|drilling|wellbore|offshore platform|refiner|lng|upstream|hydrocarbon|enhanced oil recovery|flow assurance",
 "minas-barragens": r"mining|mine (waste|tailing|water)|tailings|open pit|underground mine|ore|dredg|dam (tailings|rejeito)|rejeito|blasting|mineral processing|geomechanic|subsidence",
 "sistemas-dados-construcao": r"\bbim\b|digital twin|machine learning|deep learning|neural network|computer vision|point cloud|lidar|photogrammetr|sensor|monitoring system|internet of things|iot\b|optimi[sz]ation (of|for) (design|construction)|data-driven|structural health monitoring",
}
VOC={k:re.compile(v,re.I) for k,v in VOCAB.items()}
# Palavras que nunca podem sair na plataforma (nome do cliente e do grupo).
# A lista fica fora do repositório, num ficheiro à parte na pasta do Atlas.
_pal=[x.strip() for x in open(BASE+'palavras-proibidas.txt',encoding='utf-8').read().split() if x.strip()] if __import__('os').path.exists(BASE+'palavras-proibidas.txt') else []
PROIB=re.compile('|'.join(re.escape(x) for x in _pal),re.I) if _pal else None
por=collections.defaultdict(list); fora=collections.Counter()
for l in open(BASE+"atlas-classificado-v2.jsonl",encoding='utf-8'):
    d=json.loads(l); e=d['especialidade']; t=(d.get('titulo') or '').strip()
    if not t or not (d.get('url') or '').startswith('http'): continue
    if PROIB and PROIB.search(t): continue
    # porta de qualidade: o próprio título tem de falar da especialidade
    if not VOC[e].search(t): fora[e]+=1; continue
    por[e].append(d)
print("passaram/recusados por especialidade:")
for e in VOCAB: print(f"  {e}: {len(por[e])} passaram, {fora[e]} recusados")
POR_ESP=300
linhas=[]
for e,lst in por.items():
    lst.sort(key=lambda d:(-(d['nota_utilidade'] or 0), -(d['ano'] or 0)))
    for d in lst[:POR_ESP]:
        linhas.append(json.dumps({"id":d["id"],"t":d["titulo"][:300],"a":d["ano"],"e":e,
          "en":nomes.get(e,e),"f":d["fonte"],"l":d["licenca"] or "não informada",
          "g":bool(d["guardavel"]),"af":bool(d["contexto_africa"]),"n":d["nota_utilidade"],
          "tp":d["tipo"],"u":d["url"]},ensure_ascii=False))
open('/home/user/menezessardas/public/atlas-biblioteca-v1.jsonl','w',encoding='utf-8').write("\n".join(linhas)+"\n")
print("linhas",len(linhas))
json.dump({"medido_em":"2026-11-21","no_corpus":sum(len(v) for v in por.values())+sum(fora.values()),
 "passaram_porta_de_qualidade":sum(len(v) for v in por.values()),"na_biblioteca":len(linhas),
 "por_especialidade":{e:{"passaram":len(por[e]),"recusados":fora[e]} for e in VOCAB},
 "regra":"o título tem de conter um termo da própria especialidade; a lista de termos está em biblioteca.py"},
 open(BASE+"atlas-biblioteca-v2-porta.json","w",encoding="utf-8"),ensure_ascii=False,indent=1)
