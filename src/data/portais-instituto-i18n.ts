/**
 * V6 do plano mestre v6 (pedido de M, 13/11/2026): cada porta do Instituto é lida nas quatro
 * línguas da plataforma. O arquivo `portais-instituto.ts` segue sendo a fonte do que a porta é
 * (rota, estado), e este arquivo traz o texto em PT/EN/ZH/ES. O português bate letra a letra com
 * o original, para que a tradução seja um espelho e nada se perca no meio.
 *
 * Estado e a frase que explica o estado também ficam traduzidos aqui: antes vinham como
 * constantes em português no arquivo de dados.
 */
import type { EstadoPortal } from '@/data/portais-instituto'
import type { Idioma } from '@/lib/idioma'

export interface PortalTraduzido {
  nome: string
  resumo: string
  escopo: string[]
  comoEsta: string
}

export const ROTULO_ESTADO_I18N: Record<Idioma, Record<EstadoPortal, string>> = {
  pt: { estudo: 'Em estudo', prototipo: 'Protótipo em construção', piloto: 'Piloto com quem já usa' },
  en: { estudo: 'Under study', prototipo: 'Prototype in construction', piloto: 'Pilot with current users' },
  zh: { estudo: '研究中', prototipo: '原型搭建中', piloto: '小范围试点' },
  es: { estudo: 'En estudio', prototipo: 'Prototipo en construcción', piloto: 'Piloto con quienes ya usan' },
}

export const EXPLICACAO_ESTADO_I18N: Record<Idioma, Record<EstadoPortal, string>> = {
  pt: {
    estudo: 'Existe o desenho e a pesquisa; ainda não existe programa para usar.',
    prototipo: 'Já existe parte funcionando, em teste, e ainda não está aberta ao público.',
    piloto: 'Está em uso real com um grupo pequeno, antes de abrir para todos.',
  },
  en: {
    estudo: 'The design and research exist; there is still no program to use.',
    prototipo: 'Part of it already works, under test, and it is not yet open to the public.',
    piloto: 'It is in real use with a small group, before being opened to everyone.',
  },
  zh: {
    estudo: '设计与研究已有,但尚无可用的程序。',
    prototipo: '部分功能已在运行并测试中,尚未对公众开放。',
    piloto: '在小范围实际使用,尚未对所有人开放。',
  },
  es: {
    estudo: 'Existen el diseño y la investigación; todavía no hay programa para usar.',
    prototipo: 'Ya hay una parte funcionando, en pruebas, y aún no está abierta al público.',
    piloto: 'Está en uso real con un grupo pequeño, antes de abrirse a todos.',
  },
}

