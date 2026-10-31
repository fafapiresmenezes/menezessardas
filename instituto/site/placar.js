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
