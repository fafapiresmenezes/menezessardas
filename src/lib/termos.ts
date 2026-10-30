// Passo 09: termos de uso e aviso de privacidade (LGPD) aceitos no primeiro acesso.
// O aceite grava data, versão e o SHA-256 deste texto, para provar o que a pessoa leu.
export const TERMOS_VERSAO = '1.0 (30/10/2026)'

export const TERMOS_TEXTO = `TERMOS DE USO E AVISO DE PRIVACIDADE — PLATAFORMA GMENEZES ADVOGADOS ASSOCIADOS
Versão ${TERMOS_VERSAO}

1. O que é a plataforma
Sistema interno de gestão do escritório GMenezes Advogados Associados (CNPJ 10.945.994/0001-72), desenvolvido pelo Instituto THEYE, para administrar processos, contratos, imóveis, prazos, clientes e honorários.

2. Quem pode usar
Só pessoas liberadas por um administrador do escritório. Cada acesso é pessoal e intransferível. Senhas e códigos de dois fatores não devem ser compartilhados.

3. Dever de sigilo
Tudo o que está na plataforma é protegido pelo sigilo profissional da advocacia (Lei 8.906/1994, art. 34, VII, e Código de Ética da OAB). É proibido copiar, exportar ou divulgar dados fora das finalidades do trabalho no escritório.

4. Dados pessoais (Lei 13.709/2018 — LGPD)
4.1 Controlador: GMenezes Advogados Associados. Operador: Instituto THEYE (desenvolvimento e manutenção).
4.2 Dados tratados sobre você: nome, e-mail, função, registros de acesso e de uso (trilha de auditoria), consumo de inteligência artificial e peças enviadas para "Meu estilo de escrita".
4.3 Finalidades: operar a plataforma, garantir segurança, cumprir obrigações legais e éticas da advocacia e medir uso e custos.
4.4 Base legal: execução de contrato de trabalho ou prestação de serviços, cumprimento de obrigação legal e exercício regular de direitos (art. 7º, II, V e VI).
4.5 Dados de clientes e partes: você só pode registrar dados necessários aos casos, nunca dados excessivos. Dados de terceiros obtidos em fontes públicas (tribunais, diários oficiais) são usados só para o exercício regular de direitos.
4.6 Inteligência artificial: textos enviados ao Assistente são processados por provedor externo (Anthropic) sob contrato; não envie dados sensíveis sem necessidade. Nenhuma decisão jurídica é tomada só pela IA.
4.7 Guarda: os dados ficam em servidores Supabase (criptografia em repouso e em trânsito) enquanto durar seu vínculo com o escritório e pelos prazos legais; depois são apagados ou anonimizados.
4.8 Seus direitos (art. 18): confirmação, acesso, correção, anonimização, portabilidade, eliminação e informação sobre compartilhamento. Pedidos ao administrador do escritório pelo e-mail institucional.
4.9 Incidentes de segurança são comunicados à ANPD e aos titulares quando houver risco relevante (art. 48).

5. Registro deste aceite
Ao clicar em "Li e aceito", a plataforma grava a data e hora, a versão e a impressão digital (SHA-256) deste texto, vinculadas à sua conta. Esse registro fica visível aos administradores em Equipe.

6. Mudanças
Novas versões destes termos serão apresentadas no próximo acesso para novo aceite.`

export async function hashTermos(): Promise<string> {
  const dados = new TextEncoder().encode(TERMOS_TEXTO)
  const h = await crypto.subtle.digest('SHA-256', dados)
  return [...new Uint8Array(h)].map(b => b.toString(16).padStart(2, '0')).join('')
}