export const PORTAIS_I18N: Record<string, Record<Idioma, PortalTraduzido>> = {
  '/preditiva': {
    pt: {
      nome: 'Plataforma preditiva',
      resumo: 'Estimar, com incerteza declarada, como um processo ou um mercado tende a andar.',
      escopo: [
        'Previsão de desfecho e de prazo a partir de decisões já publicadas, sempre com a margem de erro à vista',
        'Séries públicas de água, minério, desmatamento e agro, com a fonte oficial de cada número',
        'Boletim que qualquer pessoa pode conferir: todo número leva ao dado de origem',
      ],
      comoEsta: 'A previsão de processo já funciona dentro da plataforma de direito, na tela Previsões, com a calibragem à vista. As séries de mercado estão sendo ligadas uma a uma.',
    },
    en: {
      nome: 'Predictive platform',
      resumo: 'Estimate, with stated uncertainty, how a lawsuit or a market tends to move.',
      escopo: [
        'Forecast of outcome and deadline from already published decisions, always with the margin of error in view',
        'Public series on water, mining, deforestation and agriculture, with the official source of every figure',
        'A bulletin anyone can verify: every number links back to its source',
      ],
      comoEsta: 'Lawsuit forecasting already works inside the law platform, on the Forecasts screen, with calibration in view. The market series are being connected one by one.',
    },
    zh: {
      nome: '预测平台',
      resumo: '在声明不确定度的前提下,估算案件或市场的走向。',
      escopo: [
        '基于已公布的判决预测结果与时限,始终显示误差范围',
        '水资源、矿产、毁林与农业的公开时序,每个数据都注明官方来源',
        '任何人都可核验的简报:每个数字都可追溯到原始数据',
      ],
      comoEsta: '案件预测已在法律平台的“预测”界面运行,并显示校准信息。市场时序正在逐一接入。',
    },
    es: {
      nome: 'Plataforma predictiva',
      resumo: 'Estimar, con la incertidumbre declarada, cómo tiende a avanzar un proceso o un mercado.',
      escopo: [
        'Pronóstico de desenlace y plazo a partir de decisiones ya publicadas, siempre con el margen de error a la vista',
        'Series públicas de agua, mineral, deforestación y agro, con la fuente oficial de cada número',
        'Boletín que cualquiera puede verificar: cada número lleva al dato de origen',
      ],
      comoEsta: 'La previsión de proceso ya funciona dentro de la plataforma de derecho, en la pantalla Previsiones, con la calibración a la vista. Las series de mercado se van conectando una a una.',
    },
  },
  '/geomapeamento': {
    pt: {
      nome: 'Geomapeamento',
      resumo: 'Juntar num mapa as camadas públicas de um município para enxergar o que está em volta de um imóvel ou de uma obra.',
      escopo: [
        'Camadas públicas por município: zoneamento, área de proteção, risco, bacia',
        'Cruzamento com a ficha do imóvel que o escritório já tem na plataforma',
        'Exportar o mapa e a lista de camadas usadas, com a data de cada fonte',
      ],
      comoEsta: 'Levantamento das fontes públicas em andamento. Ainda não há mapa para usar.',
    },
    en: {
      nome: 'Geomapping',
      resumo: "Combine on a map a municipality's public layers to see what surrounds a property or a construction site.",
      escopo: [
        'Public layers by municipality: zoning, protected area, risk, basin',
        'Cross-reference with the property record the firm already has in the platform',
        'Export the map and the list of layers used, with the date of each source',
      ],
      comoEsta: 'Survey of public sources in progress. There is no map to use yet.',
    },
    zh: {
      nome: '地理图谱',
      resumo: '将某市的公共图层叠加在地图上,直观看到地产或工地周围的情况。',
      escopo: [
        '各市公共图层:分区、保护区、风险区、流域',
        '与事务所平台中已有的地产档案交叉比对',
        '可导出地图及所用图层清单,附每个来源的日期',
      ],
      comoEsta: '公共数据源梳理进行中,尚无可用地图。',
    },
    es: {
      nome: 'Geomapeo',
      resumo: 'Reunir en un mapa las capas públicas de un municipio para ver qué hay en torno a un inmueble o a una obra.',
      escopo: [
        'Capas públicas por municipio: zonificación, área de protección, riesgo, cuenca',
        'Cruce con la ficha del inmueble que el despacho ya tiene en la plataforma',
        'Exportar el mapa y la lista de capas usadas, con la fecha de cada fuente',
      ],
      comoEsta: 'Relevamiento de las fuentes públicas en curso. Aún no hay mapa para usar.',
    },
  },
  '/governo': {
    pt: {
      nome: 'Estudos para governo',
      resumo: 'Estudos técnicos para órgãos públicos, com método aberto e dado de fonte oficial.',
      escopo: [
        'Estudo por encomenda, com a pergunta, o método e os limites escritos antes de começar',
        'Dado só de fonte pública e oficial, citada uma por uma',
        'Entrega com o caminho para qualquer pessoa repetir a conta',
      ],
      comoEsta: 'O método está escrito e a biblioteca de fontes existe. Nenhum estudo foi encomendado ainda.',
    },
    en: {
      nome: 'Studies for government',
      resumo: 'Technical studies for public bodies, with open method and data from official sources.',
      escopo: [
        'Commissioned study with the question, method and limits written before starting',
        'Data only from public and official sources, cited one by one',
        'Delivered with the path for anyone to reproduce the calculation',
      ],
      comoEsta: 'The method is written and the library of sources exists. No study has been commissioned yet.',
    },
    zh: {
      nome: '为政府提供研究',
      resumo: '面向公共部门的技术研究,方法公开,数据来自官方来源。',
      escopo: [
        '按需承接研究,开工前先写明问题、方法与边界',
        '数据只来自公开且官方来源,逐一列明',
        '交付时附路径,任何人都能复现计算',
      ],
      comoEsta: '方法已编写,来源库已就绪。尚未有研究被委托。',
    },
    es: {
      nome: 'Estudios para el gobierno',
      resumo: 'Estudios técnicos para organismos públicos, con método abierto y datos de fuente oficial.',
      escopo: [
        'Estudio por encargo, con la pregunta, el método y los límites escritos antes de comenzar',
        'Datos sólo de fuente pública y oficial, citada una por una',
        'Entrega con el camino para que cualquier persona repita el cálculo',
      ],
      comoEsta: 'El método está escrito y la biblioteca de fuentes existe. Aún no se ha encargado ningún estudio.',
    },
  },
  '/educacao': {
    pt: {
      nome: 'Educação e capacitação em IA',
      resumo: 'Ensinar uma equipe a usar inteligência artificial no trabalho dela, sem promessa mágica.',
      escopo: [
        'Trilha curta por profissão, com exercício no trabalho real de quem está aprendendo',
        'O que a ferramenta não faz, dito com a mesma clareza do que ela faz',
        'Material que fica com a equipe depois do curso',
      ],
      comoEsta: 'Em desenho. O conteúdo está sendo montado a partir do que já se usa dentro da plataforma.',
    },
    en: {
      nome: 'AI education and training',
      resumo: "Teach a team to use artificial intelligence in its own work, with no magical promise.",
      escopo: [
        'Short track per profession, with exercises on real work of those learning',
        'What the tool does not do, stated as clearly as what it does',
        'Material that stays with the team after the course',
      ],
      comoEsta: 'Being designed. The content is being assembled from what is already used inside the platform.',
    },
    zh: {
      nome: '人工智能教育与培训',
      resumo: '教团队在自己的工作中使用人工智能,不做夸大承诺。',
      escopo: [
        '按职业设置短期训练路径,练习就来自学员的真实工作',
        '工具做不到的事,与它能做到的事说得同样清楚',
        '课程结束后留给团队的资料',
      ],
      comoEsta: '设计阶段。内容正从平台中已在使用的部分整理而来。',
    },
    es: {
      nome: 'Educación y capacitación en IA',
      resumo: 'Enseñar a un equipo a usar la inteligencia artificial en su propio trabajo, sin promesa mágica.',
      escopo: [
        'Trayecto corto por profesión, con ejercicios en el trabajo real de quien aprende',
        'Lo que la herramienta no hace, dicho con la misma claridad que lo que hace',
        'Material que queda con el equipo después del curso',
      ],
      comoEsta: 'En diseño. El contenido se arma a partir de lo que ya se usa dentro de la plataforma.',
    },
  },
  '/civico': {
    pt: {
      nome: 'Portal Cívico',
      resumo: 'Pôr na mão de qualquer cidadão as contas e os dados públicos que hoje só quem é da área consegue ler.',
      escopo: [
        'Pergunta em português simples, resposta com o dado oficial atrás',
        'Nada de opinião: o portal mostra o número e de onde ele veio',
        'Aberto, sem login, sem cobrar',
      ],
      comoEsta: 'Em desenho. Ainda não há página pública com dado nenhum.',
    },
    en: {
      nome: 'Civic Portal',
      resumo: 'Put into every citizen’s hands the public figures and data that today only a specialist can read.',
      escopo: [
        'A question in plain language, an answer with the official datum behind it',
        'No opinion: the portal shows the number and where it came from',
        'Open, no login, no fee',
      ],
      comoEsta: 'Being designed. There is no public page with any data yet.',
    },
    zh: {
      nome: '公民门户',
      resumo: '把今天只有业内人能看懂的公共数据与账本,送到每位公民手上。',
      escopo: [
        '用平实的语言提问,回答背后附上官方数据',
        '不做评论:门户只展示数字及其来源',
        '开放访问,无需登录,不收费',
      ],
      comoEsta: '设计阶段。尚无含任何数据的公开页面。',
    },
    es: {
      nome: 'Portal Cívico',
      resumo: 'Poner en manos de cualquier ciudadano las cuentas y los datos públicos que hoy sólo lee quien es del área.',
      escopo: [
        'Pregunta en lenguaje sencillo, respuesta con el dato oficial detrás',
        'Sin opinión: el portal muestra el número y de dónde vino',
        'Abierto, sin login, sin cobrar',
      ],
      comoEsta: 'En diseño. Todavía no hay página pública con ningún dato.',
    },
  },
  '/ciberseguranca': {
    pt: {
      nome: 'Cibersegurança',
      resumo: 'Cuidar do que o escritório guarda: dado de cliente, peça, contrato e prazo.',
      escopo: [
        'Revisão de quem alcança o quê, no banco e não só na tela',
        'Segundo fator na entrada e trilha de acesso para auditoria',
        'Resposta a incidente: o que fazer, em que ordem, e quem avisar',
      ],
      comoEsta: 'As três coisas já estão em uso na plataforma de direito: segundo fator, trilha de acesso e auditoria das regras do banco. O que falta é virar serviço para outras casas.',
    },
    en: {
      nome: 'Cybersecurity',
      resumo: 'Protect what the firm holds: client data, pleadings, contracts and deadlines.',
      escopo: [
        'Review of who reaches what, in the database and not only on screen',
        'Second factor at sign-in and access trail for auditing',
        'Incident response: what to do, in what order, and who to notify',
      ],
      comoEsta: 'All three are already in use in the law platform: second factor, access trail and database-rule auditing. What is missing is turning it into a service for other firms.',
    },
    zh: {
      nome: '网络安全',
      resumo: '守护事务所所存:客户资料、诉状、合同与时限。',
      escopo: [
        '核查谁能访问什么,核到数据库层,而不仅是界面',
        '登录时的双重验证与可审计的访问轨迹',
        '事件响应:要做什么,按什么顺序,通知谁',
      ],
      comoEsta: '上述三项已在法律平台中使用:双重验证、访问轨迹与数据库规则审计。目前尚待将其发展为对其他事务所的服务。',
    },
    es: {
      nome: 'Ciberseguridad',
      resumo: 'Cuidar lo que el despacho guarda: datos del cliente, pieza, contrato y plazo.',
      escopo: [
        'Revisión de quién llega a qué, en la base de datos y no sólo en la pantalla',
        'Segundo factor al entrar y rastro de acceso para auditoría',
        'Respuesta a incidente: qué hacer, en qué orden y a quién avisar',
      ],
      comoEsta: 'Las tres cosas ya están en uso en la plataforma de derecho: segundo factor, rastro de acceso y auditoría de las reglas de la base de datos. Falta convertirlo en servicio para otros despachos.',
    },
  },
  '/quantum': {
    pt: {
      nome: 'Quantum computing',
      resumo: 'Pesquisa, sem venda: entender o que a computação quântica muda na segurança do que guardamos hoje.',
      escopo: [
        'Acompanhar o que já é consenso e o que ainda é promessa',
        'Preparar a troca das cifras que um computador quântico quebraria',
        'Publicar o que se aprende, inclusive quando a conclusão é "ainda não muda nada"',
      ],
      comoEsta: 'Pesquisa em leitura, sem promessa de prazo. O que já existe para contratar é tempo de processador quântico da IBM, revendido pelo Instituto: preços, usos e limites em /cotas-quanticas.',
    },
    en: {
      nome: 'Quantum computing',
      resumo: "Research, not sales: understand what quantum computing changes in the security of what we store today.",
      escopo: [
        'Track what is already consensus and what is still a promise',
        'Prepare the replacement of ciphers a quantum computer would break',
        'Publish what is learned, even when the conclusion is "it does not change anything yet"',
      ],
      comoEsta: "Reading research, with no deadline promised. What is available for hire is IBM quantum processor time, resold by the Institute: prices, uses and limits at /cotas-quanticas.",
    },
    zh: {
      nome: '量子计算',
      resumo: '只做研究,不做售卖:理解量子计算对我们当下所存资料安全的影响。',
      escopo: [
        '跟踪什么已成共识,什么仍只是承诺',
        '为更换会被量子计算机攻破的密码做准备',
        '公开所学,哪怕结论是“目前尚无变化”',
      ],
      comoEsta: '研究阅读中,不承诺期限。目前可购买的是由学院转售的 IBM 量子处理器机时:价格、用途与限制见 /cotas-quanticas。',
    },
    es: {
      nome: 'Computación cuántica',
      resumo: 'Investigación, sin venta: entender qué cambia la computación cuántica en la seguridad de lo que guardamos hoy.',
      escopo: [
        'Seguir lo que ya es consenso y lo que aún es promesa',
        'Preparar el reemplazo de las cifras que un ordenador cuántico rompería',
        'Publicar lo que se aprende, incluso cuando la conclusión es "aún no cambia nada"',
      ],
      comoEsta: 'Investigación en lectura, sin plazo prometido. Lo que ya se puede contratar es tiempo de procesador cuántico de IBM, revendido por el Instituto: precios, usos y límites en /cotas-quanticas.',
    },
  },
  '/ia': {
    pt: {
      nome: 'IA e superinteligência',
      resumo: 'Onde a inteligência artificial entra no trabalho sério e onde ela não deve entrar.',
      escopo: [
        'Toda peça sai como rascunho, e o advogado revisa e assina: isso não é negociável',
        'Toda previsão sai com a incerteza declarada',
        'O que a plataforma se recusa a fazer, escrito: nada de análise de rosto, de emoção, de mentira ou de perfil psicológico, e nada de vasculhar rede social de parte, advogado ou julgador',
      ],
      comoEsta: 'Em uso real dentro da plataforma de direito, com estas regras valendo hoje, não como intenção.',
    },
    en: {
      nome: 'AI and superintelligence',
      resumo: 'Where artificial intelligence belongs in serious work, and where it must not.',
      escopo: [
        'Every pleading comes out as a draft, and the lawyer reviews and signs it: this is non-negotiable',
        'Every forecast comes out with its uncertainty declared',
        'What the platform refuses to do, in writing: no face, emotion, lie or psychological profile analysis, and no scraping of social networks of a party, lawyer or judge',
      ],
      comoEsta: 'In real use inside the law platform, with these rules in force today, not as intent.',
    },
    zh: {
      nome: '人工智能与超级智能',
      resumo: '人工智能可以参与的严肃工作在哪里,又不该进入哪里。',
      escopo: [
        '所有诉状均以草稿交付,由律师审阅并签署:此项不可妥协',
        '所有预测都声明其不确定度',
        '书面写明本平台拒绝做的事:不进行面部、情绪、谎言或心理画像分析;不扒取当事人、律师或法官的社交网络',
      ],
      comoEsta: '已在法律平台中实际使用,且这些规则现在生效,而非仅是承诺。',
    },
    es: {
      nome: 'IA y superinteligencia',
      resumo: 'Dónde la inteligencia artificial entra en el trabajo serio y dónde no debe entrar.',
      escopo: [
        'Cada pieza sale como borrador, y el abogado revisa y firma: esto no es negociable',
        'Cada previsión sale con la incertidumbre declarada',
        'Lo que la plataforma se niega a hacer, por escrito: nada de análisis de rostro, emoción, mentira o perfil psicológico, y nada de rastrear redes sociales de la parte, el abogado o el juez',
      ],
      comoEsta: 'En uso real dentro de la plataforma de derecho, con estas reglas vigentes hoy, no como intención.',
    },
  },
}
