import json,hashlib,datetime,glob,math
from reportlab.lib.pagesizes import A4
from reportlab.platypus import SimpleDocTemplate,Paragraph,Spacer,Table,TableStyle,PageBreak,KeepTogether
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib import colors
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.graphics.shapes import Drawing,Rect,String,Line,Circle,Polygon,Group
f=lambda n:glob.glob(f'/usr/share/fonts/**/{n}',recursive=True)[0]
for a,b in [('Se','DejaVuSerif.ttf'),('SeB','DejaVuSerif-Bold.ttf'),('Sa','DejaVuSans.ttf'),('SaB','DejaVuSans-Bold.ttf'),('Mo','DejaVuSansMono.ttf')]: pdfmetrics.registerFont(TTFont(a,f(b)))
TINTA=colors.HexColor('#151a22');OURO=colors.HexColor('#9a7a3c');CINZA=colors.HexColor('#5b6370');LINHA=colors.HexColor('#d9d4c7');PAPEL=colors.HexColor('#f4f1ea')
VERDE=colors.HexColor('#2f6b4f');AZUL=colors.HexColor('#2c4f7c');BRANCO=colors.white
COMP={'E':colors.HexColor('#7c5a2c'),'I':colors.HexColor('#2c4f7c'),'M':colors.HexColor('#6b3f7c'),'U':colors.HexColor('#2f6b4f')}
NOMEC={'E':'Escritório','I':'Instituto','M':'Motor THE EYE','U':'Núcleo comum'}
st=lambda **k:ParagraphStyle('x',**k)
H1=st(fontName='Se',fontSize=25,leading=30,textColor=TINTA,spaceAfter=8)
H2=st(fontName='Se',fontSize=16,leading=20,textColor=TINTA,spaceBefore=8,spaceAfter=6)
K=st(fontName='Mo',fontSize=7.5,leading=10,textColor=OURO)
P=st(fontName='Sa',fontSize=9.3,leading=13.5,textColor=TINTA,spaceAfter=5)
PS=st(fontName='Sa',fontSize=8,leading=11,textColor=CINZA)
PR=st(fontName='Mo',fontSize=8.4,leading=12,textColor=TINTA,backColor=PAPEL,borderPadding=7,spaceBefore=4,spaceAfter=8,borderColor=LINHA,borderWidth=0.5)
HS=st(fontName='Mo',fontSize=7,leading=9.5,textColor=CINZA)
d=json.load(open('/mnt/project-files/unificado/fila-I02.json'));q=d['passos']
feitos=[x for x in q if x['status']=='feito'];N=len(q);nf=len(feitos)
agora=datetime.datetime.now(datetime.UTC).strftime('%d/%m/%Y %H:%M UTC')
W=174*mm
# Figura 1: mapa dos 20 passos
def mapa(destaque=None,h=None):
    cols=5;bw=W/cols-6;bh=40;gap=6;rows=math.ceil(N/cols);H=rows*(bh+16)+6
    D=Drawing(W,H)
    for i,x in enumerate(q):
        r,c=divmod(i,cols)
        if r%2==1: c=cols-1-c  # serpente
        X=c*(bw+gap)+3;Y=H-(r+1)*(bh+16)
        done=x['status']=='feito';cor=COMP[x['compartimento']]
        foco=destaque==x['n']
        D.add(Rect(X,Y,bw,bh,fillColor=cor if done else BRANCO,strokeColor=OURO if foco else cor,strokeWidth=2.6 if foco else 1,rx=4,ry=4))
        tc=BRANCO if done else cor
        D.add(String(X+6,Y+bh-13,x['n']+(' ✓' if done else ''),fontName='SaB',fontSize=9,fillColor=tc))
        import textwrap
        ls=textwrap.wrap(x['titulo'],22)[:2]
        if len(textwrap.wrap(x['titulo'],22))>2: ls[1]=ls[1][:20]+'…'
        for k,l in enumerate(ls): D.add(String(X+5,Y+15-k*8,l,fontName='Sa',fontSize=6,fillColor=tc))
        D.add(String(X+bw-12,Y+bh-13,x['compartimento'],fontName='Mo',fontSize=8,fillColor=tc))
        # seta para o próximo
        if i<N-1:
            r2,c2=divmod(i+1,cols)
            if r2%2==1:c2=cols-1-c2
            if r2==r:
                x1=X+bw if c2>c else X; x2=x1+(gap if c2>c else -gap); y=Y+bh/2
                D.add(Line(x1,y,x2,y,strokeColor=CINZA,strokeWidth=1))
            else:
                D.add(Line(X+bw/2,Y,X+bw/2,Y-16,strokeColor=CINZA,strokeWidth=1))
    return D
