// Camada de tradução da entrada do instituto (pedido de M, 13/11/2026):
// "a primeira tela tem que ser com várias línguas, mas várias línguas para você
// entrar dentro do instituto em várias línguas diferentes".
//
// Escopo: só as telas antes do login (boas-vindas, entrada, criar acesso, recuperar senha).
// O interior da plataforma continua em português.
//
// O dicionário português é a fonte das chaves: os outros três idiomas são
// Record<Chave, string>, então uma chave que falte em qualquer língua é erro
// de TypeScript, nunca um texto faltando em silêncio na tela.
import { useSyncExternalStore } from 'react'
import { type Idioma, idiomaEscolhido, definirIdioma } from './idioma'

const pt = {
  // Nomes dos idiomas (cada um aparece na sua própria língua na tela de escolha,
  // e traduzido na troca de idioma dentro da tela de entrada).
  'idioma.pt': 'Português',
  'idioma.en': 'Inglês',
  'idioma.zh': 'Chinês',
  'idioma.es': 'Espanhol',

  // Tela de boas-vindas
  'boasVindas.instituto': 'Instituto THEYE',
  'boasVindas.titulo': 'Escolha o seu idioma',
  'boasVindas.dica': 'Você entra no instituto na língua que escolher. Dá para trocar a qualquer momento na tela de entrada.',
  'boasVindas.continuarEm': 'Continuar em',
  'boasVindas.lista': 'Idiomas disponíveis',

  // Troca de idioma na tela de entrada
  'idioma.trocar': 'Idioma da tela',
  'idioma.trocarPara': 'Ver esta tela em',
  'idioma.atual': 'Idioma atual',

  // Tela de entrada
  'login.subtitulo': 'Entre com o seu e-mail e a sua senha',
  'marca.suporteJuridico': 'Suporte Jurídico',
  'login.subtituloCadastro': 'Crie a sua conta e diga de qual escritório você é',
  'login.email': 'E-mail',
  'login.senha': 'Senha',
  'login.entrar': 'Entrar',
  'login.entrarTitulo': 'Entra na plataforma com o e-mail e a senha informados',
  'login.aguarde': 'Aguarde…',
  'login.esqueciSenha': 'Esqueci minha senha',
  'login.esqueciSenhaTitulo': 'Mostra as instruções para recuperar a senha com uma pessoa administradora da sua equipe',
  'login.criarConta': 'Criar conta',
  'login.criarContaTitulo': 'Muda o formulário para criar uma conta nova e dizer de qual escritório você é',
  'login.jaTenhoAcesso': 'Já tenho acesso',
  'login.jaTenhoAcessoTitulo': 'Volta à tela de entrada para quem já tem conta',
  'login.criarAcesso': 'Criar acesso',
  'login.criarAcessoTitulo': 'Cria a sua conta e envia o pedido de entrada ao escritório informado (ou cria o escritório, se ele ainda não existe)',
  'login.escritorio': 'Escritório (em letras maiúsculas)',
  'login.escritorioRotuloTitulo': 'Escreva o nome do escritório de advocacia a que você pertence. O padrão da plataforma é tudo em LETRAS MAIÚSCULAS, para todo mundo escrever igual e ninguém errar.',
  'login.escritorioExemplo': 'EX.: SARDAS E MENEZES',
  'login.escritorioCampoTitulo': 'Nome do seu escritório, sempre em letras maiúsculas (a tela já converte sozinha). Quem é do mesmo escritório escreve o mesmo nome, igualzinho.',
  'login.escritorioAjuda': 'Padrão da casa: TUDO EM LETRAS MAIÚSCULAS, exatamente igual para todos do mesmo escritório. A tela converte sozinha enquanto você digita.',
  'login.avisoPrimeiroAcesso': 'Crie sua conta com e-mail, senha e o nome do seu escritório. Se o escritório já usa a plataforma, o seu pedido vai para quem administra lá e você só entra depois que essa pessoa liberar. Se ele ainda não usa, é criado agora, vazio, e você passa a administrá-lo.',
  'login.avisoRecuperacao': 'Esqueceu a senha? Peça a uma pessoa administradora da sua equipe uma senha provisória (menu Equipe). Depois de entrar, troque-a em Configurações → Senha.',
  'login.avisoRecuperacaoSemBanco': 'Entrada exige senha válida da plataforma. Fale com a administração.',
  'login.avisoContaCriada': 'Conta criada. Abra o e-mail que enviamos e toque no link de confirmação; depois entre com este e-mail e senha. Se o seu escritório já usa a plataforma, a pessoa que administra lá precisa liberar a sua entrada.',

  // Dois fatores
  'login.codigoPedido': 'Digite o código de 6 dígitos do seu aplicativo autenticador.',
  'login.codigoRotulo': 'Código de 6 dígitos',
  'login.confirmarCodigo': 'Confirmar código',
  'login.confirmarCodigoTitulo': 'Confere o código do aplicativo autenticador e conclui a entrada na plataforma',
  'login.outraConta': 'Entrar com outra conta',
  'login.outraContaTitulo': 'Sai desta conta e volta à tela de e-mail e senha para entrar com outra',

  // Avisos de erro
  'erro.naoConfigurada': 'A plataforma não está configurada para entrar neste ambiente. Entre pelo endereço oficial.',
  'erro.semAutenticador': 'Nenhum aplicativo autenticador ativo nesta conta.',
  'erro.codigoErrado': 'Código não confere. Tente de novo.',
  'erro.robo': 'Não foi possível criar o acesso. Tente novamente em alguns segundos.',
  'erro.senhaCurta': 'A senha precisa ter pelo menos 8 caracteres.',
  'erro.muitasContas': 'Muitas contas criadas em pouco tempo. Aguarde alguns minutos e tente de novo.',
  'erro.criarAcessoPrefixo': 'Não foi possível criar o acesso: ',
  'erro.criarAcesso': 'Não foi possível criar o acesso. Tente novamente.',
  'erro.emailNaoConfirmado': 'Falta confirmar o seu e-mail: abra a mensagem que enviamos quando a conta foi criada e toque no link. Depois entre de novo.',
  'erro.credenciais': 'E-mail ou senha incorretos.',
  'erro.servidorPrefixo': 'Não foi possível falar com o servidor (',
  'erro.servidorSufixo': '). Verifique a conexão e tente de novo.',
  'erro.servidor': 'Não foi possível falar com o servidor. Verifique a conexão e tente de novo.',
} as const

