# Medição I-M11: passos D06–D08 e L01–L05 do plano I-04 (lançamento e monetização, pedido de M 03/11 21:04Z).
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
N=json.load(open(U+'i03/notas-I-M11.json'))
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
# Passos fechados ou em janela desde a I-M10.
PED=[('D06 Painel de OKRs com selo','Feito','/okr.html: 3 objetivos e 9 KRs ao vivo, sha256 por KR e resumo diário registrado no Bitcoin.','Gestão'),
 ('D07 Matriz de priorização','Feito','Impacto × esforço e Eisenhower das pendências de M em /okr.html#mx, refeitas a cada passo.','Gestão'),
 ('D08 Legislação conectada','Em janela','7 fontes públicas lidas 7/7 em 03/11; janela de estabilidade até 10/11.','Dados abertos'),
 ('L01 Reajuste do aluguel','Feito','/reajuste.html grátis, sem cadastro: IGP-M, IPCA e INPC da série oficial do Banco Central, conta mês a mês.','Predição, experiência'),
 ('L02 Leitura de contrato por IA','Feito','/contrato.html: Haiku 5.5 com ficha de lei conferida. Sem a ficha, 3 de 10 contratos tiveram erro de lei; com a ficha, 0 de 10 e 10 de 10 defeitos plantados achados. Dados pessoais mascarados antes da IA; texto não guardado. Custo US$ 0,001 por leitura.','IA responsável, LGPD'),
 ('L03 API para imobiliárias','Em janela','/api.html: chave de teste com 20 chamadas, guardada só como sha256; teste A/B de preço até 03/12 (A R$ 0,25 por chamada; B planos de R$ 490 e R$ 1.490). Meta: 3 empresas.','Monetização'),
 ('L04 Relatório por comarca','Feito','/comarca.html: volume, procedência com intervalo de Wilson, tempo mediano e comparação com o estado; abaixo de 10 julgamentos a taxa não aparece, de 10 a 29 vem com aviso. PDF de exemplo do Rio (85,8%, IC 83,0–88,3%, n 671) registrado no Bitcoin.','Predição, dados abertos'),
 ('L05 Lançamento e tração','Em janela','/lancamento.html com as 4 ferramentas; contagem por canal sem cookie em /negocio.html (visitas, cadastros, conversão, custo por cadastro). Textos dos 3 canais prontos. Faltam M publicar, o Gmail do Instituto e o Stripe (M01). Meta: 50 cadastros e 1º pagante até 03/12.','Gestão, monetização')]
COR={'Feito':VERDE,'Em janela':AMB,'Falta':VERM}
out=U+'medicao-I-M11.pdf'
doc=SimpleDocTemplate(out,pagesize=A4,leftMargin=18*mm,rightMargin=18*mm,topMargin=16*mm,bottomMargin=18*mm,title='Medição I-M11 · lançamento e monetização',author='Instituto THEYE')
def rod(c,d):
    c.saveState();c.setFont('Sa',7);c.setFillColor(CINZA);c.drawString(18*mm,10*mm,f'Medição I-M11 · plano I-04 · {agora}');c.drawRightString(192*mm,10*mm,f'Desenvolvido pelo Instituto THEYE · {d.page}');c.restoreState()
