import json,hashlib,datetime,glob,sys
sys.path.insert(0,'/mnt/project-files/unificado/ferramentas')
from dados import TEMAS
from reportlab.lib.pagesizes import A4
from reportlab.platypus import SimpleDocTemplate,Paragraph,Spacer,Table,TableStyle
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib import colors
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.graphics.shapes import Drawing,Rect,String,Line
f=lambda n:glob.glob(f'/usr/share/fonts/**/{n}',recursive=True)[0]
for a,b in [('Se','DejaVuSerif.ttf'),('Sa','DejaVuSans.ttf'),('SaB','DejaVuSans-Bold.ttf'),('Mo','DejaVuSansMono.ttf')]: pdfmetrics.registerFont(TTFont(a,f(b)))
TINTA=colors.HexColor('#151a22');OURO=colors.HexColor('#9a7a3c');CINZA=colors.HexColor('#5b6370');LINHA=colors.HexColor('#d9d4c7');VERDE=colors.HexColor('#2f6b4f');PAPEL=colors.HexColor('#f4f1ea')
st=lambda **k:ParagraphStyle('x',**k)
H1=st(fontName='Se',fontSize=22,leading=27,textColor=TINTA,spaceAfter=8);H2=st(fontName='Se',fontSize=14,leading=18,textColor=TINTA,spaceBefore=10,spaceAfter=5)
K=st(fontName='Mo',fontSize=7.5,leading=10,textColor=OURO);P=st(fontName='Sa',fontSize=9,leading=13,textColor=TINTA,spaceAfter=4);PS=st(fontName='Sa',fontSize=7.8,leading=10.5,textColor=CINZA)
PR=st(fontName='Mo',fontSize=7.6,leading=10.5,textColor=TINTA,backColor=PAPEL,borderPadding=5,spaceBefore=3,spaceAfter=6)
M1={'Ontologia preditiva de grafo':(7.5,'U05: Lei 8.245/91 em 77 nós com fonte; 14/14 assuntos de locação da TPU mapeados; 6 precedentes conferidos. Falta: temas repetitivos do STJ e arestas no banco (U06).'),
 'Segurança':(7.5,'U04: desafio anti-robô agora de uso único (testado: 2º uso recusado). Falta: /security-review e ASVS L2 formais.'),
 'Gestão do projeto':(7.5,'Maestro religado: 5/5 passos com evidência, bloco sha1 e elo sha256; plano ilustrado selado. Falta: SPI medido (passos sem data-alvo).')}

for i,(nome,ref,nota,hoje,meta) in enumerate(TEMAS):
    if nome in M1: TEMAS[i]=(nome,ref,M1[nome][0],M1[nome][1],meta)
novo={'Predição jurídica':(6.5,'U07+U09: I-11 pré-registrado e selado antes de rodar; 977 casos de teste; ECE do grafo 1,4% (meta < 3% atendida, U10). Falta: BSS do grafo com IC inteiro acima de zero (C−A: −0,0052 a +0,0013; C−B inconclusivo).'),
 'Ontologia preditiva de grafo':(8.0,'U06: 83 normas, 6 precedentes e 13 teses no banco; 100% dos processos ligados a pelo menos uma norma. Falta: temas repetitivos do STJ completos e validação OQuaRE formal.'),
 'Dados abertos e qualidade':(7.5,'U08: 21.147 processos em 6 tribunais; 9/9 cargas sem falha; amostragem documentada. Falta: 99% de sucesso em 30 dias e desfecho em ≥ 40% (hoje 23%).'),
 'IA responsável':(7.0,'U09: resultado inconclusivo publicado sem ajuste; correção de código registrada antes das métricas. Falta: cartão do modelo e mapa NIST.'),
 'Gestão do projeto':(8.0,'10/10 passos com evidência, bloco sha1 e elo sha256; PROMPT reforçado de M encadeado. Falta: SPI medido (passos sem data-alvo).')}

# Base desta medição = notas da I-M2
for i,(nome,ref,nota,hoje,meta) in enumerate(TEMAS):
    if nome in novo: TEMAS[i]=(nome,ref,novo[nome][0],novo[nome][1],meta)
