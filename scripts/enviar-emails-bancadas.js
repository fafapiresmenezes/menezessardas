/**
 * Script para enviar emails sobre bancadas colaborativas
 *
 * Uso:
 * node scripts/enviar-emails-bancadas.js --tipo "empresas" --debug
 * node scripts/enviar-emails-bancadas.js --tipo "reenvio-existentes" --debug
 *
 * Variáveis de ambiente:
 * SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS
 */

const nodemailer = require('nodemailer')
const args = process.argv.slice(2)

// Configuração
const debug = args.includes('--debug')
const tipo = args.includes('--tipo') ? args[args.indexOf('--tipo') + 1] : 'empresas'

const TEMPLATE_BANCADAS = `
Detalhe adicional:

O Instituto está formando BANCADAS E NÚCLEOS COLABORATIVOS com profissionais doutores e PhDs.
Esses núcleos funcionam como consórcios colaborativos onde profissionais:
- NÃO precisam fazer parte do estatuto legal (legislação brasileira permite)
- Podem se chancelar com seus nomes/credenciais
- Assinam contratos específicos por projeto (temporário, direto, ou conforme a necessidade)
- Trabalham de forma colaborativa e transparente

Se você ou sua instituição deseja participar das bancadas de pesquisa em:
- Predição Jurídica
- Engenharia
- Saúde
- Ambiental
- Cibersegurança
- Quantum Computing
- Serviços Sociais

Favor contactar: bancadas@theye.club

Toda participação é rastreada por smart contract para transparência total.
`

const TEMPLATE_IA = (nomeEmpresa) => `
O Instituto de Ontologia com Soluções Multidisciplinares é uma instituição non-profit brasileira dedicada a pesquisa colaborativa em áreas estratégicas:

- Cybersecurity (LGPD, detecção de anomalias)
- Quantum Computing (simulação, otimização, criptografia pós-quântica)
- Predição (jurídica, saúde, ambiental, financeira)

Estamos convidando a ${nomeEmpresa} para:
1. Fornecer créditos de API/compute para pesquisa
2. Participar de nossa banca colaborativa (smart contract, transparência total)
3. Acessar resultados de pesquisa em tempo real

Modelo: Consórcio colaborativo, sem fins lucrativos, com pesquisadores doutores/PhDs de universidades brasileiras e internacionais.

Visite: theye.club/bancadas-colaborativas

CNPJ: 34.028.316/0001-14
Email: contato@theye.club

Agradecemos pela consideração.
`

// Empresas já contactadas (14 empresas)
const EMPRESAS_EXISTENTES = [
  // Adicionar emails aqui
]

// Empresas de IA (novo nicho)
const EMPRESAS_IA = [
  { nome: 'Anthropic', email: 'contact@anthropic.com' },
  { nome: 'OpenAI', email: 'research@openai.com' },
  { nome: 'Google DeepMind', email: 'research@deepmind.google.com' },
  { nome: 'Meta AI Research', email: 'ai-research@meta.com' },
  { nome: 'Hugging Face', email: 'research@huggingface.co' },
  { nome: 'Microsoft Research', email: 'msr@microsoft.com' }
]

async function enviarEmails() {
  // Configurar transporte de email
  // Nota: Em produção, usar um serviço como SendGrid, Resend, ou SES
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    secure: true,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  })

  let emailsParaEnviar = []

  if (tipo === 'empresas-ia') {
    emailsParaEnviar = EMPRESAS_IA.map(emp => ({
      para: emp.email,
      assunto: '[CNPJ Instituto] — Participação em Pesquisa Colaborativa (Non-Profit) — Cybersecurity, Quantum Computing',
      corpo: TEMPLATE_IA(emp.nome),
      tipo: 'empresa-ia'
    }))
  } else if (tipo === 'reenvio-existentes') {
    emailsParaEnviar = EMPRESAS_EXISTENTES.map(email => ({
      para: email,
      assunto: 'Bancadas Colaborativas THEYE - Novas Oportunidades de Participação',
      corpo: TEMPLATE_BANCADAS,
      tipo: 'reenvio'
    }))
  }

  console.log(`\n📧 Preparado para enviar ${emailsParaEnviar.length} emails do tipo "${tipo}"`)

  if (debug) {
    console.log('\n=== MODO DEBUG ===')
    emailsParaEnviar.forEach((email, idx) => {
      console.log(`\n[${idx + 1}] Para: ${email.para}`)
      console.log(`Assunto: ${email.assunto}`)
      console.log(`Corpo:\n${email.corpo}`)
      console.log('---')
    })
    console.log('\n(Nenhum email foi realmente enviado - modo debug)')
    return
  }

  // Enviar emails
  let enviados = 0
  let erros = []

  for (const email of emailsParaEnviar) {
    try {
      await transporter.sendMail({
        from: process.env.SMTP_FROM || 'contato@theye.club',
        to: email.para,
        subject: email.assunto,
        text: email.corpo,
        html: `<p>${email.corpo.replace(/\n/g, '<br>')}</p>`
      })
      enviados++
      console.log(`✓ Enviado para: ${email.para}`)
    } catch (error) {
      erros.push({ email: email.para, erro: error.message })
      console.log(`✗ Erro ao enviar para ${email.para}: ${error.message}`)
    }
  }

  console.log(`\n\n📊 Resumo:`)
  console.log(`✓ Enviados: ${enviados}`)
  console.log(`✗ Erros: ${erros.length}`)

  if (erros.length > 0) {
    console.log('\nDetalhes dos erros:')
    erros.forEach(e => console.log(`  - ${e.email}: ${e.erro}`))
  }

  process.exit(erros.length > 0 ? 1 : 0)
}

// Executar
enviarEmails().catch(error => {
  console.error('Erro fatal:', error)
  process.exit(1)
})
