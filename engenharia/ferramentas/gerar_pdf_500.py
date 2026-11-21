# -*- coding: utf-8 -*-
# HTML (para virar PDF) dos 500 agentes de produção e da matriz de normas por país.
import html, json, os, sys
RAIZ = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
p = json.load(open(os.path.join(RAIZ, 'engenharia/agentes-500/agentes-producao-500.json'), encoding='utf-8'))
nm = json.load(open(os.path.join(RAIZ, 'src/lib/engenharia/normas-paises.json'), encoding='utf-8'))
e = lambda s: html.escape(str(s))
H = ['<!doctype html><html lang="pt-BR"><meta charset="utf-8"><title>500 agentes de engenharia</title><style>',
     'body{font-family:Georgia,serif;color:#111;margin:0;font-size:10.5pt;line-height:1.4}h1{font-size:26pt;margin:0 0 8px}h2{font-size:15pt;border-bottom:1px solid #999;padding-bottom:3px;margin-top:22px}',
     '.capa{height:250mm;display:flex;flex-direction:column;justify-content:center;padding:0 20mm;page-break-after:always}.ag{page-break-inside:avoid;border-top:1px solid #ccc;padding:8px 0}',
     'table{border-collapse:collapse;width:100%;font-size:8.5pt}td,th{border:1px solid #bbb;padding:3px;vertical-align:top;text-align:left}.c{color:#a15c00;font-size:8pt}.m{font-family:monospace;font-size:8.5pt;color:#555}section{padding:0 14mm}</style>',
     f'<div class="capa"><div class="m">THEYE Institute · engenharia</div><h1>500 agentes de produção de engenharia</h1><p>{len(p["disciplinas"])} disciplinas × {len(p["funcoes"])} trabalhos, com normas de {len(nm["paises"])} jurisdições: ' + ', '.join(e(v) for v in nm['paises'].values()) + f'.</p><p>Emitido em {e(p["emitido"])}. SHA-256 dos agentes: <span class="m">{e(p["sha256"])}</span><br>SHA-256 da matriz de normas: <span class="m">{e(nm["sha256"])}</span></p>',
     '<p><strong>Regras:</strong> ' + ' '.join(e(r) for r in p['regras']) + '</p><p><strong>Estado:</strong> ' + e(p['estado']) + '</p></div><section>']
H.append('<h2>1. Os 20 trabalhos que cada disciplina tem</h2><table><tr><th>Trabalho</th><th>Objetivo</th></tr>' + ''.join(f'<tr><td>{e(f["nome"])}</td><td>{e(f["objetivo"])}</td></tr>' for f in p['funcoes']) + '</table>')
H.append('<h2>2. As 25 disciplinas</h2><p>' + '; '.join(e(d['nome']) for d in p['disciplinas']) + '.</p>')
H.append('<h2>3. Normas por país</h2>')
for k, v in nm['notas'].items():
    H.append(f'<p><strong>{e(nm["paises"][k])}:</strong> {e(v)}</p>')
paises = list(nm['paises'])
H.append('<table><tr><th>Assunto</th>' + ''.join(f'<th>{e(x)}</th>' for x in paises) + '</tr>')
for c in nm['categorias'].values():
    H.append(f'<tr><td><strong>{e(c["nome"])}</strong></td>' + ''.join('<td>' + '<br>'.join(e(n['codigo']) + (' <span class="c">conferir</span>' if n['conferir'] else '') for n in c['normas'].get(x, [])) + '</td>' for x in paises) + '</tr>')
H.append('</table><h2>4. Os 500 agentes, com a instrução completa</h2>')
for a in p['agentes']:
    H.append(f'<div class="ag"><div class="m">{e(a["id"])} · {e(a["codigo"])}</div><strong>{e(a["nome"])}</strong><pre style="white-space:pre-wrap;font-family:Georgia,serif;font-size:9pt;margin:4px 0">{e(a["instrucao"])}</pre></div>')
H.append('</section></html>')
out = sys.argv[1]
open(out, 'w', encoding='utf-8').write(''.join(H))
print(out)
