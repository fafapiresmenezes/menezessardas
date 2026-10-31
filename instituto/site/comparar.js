// Atualiza os números da página com a última comparação calculada no banco (só agregados).
(function () {
  var URL = 'https://hlraekzvgxdpiiigdxdo.supabase.co/rest/v1/rpc/';
  var KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhscmFla3p2Z3hkcGlpaWdkeGRvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI4ODEzOTksImV4cCI6MjEwODQ1NzM5OX0.yCNPEGDb7tdf1JIY30WKUbE-xZwjQFwygJFJnvBeyrs';
  function rpc(n) {
    return fetch(URL + n, { method: 'POST', headers: { apikey: KEY, Authorization: 'Bearer ' + KEY, 'Content-Type': 'application/json' }, body: '{}' })
      .then(function (r) { return r.ok ? r.json() : null; }).catch(function () { return null; });
  }
  var br = function (x, d) { return Number(x).toLocaleString('pt-BR', { minimumFractionDigits: d, maximumFractionDigits: d }); };
  var sinal = function (x) { return (x > 0 ? '+' : x < 0 ? '−' : '') + br(Math.abs(x), 4); };
  var data = function (s) { var p = String(s).slice(0, 10).split('-'); return p.length === 3 ? p[2] + '/' + p[1] + '/' + p[0] : s; };
  function por(k, v) { document.querySelectorAll('[data-k="' + k + '"]').forEach(function (e) { e.textContent = v; }); }
  Promise.all([rpc('instituto_ultima_comparacao'), rpc('instituto_resumo_coleta')]).then(function (r) {
    var c = r[0], s = r[1];
    if (s && s.processos) por('processos', Number(s.processos).toLocaleString('pt-BR'));
    if (!c || c.erro || c.brier_grafo == null) return;
    por('calculado_em', data(c.calculado_em));
    por('treino', Number(c.treino).toLocaleString('pt-BR'));
    por('teste', Number(c.teste).toLocaleString('pt-BR'));
    por('corte_temporal', data(c.corte_temporal));
    por('brier_convencional', br(c.brier_convencional, 4));
    por('brier_grafo', br(c.brier_grafo, 4));
    por('taxa_teste', br(c.taxa_teste * 100, 1) + '%');
    por('com_vizinho_no_grafo', Number(c.com_vizinho_no_grafo).toLocaleString('pt-BR'));
    por('dif', sinal(c.dif_grafo_menos_conv));
    por('ic', sinal(c.ic95[0]) + ' a ' + sinal(c.ic95[1]));
    por('veredito', c.veredito.charAt(0).toUpperCase() + c.veredito.slice(1));
    // Eixo: ±0,02 de Brier ocupa a largura toda; 0 no meio.
    var esc = function (x) { return Math.max(0, Math.min(100, 50 + (x / 0.02) * 50)); };
    var ic = document.querySelector('[data-ic]'), pt = document.querySelector('[data-pt]');
    if (ic) { ic.style.left = esc(c.ic95[0]) + '%'; ic.style.width = (esc(c.ic95[1]) - esc(c.ic95[0])) + '%'; }
    if (pt) pt.style.left = esc(c.dif_grafo_menos_conv) + '%';
  });
})();
