// Passo D06 (I-04): 3 objetivos e 9 resultados-chave ao vivo, com sha256 por KR e prova OpenTimestamps do resumo diário.
(function () {
  var URL = 'https://hlraekzvgxdpiiigdxdo.supabase.co/rest/v1/rpc/instituto_okr';
  var KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhscmFla3p2Z3hkcGlpaWdkeGRvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI4ODEzOTksImV4cCI6MjEwODQ1NzM5OX0.yCNPEGDb7tdf1JIY30WKUbE-xZwjQFwygJFJnvBeyrs';
  var $ = function (i) { return document.getElementById(i); };
  var el = function (t, c, x) { var e = document.createElement(t); if (c) e.className = c; if (x != null) e.textContent = x; return e; };
  var num = function (v) { return typeof v === 'number' ? v.toLocaleString('pt-BR', { maximumFractionDigits: 4 }) : String(v); };
  fetch(URL, { method: 'POST', headers: { apikey: KEY, Authorization: 'Bearer ' + KEY, 'Content-Type': 'application/json' }, body: '{}' })
    .then(function (r) { return r.ok ? r.json() : null; })
    .then(function (d) {
      var box = $('objetivos');
      if (!d || !d.krs) { box.textContent = 'Sem conexão com o banco agora. Tente de novo em instantes.'; return; }
      box.textContent = '';
      $('k-geral').textContent = d.progresso_geral + '%';
      $('k-quando').textContent = 'Medido em ' + new Date(d.medido_em).toLocaleString('pt-BR');
      d.objetivos.forEach(function (o, i) {
        var sec = el('div', 'obj'); sec.appendChild(el('h3', null, 'Objetivo ' + (i + 1) + ': ' + o));
        var g = el('div', 'krs');
        d.krs.filter(function (k) { return k.o === i + 1; }).forEach(function (k) {
          var c = el('div');
          c.appendChild(el('div', 'sm', 'KR ' + k.kr + ' · ' + k.nome));
          c.appendChild(el('div', 'num', num(k.valor)));
          c.appendChild(el('div', 'sm', 'Meta: ' + num(k.meta) + ' · fonte: ' + k.fonte));
          var m = el('div', 'meta'); m.setAttribute('role', 'img'); m.setAttribute('aria-label', k.progresso + '% da meta');
          var b = el('i'); b.style.width = Math.max(0, Math.min(100, k.progresso)) + '%'; m.appendChild(b); c.appendChild(m);
          c.appendChild(el('div', 'sm', k.progresso + '% da meta'));
          c.appendChild(el('div', 'hash', 'sha256 ' + k.sha256));
          g.appendChild(c);
        });
        sec.appendChild(g); box.appendChild(sec);
      });
      var s = d.selo;
      if (!s) { $('k-selo').textContent = 'O primeiro selo diário ainda está sendo registrado.'; return; }
      $('k-selo').textContent = 'Resumo de ' + s.dia.split('-').reverse().join('/') + ' · sha256 ' + s.sha256;
      try {
        var cab = [0x00, 0x4f, 0x70, 0x65, 0x6e, 0x54, 0x69, 0x6d, 0x65, 0x73, 0x74, 0x61, 0x6d, 0x70, 0x73, 0x00, 0x00, 0x50, 0x72, 0x6f, 0x6f, 0x66, 0x00, 0xbf, 0x89, 0xe2, 0xe8, 0x84, 0xe8, 0x92, 0x94, 0x01, 0x08];
        var dig = s.sha256.match(/../g).map(function (h) { return parseInt(h, 16); });
        var pr = atob(s.prova_b64).split('').map(function (ch) { return ch.charCodeAt(0); });
        var blob = new Blob([new Uint8Array(cab.concat(dig, pr))], { type: 'application/octet-stream' });
        var a = $('k-ots'); a.href = window.URL.createObjectURL(blob); a.download = 'okr-' + s.dia + '.ots'; a.hidden = false;
      } catch (e) { /* sem download, o sha256 continua visível */ }
    }).catch(function () { $('objetivos').textContent = 'Sem conexão com o banco agora. Tente de novo em instantes.'; });
})();
(function () { var s = document.createElement('script'); s.src = '/vitais.js'; s.defer = true; document.head.appendChild(s); })();