novo={'Predição jurídica':(7.0,'U11–U13: motor coleta 10/10 fontes públicas na nuvem 4×/dia; placar único com 6 protocolos selados no Bitcoin; escritório já consome a previsão do Instituto (API só para a equipe, testada: anônimo 401, equipe n=490). Falta: BSS do grafo com IC inteiro acima de zero.'),
 'Ontologia preditiva de grafo':(8.5,'U14: 70 de 70 valores dos 5 tipos do escritório (Contrato, Imóvel, Locatário, Caso, Prazo) mapeados à ontologia; 6 propostas para a v0.7. Falta: v0.7 publicada e validação OQuaRE formal.'),
 'Dados abertos e qualidade':(8.0,'U11: coletor-motor 10/10 fontes na 1ª rodada; INPE bateu 0% de diferença com o PC. Falta: 7 dias de comparação (07/11) e desfecho em ≥ 40%.'),
 'Engenharia de software':(7.5,'U13: cartão no escritório com 3 testes unitários passando e produção conferida; U15: função de agentes versionada (v3) com teste por lote. Falta: E2E do site do Instituto e Lighthouse (U17).'),
 'Segurança':(8.0,'U13: API exige login da equipe (RPC confere usuarios_perfis); U15: cota por pessoa (3/20 por dia) e teto global de 300/dia contra abuso de custo. Falta: /security-review e ASVS L2 formais.'),
 'Privacidade e LGPD':(8.5,'U13 e U15 guardam só contagem diária, nunca quem consultou nem o texto da pergunta; U14 lista campos que nunca saem do escritório. Falta: RIPD formal e política de retenção publicada.'),
 'IA responsável':(7.5,'U15: 50 agentes dizem que não são pessoas nem têm vínculo com universidades, nunca prometem resultado, citam lei e mostram o custo de cada resposta. Falta: cartão do modelo e mapa NIST.'),
 'Gestão do projeto':(8.5,'15/15 passos com evidência, bloco sha1 e elo sha256; PDF ilustrado selado e copiado a cada passo. Falta: SPI medido (passos sem data-alvo).')}

for i,(nome,ref,nota,hoje,meta) in enumerate(TEMAS):
    if nome in novo: TEMAS[i]=(nome,ref,novo[nome][0],novo[nome][1],meta)
N4=json.load(open('/mnt/project-files/unificado/u18/notas-U18.json'))
EV4={'Predição jurídica':'U18 TRIPOD+AI: 7 de 10 itens atendidos; faltam vencer a melhor base, validação externa e subgrupos.',
 'Ontologia preditiva de grafo':'U18 OQuaRE/OBO: cobertura e alinhamento completos; faltam OWL/RDF publicado, URIs persistentes, raciocinador e changelog.',
 'Dados abertos e qualidade':'U18 FAIR/DAMA: volume, atualidade e unicidade ok; faltam licença aberta, download/DOI e 30 dias de coleta a 99%.',
 'Engenharia de software':'U17+U18 ISO 25010: teste E2E automático no repositório, Lighthouse 99–100; faltam SLO de 30 dias e mais testes unitários.',
 'Segurança':'U18 ASVS L2 + LLM Top 10: 8,5 de 10; faltam filtro contra injeção de prompt e /security-review formal.',
 'Privacidade e LGPD':'U18 LGPD/27701: minimização e política ok; faltam RIPD, encarregado nomeado e prazo de retenção.',
 'Acessibilidade e experiência':'U17: 0 violações axe em 10 páginas; faltam teste com leitor de tela e SUS com 5 avaliadores.',
 'Desempenho web':'U17: LCP 1,5 s, CLS ≤ 0,04, Lighthouse ≥ 96; faltam INP e medição de campo (RUM).',
 'IA responsável':'U18 NIST AI RMF: 4 funções com evidência; faltam cartão do modelo, registro de incidentes e revisão humana.',
 'Gestão do projeto':'18 de 20 passos com evidência e elo; U16 aguarda M; U19 bloqueado (e2e exige login); falta SPI/CPI.'}
novo={k:(N4[k],EV4[k]) for k in N4}

for i,(nome,ref,nota,hoje,meta) in enumerate(TEMAS):
    if nome in novo: TEMAS[i]=(nome,ref,novo[nome][0],novo[nome][1],meta)