# Figura 2: cadeia de blocos
def cadeia():
    D=Drawing(W,120);bw=W/7-8
    itens=[('I-00','plano anterior','7cd8a5c2')]+[(x['n'],'PROMPT',x['sha256_prompt'][:8]) for x in q[:5]]+[('…','U20',q[-1]['sha256_prompt'][:8])]
    for i,(a,b,c) in enumerate(itens):
        X=i*(bw+8);done=i==0 or (i<6 and q[i-1]['status']=='feito')
        D.add(Rect(X,40,bw,56,fillColor=PAPEL,strokeColor=VERDE if done else CINZA,strokeWidth=1.3,rx=3,ry=3))
        D.add(String(X+5,80,a,fontName='SaB',fontSize=9,fillColor=TINTA))
        D.add(String(X+5,66,b,fontName='Sa',fontSize=6.5,fillColor=CINZA))
        D.add(String(X+5,48,c+'…',fontName='Mo',fontSize=6.8,fillColor=VERDE if done else CINZA))
        if i<len(itens)-1:
            D.add(Line(X+bw,68,X+bw+8,68,strokeColor=OURO,strokeWidth=1.5))
    D.add(String(0,22,'Cada elo = sha256(elo anterior + PROMPT do passo). Mudar uma letra de qualquer PROMPT quebra todos os elos seguintes.',fontName='Sa',fontSize=7.5,fillColor=TINTA))
    D.add(String(0,8,'O PDF inteiro recebe um carimbo OpenTimestamps no Bitcoin: prova de que este texto existia nesta data.',fontName='Sa',fontSize=7.5,fillColor=TINTA))
    return D
# Figura 3: ciclo do agente
def ciclo():
    D=Drawing(W,230);cx,cy,R=W/2,112,82
    et=['1 Ler a fila e o painel','2 Executar o PROMPT do passo','3 Guardar a evidência','4 Fechar o bloco (hash)','5 Medir a cada 5 passos (PDF + OTS)','6 Avisar M só se precisar','7 Abrir o próximo passo']
    n=len(et)
    D.add(Circle(cx,cy,R,fillColor=None,strokeColor=LINHA,strokeWidth=1.2))
    D.add(Circle(cx,cy,34,fillColor=OURO,strokeColor=OURO))
    D.add(String(cx,cy+4,'Gerente',fontName='SaB',fontSize=9,fillColor=BRANCO,textAnchor='middle'))
    D.add(String(cx,cy-8,'THEYE',fontName='SaB',fontSize=9,fillColor=BRANCO,textAnchor='middle'))
    for i,t in enumerate(et):
        a=math.pi/2-2*math.pi*i/n;x=cx+R*math.cos(a);y=cy+R*math.sin(a)
        D.add(Circle(x,y,6,fillColor=VERDE,strokeColor=BRANCO))
        anc='start' if math.cos(a)>0.2 else ('end' if math.cos(a)<-0.2 else 'middle')
        dx=10 if anc=='start' else (-10 if anc=='end' else 0); dy=10 if math.sin(a)>0.5 else (-16 if math.sin(a)<-0.5 else -3)
        D.add(String(x+dx,y+dy,t,fontName='Sa',fontSize=7.8,fillColor=TINTA,textAnchor=anc))
    return D
def barra(p):
    D=Drawing(W,14);D.add(Rect(0,2,W,9,fillColor=PAPEL,strokeColor=LINHA));D.add(Rect(0,2,W*p,9,fillColor=VERDE,strokeColor=None));return D
def rodape(c,doc):
    c.saveState();c.setFont('Sa',7);c.setFillColor(CINZA)
    c.drawString(18*mm,10*mm,f'Plano I-02 ilustrado · passo a passo com PROMPTs · {agora}');c.drawRightString(192*mm,10*mm,f'Desenvolvido pelo Instituto THEYE · {doc.page}');c.restoreState()
out='/mnt/project-files/unificado/plano-ilustrado-I02.pdf'
doc=SimpleDocTemplate(out,pagesize=A4,leftMargin=18*mm,rightMargin=18*mm,topMargin=16*mm,bottomMargin=18*mm,title='Plano I-02 ilustrado',author='Instituto THEYE')
E=[Paragraph('PLANO I-02 · ESCRITÓRIO GMENEZES + INSTITUTO THEYE · NICHO LOCAÇÃO',K),Spacer(1,4),
   Paragraph('O plano inteiro, passo a passo, com cada PROMPT escrito e encadeado em blockchain.',H1),
   Paragraph(f'Gerado em {agora} a pedido de M. Titular: M (CPF de M). Situação agora: <b>{nf} de {N} passos concluídos ({round(100*nf/N)}%)</b>.',P),barra(nf/N),Spacer(1,8),
   Paragraph('Figura 1 · Mapa dos 20 passos',H2),
   Paragraph('Lê-se como uma serpente: da esquerda para a direita na primeira linha, volta na segunda, e assim por diante. Caixa cheia = concluído; caixa vazada = a fazer. A letra no canto é o compartimento.',P),mapa(),Spacer(1,6)]
