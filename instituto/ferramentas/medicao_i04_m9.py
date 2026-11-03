# Medição completa I-M9 + plano I-04 (pedido de M, 03/11/2026 19:13Z).
import json,hashlib,datetime,glob
from reportlab.lib.pagesizes import A4
from reportlab.platypus import SimpleDocTemplate,Paragraph,Spacer,Table,TableStyle,PageBreak
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib import colors
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.graphics.shapes import Drawing,Rect,String
f=lambda n:glob.glob(f'/usr/share/fonts/**/{n}',recursive=True)[0]
for a,b in [('Se','DejaVuSerif.ttf'),('Sa','DejaVuSans.ttf'),('SaB','DejaVuSans-Bold.ttf'),('Mo','DejaVuSansMono.ttf')]: pdfmetrics.registerFont(TTFont(a,f(b)))
TINTA=colors.HexColor('#151a22');OURO=colors.HexColor('#9a7a3c');CINZA=colors.HexColor('#5b6370');LINHA=colors.HexColor('#d9d4c7');VERDE=colors.HexColor('#2f6b4f');PAPEL=colors.HexColor('#f4f1ea');AMB=colors.HexColor('#b07d1f');VERM=colors.HexColor('#9b3b2f')
st=lambda **k:ParagraphStyle('x',**k)
H1=st(fontName='Se',fontSize=21,leading=26,textColor=TINTA,spaceAfter=8);H2=st(fontName='Se',fontSize=14,leading=18,textColor=TINTA,spaceBefore=10,spaceAfter=5)
K=st(fontName='Mo',fontSize=7.5,leading=10,textColor=OURO);P=st(fontName='Sa',fontSize=9,leading=13,textColor=TINTA,spaceAfter=4);PS=st(fontName='Sa',fontSize=7.6,leading=10.2,textColor=CINZA)
PR=st(fontName='Mo',fontSize=7.4,leading=10.2,textColor=TINTA,backColor=PAPEL,borderPadding=5,spaceBefore=3,spaceAfter=6)
U='/mnt/project-files/unificado/'
N=json.load(open(U+'i03/notas-I-M8.json'))
q3=json.load(open(U+'fila-I03.json'))['passos'];q4d=json.load(open(U+'fila-I04.json'));q4=q4d['passos']
f3=sum(x['status']=='feito' for x in q3);f4=sum(x['status']=='feito' for x in q4)
media=sum(N.values())/len(N)
agora=datetime.datetime.now(datetime.UTC).strftime('%d/%m/%Y %H:%M UTC')
W=174*mm
def barras():
    D=Drawing(W,10*20+6)
    for i,(k,v) in enumerate(N.items()):
        y=10*20-i*20;D.add(String(0,y+3,k,fontName='Sa',fontSize=7.5,fillColor=TINTA))
        x0=58*mm;w=W-x0-22
        D.add(Rect(x0,y,w,11,fillColor=PAPEL,strokeColor=LINHA));D.add(Rect(x0,y,w*v/10,11,fillColor=VERDE,strokeColor=None))
        D.add(String(x0+w+4,y+2,f'{v:.1f}'.replace('.',','),fontName='SaB',fontSize=8,fillColor=TINTA))
    return D
# Os 6 pedidos de M (03/11 19:13Z) contra o que já está no ar.
PED=[('1. Replanejar com PROMPTs encadeados em blockchain, PDF de medição, guardião que nunca para, Supabase','No ar',
      'Fila I-04 com 20 PROMPTs encadeados por sha256 e cabeça selada no Bitcoin (OpenTimestamps); fechar_i04 recusa fechar fora de ordem; guardião 3x/dia; Supabase em uso.','D01, D17, D18, D20'),
 ('2. Top 10 benchmarks globais, só as forças, plataforma outlier, calibragem','Parcial',
      'Cada tema já é medido contra um referencial mundial (TRIPOD+AI, OQuaRE, FAIR, ASVS, NIST, WCAG). Falta a matriz explícita das 10 plataformas e a régua de calibragem "melhor do mundo".','D02, D03'),
 ('3a. Para leigos: Top 10 métodos de usabilidade, KPIs & OKRs com blockchain, matrizes visuais','Parcial',
      'WCAG 2.2 AA com 0 violação em 52 verificações; placar e painel de saúde ao vivo. Faltam SUS com pessoas (C14), modo simples, painel de OKRs selado e matriz de priorização.','D04, D05, D06, D07'),
 ('3b. Legislação e sandboxes conectados permanentemente, matriz de soluções por caso','Parcial',
      'O escritório [X] já tem legislação ao vivo; o Instituto ainda não. Faltam 6 fontes públicas no Instituto e a matriz situação × caminho.','D08, D09'),
 ('4. Top 50 skills e 50 agentes PhD consultores do Instituto','Parcial',
      '50 agentes no ar em /agentes.html, por botão, com filtro contra injeção. Faltam o mapa de 50 skills com ementa citada e a avaliação de acerto dos agentes.','D10, D11'),
 ('5. Drag-in de contratos e imóveis, documentos do imóvel por função no Brasil, agenda automática','Parcial',
      'No [X]: IA lê PDF de contrato, cadastro de imóveis e agenda iCal no ar. Falta o checklist de documentos por função (residencial, comercial, etc.) e ligá-lo ao drag-in e à agenda.','D14, D15, D16'),
 ('6. Agentes por botão, poucos tokens, conectados ao Claude (API e playground)','No ar',
      'Agentes só gastam IA quando alguém aperta o botão; cota 3/20 por dia e teto diário; custo ~R$ 0,08 por resposta. Faltam cache de prompt e roteiros exportáveis para o Console da Anthropic.','D12, D13')]
