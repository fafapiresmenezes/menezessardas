// Bloco B15: mercados de predição e Epoch AI (RPC instituto_mercados). Só leitura, só agregados.
(function () {
  var API = 'https://hlraekzvgxdpiiigdxdo.supabase.co/rest/v1/rpc/instituto_mercados';
  var KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhscmFla3p2Z3hkcGlpaWdkeGRvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI4ODEzOTksImV4cCI6MjEwODQ1NzM5OX0.yCNPEGDb7tdf1JIY30WKUbE-xZwjQFwygJFJnvBeyrs';
  var $ = function (i) { return document.getElementById(i); };
  var k = function (n) { return document.querySelector('[data-k="' + n + '"]'); };
  var el = function (t, c, x) { var e = document.createElement(t); if (c) e.className = c; if (x != null) e.textContent = x; return e; };
  var pct = function (p) { return p == null ? '—' : Math.round(Number(p) * 100) + '%'; };
  var fmt = function (v, d) { return v == null ? '—' : Number(v).toLocaleString('pt-BR', { maximumFractionDigits: d == null ? 0 : d }); };
  var dt = function (v) { return v ? new Date(v).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : '—'; };
  var dia = function (d) { return d ? new Date(d + 'T12:00:00').toLocaleDateString('pt-BR') : '—'; };

  fetch(API, { method: 'POST', headers: { apikey: KEY, Authorization: 'Bearer ' + KEY, 'Content-Type': 'application/json' }, body: JSON.stringify({ p_dias: 30 }) })
    .then(function (r) { return r.ok ? r.json() : null; })
    .then(function (d) {
      var tb = $('mercados');
      if (!d || !d.mercados) { tb.textContent = ''; var tr = el('tr'); var td = el('td', 'sm', 'Sem conexão com o banco agora. Tente de novo em instantes.'); td.colSpan = 5; tr.appendChild(td); tb.appendChild(tr); return; }
      k('quando').textContent = 'última leitura ' + dt(d.ultima_coleta);
      if (d.aviso) k('aviso').textContent = d.aviso;
      var c = d.calibragem || {};
      k('resolvidos').textContent = fmt(c.resolvidos);
      k('ece').textContent = c.ece == null ? (Number(c.resolvidos || 0) < (c.minimo || 30) ? 'ainda não' : '—') : fmt(c.ece, 3);
      k('brier').textContent = c.brier == null ? (Number(c.resolvidos || 0) < (c.minimo || 30) ? 'ainda não' : '—') : fmt(c.brier, 3);
      var e = d.epoch_ai || {};
      k('epoch-modelos').textContent = fmt(e.modelos_notaveis);
      k('epoch-log').textContent = e.log10_compute_max == null ? '—' : fmt(e.log10_compute_max, 2);
      k('epoch-dia').textContent = dia(e.dia);
      k('n-mercados').textContent = d.mercados.length + (d.mercados.length === 1 ? ' mercado' : ' mercados');
      tb.textContent = '';
      if (!d.mercados.length) { var tr0 = el('tr'); var td0 = el('td', 'sm', 'Primeira leitura em andamento. Os mercados aparecem após a coleta das 02h30 (Brasília).'); td0.colSpan = 5; tr0.appendChild(td0); tb.appendChild(tr0); return; }
      d.mercados.forEach(function (m) {
        var tr = el('tr');
        var t1 = el('td'); t1.appendChild(el('div', 'fonte', m.chave.split(':')[0])); t1.appendChild(el('div', null, m.titulo || m.chave)); tr.appendChild(t1);
        var t2 = el('td', 'n'); t2.appendChild(document.createTextNode(pct(m.p)));
        var sd = m.sd30 == null ? 0 : Number(m.sd30), p = Number(m.p);
        var f = el('span', 'faixa'); var ic = el('span', 'ic'); ic.style.left = (Math.max(0, p - sd) * 100) + '%'; ic.style.width = (Math.min(1, p + sd) - Math.max(0, p - sd)) * 100 + '%'; var pt = el('span', 'pt'); pt.style.left = (p * 100) + '%'; f.appendChild(ic); f.appendChild(pt); t2.appendChild(f); tr.appendChild(t2);
        var t3 = el('td', 'n oculta', m.sd30 == null ? '— (1 dia)' : '±' + Math.round(sd * 100) + ' pts'); tr.appendChild(t3);
        tr.appendChild(el('td', 'n oculta', fmt(m.dias)));
        tr.appendChild(el('td', 'n oculta', m.volume == null ? '—' : 'US$ ' + fmt(m.volume)));
        tb.appendChild(tr);
      });
    }).catch(function () { var tb = $('mercados'); tb.textContent = ''; var tr = el('tr'); var td = el('td', 'sm', 'Sem conexão com o banco agora. Tente de novo em instantes.'); td.colSpan = 5; tr.appendChild(td); tb.appendChild(tr); });
})();
