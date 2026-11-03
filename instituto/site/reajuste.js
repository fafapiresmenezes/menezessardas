// Passo L01 (I-04): calculadora de reajuste de aluguel com séries oficiais do SGS/BCB (RPC instituto_indices).
(function () {
  var API = 'https://hlraekzvgxdpiiigdxdo.supabase.co/rest/v1/rpc/instituto_indices';
  var KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhscmFla3p2Z3hkcGlpaWdkeGRvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI4ODEzOTksImV4cCI6MjEwODQ1NzM5OX0.yCNPEGDb7tdf1JIY30WKUbE-xZwjQFwygJFJnvBeyrs';
  var $ = function (i) { return document.getElementById(i); };
  var el = function (t, c, x) { var e = document.createElement(t); if (c) e.className = c; if (x != null) e.textContent = x; return e; };
  var MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
  var rotulo = function (ym) { var p = ym.split('-'); return MESES[+p[1] - 1] + '/' + p[0]; };
  var addM = function (ym, k) { var p = ym.split('-'), t = (+p[0]) * 12 + (+p[1] - 1) + k; return Math.floor(t / 12) + '-' + String(t % 12 + 1).padStart(2, '0'); };
  var rs = function (x) { return 'R$ ' + x.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); };
  var pct = function (x) { return (x * 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '%'; };
  var dados = null;
  // Exportado para teste: fator acumulado dos 12 meses anteriores ao aniversário.
  window.theyeReajuste = function (serie, aniversario) {
    var mapa = {}; serie.forEach(function (p) { mapa[p.mes] = Number(p.valor); });
    var fim = addM(aniversario, -1), aviso = null;
    var ultimo = serie.length ? serie[serie.length - 1].mes : null;
    if (!(fim in mapa)) { if (!ultimo) return null; aviso = 'O índice de ' + rotulo(fim) + ' ainda não saiu. Usamos os 12 meses até ' + rotulo(ultimo) + '.'; fim = ultimo; }
    var meses = [], f = 1;
    for (var k = 11; k >= 0; k--) { var m = addM(fim, -k); if (!(m in mapa)) return null; f *= 1 + mapa[m] / 100; meses.push({ mes: m, v: mapa[m] }); }
    return { fator: f, meses: meses, aviso: aviso };
  };
  function montarMeses() {
    var s = $('r-mes'), hoje = new Date(), base = hoje.getFullYear() + '-' + String(hoje.getMonth() + 1).padStart(2, '0');
    for (var k = -6; k <= 6; k++) { var m = addM(base, k), o = el('option', null, rotulo(m)); o.value = m; if (k === 0) o.selected = true; s.appendChild(o); }
  }
  function calcular() {
    var box = $('r-res'), v = parseFloat(($('r-valor').value || '').replace(/\./g, '').replace(',', '.'));
    box.textContent = '';
    if (!dados) { box.appendChild(el('p', 'sm', 'Índices ainda carregando.')); return; }
    if (!(v > 0)) { box.appendChild(el('p', 'sm', 'Preencha o valor do aluguel para ver o resultado.')); return; }
    var ind = $('r-ind').value, r = window.theyeReajuste(dados.series[ind] || [], $('r-mes').value);
    if (!r) { box.appendChild(el('p', 'sm', 'Faltam meses do ' + ind + ' para essa data. Escolha outro mês.')); return; }
    box.appendChild(el('div', 'sm', 'Novo aluguel pelo ' + ind));
    box.appendChild(el('div', 'big', rs(v * r.fator)));
    box.appendChild(el('p', null, 'Reajuste de ' + pct(r.fator - 1) + ' em 12 meses (' + rotulo(r.meses[0].mes) + ' a ' + rotulo(r.meses[11].mes) + '). Diferença: ' + rs(v * r.fator - v) + ' por mês.'));
    if (r.aviso) box.appendChild(el('p', 'sm', r.aviso));
    if (r.fator < 1) box.appendChild(el('p', 'sm', 'O índice ficou negativo. Muitos contratos dizem que, nesse caso, o aluguel não cai. Confira a cláusula de reajuste.'));
    var w = el('div', 'rolar'), t = el('table', 'tab'), h = el('tr');
    ['Mês', 'Variação', 'Acumulado'].forEach(function (x) { h.appendChild(el('th', null, x)); }); t.appendChild(h);
    var f = 1; r.meses.forEach(function (m) { f *= 1 + m.v / 100; var tr = el('tr'); [rotulo(m.mes), m.v.toLocaleString('pt-BR') + '%', pct(f - 1)].forEach(function (x) { tr.appendChild(el('td', null, x)); }); t.appendChild(tr); });
    w.appendChild(t); box.appendChild(w);
  }
  montarMeses();
  ['r-valor', 'r-mes', 'r-ind'].forEach(function (i) { $(i).addEventListener('input', calcular); $(i).addEventListener('change', calcular); });
  $('calc').addEventListener('submit', function (e) { e.preventDefault(); calcular(); });
  fetch(API, { method: 'POST', headers: { apikey: KEY, Authorization: 'Bearer ' + KEY, 'Content-Type': 'application/json' }, body: JSON.stringify({ p_meses: 36 }) })
    .then(function (r) { return r.ok ? r.json() : null; })
    .then(function (d) {
      if (!d || !d.series) { $('r-fonte').textContent = 'Sem conexão com o banco agora.'; return; }
      dados = d; $('r-fonte').textContent = 'Fonte: ' + d.fonte + (d.lido_em ? ' · atualizado em ' + new Date(d.lido_em).toLocaleDateString('pt-BR') : '');
      calcular();
    }).catch(function () { $('r-fonte').textContent = 'Sem conexão com o banco agora.'; });
})();
(function () { var s = document.createElement('script'); s.src = '/vitais.js'; s.defer = true; document.head.appendChild(s); })();
