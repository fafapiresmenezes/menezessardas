// Passo D14 (I-04): checklist de documentos do imóvel por função, a partir de /documentos-imovel.json.
// Nada é enviado: o que a pessoa marca fica só no navegador dela.
(function () {
  var fns = document.getElementById('d-fns'), lista = document.getElementById('d-lista');
  var conta = document.getElementById('d-conta'), resumo = document.getElementById('d-resumo'), fonte = document.getElementById('d-fonte');
  var dados = null, atual = null;
  var KEY = 'theye_docs_marcados';

  function lido() { try { return JSON.parse(localStorage.getItem(KEY) || '{}'); } catch (e) { return {}; } }
  function grava(m) { try { localStorage.setItem(KEY, JSON.stringify(m)); } catch (e) { /* navegação privada */ } }

  function contar() {
    var m = lido()[atual.id] || {}, itens = atual.documentos;
    var n = itens.filter(function (d) { return m[d.doc]; }).length;
    conta.textContent = n + ' de ' + itens.length + ' em ordem. Faltam ' + (itens.length - n) + '.';
  }

  function desenhar(f) {
    atual = f;
    resumo.textContent = f.resumo;
    lista.textContent = '';
    var m = lido()[f.id] || {};
    f.documentos.forEach(function (d) {
      var div = document.createElement('div'); div.className = 'item';
      var lab = document.createElement('label');
      var cb = document.createElement('input'); cb.type = 'checkbox'; cb.checked = !!m[d.doc];
      cb.addEventListener('change', function () {
        var t = lido(); t[f.id] = t[f.id] || {}; t[f.id][d.doc] = cb.checked; grava(t); contar();
      });
      var corpo = document.createElement('div');
      var h = document.createElement('h3'); h.textContent = d.doc; corpo.appendChild(h);
      var meta = document.createElement('div'); meta.className = 'meta';
      meta.textContent = 'Quem providencia: ' + d.quem + ' · Quando: ' + d.quando; corpo.appendChild(meta);
      var p = document.createElement('p'); p.className = 'sm'; p.style.margin = '6px 0 0';
      p.textContent = d.porque + ' ';
      var a = document.createElement('a'); a.href = d.url; a.rel = 'noopener'; a.textContent = d.norma; p.appendChild(a);
      corpo.appendChild(p);
      lab.appendChild(cb); lab.appendChild(corpo); div.appendChild(lab); lista.appendChild(div);
    });
    Array.prototype.forEach.call(fns.children, function (b) { b.setAttribute('aria-pressed', String(b.dataset.id === f.id)); });
    contar();
  }

  fetch('/documentos-imovel.json').then(function (r) { return r.ok ? r.json() : null; }).then(function (d) {
    if (!d) { fonte.textContent = 'Não consegui carregar a lista agora.'; return; }
    dados = d;
    fonte.textContent = 'Ontologia v' + d.versao + ' · 5 funções, 45 exigências com norma';
    d.funcoes.forEach(function (f) {
      var b = document.createElement('button'); b.type = 'button'; b.dataset.id = f.id;
      b.textContent = f.nome; b.setAttribute('aria-pressed', 'false');
      b.addEventListener('click', function () { desenhar(f); });
      fns.appendChild(b);
    });
    desenhar(d.funcoes[0]);
  }).catch(function () { fonte.textContent = 'Sem conexão agora.'; });

  document.getElementById('d-imprimir').addEventListener('click', function () { window.print(); });
})();

(function () { var s = document.createElement('script'); s.src = '/vitais.js'; s.defer = true; document.head.appendChild(s); })();
