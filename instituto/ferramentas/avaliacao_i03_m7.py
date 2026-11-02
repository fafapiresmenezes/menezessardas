# U18: avaliação item a item pelos 10 referenciais mundiais. S=atende(1), P=parcial(0,5), N=não(0). Nota = 10 × média.
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment
from openpyxl.utils import get_column_letter
A={
"Predição jurídica|TRIPOD+AI (BMJ 2024)":[
("Fonte dos dados e período descritos","S","DataJud/CNJ, 6 tribunais, 21.147 processos; amostragem-U08.md"),
("Desfecho definido antes da análise","S","Pré-registro I-11 selado no Bitcoin (preregistro-I11.pdf.ots)"),
("Preditores só com informação anterior à decisão","S","Regra de corte temporal no pré-registro; variáveis de grafo só pré-decisão"),
("Validação fora da amostra e temporal","S","Treino passado, teste futuro: 977 casos de teste"),
("Discriminação e calibração reportadas","S","Brier, ECE 1,4% e curva de confiabilidade em /comparar.html"),
("Comparação com linha de base e IC","S","C−B +0,0016, IC95 [−0,0006; +0,0038]; publicado inconclusivo"),
("Modelo supera a melhor base","N","IC cruza zero: grafo não venceu o convencional"),
("Validação externa (outro período ou tribunal)","N","Ainda não feita"),
("Análise de subgrupos e justiça","S","C20: Brier por 6 tribunais e por lado que propõe a ação em /modelo.html#subgrupos; grafo perde em ações do locatário e TJRJ"),
("Código e protocolo disponíveis","S","Repositório GitHub e Edge functions versionadas")],
"Ontologia preditiva de grafo|OQuaRE / OBO / FAIR":[
("Classes e relações documentadas","S","Ontologia v0.6: 15 classes, 18 relações (/locacao.html)"),
("Alinhamento a vocabulários oficiais","S","TPU-CNJ (classes e assuntos), Lei 8.245/91 por artigo (77 nós)"),
("Fonte e vigência por nó/aresta","S","Regra herdada da v0.4; precedentes com fonte STJ/STF"),
("Cobertura do domínio","S","70/70 valores do escritório mapeados (alinhamento-ontologia.md)"),
("Cobertura de processos","S","90,1% dos processos com aresta para norma (meta 90%)"),
("Formato padrão (OWL/RDF) publicado","S","C01: /ontologia-locacao-v07.ttl, 744 triplas, CC BY 4.0, selado OTS"),
("Identificadores persistentes (URI)","S","C02: 184 termos em /o/<id>, 184/184 resolvem"),
("Validação por raciocinador/consistência","S","C03: OWL RL + SHACL, 0 inconsistência (/consistencia-v07.json)"),
("Versionamento e changelog","S","C03: /ontologia-changelog.txt v0.4→v0.7")],
"Dados abertos e qualidade|FAIR + DAMA-DMBOK":[
("Encontrável: metadados e índice","P","Página e placar descrevem a base; sem DOI/catálogo"),
("Acessível: protocolo aberto","S","C16: CSV por HTTPS em /dados-locacao-agregados-v1.csv, sem cadastro"),
("Interoperável: vocabulários padrão","S","Códigos TPU-CNJ e números de artigo"),
("Reutilizável: licença declarada","S","C16: CC BY 4.0 com dicionário, método e citação em /dados.html"),
("Completude e volume","S","21.147 processos, 6 tribunais, 4.901 com mérito"),
("Atualidade","S","Coleta diária automática"),
("Unicidade","S","Chave por número do processo (em hash)"),
("Amostragem documentada","S","amostragem-U08.md"),
("Sucesso da coleta ≥ 99% em 30 dias","P","0 falhas na rodada U08; janela de 30 dias não completou")],
"Engenharia de software|ISO/IEC 25010:2023":[
("Adequação funcional","S","10 páginas e 6 funções no ar, testadas (U17)"),
("Eficiência de desempenho","S","Lighthouse desempenho 99–100"),
("Compatibilidade","S","Navegadores modernos; API usada pelo escritório (U13)"),
("Interação (usabilidade)","S","Acessibilidade 100, sem rolagem lateral em 390 px"),
("Confiabilidade","P","Fallback de modelo nos agentes; sem SLO medido 30 dias"),
("Segurança","S","Ver tema Segurança"),
("Manutenibilidade","S","C30: CI a cada push (52 verificações do site) + vitest 42 testes da função dos agentes"),
("Flexibilidade/portabilidade","S","Site estático + Edge; pode mudar de host (U16)"),
("Teste automático de ponta a ponta","S","u17-teste.mjs (Playwright, axe, Lighthouse) no repositório")],
"Segurança|OWASP ASVS 5.0 L2 + Top 10 LLM 2025":[
("Controle de acesso no servidor (RLS)","S","RLS em tabelas; schema instituto só via RPC SECURITY DEFINER"),
("Funções sensíveis só com service_role","S","reservar/registrar/def dos agentes restritas"),
("Cabeçalhos de segurança (CSP, HSTS)","S","vercel.json com CSP estrita"),
("Anti-robô e limite de taxa","S","Desafio de uso único; limite por rede; cota 3/20 e teto 300/dia"),
("Segredos fora do cliente","S","Chave Anthropic só no banco/Edge"),
("CORS restrito","S","Lista de origens (Instituto e theye.club)"),
("Injeção de prompt (LLM01)","S","C26: filtro em 3 camadas; 20/20 ataques barrados em produção"),
("Saída insegura do LLM (LLM05)","S","Resposta inserida como texto, não HTML"),
("Consumo ilimitado (LLM10)","S","max_tokens 1500, cotas e teto diário"),
("Revisão de segurança formal","N","/security-review ainda não rodado neste ciclo")],
"Privacidade e LGPD|LGPD + ISO/IEC 27701":[
("Minimização de dados","S","CPF só como HMAC; IP em hash; processos em hash"),
("Base legal declarada","S","Art. 7º, V e IX na página do laboratório"),
("Política de privacidade publicada","S","Seção Privacidade em /laboratorio.html (termos-lab-v1)"),
("Direitos do titular e prazo","S","Canal por e-mail; 15 dias"),
("Só agregados públicos","S","Nenhum perfil pessoal de julgador"),
("RIPD (relatório de impacto)","S","C04: /privacidade.html RIPD-v1"),
("Encarregado (DPO) nomeado","N","Não nomeado"),
("Retenção definida","P","Não há prazo de retenção escrito")],
"Acessibilidade e experiência|WCAG 2.2 AA + SUS":[
("Zero violação axe automática","S","U17: 0 violações em 10 páginas"),
("Contraste ≥ 4,5:1","S","Cores ajustadas em U17"),
("Ordem de títulos e marcos","S","Corrigido em U17"),
("Teclado e foco visível","S",":focus-visible e regiões roláveis focáveis"),
("Responsivo em 390 px","S","Sem rolagem lateral"),
("Teste com leitor de tela real","P","C13: emulação por árvore de acessibilidade nas 13 páginas, 0 problema após correções; falta sessão com NVDA/VoiceOver real"),
("SUS ≥ 80 com 5 avaliadores","N","Não aplicado")],
"Desempenho web|Core Web Vitals + Lighthouse":[
("LCP < 2,5 s","S","LCP 1,47–1,65 s (laboratório)"),
("CLS < 0,1","S","CLS ≤ 0,04"),
("INP < 200 ms","P","C11: 0–24 ms em laboratório (CPU 4x mais lenta); dado de campo (p75) em coleta desde 01/11"),
("Lighthouse ≥ 95 nas 4 categorias","S","C12: teste diário em produção no GitHub Actions; 97–100 desempenho, 100 acessibilidade, 96 boas práticas, 100 SEO; alerta abaixo de 95"),
("Medição de campo (RUM)","S","C10: vitais.js próprio sem cookies (LCP, INP, CLS, TTFB) em todas as páginas; resumo p75 público por RPC")],
"IA responsável|NIST AI RMF 1.0 + CNJ 615/2025 + AI Act":[
("Governar: papéis e regras escritas","S","Plano I-02, regras de M, gerente agendado"),
("Mapear: contexto e limites declarados","S","Avisos de não garantia e que agentes são IA"),
("Medir: métricas de desempenho e incerteza","S","Brier, ECE, IC; custo por resposta"),
("Gerir: resultado negativo publicado","S","I-11 inconclusivo publicado"),
("Transparência sobre IA ao usuário","S","agentes.html deixa claro que não são pessoas"),
("Supervisão humana","P","C09: amostra semanal de até 20 respostas no ar; 1ª revisão humana aguarda M"),
("Cartão do modelo publicado","S","C07: /modelo.html MC-v1"),
("Registro de incidentes de IA","S","C08: botão Relatar resposta errada, protocolo INC, tabela e resumo público")],
"Gestão do projeto|PMBOK 7 + OKR + Valor agregado":[
("Plano com escopo e passos","S","plano-unificado-I02.pdf, 20 passos"),
("Evidência e elo por passo","S","fila-I02.json sha256_evidencia + BLOCKCHAIN.txt"),
("Selo externo (OpenTimestamps)","S","PDFs e medições com .ots"),
("Medição periódica","S","I-M1, I-M2, I-M3"),
("OKRs com KRs mensuráveis","S","O1–O3 com 9 KRs"),
("Cadência sem parada","S","Gerente 3x/dia; 17 passos no mesmo dia"),
("SPI/CPI medidos","S","C22: SPI 1,10, CPI 1,25 em 02/11 10:48Z (i03/spi-cpi.json)"),
("Decisões pendentes do patrocinador","P","U16 e theye.club aguardam M")],
}
nota=lambda its: round(10*sum({'S':1,'P':.5,'N':0}[s] for _,s,_ in its)/len(its),1)
wb=Workbook(); r=wb.active; r.title='Resumo'
r.append(['Tema','Referencial','Itens','Atende','Parcial','Não','Nota (0–10)'])
for k,its in A.items():
    t,ref=k.split('|'); c=[s for _,s,_ in its]
    r.append([t,ref,len(its),c.count('S'),c.count('P'),c.count('N'),nota(its)])
