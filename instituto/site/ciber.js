// Tema Q01 · Cibersegurança e direito: prazo ANPD, teste de risco do escritório e mapa de normas. Tudo no navegador.
(function () {
  var $ = function (id) { return document.getElementById(id); };
  function el(tag, txt, cls) { var e = document.createElement(tag); if (txt) e.textContent = txt; if (cls) e.className = cls; return e; }
  function link(href, txt) { var a = el('a', txt); a.href = href; a.rel = 'noopener'; return a; }

  // ---------- Ferramenta 1: dias úteis com feriados nacionais ----------
  function pascoa(y) { // algoritmo de Meeus/Jones/Butcher
    var a = y % 19, b = Math.floor(y / 100), c = y % 100, d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3),
      h = (19 * a + b - d - g + 15) % 30, i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451),
      mes = Math.floor((h + l - 7 * m + 114) / 31), dia = ((h + l - 7 * m + 114) % 31) + 1;
    return new Date(Date.UTC(y, mes - 1, dia));
  }
  function iso(d) { return d.toISOString().slice(0, 10); }
  var cacheFer = {};
  function feriados(y) {
    if (cacheFer[y]) return cacheFer[y];
    var fixos = ['01-01', '04-21', '05-01', '09-07', '10-12', '11-02', '11-15', '11-20', '12-25'];
    var s = {}; fixos.forEach(function (f) { s[y + '-' + f] = 1; });
    var p = pascoa(y); s[iso(new Date(p.getTime() - 2 * 864e5))] = 1; // Sexta-feira Santa
    cacheFer[y] = s; return s;
  }
  function util(d) { var w = d.getUTCDay(); return w !== 0 && w !== 6 && !feriados(d.getUTCFullYear())[iso(d)]; }
  function somarUteis(inicio, n) { var d = new Date(inicio.getTime()), k = 0; while (k < n) { d = new Date(d.getTime() + 864e5); if (util(d)) k++; } return d; }
  function br(d) { return d.toLocaleDateString('pt-BR', { timeZone: 'UTC', weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' }); }

  // Q18/Q19: PDF gerado pelo próprio navegador (Imprimir > Salvar como PDF). Nada sai do computador.
  function imprimir(ids, cab, titulo) {
    var agora = new Date();
    $(cab).textContent = titulo + ' · Instituto THEYE · gerado em ' + agora.toLocaleString('pt-BR') + '. Documento de apoio, não é parecer.';
    ids.forEach(function (id) { $(id).classList.add('imprimir'); });
    var fim = function () { ids.forEach(function (id) { $(id).classList.remove('imprimir'); }); window.removeEventListener('afterprint', fim); };
    window.addEventListener('afterprint', fim); window.print(); setTimeout(fim, 1500);
  }
  window.theyeCiber = { imprimir: imprimir,  somarUteis: somarUteis, feriados: feriados, pascoa: pascoa };

  function prazo() {
    var v = $('p-data').value, r = $('p-res'); r.textContent = ''; r.className = 'res';
    if (!v) { r.appendChild(el('p', 'Escolha a data para ver os prazos.', 'sm')); return; }
    var ini = new Date(v + 'T00:00:00Z'), peq = $('p-peq').checked, n = peq ? 6 : 3, comp = peq ? 40 : 20;
    var lim = somarUteis(ini, n), lc = somarUteis(ini, comp);
    var hoje = new Date(); hoje = new Date(Date.UTC(hoje.getFullYear(), hoje.getMonth(), hoje.getDate()));
    var resta = 0, d = new Date(hoje.getTime()); while (d < lim) { d = new Date(d.getTime() + 864e5); if (util(d)) resta++; }
    r.appendChild(el('div', 'Comunicar à ANPD e aos titulares até', 'kicker'));
    r.appendChild(el('p', br(lim), 'big'));
    var p = el('p', n + ' dias úteis' + (peq ? ' (prazo em dobro de agente de pequeno porte)' : '') + '. ' + (lim < hoje ? 'Este prazo já passou: comunique imediatamente e explique o motivo do atraso na própria comunicação.' : resta === 0 ? 'O prazo termina hoje.' : 'Faltam ' + resta + ' dia(s) útil(eis) a partir de hoje.'));
    r.appendChild(p); if (lim < hoje) r.className = 'res alerta';
    r.appendChild(el('p', 'Complementar as informações até ' + br(lc) + ' (' + comp + ' dias úteis).', 'sm'));
    var ol = el('ol', '', 'acoes');
    ['Conter o incidente e guardar as provas (logs, e-mails, prints com data) sem apagar nada.',
      'Avaliar se há risco ou dano relevante: dados sensíveis, de crianças, financeiros, de autenticação, protegidos por sigilo, ou em grande escala.',
      'Comunicar pelo formulário oficial da ANPD, com a natureza dos dados, os titulares afetados, as medidas tomadas e o contato do encarregado.',
      'Avisar os titulares em linguagem simples, dizendo o que aconteceu, o risco e o que eles podem fazer.',
      'Registrar o incidente, mesmo que não seja comunicado, e guardar esse registro por pelo menos 5 anos.'].forEach(function (t) { ol.appendChild(el('li', t)); });
    if ($('p-sens').value === 'sim') ol.insertBefore(el('li', 'Dados sensíveis ou de crianças indicam risco relevante: trate como incidente a comunicar.'), ol.children[2]);
    r.appendChild(ol);
  }
  $('p-pdf').onclick = function () { if (!$('p-data').value) { $('p-data').focus(); return; } imprimir(['prazo'], 'p-cab', 'Registro de incidente de segurança'); };
  ['p-data', 'p-peq', 'p-sens'].forEach(function (id) { $(id).addEventListener('input', prazo); $(id).addEventListener('change', prazo); });

  // ---------- Ferramenta 2: teste de risco ----------
  var PERG = [
    ['Todo mundo usa verificação em duas etapas no e-mail e nos sistemas do escritório?', 3, 'LGPD, art. 46: medidas técnicas aptas a proteger os dados.', 'Ligar a verificação em duas etapas no e-mail, na nuvem e no sistema de processos.'],
    ['Existe cópia de segurança fora do escritório, testada nos últimos 3 meses?', 3, 'Sequestro de dados (ransomware) é a maior causa de parada; prazo processual não espera.', 'Fazer cópia diária para um lugar separado e testar a restauração uma vez por trimestre.'],
    ['A equipe recebeu treino contra e-mail falso e golpe do boleto no último ano?', 2, 'Súmula 479 do STJ e dever de cuidado: o golpe com dados do cliente pode gerar responsabilidade.', 'Fazer um treino curto de 30 minutos e combinar que pedido de pagamento novo é sempre confirmado por telefone.'],
    ['Computadores e celulares do escritório têm disco criptografado e bloqueio de tela?', 2, 'Notebook perdido sem criptografia é incidente a comunicar (Res. CD/ANPD 15/2024).', 'Ligar o BitLocker (Windows) ou FileVault (Mac) e o bloqueio automático de tela.'],
    ['Sistemas e programas são atualizados automaticamente?', 2, 'Falha conhecida e não corrigida pesa contra o escritório na dosimetria da ANPD.', 'Ligar a atualização automática do Windows, do navegador e do antivírus.'],
    ['Cada pessoa só acessa as pastas dos clientes com que trabalha?', 2, 'Sigilo profissional (Lei 8.906/94, art. 7º, II) e princípio da necessidade (LGPD, art. 6º, III).', 'Organizar as pastas por cliente e liberar acesso só a quem atua no caso.'],
    ['Há um encarregado de dados (DPO) nomeado e um contato publicado?', 1, 'LGPD, art. 41. Agente de pequeno porte pode só indicar um canal de contato.', 'Nomear o encarregado e publicar o contato no site e nos contratos.'],
    ['Existe um plano escrito do que fazer em um incidente, com nomes e telefones?', 2, 'Res. CD/ANPD 15/2024: 3 dias úteis para comunicar; sem plano, o prazo se perde.', 'Escrever um plano de uma página: quem decide, quem avisa a ANPD e o cliente, onde estão as cópias.'],
    ['Os contratos com fornecedores de TI e nuvem têm cláusula de segurança e de aviso de incidente?', 2, 'LGPD, arts. 39 e 42: operador responde junto com o controlador.', 'Incluir cláusula de segurança, aviso em 24 horas e direito de auditoria nos contratos de TI.'],
    ['Documentos de clientes enviados para IA ou sites externos passam por regra do escritório?', 2, 'Sigilo profissional e transferência de dados (LGPD, art. 33).', 'Definir quais ferramentas de IA podem receber documentos e retirar nomes e CPFs antes de enviar.'],
    ['Senhas ficam num gerenciador de senhas, e não em papel ou planilha?', 1, 'Senha reaproveitada é a porta de entrada mais comum.', 'Adotar um gerenciador de senhas para a equipe.'],
    ['O escritório guarda os registros de acesso (logs) por pelo menos 6 meses?', 1, 'Marco Civil da Internet, art. 15, e prova em caso de incidente (CPP, art. 158-A).', 'Ligar o registro de acessos no e-mail e na nuvem e guardar por 6 meses ou mais.']
  ];
  var f = $('f-risco');
  PERG.forEach(function (q, i) {
    var fs = el('fieldset'); var lg = el('legend', q[0]); fs.appendChild(lg);
    var ops = el('div', '', 'ops');
    [['sim', 'Sim'], ['parcial', 'Em parte'], ['nao', 'Não']].forEach(function (o) {
      var lb = el('label'); var inp = document.createElement('input'); inp.type = 'radio'; inp.name = 'q' + i; inp.value = o[0];
      lb.appendChild(inp); lb.appendChild(document.createTextNode(o[1])); ops.appendChild(lb);
    });
    fs.appendChild(ops); fs.appendChild(el('span', q[2], 'base')); f.appendChild(fs);
  });
  function risco() {
    var tot = 0, ganho = 0, resp = 0, faltas = [];
    PERG.forEach(function (q, i) {
      var m = f.querySelector('input[name="q' + i + '"]:checked'); tot += q[1];
      if (!m) return; resp++;
      var v = m.value === 'sim' ? 1 : m.value === 'parcial' ? 0.5 : 0; ganho += v * q[1];
      if (v < 1) faltas.push({ peso: q[1] * (1 - v), acao: q[3] });
    });
    var r = $('r-res'); r.textContent = ''; r.className = 'res';
    if (!resp) { r.appendChild(el('p', 'Responda às perguntas para ver a nota.', 'sm')); return; }
    var nota = Math.round(ganho / tot * 100) / 10;
    var nivel = nota >= 8.5 ? 'Maduro' : nota >= 6 ? 'Em construção' : nota >= 3.5 ? 'Exposto' : 'Crítico';
    if (nota < 6) r.className = 'res alerta';
    r.appendChild(el('div', 'Nota de proteção do escritório' + (resp < PERG.length ? ' (parcial: ' + resp + ' de ' + PERG.length + ' respondidas)' : ''), 'kicker'));
    r.appendChild(el('p', String(nota).replace('.', ',') + ' de 10 · ' + nivel, 'big'));
    faltas.sort(function (a, b) { return b.peso - a.peso; });
    if (faltas.length) {
      r.appendChild(el('p', 'As ações que mais reduzem o risco agora:'));
      var ol = el('ol', '', 'acoes'); faltas.slice(0, 3).forEach(function (x) { ol.appendChild(el('li', x.acao)); }); r.appendChild(ol);
    } else r.appendChild(el('p', 'Tudo em dia. Repita o teste a cada seis meses.'));
    r.appendChild(el('p', 'Pesos maiores para o que mais causa incidente em escritórios: duas etapas, cópia de segurança e plano de resposta. Isto é um diagnóstico rápido, não uma auditoria.', 'sm'));
  }
  f.addEventListener('change', risco);

  // ---------- Ferramenta 3: mapa de normas ----------
  var LX = 'https://www.lexml.gov.br/urn/urn:lex:br:federal:';
  var NORMAS = [
    ['Lei 13.709/2018 (LGPD), arts. 46 a 49', 'Segurança dos dados, boas práticas e dever de comunicar incidente.', 'Dados pessoais', LX + 'lei:2018-08-14;13709'],
    ['Resolução CD/ANPD nº 15/2024', 'Regulamento de comunicação de incidente: 3 dias úteis, conteúdo mínimo e registro por 5 anos.', 'Dados pessoais', 'https://www.gov.br/anpd/pt-br'],
    ['Resolução CD/ANPD nº 2/2022', 'Regras simplificadas e prazo em dobro para agentes de pequeno porte.', 'Dados pessoais', 'https://www.gov.br/anpd/pt-br'],
    ['Resolução CD/ANPD nº 4/2023', 'Dosimetria e aplicação das sanções da LGPD.', 'Dados pessoais', 'https://www.gov.br/anpd/pt-br'],
    ['Lei 12.965/2014 (Marco Civil da Internet)', 'Guarda de registros: 1 ano para conexão (art. 13) e 6 meses para aplicações (art. 15).', 'Internet', LX + 'lei:2014-04-23;12965'],
    ['Lei 12.737/2012 (Lei Carolina Dieckmann)', 'Criou o crime de invasão de dispositivo informático (Código Penal, art. 154-A).', 'Crimes', LX + 'lei:2012-11-30;12737'],
    ['Lei 14.155/2021', 'Aumentou as penas de invasão, furto e estelionato por meio eletrônico (fraude eletrônica, CP art. 171, § 2º-A).', 'Crimes', LX + 'lei:2021-05-27;14155'],
    ['Decreto 11.491/2023 (Convenção de Budapeste)', 'Promulgou a Convenção sobre o Crime Cibernético: cooperação internacional e preservação de provas.', 'Crimes', LX + 'decreto:2023-04-12;11491'],
    ['Lei 13.964/2019 (Pacote Anticrime), CPP arts. 158-A a 158-F', 'Cadeia de custódia da prova, aplicada também à prova digital.', 'Prova digital', LX + 'lei:2019-12-24;13964'],
    ['Decreto 11.856/2023 (PNCiber)', 'Política Nacional de Cibersegurança e Comitê Nacional de Cibersegurança.', 'Estado', LX + 'decreto:2023-12-26;11856'],
    ['Decreto 9.637/2018 (PNSI)', 'Política Nacional de Segurança da Informação na administração federal.', 'Estado', LX + 'decreto:2018-12-26;9637'],
    ['Resolução CNJ 396/2021 (ENSEC-PJ)', 'Estratégia Nacional de Segurança Cibernética do Poder Judiciário.', 'Judiciário', 'https://atos.cnj.jus.br/atos'],
    ['Resolução CMN 4.893/2021', 'Política de segurança cibernética e contratação de nuvem pelas instituições financeiras.', 'Setor financeiro', 'https://www.bcb.gov.br/estabilidadefinanceira/buscanormas'],
    ['Lei 8.906/1994 (Estatuto da OAB), art. 7º, II', 'Inviolabilidade do escritório, dos arquivos e das comunicações do advogado, inclusive eletrônicas.', 'Advocacia', LX + 'lei:1994-07-04;8906'],
    ['Lei 14.063/2020', 'Assinaturas eletrônicas simples, avançada e qualificada.', 'Assinatura digital', LX + 'lei:2020-09-23;14063'],
    ['Regulamento (UE) 2016/679 (GDPR), arts. 32 a 34', 'Referência estrangeira: notificação em 72 horas.', 'Exterior', 'https://eur-lex.europa.eu/eli/reg/2016/679/oj'],
    ['Diretiva (UE) 2022/2555 (NIS2)', 'Referência estrangeira: alerta em 24 horas e notificação em 72 horas para setores essenciais.', 'Exterior', 'https://eur-lex.europa.eu/eli/dir/2022/2555/oj'],
    ['Regulamento (UE) 2024/2847 (Cyber Resilience Act)', 'Referência estrangeira: segurança obrigatória em produtos com software.', 'Exterior', 'https://eur-lex.europa.eu/eli/reg/2024/2847/oj']
  ];
  var tema = 'Todos';
  var temas = ['Todos'].concat(NORMAS.map(function (n) { return n[2]; }).filter(function (t, i, a) { return a.indexOf(t) === i; }));
  var chips = $('n-chips');
  temas.forEach(function (t) {
    var b = el('button', t); b.type = 'button'; b.setAttribute('aria-pressed', String(t === tema));
    b.onclick = function () { tema = t; Array.prototype.forEach.call(chips.children, function (c) { c.setAttribute('aria-pressed', String(c.textContent === t)); }); normas(); };
    chips.appendChild(b);
  });
  function sem(s) { return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, ''); }
  function normas() {
    var q = sem($('n-busca').value.trim()), corpo = $('n-corpo'); corpo.textContent = ''; var n = 0;
    NORMAS.forEach(function (x) {
      if (tema !== 'Todos' && x[2] !== tema) return;
      if (q && sem(x.join(' ')).indexOf(q) < 0) return;
      var tr = el('tr'), td = el('td'); td.appendChild(link(x[3], x[0])); tr.appendChild(td); tr.appendChild(el('td', x[1])); tr.appendChild(el('td', x[2])); corpo.appendChild(tr); n++;
    });
    $('n-conta').textContent = n + ' de ' + NORMAS.length + ' normas. Conferido em 06/11/2026; textos oficiais no LexML, na ANPD, no CNJ, no Banco Central e no EUR-Lex.';
  }
  $('n-busca').addEventListener('input', normas);
  normas();
})();
