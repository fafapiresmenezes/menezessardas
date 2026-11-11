// Central de pesquisa e due diligence: reconhece o que foi digitado (processo, CPF, CNPJ, OAB ou nome),
// diz onde procurar em cada fonte e traz as listas de diligência por tipo de assunto, com o histórico que cada fonte alcança.
import { validarCnj, validarCnpj, validarCpf } from '@/lib/ferramentas/documentos'
import { lerOabs } from '@/lib/escritorio/historicoOab'

export type TipoBusca = 'vazio' | 'cnj' | 'cpf' | 'cnpj' | 'oab' | 'nome'
export type Detectado = { tipo: TipoBusca; valido: boolean; formatado: string; aviso?: string; detalhe?: string }

/** Reconhece o que a pessoa colou. Dígito errado não bloqueia a busca, mas é avisado. */
export function detectar(entrada: string): Detectado {
  const t = entrada.trim()
  if (!t) return { tipo: 'vazio', valido: false, formatado: '' }
  const digitos = t.replace(/\D/g, '')
  if (/^\d{1,7}\s*\/\s*[A-Za-z]{2}$/.test(t.replace(/[.]/g, ''))) {
    const { oabs } = lerOabs(t)
    if (oabs.length) return { tipo: 'oab', valido: true, formatado: oabs[0] }
  }
  if (!/[A-Za-zÀ-ÿ]/.test(t.replace(/[\d.\-\/\s]/g, '')) || /^[\d.\-\/\s]+$/.test(t)) {
    if (digitos.length === 20) { const r = validarCnj(t) as { valido: boolean; motivo?: string; formatado?: string; tribunal?: string; segmento?: string }; return { tipo: 'cnj', valido: r.valido, formatado: r.formatado ?? t, aviso: r.valido ? undefined : r.motivo, detalhe: r.valido ? `${r.tribunal} · ${r.segmento}` : undefined } }
    if (digitos.length === 11) { const r = validarCpf(t); return { tipo: 'cpf', valido: r.valido, formatado: r.formatado, aviso: r.valido ? undefined : r.motivo } }
    if (digitos.length === 14) { const r = validarCnpj(t); return { tipo: 'cnpj', valido: r.valido, formatado: r.formatado, aviso: r.valido ? undefined : r.motivo } }
  }
  // CNPJ alfanumérico (2026): 12 caracteres + 2 dígitos
  const alfa = t.replace(/[.\-\/\s]/g, '').toUpperCase()
  if (/^[A-Z0-9]{12}\d{2}$/.test(alfa) && /[A-Z]/.test(alfa.slice(0, 12)) && /\d/.test(alfa.slice(0, 12))) { const r = validarCnpj(alfa); return { tipo: 'cnpj', valido: r.valido, formatado: r.formatado, aviso: r.valido ? undefined : r.motivo } }
  return { tipo: 'nome', valido: t.length >= 3, formatado: t, aviso: t.length >= 3 ? undefined : 'Digite pelo menos 3 letras.' }
}

export type Acao = { id: string; titulo: string; texto: string; href: string; externo?: boolean; fonte: string }
const q = encodeURIComponent