N5=json.load(open('/mnt/project-files/unificado/i03/notas-I-M5.json'))
EV5={'Ontologia preditiva de grafo':'C01–C03: OWL/Turtle publicado e selado; 184 URIs persistentes em /o/; OWL RL + SHACL sem inconsistência; changelog v0.4→v0.7. 9 de 9 itens OQuaRE/OBO atendidos.',
 'Privacidade e LGPD':'C04: RIPD-v1 publicado em /privacidade.html. Faltam encarregado (cartão a M) e limpeza automática por prazo (cartão a M).',
 'IA responsável':'C07: cartão do modelo MC-v1 em /modelo.html. Faltam registro de incidentes (C08) e revisão humana por amostra (C09).'}
novo={k:(N5[k],EV5.get(k,EV4[k]+' (sem mudança desde I-M4)')) for k in N5}
for i,(nome,ref,nota,hoje,meta) in enumerate(TEMAS):
    if nome in novo: TEMAS[i]=(nome,ref,novo[nome][0],novo[nome][1],meta)
N6=json.load(open('/mnt/project-files/unificado/i03/notas-I-M6.json'))
EV6={'IA responsável':'C08: registro de incidentes no ar (botão, protocolo, resumo público). C09: amostra semanal para revisão humana no ar; 1ª revisão aguarda M. Contexto dos agentes atualizado para ontologia v0.7.',
 'Desempenho web':'C10: medição de campo própria sem cookies; C11: INP 0–24 ms em laboratório; C12: Lighthouse diário em produção com alerta < 95 (agentes 86 → 100 após corrigir deslocamento de layout e servir fontes próprias).',
 'Acessibilidade e experiência':'C13: roteiro de leitor de tela por emulação nas 13 páginas (link pular, h1, títulos, alvos de toque); C15: axe 0 violação no modo escuro. Faltam leitor de tela real e SUS com 5 pessoas.'}
novo={k:(N6[k],EV6.get(k,'Sem mudança desde I-M5')) for k in N6}
for i,(nome,ref,nota,hoje,meta) in enumerate(TEMAS):
    if nome in novo: TEMAS[i]=(nome,ref,novo[nome][0],novo[nome][1],meta)
N7=json.load(open('/mnt/project-files/unificado/i03/notas-I-M7.json'))
EV7={'Predição jurídica':'C20: Brier por 6 tribunais e pelo lado que propõe a ação, publicado no cartão do modelo; o grafo empata nos despejos e no TJSP e perde nas ações do locatário e no TJRJ. Faltam vencer a base (C21, modelo C2) e a validação externa (C19, 30/11).',
 'Dados abertos e qualidade':'C16: base agregada em CSV (748 linhas, 18.408 processos, células com menos de 5 suprimidas) com licença CC BY 4.0, dicionário, método e citação em /dados.html. Faltam DOI (C17, precisa de conta Zenodo) e 30 dias de coleta a 99% (C18).',
 'Engenharia de software':'C30: GitHub Action testa o site a cada envio (52 verificações: 13 páginas, 2 larguras, claro e escuro); 1ª execução verde. Faltam SLO de 30 dias (C29) e testes de todas as funções (C28).',
 'Segurança':'C26: filtro contra injeção de prompt em 3 camadas; 20 de 20 ataques barrados em produção e 12 perguntas legítimas liberadas. Falta revisão de segurança formal (C25, C27).',
 'Gestão do projeto':'C22: data-alvo e custo para os 30 passos; SPI 1,10 e CPI 1,25 em 02/11. Faltam decisões de M (U16, theye.club, C05, C06, C09).'}
novo={k:(N7[k],EV7.get(k,'Sem mudança desde I-M6')) for k in N7}
rows=[];soma0=soma1=0
for nome,ref,nota,hoje,meta in TEMAS:
    n1,ev=novo.get(nome,(nota,hoje+' (sem mudança desde I-02)'))
    rows.append((nome,ref,nota,n1,ev,meta));soma0+=nota;soma1+=n1
