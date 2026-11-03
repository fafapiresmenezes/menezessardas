"""Passo L04: gera o PDF de exemplo do relatório por comarca a partir do texto selado (JSON) do banco."""
import json, sys, hashlib
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle

entrada, saida = sys.argv[1], sys.argv[2]
texto = open(entrada, encoding='utf-8').read()
sha = hashlib.sha256(texto.encode('utf-8')).hexdigest()
r = json.loads(texto)
c, e = r['comarca_dados'], r['estado']
n = lambda x: f"{x:,}".replace(',', '.')
pct = lambda x: f"{x*100:.1f}%".replace('.', ',')
def taxa(m):
    if not m.get('procedencia'): return f"não mostrada (só {m['merito']} julgamentos de mérito)"
    p = m['procedencia']; return f"{pct(p['p'])} (IC 95%: {pct(p['ic95'][0])} a {pct(p['ic95'][1])})"
dias = lambda d: '—' if d is None else f"{n(d)} dias (≈ {round(d/30.4)} meses)"
ss = getSampleStyleSheet()
H = ParagraphStyle('h', parent=ss['Title'], fontName='Times-Bold', fontSize=22, alignment=0, spaceAfter=4)
K = ParagraphStyle('k', parent=ss['Normal'], fontName='Courier', fontSize=8, textColor=colors.HexColor('#555555'))
P = ParagraphStyle('p', parent=ss['Normal'], fontName='Helvetica', fontSize=10, leading=14)
S = ParagraphStyle('s', parent=P, fontSize=8.5, leading=11.5, textColor=colors.HexColor('#444444'))
doc = SimpleDocTemplate(saida, pagesize=A4, leftMargin=20*mm, rightMargin=20*mm, topMargin=18*mm, bottomMargin=18*mm,
                        title=f"{r['titulo']} · {r['comarca']} ({r['tribunal']})", author='Instituto THEYE')
d = r['base_em'].split('-')[::-1]
el = [Paragraph(f"INSTITUTO THEYE · {r['titulo'].upper()} · BASE DE {'/'.join(d)}", K), Spacer(1, 6),
      Paragraph(f"{r['comarca']} ({r['tribunal']})", H), Spacer(1, 6)]
if c['amostra'] != 'adequada':
    el.append(Paragraph('Amostra ' + c['amostra'] + ': leia a taxa junto com a margem.', P))
kp = Table([[f"Ações de locação\n{n(c['acoes'])}", f"Pedido aceito\n{pct(c['procedencia']['p']) if c.get('procedencia') else '—'}",
             f"Tempo mediano\n{'—' if c['tempo_mediano_dias'] is None else n(c['tempo_mediano_dias']) + ' dias'}"]], colWidths=[56*mm]*3)
kp.setStyle(TableStyle([('BOX', (0,0), (-1,-1), .5, colors.grey), ('INNERGRID', (0,0), (-1,-1), .5, colors.grey),
                        ('FONT', (0,0), (-1,-1), 'Times-Bold', 15), ('LEADING', (0,0), (-1,-1), 20), ('VALIGN', (0,0), (-1,-1), 'TOP'),
                        ('TOPPADDING', (0,0), (-1,-1), 8), ('BOTTOMPADDING', (0,0), (-1,-1), 8)]))
el += [kp, Spacer(1, 12)]
t = Table([['', r['comarca'], f"Estado ({r['tribunal']})"],
           ['Ações', n(c['acoes']), n(e['acoes'])], ['Julgamentos de mérito', n(c['merito']), n(e['merito'])],
           ['Procedência', Paragraph(taxa(c), P), Paragraph(taxa(e), P)], ['Tempo mediano', dias(c['tempo_mediano_dias']), dias(e['tempo_mediano_dias'])]],
          colWidths=[42*mm, 64*mm, 64*mm])
t.setStyle(TableStyle([('FONT', (0,0), (-1,0), 'Helvetica-Bold', 9), ('FONT', (0,1), (-1,-1), 'Helvetica', 10),
                       ('LINEBELOW', (0,0), (-1,-1), .4, colors.lightgrey), ('VALIGN', (0,0), (-1,-1), 'TOP')]))
el += [t, Spacer(1, 12), Paragraph('Ações por tipo: ' + '; '.join(f"{x['classe']} {n(x['acoes'])}" for x in c['por_classe']) + '.', S), Spacer(1, 8),
       Paragraph('Método: ' + r['metodo'], S), Spacer(1, 4), Paragraph('Fonte: ' + r['fonte'] + ' Não é parecer jurídico.', S), Spacer(1, 10),
       Paragraph('Código de registro (sha256 do texto selado): ' + sha, K), Spacer(1, 4),
       Paragraph('Registro no Bitcoin pelo OpenTimestamps: o arquivo .ots publicado ao lado deste PDF prova a data. Confira em opentimestamps.org. '
                 'O texto selado pode ser baixado em instituto-theye.vercel.app/comarca.html.', S)]
doc.build(el)
print(sha)