/** Chaves do dicionário. Vale para os quatro idiomas. */
export type Chave = keyof typeof pt
type Dicionario = Record<Chave, string>

const en: Dicionario = {
  'idioma.pt': 'Portuguese',
  'idioma.en': 'English',
  'idioma.zh': 'Chinese',
  'idioma.es': 'Spanish',

  'boasVindas.instituto': 'THEYE Institute',
  'boasVindas.titulo': 'Choose your language',
  'boasVindas.dica': 'You enter the institute in the language you choose. You can change it at any time on the sign-in screen.',
  'boasVindas.continuarEm': 'Continue in',
  'boasVindas.lista': 'Available languages',

  'idioma.trocar': 'Language of this screen',
  'idioma.trocarPara': 'View this screen in',
  'idioma.atual': 'Current language',

  'login.subtitulo': 'Sign in with your email and password',
  'marca.suporteJuridico': 'Legal Support',
  'login.subtituloCadastro': 'Create your account and tell us which firm you are from',
  'login.email': 'Email',
  'login.senha': 'Password',
  'login.entrar': 'Sign in',
  'login.entrarTitulo': 'Signs in to the platform with the email and password given',
  'login.aguarde': 'One moment…',
  'login.esqueciSenha': 'I forgot my password',
  'login.esqueciSenhaTitulo': 'Shows how to recover your password with an administrator on your team',
  'login.criarConta': 'Create an account',
  'login.criarContaTitulo': 'Switches the form to create a new account and say which firm you are from',
  'login.jaTenhoAcesso': 'I already have an account',
  'login.jaTenhoAcessoTitulo': 'Goes back to the sign-in screen for people who already have an account',
  'login.criarAcesso': 'Create access',
  'login.criarAcessoTitulo': 'Creates your account and sends your request to the firm you named (or creates the firm, if it does not exist yet)',
  'login.escritorio': 'Firm (in capital letters)',
  'login.escritorioRotuloTitulo': 'Write the name of the law firm you belong to. The house standard is ALL CAPITAL LETTERS, so that everyone writes it the same way and nobody gets it wrong.',
  'login.escritorioExemplo': 'E.G.: SARDAS E MENEZES',
  'login.escritorioCampoTitulo': 'The name of your firm, always in capital letters (the screen converts it for you). People from the same firm write exactly the same name.',
  'login.escritorioAjuda': 'House standard: ALL IN CAPITAL LETTERS, exactly the same for everyone in the same firm. The screen converts it as you type.',
  'login.avisoPrimeiroAcesso': 'Create your account with your email, a password and the name of your firm. If the firm already uses the platform, your request goes to the administrator there and you only get in once that person approves it. If it does not use the platform yet, it is created now, empty, and you become its administrator.',
  'login.avisoRecuperacao': 'Forgot your password? Ask an administrator on your team for a temporary password (Team menu). Once you are in, change it under Settings → Password.',
  'login.avisoRecuperacaoSemBanco': 'Signing in requires a valid platform password. Please contact the administration.',
  'login.avisoContaCriada': 'Account created. Open the email we sent and tap the confirmation link; then sign in with this email and password. If your firm already uses the platform, the administrator there has to approve your entry.',

  'login.codigoPedido': 'Enter the 6-digit code from your authenticator app.',
  'login.codigoRotulo': '6-digit code',
  'login.confirmarCodigo': 'Confirm code',
  'login.confirmarCodigoTitulo': 'Checks the code from your authenticator app and completes your sign-in',
  'login.outraConta': 'Sign in with another account',
  'login.outraContaTitulo': 'Signs out of this account and goes back to the email and password screen',

  'erro.naoConfigurada': 'The platform is not set up for signing in on this environment. Please use the official address.',
  'erro.semAutenticador': 'This account has no active authenticator app.',
  'erro.codigoErrado': 'That code does not match. Please try again.',
  'erro.robo': 'We could not create the access. Please try again in a few seconds.',
  'erro.senhaCurta': 'The password needs at least 8 characters.',
  'erro.muitasContas': 'Too many accounts created in a short time. Please wait a few minutes and try again.',
  'erro.criarAcessoPrefixo': 'We could not create the access: ',
  'erro.criarAcesso': 'We could not create the access. Please try again.',
  'erro.emailNaoConfirmado': 'Your email still needs to be confirmed: open the message we sent when the account was created and tap the link. Then sign in again.',
  'erro.credenciais': 'Wrong email or password.',
  'erro.servidorPrefixo': 'We could not reach the server (',
  'erro.servidorSufixo': '). Check your connection and try again.',
  'erro.servidor': 'We could not reach the server. Check your connection and try again.',
}

