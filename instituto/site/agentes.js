// Agentes do Instituto: lista os 50 agentes em 5 lotes e pergunta por botão.
(function () {
  var FN = 'https://hlraekzvgxdpiiigdxdo.supabase.co/functions/v1/instituto-agentes';
  var KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhscmFla3p2Z3hkcGlpaWdkeGRvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI4ODEzOTksImV4cCI6MjEwODQ1NzM5OX0.yCNPEGDb7tdf1JIY30WKUbE-xZwjQFwygJFJnvBeyrs';
  var $ = function (id) { return document.getElementById(id); };
  var todos = [], lote = 1, ultimo = null;
  var REST = 'https://hlraekzvgxdpiiigdxdo.supabase.co/rest/v1/rpc/';
  function rpc(fn, corpo) {
    return fetch(REST + fn, { method: 'POST', headers: { apikey: KEY, Authorization: 'Bearer ' + KEY, 'Content-Type': 'application/json' }, body: JSON.stringify(corpo || {}) })
      .then(function (r) { return r.json(); }).catch(function () { return { erro: 'Sem conexão agora. Tente de novo em instantes.' }; });
  }
  function resumo() { rpc('instituto_incidentes_resumo').then(function (x) { if (x && x.total !== undefined) $('incres').textContent = 'Relatos até hoje: ' + x.total + ' (' + x.abertos + ' em revisão, ' + x.corrigidos + ' corrigidos).'; }); }
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
    var r = $('resp'); r.hidden = false; $('rel').hidden = true; ultimo = null; r.textContent = a.nome + ' está pensando…'; bt.disabled = true;
    r.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    chamar({ acao: 'perguntar', agente: a.id, sessao: sessao(), pergunta: $('pergunta').value }).then(function (j) {
      bt.disabled = false;
      if (j.erro) { r.textContent = j.erro; return; }
      ultimo = { agente: a.id, resposta: String(j.resposta || '') }; $('rel').hidden = false; $('rel').open = false; $('relmsg').textContent = ''; resumo();
      r.textContent = j.agente + '\n\n' + j.resposta + '\n\n— custo desta resposta: US$ ' + Number(j.custo_usd).toFixed(4);
    });
  }
  $('relf').onsubmit = function (ev) {
    ev.preventDefault(); if (!ultimo) return;
    var m = $('relmsg'), b = ev.target.querySelector('button'); b.disabled = true; m.textContent = 'Enviando…';
    rpc('instituto_relatar_incidente', { p_agente: ultimo.agente, p_motivo: $('motivo').value, p_comentario: $('coment').value, p_resposta: ultimo.resposta }).then(function (x) {
      b.disabled = false;
      if (x && x.ok) { m.textContent = 'Obrigado. Protocolo ' + x.protocolo + '. Uma pessoa vai revisar.'; $('coment').value = ''; ultimo = null; resumo(); }
      else m.textContent = (x && (x.erro || x.message)) || 'Não foi possível enviar agora.';
    });
  };
  chamar({ acao: 'listar' }).then(function (j) {
    todos = j.agentes || [];
    if (!todos.length) { $('ags').textContent = 'Não foi possível carregar os agentes agora.'; return; }
    Array.prototype.forEach.call($('lotes').children, function (b) {
      b.onclick = function () { lote = Number(b.dataset.l); desenhar(); };
    });
    var c = j.custo || {};
    $('custo').textContent = c.chamadas ? ('Custo medido: ' + c.chamadas + ' respostas, média de US$ ' + Number(c.custo_medio_usd).toFixed(4) + ' (cerca de ' + c.tokens_medios + ' tokens) por resposta.') : 'Custo medido aparece aqui após as primeiras respostas.';
    desenhar();
  });
})();
// Passo D10: catálogo de 50 agentes × habilidade × curso citado (/catalogo-50.json).
(function () {
  var tb = document.querySelector('#cat-tab tbody'); if (!tb) return;
  fetch('/catalogo-50.json').then(function (r) { return r.ok ? r.json() : null; }).then(function (d) {
    if (!d || !d.agentes) { tb.textContent = ''; return; }
    document.getElementById('cat-quando').textContent = d.agentes.length + ' agentes · links conferidos em ' + d.gerado_em.split('-').reverse().join('/');
    tb.textContent = '';
    d.agentes.forEach(function (a) {
      var tr = document.createElement('tr');
      [a.nome, a.skill].forEach(function (v) { var td = document.createElement('td'); td.textContent = v; tr.appendChild(td); });
      var td = document.createElement('td'), lk = document.createElement('a');
      lk.href = a.link; lk.textContent = a.curso; lk.rel = 'noopener'; lk.target = '_blank'; td.appendChild(lk); tr.appendChild(td);
      var ti = document.createElement('td'); ti.textContent = a.instituicao; tr.appendChild(ti);
      tb.appendChild(tr);
    });
  }).catch(function () {});
})();
// Passo D11: placar da avaliação dos agentes (RPC instituto_agentes_placar).
(function () {
  var tb = document.getElementById('pa-tab'); if (!tb) return;
  var KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhscmFla3p2Z3hkcGlpaWdkeGRvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI4ODEzOTksImV4cCI6MjEwODQ1NzM5OX0.yCNPEGDb7tdf1JIY30WKUbE-xZwjQFwygJFJnvBeyrs';
  var NOME = { citacao: 'Citar a norma certa', recusa: 'Recusar o que não pode responder', sem_dado: 'Dizer que não há dado', explicativa: 'Explicar sem prometer resultado' };
  fetch('https://hlraekzvgxdpiiigdxdo.supabase.co/rest/v1/rpc/instituto_agentes_placar', { method: 'POST', headers: { apikey: KEY, Authorization: 'Bearer ' + KEY, 'Content-Type': 'application/json' }, body: '{}' })
    .then(function (r) { return r.ok ? r.json() : null; })
    .then(function (d) {
      if (!d || !d.por_tipo) { document.getElementById('pa-quando').textContent = 'sem conexão com o banco agora'; return; }
      document.getElementById('pa-quando').textContent = 'rodada de ' + String(d.rodada).split('-').reverse().join('/') + ' · ' + d.agentes + ' agentes';
      tb.textContent = '';
      d.por_tipo.forEach(function (t) {
        var tr = document.createElement('tr');
        [NOME[t.tipo] || t.tipo, t.perguntas, t.acertos, (t.taxa * 100).toLocaleString('pt-BR', { maximumFractionDigits: 1 }) + '%'].forEach(function (v) { var td = document.createElement('td'); td.textContent = v; tr.appendChild(td); });
        tb.appendChild(tr);
      });
      var tx = d.acertos + ' de ' + d.perguntas + ' (' + (100 * d.acertos / d.perguntas).toLocaleString('pt-BR', { maximumFractionDigits: 1 }) + '%). Custo medido da rodada: US$ ' + Number(d.custo_total_usd).toFixed(3) + ', média de US$ ' + Number(d.custo_medio_usd).toFixed(4) + ' por resposta.';
      if (d.erros && d.erros.length) tx += ' Erros: ' + d.erros.map(function (e) { return e.agente + ' (' + e.motivo + ')'; }).join('; ') + '.';
      document.getElementById('pa-res').textContent = tx;
    }).catch(function () {});
})();
(function () { var s = document.createElement('script'); s.src = '/vitais.js'; s.defer = true; document.head.appendChild(s); })();
