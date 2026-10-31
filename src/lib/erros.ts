// Passo 55 (Onda E): traduz erros técnicos do Supabase, das funções Edge e da rede para português simples, com o que fazer.
const MAPA: [RegExp, string][] = [
  [/Failed to fetch|NetworkError|Load failed|ERR_INTERNET|net::/i, 'Sem conexão com a internet. Verifique a rede e tente de novo.'],
  [/JWT expired|invalid JWT|refresh_token|session_not_found|not authenticated/i, 'Sua sessão expirou. Entre de novo para continuar.'],
  [/permission denied|row-level security|42501|insufficient_privilege/i, 'Você não tem permissão para esta ação. Peça a um administrador em Equipe.'],
  [/duplicate key|23505|already exists/i, 'Já existe um registro igual a este. Abra o existente em vez de criar outro.'],
  [/foreign key|23503/i, 'Este registro está ligado a outro e não pode ser apagado. Desfaça o vínculo primeiro.'],
  [/not[- ]null|23502|violates check/i, 'Falta preencher um campo obrigatório.'],
  [/timeout|timed out|57014|statement_timeout|504/i, 'O servidor demorou demais para responder. Tente de novo em instantes.'],
  [/rate limit|429|too many requests/i, 'Muitas tentativas seguidas. Espere um minuto e tente de novo.'],
  [/invalid login credentials|Invalid login/i, 'E-mail ou senha incorretos.'],
  [/Email not confirmed/i, 'Confirme o e-mail pela mensagem que enviamos antes de entrar.'],
  [/aguardando liberação|não liberad/i, 'Seu cadastro ainda não foi liberado por um administrador.'],
  [/payload too large|413|exceeded the maximum allowed size/i, 'O arquivo é grande demais. O limite é 50 MB.'],
  [/api key|chave.*(inválida|ausente)|401.*anthropic|invalid x-api-key/i, 'A chave da IA está ausente ou inválida. Um administrador corrige em Configurações → IA.'],
  [/teto|limite mensal de IA/i, 'O teto mensal de IA foi atingido. Um administrador pode ajustá-lo em Consumo.'],
  [/404|not found|PGRST116/i, 'Não encontramos este registro. Ele pode ter sido apagado.'],
  [/5\d\d|internal server error|Edge Function returned a non-2xx/i, 'O servidor teve um problema momentâneo. Tente de novo; se persistir, avise um administrador.'],
]
export function mensagemAmigavel(err: unknown, padrao = 'Não foi possível concluir. Tente de novo.'): string {
  const bruto = err instanceof Error ? err.message : typeof err === 'string' ? err : (err as { message?: string })?.message ?? ''
  for (const [re, msg] of MAPA) if (re.test(bruto)) return msg
  if (!bruto) return padrao
  // Mensagens já em português e curtas passam como estão; o resto vira o padrão com o detalhe técnico entre parênteses.
  return /^[A-ZÀ-Ú][^{}<>]{0,140}$/.test(bruto) && /[áéíóúãõçÁÉÍÓÚ]|\b(não|já|ou|para|com)\b/.test(bruto) ? bruto : `${padrao} (detalhe técnico: ${bruto.slice(0, 120)})`
}
