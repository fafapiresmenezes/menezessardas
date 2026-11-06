// Bloco B14: enquetes públicas (RPC instituto_enquetes). Só agregados, n >= 10, intervalo de Wilson 95%.
(function () {
  var API = 'https://hlraekzvgxdpiiigdxdo.supabase.co/rest/v1/rpc/instituto_enquetes';
  var KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhscmFla3p2Z3hkcGlpaWdkeGRvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI4ODEzOTksImV4cCI6MjEwODQ1NzM5OX0.yCNPEGDb7tdf1JIY30WKUbE-xZwjQFwygJFJnvBeyrs';
  var $ = function (i) { return document.getElementById(i); };
  var el = function (t, c, x) { var e = document.createElement(t); if (c) e.className = c; if (x != null) e.textContent = x; return e; };
  var dia = function (d) { return d ? new Date(d).toLocaleDateString('pt-BR') : ''; };
  function wilson(k, n, z) { z = z || 1.96; if (!n) return { p: 0, min: 0, max: 0 }; var p = k / n, z2 = z * z, den = 1 + z2 / n; var c = (p + z2 / (2 * n)) / den, m = z * Math.sqrt(p * (1 - p) / n + z2 / (4 * n * n)) / den; return { p: p, min: Math.max(0, c - m), max: Math.min(1, c + m) }; }
  var pc = function (x) { return Math.round(x * 100) + '%'; };

  fetch(API, { method: 'POST', headers: { apikey: KEY, Authorization: 'Bearer ' + KEY, 'Content-Type': 'application/json' }, body: '{}' })
    .then(function (r) { return r.ok ? r.json() : null; })
    .then(function (d) {
      var box = $('enquetes');
      if (!d || !d.enquetes) { box.textContent = 'Sem conexão com o banco agora. Tente de novo em instantes.'; return; }
      box.textContent = '';
      document.querySelector('[data-k="quando"]').textContent = d.enquetes.length + (d.enquetes.length === 1 ? ' enquete' : ' enquetes');
      if (!d.enquetes.length) { var a = el('article'); a.appendChild(el('div', 'sm', 'Nenhuma enquete pública ainda. As primeiras são abertas pelos escritórios parceiros.')); box.appendChild(a); return; }
      d.enquetes.forEach(function (e) {
        var art = el('article');
        var aberta = new Date(e.aberta_ate) > new Date();
        art.appendChild(el('div', 'kicker', e.tema + ' · ' + (aberta ? 'aberta até ' + dia(e.aberta_ate) : 'encerrada')));
        art.appendChild(el('h3', null, e.pergunta));
        var n = Number(e.n || 0);
        if (!e.contagens) { art.appendChild(el('div', 'sm', n + (n === 1 ? ' voto' : ' votos') + ' até agora. Publicamos o resultado a partir de 10.')); art.appendChild(el('span', 'veredito', 'Amostra pequena')); box.appendChild(art); return; }
        var linhas = e.opcoes.map(function (o, i) { var w = wilson(Number(e.contagens[i] || 0), n); w.opcao = o; w.k = Number(e.contagens[i] || 0); return w; });
        linhas.forEach(function (l) {
          var r = el('div', 'opc');
          r.appendChild(el('span', null, l.opcao));
          r.appendChild(el('span', null, pc(l.p) + ' (' + pc(l.min) + '–' + pc(l.max) + ')'));
          var b = el('div', 'b'); var ic = el('div', 'ic'); ic.style.left = (l.min * 100) + '%'; ic.style.width = (Math.max(0, l.max - l.min) * 100) + '%'; var pt = el('div', 'pt'); pt.style.left = (l.p * 100) + '%';
          b.appendChild(ic); b.appendChild(pt); r.appendChild(b); art.appendChild(r);
        });
        var ord = linhas.slice().sort(function (a, b) { return b.k - a.k; });
        var empate = ord.length > 1 && ord[0].min <= ord[1].max;
        var margem = Math.round(1.96 * Math.sqrt(0.25 / n) * 1000) / 10;
        art.appendChild(el('div', 'sm', n + ' votos · margem máxima ±' + margem.toLocaleString('pt-BR') + ' pontos'));
        art.appendChild(el('span', 'veredito', empate ? 'Empate técnico' : 'À frente: ' + ord[0].opcao));
        box.appendChild(art);
      });
    }).catch(function () { $('enquetes').textContent = 'Sem conexão com o banco agora. Tente de novo em instantes.'; });
})();
