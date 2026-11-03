// Passo M04 (I-04): painel de 30 dias do negócio, lido da RPC pública instituto_negocio (só agregados).
(function () {
  var URL = 'https://hlraekzvgxdpiiigdxdo.supabase.co/rest/v1/rpc/instituto_negocio';
  var KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhscmFla3p2Z3hkcGlpaWdkeGRvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI4ODEzOTksImV4cCI6MjEwODQ1NzM5OX0.yCNPEGDb7tdf1JIY30WKUbE-xZwjQFwygJFJnvBeyrs';
  var $ = function (i) { return document.getElementById(i); };
  var rs = function (x) { return 'R$ ' + Number(x || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); };
  var n = function (x) { return Number(x || 0).toLocaleString('pt-BR'); };
  fetch(URL, { method: 'POST', headers: { apikey: KEY, Authorization: 'Bearer ' + KEY, 'Content-Type': 'application/json' }, body: JSON.stringify({ p_dias: 30 }) })
    .then(function (r) { return r.ok ? r.json() : null; })
    .then(function (d) {
      if (!d || Array.isArray(d)) { $('n-cad2').textContent = 'sem conexão com o banco agora'; return; }
      $('n-cad').textContent = n(d.cadastros_total); $('n-cad2').textContent = n(d.cadastros_periodo) + ' nos últimos 30 dias';
      $('n-pag').textContent = n(d.pagantes);
      var p = Math.min(100, 100 * (d.pagantes || 0) / (d.meta_equilibrio_membros || 7));
      $('n-barra').style.width = p + '%'; $('n-meta').setAttribute('aria-label', n(d.pagantes) + ' de ' + d.meta_equilibrio_membros + ' membros da meta de equilíbrio');
      $('n-conv').textContent = Number(d.conversao_pct || 0).toLocaleString('pt-BR') + '%';
      $('n-rec').textContent = rs(d.receita_periodo); $('n-cob').textContent = d.cobranca_ativa ? 'cobrança ligada' : 'cobrança ainda não ligada';
      $('n-ia').textContent = rs(d.custo_ia_por_membro); $('n-ia2').textContent = rs(d.custo_ia_periodo) + ' no total em 30 dias';
      $('n-mar').textContent = rs(d.margem_periodo);
      var t = $('n-serie'); t.textContent = '';
      (d.serie || []).slice().reverse().forEach(function (l) {
        var tr = document.createElement('tr');
        [l.dia.split('-').reverse().join('/'), n(l.cadastros), rs(l.receita).replace('R$ ', ''), rs(l.custo_ia).replace('R$ ', '')].forEach(function (v) { var td = document.createElement('td'); td.textContent = v; tr.appendChild(td); });
        t.appendChild(tr);
      });
    }).catch(function () { $('n-cad2').textContent = 'sem conexão com o banco agora'; });
})();
(function () { var s = document.createElement('script'); s.src = '/vitais.js'; s.defer = true; document.head.appendChild(s); })();
