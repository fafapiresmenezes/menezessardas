// Tema Q02 · Computação quântica e direito: teste de Mosca, inventário de criptografia e linha do tempo. Tudo no navegador.
(function () {
  var $ = function (id) { return document.getElementById(id); };
  function el(tag, txt, cls) { var e = document.createElement(tag); if (txt) e.textContent = txt; if (cls) e.className = cls; return e; }

  // ---------- Ferramenta 1: teste de Mosca ----------
  var TIPOS = [
    ['Contrato de locação de 5 anos', 10, 'Prazo do contrato mais 5 anos de prescrição (CC, art. 206, § 5º).'],
    ['Escritura, matrícula ou documento de imóvel', 30, 'A prova da propriedade precisa valer por décadas.'],
    ['Procuração ou contrato social', 15, 'Usados em atos futuros e conferidos anos depois.'],
    ['Peça e documento de processo', 12, 'Duração média de processos mais prazo de ação rescisória.'],
    ['Prontuário ou dado de saúde', 20, 'Lei 13.787/2018: guarda mínima de 20 anos.'],
    ['Segredo de negócio ou estratégia de litígio', 10, 'Perde valor se aberto enquanto a disputa existe.'],
    ['Mensagem do dia a dia', 1, 'Sigilo curto: baixo risco.']
  ];
  var tipo = $('m-tipo');
  TIPOS.forEach(function (t, i) { var o = el('option', t[0]); o.value = i; tipo.appendChild(o); });
  function porTipo() { $('m-x').value = TIPOS[tipo.value][1]; mosca(); }
  function mosca() {
    var x = Math.max(0, Number($('m-x').value) || 0), y = Math.max(0, Number($('m-y').value) || 0), z = Number($('m-z').value);
    var ano = 2026, r = $('m-res'); r.textContent = ''; r.className = 'res';
    var folga = z - (x + y), risco = folga < 0;
    if (risco) r.className = 'res alerta';
    r.appendChild(el('div', risco ? 'Em risco' : folga <= 2 ? 'No limite' : 'Fora de risco por enquanto', 'kicker'));
    r.appendChild(el('p', 'x + y = ' + (x + y) + ' anos · z = ' + z + ' anos', 'big'));
    var b = el('div', '', 'barra'), escala = Math.max(x + y, z, 1) * 1.1;
    var ix = el('i', '', 'x'); ix.style.width = (x / escala * 100) + '%'; b.appendChild(ix);
    var iy = el('i', '', 'y'); iy.style.left = (x / escala * 100) + '%'; iy.style.width = (y / escala * 100) + '%'; b.appendChild(iy);
    var iz = el('i', '', 'z'); iz.style.left = (z / escala * 100) + '%'; b.appendChild(iz);
    b.setAttribute('role', 'img'); b.setAttribute('aria-label', 'Sigilo ' + x + ' anos, migração ' + y + ' anos, computador quântico em ' + z + ' anos');
    r.appendChild(b);
    var leg = el('div', '', 'leg'); leg.appendChild(el('span', 'x sigilo ou validade', 'lx')); leg.appendChild(el('span', 'y migração', 'ly')); leg.appendChild(el('span', 'z computador quântico (' + (ano + z) + ')', 'lz')); r.appendChild(leg);
    r.appendChild(el('p', risco
      ? 'O documento precisa continuar protegido até ' + (ano + x + y) + ', mas o cenário escolhido prevê o computador quântico em ' + (ano + z) + '. Faltam ' + (-folga) + ' ano(s) de proteção. Comece a migração já: guarde com carimbo de tempo baseado em hash, cifre com AES-256 e peça ao fornecedor assinatura pós-quântica (ML-DSA) assim que a ICP-Brasil liberar.'
      : 'Sobram ' + folga + ' ano(s) de folga neste cenário. Mesmo assim, inclua a migração no plano de TI e revise o teste a cada ano.'));
    r.appendChild(el('p', TIPOS[tipo.value][2], 'sm'));
  }
  tipo.addEventListener('change', porTipo);
  ['m-x', 'm-y', 'm-z'].forEach(function (id) { $(id).addEventListener('input', mosca); $(id).addEventListener('change', mosca); });
  porTipo();

  // ---------- Ferramenta 2: inventário ----------
  var Q = 'q', G = 'g', OK = 'ok';
  var ITENS = [
    ['Certificado digital ICP-Brasil (e-CPF, e-CNPJ A1 ou A3)', 'Hoje usa RSA 2048: quebrado pelo algoritmo de Shor. A IN ITI nº 35/2026 abriu o caminho para certificados pós-quânticos.', Q],
    ['Assinatura gov.br', 'Usa criptografia de chave pública clássica; o ITI anunciou as primeiras assinaturas avançadas pós-quânticas na plataforma.', Q],
    ['PDF assinado (Adobe, DocuSign, plataformas de assinatura)', 'Assinatura RSA ou ECDSA: quebrável. Arquivos de longo prazo precisam de carimbo de tempo renovado.', Q],
    ['Site e sistemas com cadeado HTTPS (TLS)', 'A troca de chaves clássica é quebrável; navegadores atuais já usam troca híbrida com ML-KEM. Atualize servidor e navegador.', Q],
    ['VPN ou acesso remoto ao escritório', 'Quase sempre RSA ou Diffie-Hellman: quebrável. Peça ao fornecedor o plano de troca híbrida.', Q],
    ['Carteira de criptomoeda ou token de imóvel', 'Assinatura ECDSA: quebrável quando a chave pública fica exposta na cadeia.', Q],
    ['Arquivos e cópias cifrados com AES-128', 'O algoritmo de Grover reduz a força pela metade: suba para AES-256.', G],
    ['Senhas guardadas com hash (bcrypt, Argon2)', 'Grover acelera pouco a quebra; senha longa continua segura.', G],
    ['Disco criptografado com AES-256 (BitLocker, FileVault)', 'Resiste ao computador quântico conhecido.', OK],
    ['Hash SHA-256 e carimbo OpenTimestamps no Bitcoin', 'Prova de data por hash: segue robusta. É o que o Instituto usa nos selos.', OK],
    ['WhatsApp, Signal ou iMessage', 'Signal (PQXDH) e iMessage (PQ3) já usam troca de chaves pós-quântica. WhatsApp usa o protocolo Signal, mas a adoção pós-quântica não é pública: trate como em transição.', G]
  ];
  var inv = $('inv');
  ITENS.forEach(function (it, i) {
    var lb = el('label'), inp = document.createElement('input'); inp.type = 'checkbox'; inp.value = i;
    var tx = el('span', it[0]); tx.appendChild(el('small', it[1]));
    lb.appendChild(inp); lb.appendChild(tx); inv.appendChild(lb);
  });
  var ROT = { q: ['Quebrável', 'r-q'], g: ['Reforçar', 'r-g'], ok: ['Resiste', 'r-ok'] };
  function inventario() {
    var r = $('i-res'); r.textContent = ''; r.className = 'res';
    var marc = Array.prototype.filter.call(inv.querySelectorAll('input'), function (x) { return x.checked; }).map(function (x) { return ITENS[x.value]; });
    if (!marc.length) { r.appendChild(el('p', 'Marque pelo menos um item.', 'sm')); return; }
    var n = { q: 0, g: 0, ok: 0 }; marc.forEach(function (m) { n[m[2]]++; });
    if (n.q) r.className = 'res alerta';
    r.appendChild(el('div', 'Resultado do inventário', 'kicker'));
    r.appendChild(el('p', n.q + ' quebrável(is) · ' + n.g + ' a reforçar · ' + n.ok + ' resiste(m)', 'big'));
    [Q, G, OK].forEach(function (k) {
      marc.filter(function (m) { return m[2] === k; }).forEach(function (m) {
        var p = el('p'); p.appendChild(el('span', ROT[k][0], 'selo-r ' + ROT[k][1])); p.appendChild(document.createTextNode(m[0])); r.appendChild(p);
      });
    });
    r.appendChild(el('p', n.q ? 'Prioridade: liste os documentos assinados que precisam valer por mais de 10 anos e passe-os pelo teste de Mosca acima.' : 'Bom ponto de partida. Revise o inventário a cada nova norma do ITI.', 'sm'));
  }
  inv.addEventListener('change', inventario);

  // ---------- Ferramenta 3: linha do tempo ----------
  var LT = [
    ['1994', 'Peter Shor publica o algoritmo que, num computador quântico, quebra RSA e curvas elípticas.', ''],
    ['2001', 'MP 2.200-2 cria a ICP-Brasil e a presunção de veracidade dos documentos assinados com certificado.', 'br'],
    ['2016', 'O NIST (EUA) abre a competição mundial de algoritmos pós-quânticos.', ''],
    ['2020', 'Lei 14.063/2020 define assinatura eletrônica simples, avançada e qualificada.', 'br'],
    ['ago. 2024', 'NIST publica os três primeiros padrões: FIPS 203 (ML-KEM), FIPS 204 (ML-DSA) e FIPS 205 (SLH-DSA).', ''],
    ['mar. 2025', 'NIST escolhe o HQC como algoritmo reserva de troca de chaves (padrão ainda em elaboração).', ''],
    ['jun. 2025', 'União Europeia publica o roteiro coordenado de migração: estratégias nacionais até o fim de 2026.', ''],
    ['30 jan. 2026', 'Instrução Normativa ITI nº 35/2026 define padrões pós-quânticos, tamanhos de chave e validade para a ICP-Brasil.', 'br'],
    ['26 jun. 2026', 'Portaria cria o Grupo de Trabalho Técnico sobre Criptografia Pós-Quântica da ICP-Brasil (90 dias, prorrogáveis), inclusive para tratar da validade de documentos já assinados.', 'br'],
    ['out. 2026', 'NIST publica a versão final do IR 8547 com o calendário de transição.', ''],
    ['2027', 'NSA (CNSA 2.0): novos sistemas de segurança nacional dos EUA devem aceitar algoritmos pós-quânticos.', 'fut'],
    ['2030', 'NIST: RSA e curvas elípticas de 112 bits deixam de ser recomendados. UE: infraestruturas críticas migradas nos casos de alto risco.', 'fut'],
    ['2035', 'NIST: RSA e curvas elípticas proibidos. UE: migração concluída nos casos de risco médio.', 'fut']
  ];
  var lt = $('lt');
  LT.forEach(function (x) { var li = el('li', '', x[2]); li.appendChild(el('b', x[0])); li.appendChild(el('span', x[1])); lt.appendChild(li); });
})();
