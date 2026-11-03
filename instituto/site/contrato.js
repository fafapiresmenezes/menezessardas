// Passo L02: leitura de contrato de locação por IA (Edge instituto-agentes, ação "contrato").
(function () {
  var FN = 'https://hlraekzvgxdpiiigdxdo.supabase.co/functions/v1/instituto-agentes';
  var KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhscmFla3p2Z3hkcGlpaWdkeGRvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI4ODEzOTksImV4cCI6MjEwODQ1NzM5OX0.yCNPEGDb7tdf1JIY30WKUbE-xZwjQFwygJFJnvBeyrs';
  var $ = function (id) { return document.getElementById(id); };
  function sessao() { try { return localStorage.getItem('theye_sessao') || ''; } catch (e) { return ''; } }
  function el(tag, txt, cls) { var e = document.createElement(tag); e.textContent = txt; if (cls) e.className = cls; return e; }
  var res = $('c-res'), txt = $('c-texto'), btn = $('c-ir');
  $('c-estado').textContent = sessao() ? 'Você está no laboratório: pode ler.' : 'Para ler, faça o cadastro grátis no laboratório.';
  txt.addEventListener('input', function () { $('c-conta').textContent = txt.value.length.toLocaleString('pt-BR') + ' caracteres'; });
  // Mostra a análise como títulos e parágrafos, sem HTML vindo da IA.
  function mostrar(a) {
    res.textContent = '';
    a.split('\n').forEach(function (l) {
      l = l.trim().replace(/\*\*/g, ''); if (!l) return;
      if (/^#{0,3}\s*\d\.\s/.test(l)) { res.appendChild(el('h3', l.replace(/^#+\s*/, ''))); return; }
      var p = el('p', '');
      var m = l.match(/^(-\s*)?(Gravidade\s+)?(alta|média|media|baixa)\b/i);
      if (m) { var g = m[3].toLowerCase().replace('média', 'media'); p.appendChild(el('span', l.slice(0, m[0].length), g)); p.appendChild(document.createTextNode(l.slice(m[0].length))); }
      else p.textContent = l;
      res.appendChild(p);
    });
  }
  $('ler').addEventListener('submit', function (ev) {
    ev.preventDefault();
    var t = txt.value.trim();
    if (!sessao()) { res.textContent = ''; res.appendChild(el('p', 'Faça o cadastro grátis no laboratório e volte para esta página.')); var a = el('a', 'Ir para o laboratório', 'btn'); a.href = '/laboratorio.html'; res.appendChild(a); return; }
    if (t.length < 300) { res.textContent = 'Cole o contrato inteiro: faltam ' + (300 - t.length) + ' caracteres.'; return; }
    if (t.length > 40000) { res.textContent = 'O contrato passou de 40 mil caracteres. Cole só as cláusulas principais.'; return; }
    btn.disabled = true; res.textContent = 'Lendo o contrato. Leva cerca de 1 minuto.';
    fetch(FN, { method: 'POST', headers: { apikey: KEY, Authorization: 'Bearer ' + KEY, 'Content-Type': 'application/json' }, body: JSON.stringify({ acao: 'contrato', texto: t, sessao: sessao() }) })
      .then(function (r) { return r.json(); })
      .catch(function () { return { erro: 'Sem conexão agora. Tente de novo em instantes.' }; })
      .then(function (j) {
        btn.disabled = false;
        if (!j || j.erro) { res.textContent = (j && j.erro) || 'Não consegui ler agora.'; return; }
        mostrar(j.analise);
        if (window.theyeEvento) window.theyeEvento('contrato');
        res.appendChild(el('p', 'Leitura feita por IA (' + j.modelo + '). O texto do contrato não foi guardado.', 'sm'));
      });
  });
})();