const zh: Dicionario = {
  'idioma.pt': '葡萄牙语',
  'idioma.en': '英语',
  'idioma.zh': '中文',
  'idioma.es': '西班牙语',

  'boasVindas.instituto': 'THEYE 研究院',
  'boasVindas.titulo': '请选择语言',
  'boasVindas.dica': '您可以用所选的语言进入研究院。在登录页面随时可以更换语言。',
  'boasVindas.continuarEm': '继续使用的语言：',
  'boasVindas.lista': '可用语言',

  'idioma.trocar': '本页语言',
  'idioma.trocarPara': '以此语言查看本页：',
  'idioma.atual': '当前语言',

  'login.subtitulo': '请使用您的邮箱和密码登录',
  'marca.suporteJuridico': '法律支持',
  'login.subtituloCadastro': '创建账户，并填写您所属的事务所',
  'login.email': '邮箱',
  'login.senha': '密码',
  'login.entrar': '登录',
  'login.entrarTitulo': '使用所填的邮箱和密码登录平台',
  'login.aguarde': '请稍候…',
  'login.esqueciSenha': '忘记密码',
  'login.esqueciSenhaTitulo': '显示如何通过团队管理员找回密码',
  'login.criarConta': '创建账户',
  'login.criarContaTitulo': '切换为创建新账户的表单，并填写您所属的事务所',
  'login.jaTenhoAcesso': '我已有账户',
  'login.jaTenhoAcessoTitulo': '返回已有账户的登录页面',
  'login.criarAcesso': '创建账户',
  'login.criarAcessoTitulo': '创建您的账户，并把加入申请发给所填的事务所（如该事务所还不存在，则现在创建）',
  'login.escritorio': '事务所（请用大写字母）',
  'login.escritorioRotuloTitulo': '请填写您所属律师事务所的名称。平台的统一规则是全部使用大写字母，让大家写法一致，不易出错。',
  'login.escritorioExemplo': '例如：SARDAS E MENEZES',
  'login.escritorioCampoTitulo': '您所属事务所的名称，始终使用大写字母（页面会自动转换）。同一事务所的人填写完全相同的名称。',
  'login.escritorioAjuda': '统一规则：全部大写，同一事务所的所有人完全一致。您输入时页面会自动转换。',
  'login.avisoPrimeiroAcesso': '请用邮箱、密码和事务所名称创建账户。如果该事务所已在使用本平台，您的申请会发给那里的管理员，只有对方批准后您才能进入。如果该事务所还没有使用本平台，系统现在就为它建立一个空的账户，并由您担任管理员。',
  'login.avisoRecuperacao': '忘记密码了？请向团队的管理员索取一个临时密码（“团队”菜单）。登录后，请在“设置 → 密码”中更改。',
  'login.avisoRecuperacaoSemBanco': '登录需要有效的平台密码。请联系管理方。',
  'login.avisoContaCriada': '账户已创建。请打开我们发送的邮件并点击确认链接，然后用此邮箱和密码登录。如果您的事务所已在使用本平台，还需要那里的管理员批准您的加入。',

  'login.codigoPedido': '请输入身份验证器应用中的 6 位验证码。',
  'login.codigoRotulo': '6 位验证码',
  'login.confirmarCodigo': '确认验证码',
  'login.confirmarCodigoTitulo': '核对身份验证器应用的验证码并完成登录',
  'login.outraConta': '用其他账户登录',
  'login.outraContaTitulo': '退出当前账户，返回邮箱和密码页面',

  'erro.naoConfigurada': '本环境未配置登录功能。请通过官方网址进入。',
  'erro.semAutenticador': '此账户没有启用身份验证器应用。',
  'erro.codigoErrado': '验证码不正确。请重试。',
  'erro.robo': '无法创建账户。请过几秒再试。',
  'erro.senhaCurta': '密码至少需要 8 个字符。',
  'erro.muitasContas': '短时间内创建的账户过多。请等几分钟后再试。',
  'erro.criarAcessoPrefixo': '无法创建账户：',
  'erro.criarAcesso': '无法创建账户。请重试。',
  'erro.emailNaoConfirmado': '您的邮箱还需要确认：请打开创建账户时我们发送的邮件并点击链接，然后重新登录。',
  'erro.credenciais': '邮箱或密码不正确。',
  'erro.servidorPrefixo': '无法连接服务器（',
  'erro.servidorSufixo': '）。请检查网络后重试。',
  'erro.servidor': '无法连接服务器。请检查网络后重试。',
}

