// Passo D21 (I-04): "O que falta de você". Só leitura: a RPC instituto_pendencias devolve os itens,
// as opções de múltipla escolha e o status do cartão. A decisão é registrada pelo guardião quando M responde no chat.
(function () {
  var KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhscmFla3p2Z3hkcGlpaWdkeGRvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI4ODEzOTksImV4cCI6MjEwODQ1NzM5OX0.yCNPEGDb7tdf1JIY30WKUbE-xZwjQFwygJFJnvBeyrs';
  var cards = document.getElementById('f-cards'), resumo = document.getElementById('f-resumo');
  var fil = document.getElementById('f-fil'), quando = document.getElementById('f-quando');
  var itens = [], filtro = 'todos';
  var ONDE = { instituto: 'Instituto', escritorio: 'Escritório' };
  var ESTADO = { 'nao aberto': 'sem cartão ainda', 'aberto': 'esperando a sua resposta', 'respondido': 'respondido' };

  function desenhar() {
    cards.textContent = '';
    itens.filter(function (i) {
      return filtro === 'todos' || (filtro === 'pendentes' ? i.cartao !== 'respondido' : i.onde === filtro);
    }).forEach(function (i) {
      var d = document.createElement('div'); d.className = 'card';
      if (i.cartao === 'respondido') d.style.borderLeftColor = 'var(--apagado)';
      var m = document.createElement('div'); m.className = 'meta';
      m.textContent = (ONDE[i.onde] || i.onde) + ' · ' + (ESTADO[i.cartao] || i.cartao);
      var h = document.createElement('h3'); h.textContent = i.titulo;
      var p1 = document.createElement('p'); p1.className = 'sm'; p1.style.margin = '0 0 6px'; p1.textContent = i.porque;
      var p2 = document.createElement('p'); p2.className = 'sm'; p2.style.margin = '0'; p2.textContent = 'O que trava: ' + i.impacto;
      d.appendChild(m); d.appendChild(h); d.appendChild(p1); d.appendChild(p2);
      var ol = document.createElement('ol');
      (i.opcoes || []).forEach(function (o) { var li = document.createElement('li'); li.textContent = o; ol.appendChild(li); });
      d.appendChild(ol);
      if (i.escolha) { var e = document.createElement('p'); e.className = 'esc'; e.textContent = 'Você escolheu: ' + i.escolha; d.appendChild(e); }
      if (i.cartao !== 'respondido') {
        var b = document.createElement('button'); b.type = 'button'; b.className = 'copiar';
        b.textContent = 'Copiar a resposta';
        b.addEventListener('click', function () {
          var txt = i.titulo + ': escolho a opção 1 (' + ((i.opcoes || [])[0] || '') + ').';
          if (navigator.clipboard) navigator.clipboard.writeText(txt).then(function () { b.textContent = 'Copiado, agora cole no chat'; });
          else b.textContent = txt;
        });
        d.appendChild(b);
      }
      cards.appendChild(d);
    });
  }

  fetch('https://hlraekzvgxdpiiigdxdo.supabase.co/rest/v1/rpc/instituto_pendencias', {
    method: 'POST', headers: { apikey: KEY, Authorization: 'Bearer ' + KEY, 'Content-Type': 'application/json' }, body: '{}'
  }).then(function (r) { return r.ok ? r.json() : null; }).then(function (d) {
    if (!d) { quando.textContent = 'Não consegui carregar agora.'; return; }
    itens = d.itens || [];
    quando.textContent = itens.length + ' itens · ' + d.com_cartao + ' com cartão aberto · ' + d.respondidos + ' respondidos';
    [['Itens que dependem de você', d.total], ['Com cartão aberto', d.com_cartao], ['Já respondidos', d.respondidos]].forEach(function (x) {
      var el = document.createElement('div');
      var b = document.createElement('b'); b.textContent = x[1];
      var s = document.createElement('span'); s.className = 'sm'; s.textContent = x[0];
      el.appendChild(b); el.appendChild(s); resumo.appendChild(el);
    });
    [['todos', 'Todos'], ['pendentes', 'Só os pendentes'], ['instituto', 'Instituto'], ['escritorio', 'Escritório']].forEach(function (x) {
      var b = document.createElement('button'); b.type = 'button'; b.textContent = x[1];
      b.setAttribute('aria-pressed', String(x[0] === filtro));
      b.addEventListener('click', function () {
        filtro = x[0];
        Array.prototype.forEach.call(fil.children, function (o) { o.setAttribute('aria-pressed', String(o === b)); });
        desenhar();
      });
      fil.appendChild(b);
    });
    desenhar();
  }).catch(function () { quando.textContent = 'Sem conexão agora.'; });
})();

(function () { var s = document.createElement('script'); s.src = '/vitais.js'; s.defer = true; document.head.appendChild(s); })();
