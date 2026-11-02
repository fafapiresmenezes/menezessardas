# Passo C27: planilha OWASP ASVS 5.0 nível 2 aplicada ao Instituto THEYE (site estático + Edge functions + Postgres/Supabase).
# Status: S atende, P parcial, N não atende, NA não se aplica (com motivo). Evidência aponta arquivo, função ou teste.
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment
import json, hashlib
I = [
# (capítulo, requisito resumido, status, evidência)
("V1 Codificação e sanitização","Saída codificada conforme o contexto (HTML, JS, URL)","S","Respostas da IA e dados do servidor inseridos com textContent; único innerHTML (laboratorio.js:60) usa só texto fixo do código"),
("V1 Codificação e sanitização","Consultas ao banco parametrizadas","S","Só RPC do supabase-js com parâmetros; SQL das funções sem concatenação de entrada"),
("V1 Codificação e sanitização","Sem eval ou geração dinâmica de código","S","CSP script-src 'self' sem unsafe-eval; código sem eval"),
("V1 Codificação e sanitização","Entrada de LLM tratada como dado (injeção)","S","C26: filtro.ts + <pergunta> + regra no sistema; 20/20 ataques barrados"),
("V2 Validação e regras de negócio","Validação de entrada no servidor com lista permitida","S","normalizarEmail, cpfValido, motivos enumerados em instituto_relatar_incidente, limites de tamanho (500/1500)"),
("V2 Validação e regras de negócio","Limites de uso contra abuso de regra de negócio","S","Cota 3/20 por dia, teto 300/dia dos agentes; 1 consulta grátis (índice único, C25)"),
("V2 Validação e regras de negócio","Fluxos executados na ordem certa","S","Consulta exige sessão confirmada por e-mail; cadastro exige prova de trabalho assinada"),
("V2 Validação e regras de negócio","Proteção contra automação (anti-robô)","S","Prova de trabalho 16 bits, campo armadilha, tempo mínimo 3 s, uso único do desafio, limite por rede"),
("V3 Segurança do front-end","Content-Security-Policy restritiva","S","vercel.json: default-src 'self'; script-src 'self'; frame-ancestors 'none'"),
("V3 Segurança do front-end","X-Content-Type-Options nosniff e Content-Type correto","S","vercel.json; md5 + tipo conferidos por pg_net a cada publicação"),
("V3 Segurança do front-end","HSTS com includeSubDomains","S","max-age=63072000; includeSubDomains"),
("V3 Segurança do front-end","Proteção contra clickjacking","S","X-Frame-Options DENY + frame-ancestors 'none'"),
("V3 Segurança do front-end","Referrer-Policy","S","strict-origin-when-cross-origin"),
("V3 Segurança do front-end","Sem recursos de terceiros sem integridade","S","Fontes servidas pelo próprio site (C12); nenhum script externo"),
("V3 Segurança do front-end","Cookies seguros","NA","O site não usa cookies; sessão do laboratório é token aleatório no armazenamento local"),
("V4 API e serviços web","CORS restrito a origens conhecidas","S","ORIGENS = instituto-theye.vercel.app e theye.club nas funções"),
("V4 API e serviços web","Métodos HTTP limitados","S","Funções aceitam só POST/OPTIONS; previsao-locacao responde 405 aos demais"),
("V4 API e serviços web","Mensagens de erro sem detalhe interno","S","Erros genéricos em português; sem stack trace"),
("V5 Arquivos","Envio de arquivos","NA","Instituto não recebe arquivos"),
("V6 Autenticação","Sem senha: link de uso único por e-mail com validade","S","Token aleatório de 256 bits, guardado só como sha256, vale 24 h"),
("V6 Autenticação","Resposta igual para e-mail existente ou não (enumeração)","S","'Se houver cadastro com esse e-mail, enviamos um link'"),
("V6 Autenticação","Limite de tentativas","S","instituto_registrar_tentativa por rede (HMAC do IP) e desafio de uso único"),
("V6 Autenticação","E-mails descartáveis bloqueados","S","Lista DESCARTAVEIS"),
("V6 Autenticação","MFA para administradores","P","Admin do Instituto é o dono do Supabase (MFA da conta Supabase); 2FA dos admins do escritório obrigatório a partir de 06/11/2026"),
("V7 Gestão de sessão","Token de sessão aleatório e guardado como hash","S","aleatorio() 32 bytes; banco guarda sha256 (instituto_membro_por_sessao)"),
("V7 Gestão de sessão","Expiração de sessão","S","Sessão vencida devolve 401 ('Sessão vencida. Entre de novo.')"),
("V7 Gestão de sessão","Encerrar sessão (logout) no servidor","P","Botão sair apaga o token no navegador; invalidação no servidor ainda não existe"),
("V8 Autorização","Controle de acesso aplicado no servidor","S","RLS em todas as 35 tabelas; schema instituto só por RPC SECURITY DEFINER"),
("V8 Autorização","Menor privilégio nas funções","S","C25: i11_* e RPCs sensíveis só service_role; 15 RPCs públicas só agregados"),
("V8 Autorização","Separação do escritório","S","Logins do Instituto separados; previsao-locacao confere equipe do escritório na RPC"),
("V9 Tokens autocontidos","JWT validado pela plataforma","S","verify_jwt nas funções que exigem; chave anon só leitura pública"),
("V9 Tokens autocontidos","Chave de serviço fora do cliente","S","SUPABASE_SERVICE_ROLE_KEY só nas Edge functions"),
("V10 OAuth/OIDC","OAuth e OpenID Connect","NA","Instituto não usa OAuth"),
("V11 Criptografia","Algoritmos aprovados","S","SHA-256 e HMAC-SHA-256 via WebCrypto; aleatoriedade crypto.getRandomValues"),
("V11 Criptografia","Dado pessoal com pseudonimização irreversível","S","CPF e IP como HMAC com pimenta secreta"),
("V11 Criptografia","Comparação de segredos em tempo constante","S","C25: iguais() na assinatura do desafio"),
("V11 Criptografia","Gestão e rotação de chaves","P","Segredos no banco (instituto_segredos_servico); rotação documentada não existe"),
("V12 Comunicação segura","TLS em todas as conexões","S","HTTPS em Vercel, Supabase, Anthropic e Brevo; HSTS"),
("V13 Configuração","Segredos fora do repositório","S","Repositório público sem chaves; varredura de segredos do GitHub"),
("V13 Configuração","Dependências fixadas e conhecidas","S","jsr:@supabase/supabase-js@2; site sem dependências de terceiros"),
("V13 Configuração","Ambientes de teste sem dados reais","S","Testes vitest com dublês; e2e em servidor local"),
("V14 Proteção de dados","Minimização (LGPD)","S","Só agregados; amostra de revisão guarda a resposta, nunca a pergunta; contador de injeção guarda só o motivo"),
("V14 Proteção de dados","Retenção e descarte","P","C06: limpeza automática pronta, aguarda OK de M"),
("V14 Proteção de dados","Dados sensíveis fora de logs","S","Logs sem e-mail, CPF ou texto de pergunta"),
("V14 Proteção de dados","Cache de respostas sensíveis desligado","S","Respostas das funções em JSON sem cache público; site estático com cache só de arquivos públicos"),
("V15 Código seguro e arquitetura","Revisão de segurança registrada","S","C25: i03/C25-revisao-seguranca.md"),
("V15 Código seguro e arquitetura","Testes automáticos de segurança","S","Vitest: cotas, CORS, injeção, corrida da consulta grátis; 176 testes; CI a cada push"),
("V15 Código seguro e arquitetura","Concorrência em operações críticas","S","C25: consulta grátis atômica; reserva de cota atômica na RPC"),
("V16 Registro e tratamento de erros","Registro de eventos de segurança","S","Tentativas por rede, incidentes de IA (C08), injeções barradas (C26), consumo de IA"),
("V16 Registro e tratamento de erros","Logs protegidos contra alteração","P","Tabelas com RLS; evidências do projeto seladas no Bitcoin; logs operacionais não são selados"),
("V16 Registro e tratamento de erros","Alertas de falha","S","Teste diário dos agentes por e-mail (alerta-teste-agentes); Lighthouse e CI avisam por e-mail"),
("V17 WebRTC","WebRTC","NA","Não usado"),
]
wb = Workbook(); ws = wb.active; ws.title = 'ASVS 5.0 L2'
ws.append(['Capítulo', 'Requisito (resumo)', 'Status', 'Evidência'])
cor = {'S': 'D9EAD3', 'P': 'FFF2CC', 'N': 'F4CCCC', 'NA': 'EEEEEE'}
for r in I:
    ws.append(list(r)); ws.cell(ws.max_row, 3).fill = PatternFill('solid', fgColor=cor[r[2]])