const es: Dicionario = {
  'idioma.pt': 'Portugués',
  'idioma.en': 'Inglés',
  'idioma.zh': 'Chino',
  'idioma.es': 'Español',

  'boasVindas.instituto': 'Instituto THEYE',
  'boasVindas.titulo': 'Elija su idioma',
  'boasVindas.dica': 'Usted entra en el instituto en el idioma que elija. Puede cambiarlo en cualquier momento en la pantalla de entrada.',
  'boasVindas.continuarEm': 'Continuar en',
  'boasVindas.lista': 'Idiomas disponibles',

  'idioma.trocar': 'Idioma de esta pantalla',
  'idioma.trocarPara': 'Ver esta pantalla en',
  'idioma.atual': 'Idioma actual',

  'login.subtitulo': 'Entre con su correo electrónico y su contraseña',
  'marca.suporteJuridico': 'Soporte Jurídico',
  'login.subtituloCadastro': 'Cree su cuenta e indique de qué despacho es',
  'login.email': 'Correo electrónico',
  'login.senha': 'Contraseña',
  'login.entrar': 'Entrar',
  'login.entrarTitulo': 'Entra en la plataforma con el correo y la contraseña indicados',
  'login.aguarde': 'Un momento…',
  'login.esqueciSenha': 'Olvidé mi contraseña',
  'login.esqueciSenhaTitulo': 'Muestra cómo recuperar la contraseña con una persona administradora de su equipo',
  'login.criarConta': 'Crear cuenta',
  'login.criarContaTitulo': 'Cambia el formulario para crear una cuenta nueva e indicar de qué despacho es',
  'login.jaTenhoAcesso': 'Ya tengo cuenta',
  'login.jaTenhoAcessoTitulo': 'Vuelve a la pantalla de entrada para quien ya tiene cuenta',
  'login.criarAcesso': 'Crear acceso',
  'login.criarAcessoTitulo': 'Crea su cuenta y envía la solicitud de entrada al despacho indicado (o lo crea, si todavía no existe)',
  'login.escritorio': 'Despacho (en letras mayúsculas)',
  'login.escritorioRotuloTitulo': 'Escriba el nombre del despacho de abogados al que pertenece. La norma de la plataforma es escribirlo TODO EN MAYÚSCULAS, para que todos lo escriban igual y nadie se equivoque.',
  'login.escritorioExemplo': 'EJ.: SARDAS E MENEZES',
  'login.escritorioCampoTitulo': 'Nombre de su despacho, siempre en mayúsculas (la pantalla lo convierte sola). Quien es del mismo despacho escribe el mismo nombre, igual.',
  'login.escritorioAjuda': 'Norma de la casa: TODO EN MAYÚSCULAS, exactamente igual para todos los del mismo despacho. La pantalla lo convierte mientras escribe.',
  'login.avisoPrimeiroAcesso': 'Cree su cuenta con correo, contraseña y el nombre de su despacho. Si el despacho ya usa la plataforma, su solicitud va a quien administra allí y usted solo entra cuando esa persona la aprueba. Si todavía no la usa, se crea ahora, vacío, y usted pasa a administrarlo.',
  'login.avisoRecuperacao': '¿Olvidó la contraseña? Pida a una persona administradora de su equipo una contraseña provisional (menú Equipo). Después de entrar, cámbiela en Configuración → Contraseña.',
  'login.avisoRecuperacaoSemBanco': 'Para entrar hace falta una contraseña válida de la plataforma. Hable con la administración.',
  'login.avisoContaCriada': 'Cuenta creada. Abra el correo que le enviamos y toque el enlace de confirmación; después entre con este correo y contraseña. Si su despacho ya usa la plataforma, la persona que administra allí tiene que aprobar su entrada.',

  'login.codigoPedido': 'Escriba el código de 6 dígitos de su aplicación de autenticación.',
  'login.codigoRotulo': 'Código de 6 dígitos',
  'login.confirmarCodigo': 'Confirmar código',
  'login.confirmarCodigoTitulo': 'Comprueba el código de la aplicación de autenticación y completa la entrada en la plataforma',
  'login.outraConta': 'Entrar con otra cuenta',
  'login.outraContaTitulo': 'Sale de esta cuenta y vuelve a la pantalla de correo y contraseña',

  'erro.naoConfigurada': 'La plataforma no está configurada para entrar en este entorno. Entre por la dirección oficial.',
  'erro.semAutenticador': 'Esta cuenta no tiene ninguna aplicación de autenticación activa.',
  'erro.codigoErrado': 'El código no coincide. Inténtelo de nuevo.',
  'erro.robo': 'No se pudo crear el acceso. Inténtelo de nuevo en unos segundos.',
  'erro.senhaCurta': 'La contraseña necesita al menos 8 caracteres.',
  'erro.muitasContas': 'Se crearon demasiadas cuentas en poco tiempo. Espere unos minutos e inténtelo de nuevo.',
  'erro.criarAcessoPrefixo': 'No se pudo crear el acceso: ',
  'erro.criarAcesso': 'No se pudo crear el acceso. Inténtelo de nuevo.',
  'erro.emailNaoConfirmado': 'Falta confirmar su correo: abra el mensaje que le enviamos cuando se creó la cuenta y toque el enlace. Después entre de nuevo.',
  'erro.credenciais': 'Correo o contraseña incorrectos.',
  'erro.servidorPrefixo': 'No se pudo hablar con el servidor (',
  'erro.servidorSufixo': '). Compruebe la conexión e inténtelo de nuevo.',
  'erro.servidor': 'No se pudo hablar con el servidor. Compruebe la conexión e inténtelo de nuevo.',
}

