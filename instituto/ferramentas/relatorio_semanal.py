# Passo C24: relatório semanal automático do Instituto THEYE em PDF, selável por OpenTimestamps.
# Uso: python3 relatorio_semanal.py [AAAA-MM-DD]  (data dentro da semana; padrão = hoje). Idempotente: refaz a semana pedida.
# Lê só registros já existentes: fila-I03.json, cadeia-instituto.txt, notas-I-M*.json, spi-cpi.json.
import json, glob, hashlib, datetime as dt, sys, re, subprocess
from reportlab.lib.pagesizes import A4
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib import colors
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
f = lambda n: glob.glob(f'/usr/share/fonts/**/{n}', recursive=True)[0]
for a, b in [('Se', 'DejaVuSerif.ttf'), ('Sa', 'DejaVuSans.ttf'), ('Mo', 'DejaVuSansMono.ttf')]: pdfmetrics.registerFont(TTFont(a, f(b)))
TINTA = colors.HexColor('#151a22'); OURO = colors.HexColor('#9a7a3c'); CINZA = colors.HexColor('#5b6370'); LINHA = colors.HexColor('#d9d4c7')
st = lambda **k: ParagraphStyle('x', **k)
H1 = st(fontName='Se', fontSize=20, leading=25, textColor=TINTA, spaceAfter=6); H2 = st(fontName='Se', fontSize=13, leading=17, textColor=TINTA, spaceBefore=10, spaceAfter=4)
K = st(fontName='Mo', fontSize=7.5, leading=10, textColor=OURO); P = st(fontName='Sa', fontSize=9, leading=13, textColor=TINTA, spaceAfter=4); PS = st(fontName='Sa', fontSize=7.8, leading=10.5, textColor=CINZA)
U = '/mnt/project-files/unificado'
dia = dt.date.fromisoformat(sys.argv[1]) if len(sys.argv) > 1 else dt.datetime.now(dt.timezone.utc).date()
ini = dia - dt.timedelta(days=dia.weekday()); fim = ini + dt.timedelta(days=6)
ano, sem, _ = dia.isocalendar(); rot = f'{ano}-W{sem:02d}'
br = lambda d: d.strftime('%d/%m')
fila = json.load(open(f'{U}/fila-I03.json')); fila = fila['passos'] if isinstance(fila, dict) else fila
def quando(p):
    v = p.get('feito_em'); return dt.datetime.strptime(v, '%Y-%m-%dT%H%MZ').date() if v else None
feitos_sem = [p for p in fila if p['status'] == 'feito' and quando(p) and ini <= quando(p) <= fim]
total = sum(p['status'] == 'feito' for p in fila)
pend = [p for p in fila if p['status'] != 'feito']
cad = [l for l in open('/mnt/project-files/instituto/cadeia-instituto.txt', encoding='utf-8') if l[:10] and ini.isoformat() <= l[:10] <= fim.isoformat()]
med = sorted(glob.glob(f'{U}/i03/notas-I-M*.json'), key=lambda x: int(re.search(r'M(\d+)', x).group(1)))
ult = json.load(open(med[-1])); nome_med = re.search(r'(I-M\d+)', med[-1]).group(1)
ev = json.load(open(f'{U}/i03/spi-cpi.json')) if glob.glob(f'{U}/i03/spi-cpi.json') else {}
out = f'{U}/i03/relatorio-semanal-{rot}.pdf'
doc = SimpleDocTemplate(out, pagesize=A4, leftMargin=18*mm, rightMargin=18*mm, topMargin=16*mm, bottomMargin=18*mm, title=f'Relatório semanal {rot}', author='Instituto THEYE')
agora = dt.datetime.now(dt.timezone.utc).strftime('%d/%m/%Y %H:%M UTC')
def rod(c, d):
    c.saveState(); c.setFont('Sa', 7); c.setFillColor(CINZA); c.drawString(18*mm, 10*mm, f'Relatório semanal {rot} · gerado em {agora}'); c.drawRightString(192*mm, 10*mm, f'Desenvolvido pelo Instituto THEYE · {d.page}'); c.restoreState()
media = sum(ult.values()) / len(ult)
E = [Paragraph(f'RELATÓRIO SEMANAL · {rot} · {br(ini)} A {br(fim)}', K), Spacer(1, 3),
     Paragraph(f'{len(feitos_sem)} passos feitos na semana; ciclo I-03 em {total} de {len(fila)}.', H1),
     Paragraph(f'Última medição item a item ({nome_med}): média {media:.2f} de 10.'.replace('.', ',', 1) + (f' Valor agregado: SPI {ev["SPI"]}, CPI {ev["CPI"]} ({ev["status_em"]}).'.replace('.', ',') if ev else ''), P),
     Paragraph('Feito na semana', H2)]
t = [[Paragraph(x, K) for x in ['Passo', 'Tema', 'O que foi feito', 'Quando']]]
for p in feitos_sem: t.append([Paragraph(f'<b>{p["n"]}</b>', PS), Paragraph(p['tema'], PS), Paragraph(f'{p["titulo"]}: {p["evidencia"][:260]}', PS), Paragraph(p['feito_em'], PS)])
if len(t) == 1: t.append([Paragraph('—', PS)] * 4)
T = Table(t, colWidths=[13*mm, 32*mm, 105*mm, 24*mm], repeatRows=1); T.setStyle(TableStyle([('LINEBELOW', (0, 0), (-1, -1), .3, LINHA), ('VALIGN', (0, 0), (-1, -1), 'TOP')])); E.append(T)
E.append(Paragraph(f'Notas por tema ({nome_med})', H2))
t2 = [[Paragraph(k, PS), Paragraph(f'{v:.1f}'.replace('.', ','), PS)] for k, v in ult.items()]
T2 = Table(t2, colWidths=[80*mm, 20*mm]); T2.setStyle(TableStyle([('LINEBELOW', (0, 0), (-1, -1), .3, LINHA)])); E.append(T2)
E.append(Paragraph('Pendências', H2))
for p in pend: E.append(Paragraph(f'<b>{p["n"]}</b> {p["titulo"]} · {p["status"]}', PS))
E.append(Paragraph('Registros da cadeia na semana', H2))
for l in cad[-40:]: E.append(Paragraph(l.strip()[:150].replace('&', '&amp;').replace('<', '&lt;'), PS))
doc.build(E, onFirstPage=rod, onLaterPages=rod)
print(out, hashlib.sha256(open(out, 'rb').read()).hexdigest(), len(feitos_sem), total)
