# D07 (I-04): gera instituto/site/matriz-i04.json a partir da fila: impacto × esforço dos passos abertos
# e Eisenhower das pendências de M. Rodar depois de cada fechar_i04.py.
import json,hashlib,datetime,sys
F='/mnt/project-files/unificado/fila-I04.json'
OUT=sys.argv[1] if len(sys.argv)>1 else '/home/claude/menezessardas/instituto/site/matriz-i04.json'
# impacto e esforço de 1 a 5, dados pelo gerente; impacto = efeito em receita, prova do grafo ou pedido explícito de M
IE={'M01':(5,2,'Liga a receita: sem cobrança não há negócio'),'M02':(3,1,'Marca própria no endereço theye.club'),'M03':(4,1,'Permite cobrar sem violar o plano grátis da hospedagem'),
'D07':(3,2,'O leigo vê o que vem primeiro'),'D08':(4,3,'Legislação ao vivo no Instituto, pedido de M'),'D09':(4,3,'Caminho por situação para o cliente'),
'D10':(3,3,'Mapa das 50 skills com ementa'),'D11':(4,3,'Prova de que os agentes acertam'),'D12':(3,2,'Corta 30% do custo de IA'),'D13':(2,2,'Roteiros para o Console da Anthropic'),
'D14':(4,4,'Diz ao dono quais papéis o imóvel precisa'),'D15':(4,2,'Arrastar o contrato e o prazo já entra na agenda'),'D16':(4,3,'THEYE dentro do escritório'),'D17':(3,1,'Nada para sem aviso'),
'D18':(2,1,'Mantém a nota honesta'),'D19':(5,4,'É o que prova se o grafo vence'),'D20':(3,1,'Entrega final selada'),'D21':(4,2,'Você resolve tudo numa tela só'),'D22':(4,3,'Mais tribunais e classes')}
q=json.load(open(F));ps=q['passos']
abertos=[x for x in ps if x['status']!='feito']
itens=[]
for x in abertos:
    i,e,porque=IE.get(x['n'],(3,3,''))
    quad='Fazer já' if i>=4 and e<=2 else 'Planejar' if i>=4 else 'Encaixar' if e<=2 else 'Depois'
    itens.append(dict(n=x['n'],titulo=x['titulo'],status=x['status'],impacto=i,esforco=e,quadrante=quad,porque=porque))
ordem={'Fazer já':0,'Planejar':1,'Encaixar':2,'Depois':3}
itens.sort(key=lambda y:(ordem[y['quadrante']],-y['impacto'],y['esforco']))
eis=[dict(n=x['n'],titulo=x['titulo'],quadrante='Urgente e importante' if x['n'] in('M01','M03') else 'Importante, não urgente',
          acao={'M01':'Reconectar o Stripe em Configurações, Conectores','M02':'Responder o cartão do domínio theye.club','M03':'Responder o cartão da hospedagem paga'}.get(x['n'],''))
     for x in ps if x['status']=='aguardando M']
d=dict(gerado_em=datetime.datetime.now(datetime.UTC).strftime('%Y-%m-%dT%H:%MZ'),cabeca=q['cabeca'],feitos=sum(x['status']=='feito' for x in ps),total=len(ps),impacto_esforco=itens,eisenhower_m=eis)
d['sha256']=hashlib.sha256(json.dumps(d,ensure_ascii=False,sort_keys=True).encode()).hexdigest()
json.dump(d,open(OUT,'w'),ensure_ascii=False,indent=1);print(OUT,len(itens),d['sha256'][:12])
