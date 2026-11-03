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
  // Passo L03: teste A/B de preço da API B2B (só contagens).
  fetch('https://hlraekzvgxdpiiigdxdo.supabase.co/rest/v1/rpc/instituto_b2b_resumo', { method: 'POST', headers: { apikey: KEY, Authorization: 'Bearer ' + KEY, 'Content-Type': 'application/json' }, body: '{}' })
    .then(function (r) { return r.ok ? r.json() : null; })
    .then(function (b) {
      if (!b || !b.ofertas) { $('b-jan').textContent = 'sem conexão com o banco agora'; return; }
      var f = function (d) { return d ? d.split('-').reverse().join('/') : '—'; };
      $('b-jan').textContent = 'de ' + f(b.teste_ab.inicio) + ' a ' + f(b.teste_ab.fim);
      var t = $('b-tab'); t.textContent = '';
      b.ofertas.forEach(function (o) {
        var tr = document.createElement('tr');
        [o.braco + ' · ' + o.nome, o.regra, n((b.por_braco || {})[o.braco])].forEach(function (v) { var td = document.createElement('td'); td.textContent = v; tr.appendChild(td); });
        t.appendChild(tr);
      });
      $('b-res').textContent = n(b.contatos) + ' empresas com chave de teste, ' + n(b.chamadas_teste) + ' chamadas de teste, ' + n(b.pagantes) + ' contratos pagos. Meta do passo: 3 empresas.';
    });
})();
// Passo L05: tração por canal (RPC instituto_tracao_resumo).
(function () {
  var KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhscmFla3p2Z3hkcGlpaWdkeGRvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI4ODEzOTksImV4cCI6MjEwODQ1NzM5OX0.yCNPEGDb7tdf1JIY30WKUbE-xZwjQFwygJFJnvBeyrs';
  var $ = function (i) { return document.getElementById(i); };
  var n = function (x) { return Number(x || 0).toLocaleString('pt-BR'); };
  var brl = function (x) { return x == null ? '—' : 'R$ ' + Number(x).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); };
  var NOMES = { linkedin: 'LinkedIn', 'oab-jovem': 'OAB Jovem', 'grupos-imobiliarias': 'Grupos de imobiliárias', direto: 'Direto (sem link rastreado)', outro: 'Outro' };
  if (!$('t-tab')) return;
  fetch('https://hlraekzvgxdpiiigdxdo.supabase.co/rest/v1/rpc/instituto_tracao_resumo', { method: 'POST', headers: { apikey: KEY, Authorization: 'Bearer ' + KEY, 'Content-Type': 'application/json' }, body: JSON.stringify({ p_dias: 30 }) })
    .then(function (r) { return r.ok ? r.json() : null; })
    .then(function (d) {
      if (!d || !d.canais) { $('t-jan').textContent = 'sem conexão com o banco agora'; return; }
      $('t-jan').textContent = 'últimos ' + d.janela_dias + ' dias';
      var t = $('t-tab'); t.textContent = '';
      if (!d.canais.length) { var tr0 = document.createElement('tr'), td0 = document.createElement('td'); td0.colSpan = 6; td0.textContent = 'Ainda sem visitas registradas. A contagem começou no lançamento.'; tr0.appendChild(td0); t.appendChild(tr0); }
      d.canais.forEach(function (c) {
        var tr = document.createElement('tr');
        [NOMES[c.origem] || c.origem, n(c.visitas), n(c.cadastros), c.conversao == null ? '—' : (c.conversao * 100).toLocaleString('pt-BR', { maximumFractionDigits: 1 }) + '%', brl(c.custo_por_cadastro_brl),
         n(c.contratos_lidos) + ' contratos, ' + n(c.relatorios) + ' relatórios, ' + n(c.chaves_api) + ' chaves de API'].forEach(function (v) { var td = document.createElement('td'); td.textContent = v; tr.appendChild(td); });
        t.appendChild(tr);
      });
      $('t-res').textContent = n(d.membros_confirmados) + ' cadastros confirmados no total (meta do KR 2.1: 50), ' + n(d.pagantes) + ' pagantes. Custo de IA na janela: ' + brl(d.custo_ia_brl) + '. ' + d.nota;
    });
})();
(function () { var s = document.createElement('script'); s.src = '/vitais.js'; s.defer = true; document.head.appendChild(s); })();
