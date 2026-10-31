// Passo 40 (Onda D): contrato de adesão SaaS da Value Pas, aceito com hash pelo administrador de cada escritório parceiro
// no primeiro acesso. O aceite grava data, versão, SHA-256 do texto e navegador em aceites_contrato_saas.
export const CONTRATO_SAAS_VERSAO = '1.0 (31/10/2026)'

export const CONTRATO_SAAS_TEXTO = `CONTRATO DE ADESÃO · LICENÇA DE USO DE SOFTWARE COMO SERVIÇO (SaaS)
Versão ${CONTRATO_SAAS_VERSAO}

CONTRATADA: Value Pas (empresa emissora, subcontratada do Instituto THEYE), doravante "Value Pas".
CONTRATANTE: o escritório ou empresa identificado no cadastro da plataforma, representado pelo administrador que aceita este contrato, doravante "Cliente".
OBJETO: licença de uso, não exclusiva e intransferível, da plataforma de gestão jurídica GMenezes (desenvolvida pelo Instituto THEYE), em área própria e separada, para gerir casos, prazos, contratos, honorários, portal do cliente e demais funções disponíveis no plano.

1. Prazo e vigência
1.1. O contrato vigora por 12 (doze) meses a partir do aceite e se renova automaticamente por iguais períodos, salvo aviso de uma das partes com 30 (trinta) dias de antecedência.
1.2. O uso é liberado no aceite; a cobrança começa no primeiro dia do mês seguinte à liberação do primeiro usuário.

2. Preço e pagamento
2.1. Mensalidade por usuário: R$ 390,00 por operador e R$ 120,00 por leitor, apurada no dia 1 de cada mês pelo número de usuários ativos no escritório do Cliente.
2.2. Nos primeiros 12 meses contados do cadastro do escritório, aplica-se desconto de 30% (trinta por cento) sobre a mensalidade.
2.3. A fatura é emitida no dia 1, com vencimento no dia 10, paga por PIX (QR ou copia e cola) indicado na própria fatura. Atraso superior a 30 dias autoriza a suspensão do acesso, mantidos os dados por 90 dias.
2.4. Reajuste anual pelo IPCA (IBGE) ou índice que o substitua. Serviços de terceiros (APIs externas, como diários oficiais pagos) são repassados sem margem.

3. Proteção de dados (LGPD, Lei 13.709/2018)
3.1. O Cliente é o CONTROLADOR dos dados pessoais que insere na plataforma (clientes, partes, processos, equipe). A Value Pas e o Instituto THEYE atuam como OPERADORES, tratando os dados exclusivamente conforme as instruções do Cliente e para a prestação do serviço.
3.2. Os dados do Cliente ficam em área segregada por escritório (políticas de acesso por linha no banco de dados); nenhum outro escritório, nem a sede GMenezes, acessa seu conteúdo, salvo suporte técnico autorizado por escrito pelo Cliente.
3.3. A Value Pas adota medidas técnicas e administrativas de segurança (criptografia em trânsito, controle de acesso por função, dois fatores obrigatório para administradores, registro de auditoria, selos de integridade) e comunica incidentes de segurança ao Cliente em até 48 horas da ciência.
3.4. Ao fim do contrato, o Cliente pode exportar seus dados por 90 dias; depois disso, os dados são eliminados, ressalvadas obrigações legais de guarda.
3.5. Os dados são hospedados em provedores de nuvem (Supabase/AWS e Vercel) que podem operar fora do Brasil, com cláusulas de transferência internacional adequadas à LGPD.

4. Nível de serviço (SLA)
4.1. Disponibilidade mensal mínima de 99% (noventa e nove por cento), excluídas manutenções programadas avisadas com 24 horas de antecedência e indisponibilidades dos provedores de nuvem ou da internet do Cliente.
4.2. Se a disponibilidade ficar abaixo de 99% em um mês, o Cliente recebe crédito de 10% da mensalidade daquele mês; abaixo de 95%, crédito de 30%. O crédito é o único remédio por indisponibilidade.
4.3. Suporte por e-mail em dias úteis, das 9h às 18h (horário de Brasília), com primeira resposta em até 1 dia útil.

5. Obrigações do Cliente
5.1. Manter em sigilo as credenciais de acesso; cada acesso é pessoal. Cadastrar apenas pessoas autorizadas e informar à Value Pas desligamentos para ajuste da cobrança.
5.2. Usar a plataforma conforme a lei, o Estatuto da Advocacia (Lei 8.906/1994) e o Código de Ética da OAB. A plataforma é ferramenta de apoio; a responsabilidade profissional pelos atos permanece com o Cliente.
5.3. A inteligência artificial integrada produz minutas e análises que devem ser revisadas por advogado antes de qualquer uso; o consumo de IA é medido e pode ter teto definido pelo Cliente.

6. Propriedade intelectual
6.1. A plataforma, seu código, marca e documentação pertencem ao Instituto THEYE e à Value Pas; o Cliente recebe apenas a licença de uso. Os dados inseridos pelo Cliente pertencem ao Cliente.

7. Rescisão
7.1. Qualquer parte pode rescindir sem ônus com aviso de 30 dias; não há multa de fidelidade. Mensalidades já vencidas permanecem devidas.
7.2. A Value Pas pode rescindir de imediato em caso de uso ilícito, violação de segurança por parte do Cliente ou inadimplência superior a 60 dias.
7.3. Após a rescisão, aplica-se o item 3.4 (exportação por 90 dias e eliminação).

8. Disposições gerais
8.1. Este contrato é celebrado eletronicamente; o aceite pelo administrador do escritório, com registro de data, versão, impressão digital (SHA-256) do texto e navegador, vale como assinatura (art. 10, § 2º, da MP 2.200-2/2001).
8.2. Alterações serão comunicadas com 30 dias de antecedência; o uso continuado após nova versão exige novo aceite.
8.3. Foro: comarca do Rio de Janeiro/RJ, com renúncia a qualquer outro.`

export async function hashContratoSaas(): Promise<string> {
  const dados = new TextEncoder().encode(CONTRATO_SAAS_TEXTO)
  const h = await crypto.subtle.digest('SHA-256', dados)
  return Array.from(new Uint8Array(h)).map(b => b.toString(16).padStart(2, '0')).join('')
}