tot=len(q3)+len(q4);pct=100*(f3+f4)/tot
E=[Paragraph('MEDIÇÃO I-M11 · LANÇAMENTO E MONETIZAÇÃO · PLANO I-04',K),Spacer(1,4),
   Paragraph(f'Nota média {media:.2f} de 10. Programa em {pct:.0f}% ({f3+f4} de {tot} passos).'.replace('.',',',1),H1),
   Paragraph(f'Gerado em {agora}. Ciclo I-04 com {len(q4)} PROMPTs encadeados: {f4} feitos; os demais abertos só fecham em ordem. Desde a I-M10 entraram 8 passos (5 feitos, 3 em janela de medição). Ciclo I-03 em {f3} de {len(q3)}. Notas de 0 a 10 dadas por mim a partir das evidências registradas; não são auditoria externa.',P),
   Spacer(1,8),barras(),Spacer(1,4),Paragraph('Desde a I-M10 (9,09): Predição 8,2→8,4 (relatório por comarca com regra de amostra e API com aviso de amostra); Dados abertos 8,9→9,0 (texto selado e PDF de exemplo públicos); Privacidade 8,1→8,4 (máscara de dados pessoais antes da IA, contagem sem cookie, aceite LGPD no B2B); Acessibilidade 8,4→8,5 (21 páginas com 0 violação WCAG 2.2 AA); IA responsável 9,4→9,5 (ficha de lei: erros de 3/10 para 0/10); Gestão 9,5→9,6 (OKRs selados, matriz de prioridade, teste A/B e tração por canal medidos).',PS),
   Paragraph('O que entrou desde a I-M10',H2)]
t=[[Paragraph(x,K) for x in ['Passo','Status','Evidência','Tema']]]
for a,b,c,d in PED: t.append([Paragraph(f'<b>{a}</b>',PS),Paragraph(f'<font color="{COR[b].hexval()}"><b>{b}</b></font>',PS),Paragraph(c,PS),Paragraph(d,PS)])
T=Table(t,colWidths=[52*mm,15*mm,82*mm,25*mm],repeatRows=1);T.setStyle(TableStyle([('LINEBELOW',(0,0),(-1,-1),0.3,LINHA),('VALIGN',(0,0),(-1,-1),'TOP')]));E+=[T,PageBreak()]
E+=[Paragraph(f'Fila I-04: {len(q4)} PROMPTs encadeados',H2),Paragraph('Cada PROMPT carrega o sha256 do anterior: sha256_prompt = sha256(elo_anterior + PROMPT). O 1º elo é o último PROMPT do ciclo I-03 (C30). Trocar uma palavra de qualquer PROMPT muda todos os elos seguintes, então a sequência não pode divergir sem deixar rastro. O script fechar_i04.py recusa fechar um passo enquanto algum anterior não estiver feito ou formalmente em espera.',P)]
t=[[Paragraph(x,K) for x in ['Nº','Tema','Passo, status e PROMPT','KPI','sha256 (12)']]]
for x in q4: t.append([Paragraph(x['n'],PS),Paragraph(x['tema'],PS),Paragraph(f"<b>{x['titulo']}</b> [{x['status']}]. {x['prompt']}",PS),Paragraph(x['kpi'],PS),Paragraph(x['sha256_prompt'][:12],PS)])
T=Table(t,colWidths=[10*mm,24*mm,86*mm,34*mm,20*mm],repeatRows=1);T.setStyle(TableStyle([('LINEBELOW',(0,0),(-1,-1),0.3,LINHA),('VALIGN',(0,0),(-1,-1),'TOP')]));E+=[T]
E+=[Paragraph('Ainda abertos do ciclo I-03',H2),Paragraph('; '.join(f"{x['n']} {x['titulo']} ({x['status']})" for x in q3 if x['status']!='feito')+'.',P),
    Paragraph('Prova de registro',H2),Paragraph(f"Cabeça da cadeia I-04: {q4d['cabeca']}. Selada no Bitcoin por OpenTimestamps em unificado/i04/cadeia-I04-sha256.ots. Para conferir: opentimestamps.org, enviar o .ots com o fila-I04.json.",PS)]
prompt=("Medição I-M11 (D06–D08 e L01–L05 desde a I-M10): reavalie os 10 temas só com evidência registrada; "
        "mostre cada passo com status e evidência; mostre a fila I-04; sele o PDF no Bitcoin.")
E+=[Paragraph('PROMPT desta medição',K),Paragraph(prompt,PR),Paragraph(f'sha256 do PROMPT: {hashlib.sha256(prompt.encode()).hexdigest()}',PS)]
doc.build(E,onFirstPage=rod,onLaterPages=rod)
print(out,hashlib.sha256(open(out,'rb').read()).hexdigest(),round(media,2),f'{pct:.1f}%')