COR={'No ar':VERDE,'Parcial':AMB,'Falta':VERM}
out=U+'medicao-I-M9.pdf'
doc=SimpleDocTemplate(out,pagesize=A4,leftMargin=18*mm,rightMargin=18*mm,topMargin=16*mm,bottomMargin=18*mm,title='Medição I-M9 e plano I-04',author='Instituto THEYE')
def rod(c,d):
    c.saveState();c.setFont('Sa',7);c.setFillColor(CINZA);c.drawString(18*mm,10*mm,f'Medição I-M9 · plano I-04 · {agora}');c.drawRightString(192*mm,10*mm,f'Desenvolvido pelo Instituto THEYE · {d.page}');c.restoreState()
tot=len(q3)+len(q4);pct=100*(f3+f4)/tot
E=[Paragraph('MEDIÇÃO COMPLETA I-M9 · REPLANEJAMENTO I-04 · PEDIDO DE M EM 03/11/2026',K),Spacer(1,4),
   Paragraph(f'Nota média {media:.2f} de 10. Programa em {pct:.0f}% ({f3+f4} de {tot} passos).'.replace('.',',',1),H1),
   Paragraph(f'Gerado em {agora}. O ciclo I-03 está em {f3} de {len(q3)} passos; os 10 que faltam dependem de prazo (janelas de 30 dias até 02/12, campo até 08/11, validação externa em 30/11) ou de decisão de M. O novo ciclo I-04 transforma os 6 pedidos de M em 20 PROMPTs encadeados, que só fecham em ordem. Notas de 0 a 10 dadas por mim a partir das evidências; não são auditoria externa.',P),
   Spacer(1,8),barras(),Spacer(1,4),Paragraph('Desde a medição I-M8 (9,01): coleta diária corrigida (um job por tribunal, repetição em caso de recusa ou lentidão) e monitores de 30 dias no ar (disponibilidade 100% no 1º dia). As notas não mudam até as janelas fecharem.',PS),
   Paragraph('Os 6 pedidos de M, um a um',H2)]
t=[[Paragraph(x,K) for x in ['Pedido','Hoje','O que existe e o que falta','Passos I-04']]]
for a,b,c,d in PED: t.append([Paragraph(f'<b>{a}</b>',PS),Paragraph(f'<font color="{COR[b].hexval()}"><b>{b}</b></font>',PS),Paragraph(c,PS),Paragraph(d,PS)])
T=Table(t,colWidths=[52*mm,15*mm,82*mm,25*mm],repeatRows=1);T.setStyle(TableStyle([('LINEBELOW',(0,0),(-1,-1),0.3,LINHA),('VALIGN',(0,0),(-1,-1),'TOP')]));E+=[T,PageBreak()]
E+=[Paragraph('Fila I-04: 20 PROMPTs encadeados',H2),Paragraph('Cada PROMPT carrega o sha256 do anterior: sha256_prompt = sha256(elo_anterior + PROMPT). O 1º elo é o último PROMPT do ciclo I-03 (C30). Trocar uma palavra de qualquer PROMPT muda todos os elos seguintes, então a sequência não pode divergir sem deixar rastro. O script fechar_i04.py recusa fechar um passo enquanto algum anterior não estiver feito ou formalmente em espera.',P)]
t=[[Paragraph(x,K) for x in ['Nº','Tema','Passo e PROMPT','KPI','sha256 (12)']]]
for x in q4: t.append([Paragraph(x['n'],PS),Paragraph(x['tema'],PS),Paragraph(f"<b>{x['titulo']}.</b> {x['prompt']}",PS),Paragraph(x['kpi'],PS),Paragraph(x['sha256_prompt'][:12],PS)])
T=Table(t,colWidths=[10*mm,24*mm,86*mm,34*mm,20*mm],repeatRows=1);T.setStyle(TableStyle([('LINEBELOW',(0,0),(-1,-1),0.3,LINHA),('VALIGN',(0,0),(-1,-1),'TOP')]));E+=[T]
E+=[Paragraph('Ainda abertos do ciclo I-03',H2),Paragraph('; '.join(f"{x['n']} {x['titulo']} ({x['status']})" for x in q3 if x['status']!='feito')+'.',P),
    Paragraph('Prova de registro',H2),Paragraph(f"Cabeça da cadeia I-04: {q4d['cabeca']}. Selada no Bitcoin por OpenTimestamps em unificado/i04/cadeia-I04-sha256.ots. Para conferir: opentimestamps.org, enviar o .ots com o fila-I04.json.",PS)]
prompt=("Medição I-M9: reavalie os 10 temas com a régua item a item (avaliacao-I-M8.xlsx), só com evidência registrada; "
        "cruze os 6 pedidos de M de 03/11/2026 19:13Z com o que está no ar; transforme cada lacuna em PROMPT encadeado na fila I-04; sele a cabeça da cadeia.")
E+=[Paragraph('PROMPT desta medição',K),Paragraph(prompt,PR),Paragraph(f'sha256 do PROMPT: {hashlib.sha256(prompt.encode()).hexdigest()}',PS)]
doc.build(E,onFirstPage=rod,onLaterPages=rod)
print(out,hashlib.sha256(open(out,'rb').read()).hexdigest(),round(media,2),f'{pct:.1f}%')
