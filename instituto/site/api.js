// Passo L03: chave de teste da API B2B e consulta de exemplo (RPCs instituto_api_cadastrar e instituto_api_prever).
(function () {
  var REST = 'https://hlraekzvgxdpiiigdxdo.supabase.co/rest/v1/rpc/';
  var KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhscmFla3p2Z3hkcGlpaWdkeGRvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI4ODEzOTksImV4cCI6MjEwODQ1NzM5OX0.yCNPEGDb7tdf1JIY30WKUbE-xZwjQFwygJFJnvBeyrs';
  var $ = function (id) { return document.getElementById(id); };
  function el(tag, txt, cls) { var e = document.createElement(tag); e.textContent = txt; if (cls) e.className = cls; return e; }
  function rpc(fn, corpo) {
    return fetch(REST + fn, { method: 'POST', headers: { apikey: KEY, Authorization: 'Bearer ' + KEY, 'Content-Type': 'application/json' }, body: JSON.stringify(corpo) })
      .then(function (r) { return r.json(); }).catch(function () { return { erro: 'Sem conexão agora. Tente de novo em instantes.' }; });
  }
  var pct = function (x) { return (Number(x) * 100).toLocaleString('pt-BR', { maximumFractionDigits: 1 }) + '%'; };
  var brl = function (x) { return x == null ? 'sob proposta' : Number(x).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }); };
  $('a-pub').textContent = KEY;
  $('chave').addEventListener('submit', function (ev) {
    ev.preventDefault();
    var res = $('a-res');
    if (!$('a-ok').checked) { res.textContent = 'Marque o aceite para receber a chave.'; return; }
    $('a-ir').disabled = true; res.textContent = 'Gerando a chave.';
    rpc('instituto_api_cadastrar', { p_empresa: $('a-emp').value, p_email: $('a-email').value, p_segmento: $('a-seg').value, p_aceite: true, p_origem: $('a-orig').value || (location.search.match(/utm_source=([\w-]+)/) || [])[1] || null })
      .then(function (j) {
        $('a-ir').disabled = false; res.textContent = '';
        if (!j || j.erro) { res.textContent = (j && (j.erro || j.message)) || 'Não consegui gerar agora.'; return; }
        res.appendChild(el('p', 'Sua chave de teste (' + j.limite + ' chamadas). Ela aparece só agora: copie e guarde.'));
        res.appendChild(el('p', j.chave, 'chave'));
        $('t-chave').value = j.chave;
        var o = j.oferta; res.appendChild(el('h3', 'Sua oferta: ' + o.nome));
        (o.planos || []).forEach(function (p) {
          var t = p.unidade === 'chamada' ? brl(p.preco_brl) + ' por chamada, ' + (p.minimo || '') : p.plano + ': ' + brl(p.preco_brl) + (p.preco_brl == null ? '' : ' por mês') + ', inclui ' + p.inclui + (typeof p.inclui === 'number' ? ' chamadas' : '');
          res.appendChild(el('p', t));
        });
        res.appendChild(el('p', 'Como chegamos ao preço: ' + o.premissas, 'sm'));
      });
  });
  $('teste').addEventListener('submit', function (ev) {
    ev.preventDefault();
    var res = $('t-res'); res.textContent = 'Consultando.';
    rpc('instituto_api_prever', { p_chave: $('t-chave').value.trim(), p_tribunal: $('t-trib').value, p_classe: $('t-classe').value })
      .then(function (j) {
        res.textContent = '';
        if (!j || j.erro) { res.textContent = (j && (j.erro || j.message)) || 'Não consegui consultar agora.'; return; }
        var c = j.convencional;
        res.appendChild(el('p', 'Chance de procedência: ' + pct(c.p) + ' (intervalo de 95%: ' + pct(c.ic95[0]) + ' a ' + pct(c.ic95[1]) + ').'));
        res.appendChild(el('p', 'Amostra: ' + c.n.toLocaleString('pt-BR') + ' julgamentos. Confiança ' + j.confianca + '.' + (j.aviso_amostra ? ' ' + j.aviso_amostra : '')));
        res.appendChild(el('p', 'Fonte: ' + j.fonte + '. Chamadas usadas: ' + j.uso.usadas + ' de ' + j.uso.limite + '.', 'sm'));
        var pre = el('pre', JSON.stringify(j, null, 2)); pre.tabIndex = 0; res.appendChild(pre);
      });
  });
})();