m0=soma0/10;m1=soma1/10
q=json.load(open('/mnt/project-files/unificado/fila-I02.json'))['passos'];nf=sum(x['status']=='feito' for x in q)
agora=datetime.datetime.now(datetime.UTC).strftime('%d/%m/%Y %H:%M UTC')
W=174*mm
def barras():
    D=Drawing(W,10*22+10)
    for i,r in enumerate(rows):
        y=10*22-i*22;D.add(String(0,y+4,r[0],fontName='Sa',fontSize=7.5,fillColor=TINTA))
        x0=58*mm;w=W-x0-20
        D.add(Rect(x0,y,w,12,fillColor=PAPEL,strokeColor=LINHA))
        D.add(Rect(x0,y,w*r[3]/10,12,fillColor=VERDE,strokeColor=None))
        D.add(Line(x0+w*r[2]/10,y-2,x0+w*r[2]/10,y+14,strokeColor=OURO,strokeWidth=1.5))
        D.add(String(x0+w+4,y+3,f'{r[3]:.1f}'.replace('.',','),fontName='SaB',fontSize=8,fillColor=TINTA))
    return D
out='/mnt/project-files/unificado/medicao-I-M7.pdf'
doc=SimpleDocTemplate(out,pagesize=A4,leftMargin=18*mm,rightMargin=18*mm,topMargin=16*mm,bottomMargin=18*mm,title='Medição I-M7',author='Instituto THEYE')
def rod(c,d):
    c.saveState();c.setFont('Sa',7);c.setFillColor(CINZA);c.drawString(18*mm,10*mm,f'Medição I-M7 · ciclo I-03 · {agora}');c.drawRightString(192*mm,10*mm,f'Desenvolvido pelo Instituto THEYE · {d.page}');c.restoreState()
prompt=("Medição I-M7: reavalie os 10 temas do ciclo I-03 contra os referenciais citados, usando só evidência registrada em fila-I03.json "
        "e nos relatórios STEP-Cxx; mantenha a nota onde não houve evidência nova; use a planilha item a item atualizada (avaliacao-I-M7.xlsx) como nota e registre o que falta para 10.")
E=[Paragraph('MEDIÇÃO I-M7 · CICLO I-03 · APÓS 15 DE 30 PASSOS',K),Spacer(1,4),
   Paragraph(f'Média {m1:.2f} (era {m0:.2f}).'.replace('.',',',2),H1),
   Paragraph(f'Gerado em {agora}. Notas de 0 a 10 dadas por mim a partir das evidências; não são auditoria externa. Traço dourado = nota da medição I-M6; barra verde = nota agora.',P),barras(),
   Paragraph('Tema a tema',H2)]
t=[[Paragraph(x,K) for x in ['Tema','Antes','Agora','Evidência','Critério para 10']]]
for nome,ref,n0,n1,ev,meta in rows: t.append([Paragraph(f'<b>{nome}</b><br/>{ref}',PS),Paragraph(f'{n0:.1f}'.replace('.',','),PS),Paragraph(f'<b>{n1:.1f}</b>'.replace('.',','),PS),Paragraph(ev,PS),Paragraph(meta,PS)])
T=Table(t,colWidths=[42*mm,14*mm,14*mm,56*mm,48*mm],repeatRows=1);T.setStyle(TableStyle([('LINEBELOW',(0,0),(-1,-1),0.3,LINHA),('VALIGN',(0,0),(-1,-1),'TOP')]));E+=[T]
E+=[Paragraph('Próximos passos',H2),Paragraph('Seguem no ciclo I-03: relatório semanal selado (C24), revisão de segurança e ASVS L2 (C25, C27), testes de todas as funções (C28), modelo C2 pré-registrado (C21), painel de coleta e SLO de 30 dias (C18, C29) e validação externa em 30/11 (C19). Dependem de M: conta Zenodo para o DOI, revisão humana da 1ª amostra dos agentes, 5 avaliações SUS, encarregado de dados, limpeza automática por prazo, hospedagem (U16) e theye.club.',P),
    Paragraph('PROMPT desta medição',K),Paragraph(prompt,PR),Paragraph(f'sha256 do PROMPT: {hashlib.sha256(prompt.encode()).hexdigest()}',PS)]
doc.build(E,onFirstPage=rod,onLaterPages=rod)
print(out,hashlib.sha256(open(out,'rb').read()).hexdigest(),round(m0,2),round(m1,2))