n=len(A)+1; r.append(['Média','','','','','',f'=ROUND(AVERAGE(G2:G{n}),2)'])
it=wb.create_sheet('Itens'); it.append(['Tema','Referencial','Item do checklist','Situação','Pontos','Evidência'])
for k,its in A.items():
    t,ref=k.split('|')
    for i,s,e in its: it.append([t,ref,i,{'S':'Atende','P':'Parcial','N':'Não atende'}[s],{'S':1,'P':.5,'N':0}[s],e])
for ws,w in ((r,[30,40,8,8,8,8,12]),(it,[28,34,46,12,8,70])):
    for i,x in enumerate(w,1): ws.column_dimensions[get_column_letter(i)].width=x
    for c in ws[1]: c.font=Font(bold=True,color='FFFFFF'); c.fill=PatternFill('solid',fgColor='0F1A2B')
    for row in ws.iter_rows(min_row=2):
        for c in row: c.alignment=Alignment(wrap_text=True,vertical='top')
wb.save('/mnt/project-files/unificado/i03/avaliacao-I-M7.xlsx')
import json; json.dump({k.split('|')[0]:nota(v) for k,v in A.items()},open('/mnt/project-files/unificado/i03/notas-I-M7.json','w'),ensure_ascii=False,indent=1)
for k,v in A.items(): print(k.split('|')[0],nota(v),len(v))
print('média',round(sum(nota(v) for v in A.values())/10,2), 'itens',sum(len(v) for v in A.values()))