/** O que fazer com cada tipo de busca: as telas da plataforma já com o termo preenchido e os sites externos. */
export function acoesPara(d: Detectado): Acao[] {
  const t = d.formatado
  if (d.tipo === 'vazio') return []
  const ext = (id: string, titulo: string, texto: string, href: string, fonte: string): Acao => ({ id, titulo, texto, href, externo: true, fonte })
  const intern = (id: string, titulo: string, texto: string, href: string, fonte: string): Acao => ({ id, titulo, texto, href, fonte })
  if (d.tipo === 'cnj') return [
    intern('linha', 'Histórico completo de andamentos', 'Todas as movimentações do processo, em ordem, com filtro por período e texto.', `/monitoramento?lt=${q(t)}`, 'DataJud (CNJ)'),
    intern('prazos', 'Calcular o prazo do próximo ato', 'Escolha o ato pelo código (CPC, CLT, CPP…) e veja a data final.', '/prazos', 'Prazos por código'),
    intern('intim', 'Intimações deste processo', 'Publicações do Diário de Justiça Eletrônico Nacional para as OABs do escritório.', '/intimacoes', 'DJEN (CNJ)'),
    intern('cart', 'Acompanhar na carteira', 'Cadastre o processo para monitorar andamentos e prazos.', '/processos/importar', 'Carteira de processos'),
    ext('escavador', 'Abrir no Escavador', 'Capa, partes e movimentações no Escavador.', `https://www.escavador.com/busca?q=${q(t)}`, 'Escavador'),
    ext('jusbrasil', 'Abrir no Jusbrasil', 'Processo e jurisprudência relacionada.', `https://www.jusbrasil.com.br/busca?q=${q(t)}`, 'Jusbrasil'),
  ]
  if (d.tipo === 'cnpj') return [
    intern('kyc', 'Checagem de contraparte (empresa)', 'Situação na Receita, sócios, sanções e conflito de interesse.', `/kyc?doc=${q(t)}`, 'Receita Federal, CGU'),
    intern('parte', 'Ficha da parte adversa', 'Publicações, diários oficiais e processos citando a empresa, com finalidade e caso.', `/parte-adversa?parte=${q(t)}&cnpj=${q(t)}`, 'Comunica PJe, Querido Diário'),
    intern('mon', 'Monitorar a empresa', 'Aviso de novas publicações e de ação distribuída contra ou a favor.', '/monitoramento', 'DJEN (CNJ)'),
    intern('fontes', 'Buscar processos no Escavador (token do escritório)', 'Processos e publicações por CNPJ.', `/fontes?termo=${q(t)}`, 'Escavador'),
    ext('escavador', 'Abrir no Escavador', 'Busca pelo CNPJ no site.', `https://www.escavador.com/busca?q=${q(t)}`, 'Escavador'),
  ]
  if (d.tipo === 'cpf') return [
    intern('parte', 'Ficha da parte adversa (pessoa física)', 'Publicações e diários oficiais com o nome; exige finalidade e caso (LGPD, art. 7º, VI).', '/parte-adversa', 'Comunica PJe, Querido Diário'),
    intern('fontes', 'Buscar processos no Escavador (token do escritório)', 'Processos por CPF.', `/fontes?termo=${q(t)}`, 'Escavador'),
    ext('receita', 'Situação do CPF na Receita', 'Confere nome, nascimento e situação cadastral.', 'https://servicos.receita.fazenda.gov.br/servicos/cpf/consultasituacao/consultapublica.asp', 'Receita Federal'),
    ext('escavador', 'Abrir no Escavador', 'Busca pelo CPF no site.', `https://www.escavador.com/busca?q=${q(t)}`, 'Escavador'),
  ]
  if (d.tipo === 'oab') return [
    intern('importar', 'Importar todos os processos desta OAB', 'Busca o histórico de publicações da OAB e lista os processos para você escolher.', '/processos/importar', 'DJEN (CNJ)'),
    intern('intim', 'Ver intimações das OABs do escritório', 'Caixa de intimações com busca várias vezes ao dia.', '/intimacoes', 'DJEN (CNJ)'),
    ext('cna', 'Conferir o advogado no Cadastro Nacional (OAB)', 'Situação da inscrição e sociedade de advogados.', 'https://cna.oab.org.br/', 'OAB'),
  ]
  return [
    intern('parte', 'Ficha da parte adversa', 'Publicações e diários oficiais com o nome; exige finalidade e caso.', `/parte-adversa?parte=${q(t)}`, 'Comunica PJe, Querido Diário'),
    intern('mon', 'Monitorar o nome', 'Avisa de novas publicações, com variações de grafia e termos obrigatórios ou excludentes.', '/monitoramento', 'DJEN (CNJ)'),
    intern('fontes', 'Buscar processos no Escavador (token do escritório)', 'Processos e publicações por nome.', `/fontes?termo=${q(t)}`, 'Escavador'),
    ext('escavador', 'Abrir no Escavador', 'Busca pelo nome no site.', `https://www.escavador.com/busca?q=${q(t)}`, 'Escavador'),
    ext('jusbrasil', 'Abrir no Jusbrasil', 'Processos, diários e jurisprudência.', `https://www.jusbrasil.com.br/busca?q=${q(t)}`, 'Jusbrasil'),
  ]
}

