// U12: placar único. Lê public.instituto_placar_unico (só agregados) e monta a tabela com a mesma régua para todos os protocolos.
(function () {
  var URL = 'https://hlraekzvgxdpiiigdxdo.supabase.co/rest/v1/rpc/instituto_placar_unico';
  var KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhscmFla3p2Z3hkcGlpaWdkeGRvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI4ODEzOTksImV4cCI6MjEwODQ1NzM5OX0.yCNPEGDb7tdf1JIY30WKUbE-xZwjQFwygJFJnvBeyrs';
  var corpo = document.getElementById('placar-unico');
  if (!corpo) return;
  var n4 = function (x) { return x == null ? '—' : Number(x).toLocaleString('pt-BR', { minimumFractionDigits: 4, maximumFractionDigits: 4 }); };
  var pct = function (x) { return x == null ? '—' : (x > 0 ? '+' : x < 0 ? '−' : '') + Math.abs(x * 100).toLocaleString('pt-BR', { maximumFractionDigits: 1 }) + '%'; };
  var ic = function (a) { return a && a.length === 2 ? n4(a[0]).replace('-', '−') + ' a ' + n4(a[1]).replace('-', '−') : '—'; };
  function cel(tr, t, cls) { var td = document.createElement('td'); td.textContent = t; if (cls) td.className = cls; tr.appendChild(td); }
  fetch(URL, { method: 'POST', headers: { apikey: KEY, Authorization: 'Bearer ' + KEY, 'Content-Type': 'application/json' }, body: '{}' })
    .then(function (r) { return r.ok ? r.json() : null; })
    .then(function (linhas) {
      if (!linhas || !linhas.length) return;
      while (corpo.firstChild) corpo.removeChild(corpo.firstChild);
      linhas.forEach(function (l) {
        var tr = document.createElement('tr');
        cel(tr, l.id, 'mono'); cel(tr, l.titulo); cel(tr, l.dominio);
        cel(tr, n4(l.brier_modelo), 'nu'); cel(tr, n4(l.brier_base), 'nu'); cel(tr, pct(l.bss), 'nu'); cel(tr, ic(l.ic95), 'nu');
        cel(tr, l.veredito || '—'); cel(tr, l.selo_ots ? 'selado ' + String(l.selo_sha256).slice(0, 8) : 'sem selo', 'mono');
        corpo.appendChild(tr);
      });
    }).catch(function () {});
})();
// C18 e C29: painel ao vivo de sucesso da coleta e disponibilidade (SLO).
(function () {
  var B = 'https://hlraekzvgxdpiiigdxdo.supabase.co/rest/v1/rpc/';
  var KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhscmFla3p2Z3hkcGlpaWdkeGRvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI4ODEzOTksImV4cCI6MjEwODQ1NzM5OX0.yCNPEGDb7tdf1JIY30WKUbE-xZwjQFwygJFJnvBeyrs';
  var pc = function (x) { return x == null ? '—' : Number(x).toLocaleString('pt-BR', { maximumFractionDigits: 2 }) + '%'; };
  function rpc(n, cb) {
    fetch(B + n, { method: 'POST', headers: { apikey: KEY, Authorization: 'Bearer ' + KEY, 'Content-Type': 'application/json' }, body: '{}' })
      .then(function (r) { return r.ok ? r.json() : null; }).then(function (d) { if (d) cb(d); }).catch(function () {});
  }
  var c = document.getElementById('s-coleta'), s = document.getElementById('s-slo');
  if (c) rpc('instituto_coleta_sucesso', function (d) { c.textContent = d.dias ? pc(d.sucesso) + ' dos dias (' + d.dias_com_coleta + ' de ' + d.dias + ' com coleta)' : 'medição começa em 03/11/2026'; });
  if (s) rpc('instituto_slo', function (d) { var a = d.alvos || {}; s.textContent = d.geral == null ? 'primeiras sondas em andamento' : pc(d.geral) + ' (site ' + pc(a.site && a.site.disponibilidade) + ', estilo ' + pc(a.css && a.css.disponibilidade) + ', agentes ' + pc(a.api && a.api.disponibilidade) + ')'; });
})();

// Passo D22: cobertura da coleta e Brier por tribunal (RPC instituto_cobertura).
(function () {
  var corpo = document.getElementById('cb-trib'); if (!corpo) return;
  var KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhscmFla3p2Z3hkcGlpaWdkeGRvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI4ODEzOTksImV4cCI6MjEwODQ1NzM5OX0.yCNPEGDb7tdf1JIY30WKUbE-xZwjQFwygJFJnvBeyrs';
  var num = function (x) { return x == null ? '—' : Number(x).toLocaleString('pt-BR'); };
  var b4 = function (x) { return x == null ? '—' : Number(x).toLocaleString('pt-BR', { minimumFractionDigits: 4, maximumFractionDigits: 4 }); };
  var dt = function (x) { return x ? x.split('-').reverse().join('/') : '—'; };
  function td(t, tr) { var e = document.createElement('td'); e.textContent = t; tr.appendChild(e); }
  fetch('https://hlraekzvgxdpiiigdxdo.supabase.co/rest/v1/rpc/instituto_cobertura', {
    method: 'POST', headers: { apikey: KEY, Authorization: 'Bearer ' + KEY, 'Content-Type': 'application/json' }, body: '{}'
  }).then(function (r) { return r.ok ? r.json() : null; }).then(function (d) {
    var res = document.getElementById('cb-resumo');
    if (!d) { res.textContent = 'Não consegui carregar agora.'; return; }
    res.textContent = d.tribunais + ' tribunais · ' + d.classes + ' classes · ' + num(d.acoes) + ' ações, ' + num(d.merito) + ' julgadas no mérito';
    (d.por_tribunal || []).forEach(function (t) {
      var tr = document.createElement('tr');
      td(t.tribunal, tr); td(num(t.acoes), tr); td(num(t.classes), tr); td(num(t.merito), tr);
      td(dt(t.de) + ' a ' + dt(t.ate), tr); td(num(t.teste), tr);
      td(b4(t.brier_convencional), tr); td(b4(t.brier_grafo), tr);
      td(t.amostra === 'pequena' ? 'pequena, leia com reserva' : 'adequada', tr);
      corpo.appendChild(tr);
    });
    var cc = document.getElementById('cb-classe');
    (d.por_classe || []).forEach(function (c) {
      var tr = document.createElement('tr'); td(c.classe, tr); td(num(c.acoes), tr); td(num(c.tribunais), tr); cc.appendChild(tr);
    });
    var sl = d.slo || {}, co = d.coleta || {};
    document.getElementById('cb-metodo').textContent = d.regras + ' Corte temporal em ' + dt(d.corte_temporal) +
      '. Disponibilidade medida em 30 dias: ' + (sl.geral == null ? 'sondas em andamento' : Number(sl.geral).toLocaleString('pt-BR', { maximumFractionDigits: 1 }) + '%') +
      ' (meta ' + (sl.meta || 99.5) + '%); coleta diária com meta de ' + (co.meta || 99) + '% dos dias. ' + d.fonte;
  }).catch(function () { document.getElementById('cb-resumo').textContent = 'Sem conexão agora.'; });
})();
(function () { var s = document.createElement('script'); s.src = '/vitais.js'; s.defer = true; document.head.appendChild(s); })();