leg=Table([[Paragraph(f'<font color="{COMP[k].hexval().replace("0x","#")}"><b>{k}</b></font> · {NOMEC[k]}',PS) for k in 'EIMU']],colWidths=[W/4]*4)
E+=[leg,Spacer(1,6),Paragraph('E só muda pelo thread principal (o escritório está congelado numa cópia segura). I é o site e o laboratório do Instituto. M é o motor do seu PC. U é o núcleo comum: a ontologia preditiva de locação usada pelos dois.',PS),PageBreak()]
E+=[Paragraph('Figura 2 · A corrente de blocos que impede o plano de divergir',H2),
    Paragraph('Cada PROMPT tem uma impressão digital (sha256) calculada junto com a impressão do passo anterior. Se alguém mudar o texto de um passo, a impressão muda e toda a corrente seguinte deixa de bater. As evidências de cada passo concluído também são encadeadas do mesmo jeito.',P),cadeia(),Spacer(1,10),
    Paragraph('Figura 3 · O agente gerente que nunca deixa o projeto parado',H2),
    Paragraph('O "Gerente THEYE unificado" roda sozinho três vezes por dia (7h32, 13h32 e 19h32, horário de Brasília) e também a cada resposta neste thread. Ele segue o ciclo abaixo e só para se faltar algo que só você pode dar; aí pergunta em múltipla escolha e continua no que não depende disso. "ok MAGO" vale como aprovação já dada.',P),ciclo(),PageBreak()]
for x in q:
    done=x['status']=='feito';cor=COMP[x['compartimento']]
    bloco=[Paragraph(f'PASSO {x["n"]} · FASE {x["fase"]} · {NOMEC[x["compartimento"]].upper()} · {"CONCLUÍDO" if done else "A FAZER"}',K),
      Paragraph(x['titulo'],H2),mapa(destaque=x['n']),Spacer(1,6),
      Table([[Paragraph('<b>Objetivo</b>',PS),Paragraph(x['objetivo'],P)],[Paragraph('<b>Skills</b>',PS),Paragraph(x['skills'],P)],
             [Paragraph('<b>Evidência esperada</b>',PS),Paragraph(x['evidencia_esperada'],P)],[Paragraph('<b>KPI</b>',PS),Paragraph(x['kpi'],P)]],
            colWidths=[34*mm,W-34*mm],style=[('VALIGN',(0,0),(-1,-1),'TOP'),('LINEBELOW',(0,0),(-1,-1),0.3,LINHA)]),
      Paragraph('PROMPT DO PASSO (texto integral)',K),Paragraph(x['prompt'],PR),
      Paragraph(f'elo anterior: {x["elo_anterior"]}',HS),Paragraph(f'sha256 deste PROMPT: {x["sha256_prompt"]}',HS)]
    if done:
        bloco+=[Spacer(1,6),Paragraph(f'CONCLUÍDO EM {x["feito_em"]}',K),Paragraph(x['evidencia'],P),Paragraph(f'sha256 da evidência: {x.get("sha256_evidencia","")}',HS)]
    E+=bloco+[PageBreak()]
E+=[Paragraph('Como conferir com os próprios olhos',H2),
    Paragraph('1. Abra o arquivo fila-I02.json (na pasta unificado). Para cada passo, calcule sha256(elo_anterior + prompt): o resultado tem de ser igual ao sha256 impresso nesta página. 2. O elo_anterior de cada passo é o sha256 do passo anterior; o do U01 é o do plano I-00. 3. O arquivo .ots ao lado deste PDF prova no Bitcoin que este documento existia na data do carimbo (verificável em opentimestamps.org).',P),
    Paragraph('Regras que o gerente nunca quebra',H2),
    Paragraph('Nunca abre a pasta 10_COFRE_SEGREDOS. Só dados públicos e agregados (LGPD). O escritório só muda pelo thread principal. Toda contratação fica no CPF de M e o pagamento é feito por M no site do fornecedor. Nenhum número de previsão sai sem fonte pública, amostra, intervalo e confiança. Site nunca vai ao ar sem CSS. A cada 5 passos: medição em PDF com carimbo no Bitcoin.',P)]
doc.build(E,onFirstPage=rodape,onLaterPages=rodape)
print(out,hashlib.sha256(open(out,'rb').read()).hexdigest())