// ---------- Due diligence por tipo de assunto ----------
export type ItemDiligencia = { id: string; item: string; fonte: string; link?: string; prova: string; validade?: string; interno?: string }
export type Diligencia = { id: string; titulo: string; para: string; itens: ItemDiligencia[] }

export const DILIGENCIAS: Diligencia[] = [
  { id: 'empresa', titulo: 'Empresa (CNPJ)', para: 'Contratar, vender, financiar, comprar participação ou litigar contra uma empresa.', itens: [
    { id: 'cnpj', item: 'Cartão CNPJ, situação cadastral e quadro de sócios', fonte: 'Receita Federal', link: 'https://solucoes.receita.fazenda.gov.br/servicos/cnpjreva/cnpjreva_solicitacao.asp', prova: 'A empresa existe, está ativa e quem são os sócios e administradores.', interno: '/kyc' },
    { id: 'jucerja', item: 'Ficha cadastral e atos arquivados (contrato social e alterações)', fonte: 'Junta Comercial do estado (no Rio: JUCERJA)', link: 'https://www.jucerja.rj.gov.br/', prova: 'Quem pode assinar pela empresa e se houve alterações recentes.' },
    { id: 'cnd-federal', item: 'Certidão de débitos federais (Receita e PGFN)', fonte: 'Receita Federal e PGFN', link: 'https://servicos.receita.fazenda.gov.br/servicos/certidaointernet/pj/emitir', prova: 'Regularidade com tributos federais e dívida ativa da União.', validade: '180 dias' },
    { id: 'crf', item: 'Certificado de regularidade do FGTS', fonte: 'Caixa Econômica Federal', link: 'https://consulta-crf.caixa.gov.br/consultacrf/pages/consultaEmpregador.jsf', prova: 'Regularidade dos depósitos de FGTS dos empregados.', validade: '30 dias' },
    { id: 'cndt', item: 'Certidão negativa de débitos trabalhistas (CNDT)', fonte: 'Tribunal Superior do Trabalho', link: 'https://www.tst.jus.br/certidao', prova: 'Inexistência de dívida trabalhista já reconhecida em decisão.', validade: '180 dias' },
    { id: 'estadual-municipal', item: 'Certidões de tributos estaduais e municipais', fonte: 'Secretaria de Fazenda do estado e da prefeitura', prova: 'Regularidade de ICMS, ISS e taxas.', validade: 'conforme a certidão' },
    { id: 'distribuicao', item: 'Certidões de distribuição cível, fiscal, criminal e trabalhista da empresa e dos sócios', fonte: 'Tribunais de Justiça, Justiça Federal e TRT', prova: 'Processos em andamento que possam afetar o patrimônio.', validade: 'conforme a certidão' },
    { id: 'processos', item: 'Processos e publicações pelo CNPJ e pelo nome', fonte: 'Escavador, Comunica PJe (DJEN) e DataJud', prova: 'Histórico de litígios, mesmo sem certidão.', interno: '/parte-adversa' },
    { id: 'sancoes', item: 'Sanções e impedimentos (CEIS, CNEP e outros cadastros)', fonte: 'Portal da Transparência (CGU)', link: 'https://portaldatransparencia.gov.br/sancoes/consulta', prova: 'Empresa punida ou impedida de contratar com o poder público.', interno: '/kyc' },
    { id: 'protestos', item: 'Protestos', fonte: 'Cartórios de protesto (consulta nacional)', link: 'https://www.cenprotnacional.org.br/', prova: 'Títulos protestados contra a empresa.' },
    { id: 'marcas', item: 'Marcas e patentes registradas', fonte: 'INPI', link: 'https://busca.inpi.gov.br/pePI/', prova: 'Titularidade de marca ou patente usada no negócio.' },
    { id: 'mid', item: 'Notícias e mídia adversa', fonte: 'Fontes abertas (notícias e diários oficiais)', prova: 'Fatos públicos relevantes que não aparecem em certidão.', interno: '/parte-adversa' },
  ] },
  { id: 'pessoa', titulo: 'Pessoa física (CPF)', para: 'Contratar, ser fiador, comprar de uma pessoa, conhecer o adversário ou o futuro sócio.', itens: [
    { id: 'cpf', item: 'Situação cadastral do CPF', fonte: 'Receita Federal', link: 'https://servicos.receita.fazenda.gov.br/servicos/cpf/consultasituacao/consultapublica.asp', prova: 'CPF regular e nome conferido com o documento.' },
    { id: 'civel', item: 'Certidões de distribuição cível (Estadual e Federal)', fonte: 'Tribunal de Justiça e Justiça Federal da residência', prova: 'Ações cíveis, execuções e falência.', validade: 'conforme a certidão' },
    { id: 'criminal', item: 'Certidões criminais (Estadual e Federal)', fonte: 'Tribunal de Justiça e Justiça Federal; Polícia Federal (antecedentes)', prova: 'Ações penais e antecedentes.', validade: 'conforme a certidão' },
    { id: 'trab', item: 'Certidão trabalhista (CNDT) e ações no TRT', fonte: 'Tribunal Superior do Trabalho e TRT', link: 'https://www.tst.jus.br/certidao', prova: 'Dívidas e ações trabalhistas.', validade: '180 dias' },
    { id: 'bnmp', item: 'Mandados de prisão', fonte: 'BNMP (CNJ)', link: 'https://portalbnmp.cnj.jus.br/', prova: 'Mandado de prisão em aberto.' },
    { id: 'processos', item: 'Processos e publicações pelo nome e pelo CPF', fonte: 'Escavador, Comunica PJe (DJEN), DataJud e Querido Diário', prova: 'Histórico de litígios e atos em diários oficiais.', interno: '/parte-adversa' },
    { id: 'protestos', item: 'Protestos', fonte: 'Cartórios de protesto (consulta nacional)', link: 'https://www.cenprotnacional.org.br/', prova: 'Títulos protestados.' },
    { id: 'cnib', item: 'Indisponibilidade de bens', fonte: 'CNIB (Central Nacional de Indisponibilidade de Bens)', link: 'https://www.indisponibilidade.org.br/', prova: 'Bens bloqueados por ordem judicial ou administrativa.' },
    { id: 'sancoes', item: 'Sanções e cadastros públicos', fonte: 'Portal da Transparência (CGU)', link: 'https://portaldatransparencia.gov.br/sancoes/consulta', prova: 'Pessoa punida ou impedida de contratar com o poder público.' },
  ] },
  { id: 'imovel', titulo: 'Imóvel', para: 'Compra, venda, locação de longo prazo, garantia ou financiamento.', itens: [
    { id: 'matricula', item: 'Matrícula atualizada com certidão de ônus reais', fonte: 'Cartório de Registro de Imóveis (pedido pelo ONR)', link: 'https://www.registradores.onr.org.br/', prova: 'Quem é o dono, hipotecas, penhoras, alienação fiduciária e outras restrições.', validade: '30 dias (para escritura)' },
    { id: 'iptu', item: 'Certidão negativa de IPTU e taxas do imóvel', fonte: 'Prefeitura', prova: 'Ausência de dívida que acompanha o imóvel.', validade: 'conforme a certidão' },
    { id: 'condominio', item: 'Declaração de quitação do condomínio', fonte: 'Síndico ou administradora', prova: 'Dívida condominial acompanha o imóvel.' },
    { id: 'vendedor', item: 'Certidões do vendedor (cível, fiscal, trabalhista, protesto) e dos cônjuges', fonte: 'Tribunais, Receita e cartórios', prova: 'Evita fraude à execução e penhora do imóvel por dívida do vendedor.', validade: 'conforme a certidão' },
    { id: 'cnib', item: 'Indisponibilidade de bens do vendedor', fonte: 'CNIB', link: 'https://www.indisponibilidade.org.br/', prova: 'Bloqueio que impede a venda.' },
    { id: 'processos', item: 'Processos contra o imóvel e o vendedor', fonte: 'Escavador, Comunica PJe e DataJud', prova: 'Ações reipersecutórias e execuções.', interno: '/parte-adversa' },
    { id: 'habitese', item: 'Habite-se, planta aprovada e regularidade urbanística', fonte: 'Prefeitura', prova: 'Imóvel regular perante o município.' },
    { id: 'ambiental', item: 'Áreas embargadas e restrições ambientais (imóvel rural ou grande)', fonte: 'IBAMA e órgão ambiental do estado', prova: 'Embargos e áreas protegidas.' },
  ] },
  { id: 'processo', titulo: 'Processo (contencioso)', para: 'Assumir, acompanhar ou auditar um processo, como os deixados por outro advogado.', itens: [
    { id: 'numero', item: 'Número CNJ válido e tribunal correto', fonte: 'Ferramentas (validador CNJ)', prova: 'Dígito conferido e tribunal identificado.', interno: '/ferramentas' },
    { id: 'andamentos', item: 'Histórico completo de andamentos', fonte: 'DataJud (CNJ)', prova: 'Tudo o que foi feito, em ordem, desde a distribuição.', interno: '/monitoramento' },
    { id: 'intimacoes', item: 'Intimações e publicações', fonte: 'Comunica PJe (DJEN)', prova: 'Prazos abertos e atos que exigem resposta.', interno: '/intimacoes' },
    { id: 'prazos', item: 'Prazos em aberto, por código do ramo', fonte: 'Calculadora de prazos por código', prova: 'Data final de cada ato pendente.', interno: '/prazos' },
    { id: 'procuracao', item: 'Procuração, substabelecimentos e atuação de outros advogados', fonte: 'Autos do processo', prova: 'Poderes e quem mais atua no processo.' },
    { id: 'partes', item: 'Partes, representantes e terceiros interessados', fonte: 'Autos e ficha da parte adversa', prova: 'Quem são e se há conflito de interesse.', interno: '/parte-adversa' },
    { id: 'custas', item: 'Custas, depósitos e gratuidade', fonte: 'Autos', prova: 'Risco de deserção e de pena por custas.' },
    { id: 'precedentes', item: 'Precedentes e perfil do julgador', fonte: 'Assistente jurídico e jurimetria', prova: 'Como o juízo e o tribunal decidem casos parecidos.', interno: '/assistente' },
    { id: 'segredo', item: 'Processo sigiloso ou fora da base pública', fonte: 'Consulta no sistema do tribunal com certificado ou peticionamento', prova: 'Segredo de justiça não aparece nas fontes públicas.' },
  ] },
]

