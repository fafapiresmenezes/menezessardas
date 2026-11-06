// Bloco B11: índice diário de notícias jurídicas por tema (RPC instituto_gdelt_indice). Só agregados.
(function () {
  var API = 'https://hlraekzvgxdpiiigdxdo.supabase.co/rest/v1/rpc/instituto_gdelt_indice';
  var KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhscmFla3p2Z3hkcGlpaWdkeGRvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI4ODEzOTksImV4cCI6MjEwODQ1NzM5OX0.yCNPEGDb7tdf1JIY30WKUbE-xZwjQFwygJFJnvBeyrs';
  var ROTULO = { locacao: 'Locação e aluguel', despejo: 'Despejo e desocupação', juros: 'Juros e Selic', inadimplencia: 'Inadimplência', judiciario: 'Tribunais superiores', lgpd: 'LGPD e dados pessoais' };
  var ORDEM = ['locacao', 'despejo', 'juros', 'inadimplencia', 'judiciario', 'lgpd'];
  var $ = function (i) { return document.getElementById(i); };
  var el = function (t, c, x) { var e = document.createElement(t); if (c) e.className = c; if (x != null) e.textContent = x; return e; };
  var pct = function (v) { return v == null ? '—' : Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '%'; };
  var dia = function (d) { return d ? new Date(d + 'T12:00:00').toLocaleDateString('pt-BR') : ''; };
  var dt = function (v) { return v ? new Date(v).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : '—'; };

  function sparkline(serie) {
    var NS = 'http://www.w3.org/2000/svg', W = 300, H = 56;
    var svg = document.createElementNS(NS, 'svg'); svg.setAttribute('class', 'sp'); svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H); svg.setAttribute('aria-hidden', 'true');
    var base = document.createElementNS(NS, 'line'); base.setAttribute('x1', 0); base.setAttribute('x2', W); base.setAttribute('y1', H - 1); base.setAttribute('y2', H - 1); svg.appendChild(base);
    if (!serie || serie.length < 2) return svg;
    var vs = serie.map(function (p) { return Number(p.valor); }), max = Math.max.apply(null, vs), min = Math.min.apply(null, vs), amp = (max - min) || 1;
    var d = vs.map(function (v, i) { return (i ? 'L' : 'M') + (i * W / (vs.length - 1)).toFixed(1) + ' ' + (H - 6 - (v - min) / amp * (H - 12)).toFixed(1); }).join(' ');
    var path = document.createElementNS(NS, 'path'); path.setAttribute('d', d); svg.appendChild(path);
    return svg;
  }

  fetch(API, { method: 'POST', headers: { apikey: KEY, Authorization: 'Bearer ' + KEY, 'Content-Type': 'application/json' }, body: JSON.stringify({ p_dias: 30 }) })
    .then(function (r) { return r.ok ? r.json() : null; })
    .then(function (d) {
      var box = $('temas');
      if (!d || !d.temas) { box.textContent = 'Sem conexão com o banco agora. Tente de novo em instantes.'; return; }
      var por = {}; d.temas.forEach(function (t) { por[t.tema] = t; });
      box.textContent = '';
      var ultimoDia = null;
      ORDEM.forEach(function (k) {
        var t = por[k], c = el('div');
        c.appendChild(el('div', 'sm', ROTULO[k] || k));
        if (!t || !t.dias) {
          c.appendChild(el('div', 'num', '—'));
          c.appendChild(el('div', 'sm', 'Primeira coleta em andamento. O índice aparece quando houver um dia completo.'));
        } else {
          c.appendChild(el('div', 'num', pct(t.ultimo)));
          c.appendChild(el('div', 'sm', 'em ' + dia(t.ultimo_dia) + ' · média de ' + t.dias + ' dias: ' + pct(t.media)));
          if (t.variacao != null) { var v = Number(t.variacao); c.appendChild(el('div', 'var ' + (v > 0.1 ? 'up' : v < -0.1 ? 'down' : ''), (v >= 0 ? '+' : '') + (v * 100).toFixed(0) + '% frente à média')); }
          c.appendChild(sparkline(t.serie));
          if (!ultimoDia || t.ultimo_dia > ultimoDia) ultimoDia = t.ultimo_dia;
        }
        box.appendChild(c);
      });
      $('temas').parentNode.querySelector('[data-k="quando"]').textContent = ultimoDia ? 'último dia completo ' + dia(ultimoDia) : 'aguardando a primeira coleta';
      $('nota-coleta').textContent = 'Última coleta bem-sucedida: ' + dt(d.ultima_coleta) + '. ' + (d.fonte || '');
    }).catch(function () { $('temas').textContent = 'Sem conexão com o banco agora. Tente de novo em instantes.'; });
})();