/** Os quatro dicionários completos, por código de idioma. */
export const DICIONARIOS: Record<Idioma, Dicionario> = { pt, en, zh, es }

// Loja mínima: quem troca o idioma avisa as telas montadas, que se redesenham.
const ouvintes = new Set<() => void>()
let atual: Idioma | null = null

function assinar(ouvinte: () => void): () => void {
  ouvintes.add(ouvinte)
  return () => { ouvintes.delete(ouvinte) }
}

/** Idioma em uso agora: o escolhido nesta sessão, o guardado na visita anterior ou português. */
export function idiomaAtual(): Idioma {
  return atual ?? idiomaEscolhido() ?? 'pt'
}

/** Troca o idioma: guarda a escolha e redesenha as telas abertas. */
export function trocarIdioma(codigo: Idioma): void {
  atual = codigo
  definirIdioma(codigo)
  ouvintes.forEach(f => f())
}

/** Esquece a escolha feita nesta sessão (usado nos testes). */
export function reiniciarIdioma(): void {
  atual = null
  ouvintes.forEach(f => f())
}

/** Chave do nome de um idioma dentro do dicionário. */
export function chaveIdioma(codigo: Idioma): Chave {
  return `idioma.${codigo}` as Chave
}

/** Texto de uma chave em um idioma qualquer. */
export function textoEm(idioma: Idioma, chave: Chave): string {
  return DICIONARIOS[idioma][chave]
}

/** Idioma em uso, acompanhado: muda quando alguém chama trocarIdioma. */
export function useIdioma(): Idioma {
  return useSyncExternalStore(assinar, idiomaAtual, idiomaAtual)
}

/** Tradutor da tela: t('login.entrar') devolve o texto no idioma em uso. */
export function useTexto(): (chave: Chave) => string {
  const idioma = useIdioma()
  return (chave: Chave) => DICIONARIOS[idioma][chave]
}
