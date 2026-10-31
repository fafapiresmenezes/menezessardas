// Agentes do Instituto: lista os 50 agentes em 5 lotes e pergunta por botão.
(function () {
  var FN = 'https://hlraekzvgxdpiiigdxdo.supabase.co/functions/v1/instituto-agentes';
  var KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhscmFla3p2Z3hkcGlpaWdkeGRvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI4ODEzOTksImV4cCI6MjEwODQ1NzM5OX0.yCNPEGDb7tdf1JIY30WKUbE-xZwjQFwygJFJnvBeyrs';
  var $ = function (id) { return document.getElementById(id); };
  var NOMES = { 1: 'Locação e núcleo', 2: 'Dados e predição', 3: 'Direito e normas', 4: 'Mercado e gestão', 5: 'Pesquisa e ensino' };
  var todos = [], lote = 1;
  function chamar(corpo) {
    return fetch(FN, { method: 'POST', headers: { apikey: KEY, Authorization: 'Bearer ' + KEY, 'Content-Type': 'application/json' }, body: JSON.stringify(corpo) })
      .then(function (r) { return r.json(); })
      .catch(function () { return { erro: 'Sem conexão agora. Tente de novo em instantes.' }; });
  }
  function sessao() { try { return localStorage.getItem('theye_sessao') || ''; } catch (e) { return ''; } }
  function el(tag, txt, cls) { var e = document.createElement(tag); if (txt) e.textContent = txt; if (cls) e.className = cls; return e; }
  function desenhar() {
    var box = $('ags'); box.textContent = '';
    todos.filter(function (a) { return a.lote === lote; }).forEach(function (a) {
      var c = el('div', '', 'ag');
      c.appendChild(el('b', a.nome)); c.appendChild(el('small', a.area + ' · currículo de referência: ' + a.formacao)); c.appendChild(el('p', a.papel));
      var bt = el('button', a.botao); bt.type = 'button';
      bt.onclick = function () { perguntar(a, bt); };
      c.appendChild(bt); box.appendChild(c);
    });
    Array.prototype.forEach.call($('lotes').children, function (b) { b.setAttribute('aria-pressed', String(Number(b.dataset.l) === lote)); });
  }
  function perguntar(a, bt) {
    var r = $('resp'); r.hidden = false; r.textContent = a.nome + ' está pensando…'; bt.disabled = true;
    r.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    chamar({ acao: 'perguntar', agente: a.id, sessao: sessao(), pergunta: $('pergunta').value }).then(function (j) {
      bt.disabled = false;
      if (j.erro) { r.textContent = j.erro; return; }
      r.textContent = j.agente + '\n\n' + j.resposta + '\n\n— custo desta resposta: US$ ' + Number(j.custo_usd).toFixed(4);
    });
  }
  chamar({ acao: 'listar' }).then(function (j) {
    todos = j.agentes || [];
    if (!todos.length) { $('ags').textContent = 'Não foi possível carregar os agentes agora.'; return; }
    [1, 2, 3, 4, 5].forEach(function (l) {
      var b = el('button', 'Lote ' + l + ' · ' + NOMES[l]); b.type = 'button'; b.dataset.l = l;
      b.onclick = function () { lote = l; desenhar(); }; $('lotes').appendChild(b);
    });
    var c = j.custo || {};
    $('custo').textContent = c.chamadas ? ('Custo medido: ' + c.chamadas + ' respostas, média de US$ ' + Number(c.custo_medio_usd).toFixed(4) + ' (cerca de ' + c.tokens_medios + ' tokens) por resposta.') : 'Custo medido aparece aqui após as primeiras respostas.';
    desenhar();
  });
})();