for c in ws[1]: c.font = Font(bold=True)
for col, w in zip('ABCD', [30, 55, 8, 90]): ws.column_dimensions[col].width = w
for row in ws.iter_rows(min_row=2):
    for c in row: c.alignment = Alignment(wrap_text=True, vertical='top')
ap = [r for r in I if r[2] != 'NA']
pontos = sum({'S': 1, 'P': .5, 'N': 0}[r[2]] for r in ap)
res = wb.create_sheet('Resumo')
res.append(['Itens', len(I)]); res.append(['Aplicáveis', len(ap)])
for s in ['S', 'P', 'N', 'NA']: res.append([s, sum(r[2] == s for r in I)])
res.append(['Aderência (S=1, P=0,5)', round(100 * pontos / len(ap), 1)])
res.append(['Escopo', 'ASVS 5.0 capítulos V1–V17, requisitos de nível 1 e 2 aplicáveis à arquitetura do Instituto, resumidos; não substitui auditoria externa.'])
out = '/mnt/project-files/unificado/i03/asvs-l2-instituto.xlsx'; wb.save(out)
print(len(I), len(ap), {s: sum(r[2] == s for r in I) for s in ['S', 'P', 'N', 'NA']}, round(100 * pontos / len(ap), 1), hashlib.sha256(open(out, 'rb').read()).hexdigest())
