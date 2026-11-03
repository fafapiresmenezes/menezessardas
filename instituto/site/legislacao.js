// Passo D08 (I-04): sete fontes públicas de legislação e reguladores, lidas 1x/dia (RPC instituto_legislacao).
(function () {
  var API = 'https://hlraekzvgxdpiiigdxdo.supabase.co/rest/v1/rpc/instituto_legislacao';
  var KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhscmFla3p2Z3hkcGlpaWdkeGRvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI4ODEzOTksImV4cCI6MjEwODQ1NzM5OX0.yCNPEGDb7tdf1JIY30WKUbE-xZwjQFwygJFJnvBeyrs';
  var $ = function (i) { return document.getElementById(i); };
  var el = function (t, c, x) { var e = document.createElement(t); if (c) e.className = c; if (x != null) e.textContent = x; return e; };
  var dt = function (v) { return v ? new Date(v).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : null; };
  fetch(API, { method: 'POST', headers: { apikey: KEY, Authorization: 'Bearer ' + KEY, 'Content-Type': 'application/json' }, body: '{}' })
    .then(function (r) { return r.ok ? r.json() : null; })
    .then(function (d) {
      var box = $('fontes');
      if (!d || !d.fontes) { box.textContent = 'Sem conexão com o banco agora. Tente de novo em instantes.'; return; }
      box.textContent = ''; $('l-quando').textContent = 'Consultado em ' + dt(d.atualizado_em);
      d.fontes.forEach(function (f) {
        var c = el('div');
        c.appendChild(el('div', 'sm', f.orgao));
        c.appendChild(el('h3', null, f.nome));
        c.appendChild(el('p', 'sm', f.por_que));
        var ok = f.ultima_ok;
        c.appendChild(el('div', 'st ' + (ok === false ? 'no' : 'ok'), ok === false ? 'Última leitura falhou; tentamos de novo amanhã' : f.ultima_leitura ? 'Lida em ' + dt(f.ultima_leitura) : 'Primeira leitura em andamento'));
        c.appendChild(el('div', 'sm', f.ultima_mudanca ? 'Última mudança detectada: ' + dt(f.ultima_mudanca) : f.primeira_leitura ? 'Sem mudança desde ' + dt(f.primeira_leitura) : ''));
        c.appendChild(el('div', 'sm', 'Últimos 7 dias: ' + f.leituras_7d + ' leituras, ' + f.falhas_7d + ' falhas'));
        if (f.sha256) c.appendChild(el('div', 'hash', 'sha256 ' + f.sha256));
        var a = el('a', null, 'Abrir a fonte original'); a.href = f.pagina; a.rel = 'noopener'; a.style.display = 'inline-block'; a.style.padding = '4px 0';
        c.appendChild(a); box.appendChild(c);
      });
    }).catch(function () { $('fontes').textContent = 'Sem conexão com o banco agora. Tente de novo em instantes.'; });
})();
(function () { var s = document.createElement('script'); s.src = '/vitais.js'; s.defer = true; document.head.appendChild(s); })();