// ---------- Cobertura e histórico de cada fonte ----------
export type Cobertura = { fonte: string; o_que_traz: string; historico: string; limite: string; onde: string; gratis: boolean }
export const COBERTURA: Cobertura[] = [
  { fonte: 'DataJud (CNJ)', o_que_traz: 'Capa, assuntos e todas as movimentações do processo, de todos os graus, em todos os ramos que o CNJ publica (estadual, federal, trabalho, eleitoral, militar, STJ, TST, TSE e STM).', historico: 'Completo para o que o tribunal enviou ao CNJ, desde a distribuição.', limite: 'Não traz as partes nem o inteiro teor das peças. STF fora da base. Segredo de justiça fica de fora. Cada tribunal atualiza em seu ritmo.', onde: 'Pesquisa (fontes oficiais) e Monitoramento', gratis: true },
  { fonte: 'Comunica PJe / DJEN (CNJ)', o_que_traz: 'Publicações com o texto completo (despachos, decisões, sentenças e intimações), com as partes e os advogados, por nome da parte, nome do advogado, OAB ou número.', historico: 'Até 5 anos para trás, em blocos de 90 dias (Pesquisa) ou de 30 dias (Importar pelas OABs).', limite: 'Só aparecem processos em que a OAB ou o nome recebeu publicação. Antes de o tribunal publicar no DJEN, consulte o diário do próprio tribunal.', onde: 'Intimações e Importar processos', gratis: true },
  { fonte: 'Querido Diário', o_que_traz: 'Diários oficiais de municípios (licitações, nomeações, atos).', historico: 'Conforme os municípios já coletados pelo projeto.', limite: 'Cobertura de municípios é parcial.', onde: 'Parte adversa', gratis: true },
  { fonte: 'Receita Federal (CNPJ e CPF)', o_que_traz: 'Situação cadastral, sócios e atividade.', historico: 'Situação atual (não mostra a linha do tempo de alterações).', limite: 'Alterações antigas estão na Junta Comercial.', onde: 'Checagem de contraparte', gratis: true },
  { fonte: 'Portal da Transparência (sanções)', o_que_traz: 'Empresas e pessoas punidas ou impedidas de contratar com o poder público.', historico: 'Vigência de cada sanção.', limite: 'Só sanções federais cadastradas.', onde: 'Checagem de contraparte', gratis: true },
  { fonte: 'Escavador (opcional, pago por crédito)', o_que_traz: 'Processos por nome, CPF, CNPJ, OAB ou número; partes e movimentações; diários.', historico: 'Conforme a base do Escavador, que reúne tribunais, diários e autos que o DataJud não mostra.', limite: 'Opcional: a busca nas fontes oficiais já cobre andamentos e publicações. Serve para autos que não foram publicados e tribunais fora do DataJud. Exige token e consome créditos; uso conforme a LGPD.', onde: 'Fontes do advogado', gratis: false },
  { fonte: 'Certidões (Receita, PGFN, FGTS, TST, tribunais)', o_que_traz: 'Prova oficial e datada de regularidade.', historico: 'Instantâneo do dia da emissão.', limite: 'Têm validade; precisam ser emitidas no site do órgão e anexadas ao caso.', onde: 'Due diligence (lista abaixo)', gratis: true },
  { fonte: 'Sistemas do Judiciário (autos, SISBAJUD, RENAJUD, INFOJUD)', o_que_traz: 'Autos completos, bloqueios e consultas patrimoniais.', historico: 'Completo.', limite: 'Acesso só pelo tribunal ou pela autoridade; a plataforma não substitui.', onde: 'Fora da plataforma', gratis: true },
]

/** Texto da lista de diligência para copiar para o e-mail ou o dossiê. */
export function textoDiligencia(d: Diligencia, feitos: Record<string, boolean>, assunto: string): string {
  const linhas = d.itens.map(i => `[${feitos[i.id] ? 'x' : ' '}] ${i.item} — ${i.fonte}${i.validade ? ` (validade: ${i.validade})` : ''}`)
  const feitosN = d.itens.filter(i => feitos[i.id]).length
  return [`Due diligence: ${d.titulo}${assunto ? ` — ${assunto}` : ''}`, `${feitosN} de ${d.itens.length} itens conferidos`, '', ...linhas].join('\n')
}
