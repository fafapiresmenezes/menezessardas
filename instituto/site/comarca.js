// Passo L04: relatório jurimétrico por comarca (RPCs instituto_comarcas, instituto_relatorio_comarca, instituto_relatorio_prova).
(function () {
  var REST = 'https://hlraekzvgxdpiiigdxdo.supabase.co/rest/v1/rpc/';
  var KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhscmFla3p2Z3hkcGlpaWdkeGRvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI4ODEzOTksImV4cCI6MjEwODQ1NzM5OX0.yCNPEGDb7tdf1JIY30WKUbE-xZwjQFwygJFJnvBeyrs';
  var $ = function (id) { return document.getElementById(id); };
  function el(tag, txt, cls) { var e = document.createElement(tag); if (txt != null) e.textContent = txt; if (cls) e.className = cls; return e; }
  function rpc(fn, corpo) {
    return fetch(REST + fn, { method: 'POST', headers: { apikey: KEY, Authorization: 'Bearer ' + KEY, 'Content-Type': 'application/json' }, body: JSON.stringify(corpo) })
      .then(function (r) { return r.json(); }).catch(function () { return { erro: 'Sem conexão agora. Tente de novo em instantes.' }; });
  }
  var pct = function (x) { return (Number(x) * 100).toLocaleString('pt-BR', { maximumFractionDigits: 1 }) + '%'; };
  var n = function (x) { return Number(x || 0).toLocaleString('pt-BR'); };
  var dias = function (d) { return d == null ? 'sem dados suficientes' : n(d) + ' dias (cerca de ' + (d / 30.4).toLocaleString('pt-BR', { maximumFractionDigits: 0 }) + ' meses)'; };
  function taxa(m) {
    if (!m.procedencia) return 'não mostrada: só ' + n(m.merito) + ' julgamentos de mérito (mínimo 10)';
    return pct(m.procedencia.p) + ' (95%: ' + pct(m.procedencia.ic95[0]) + ' a ' + pct(m.procedencia.ic95[1]) + ')';
  }
  function comarcas() {
    var s = $('c-com'); s.textContent = ''; s.appendChild(el('option', 'carregando'));
    rpc('instituto_comarcas', { p_tribunal: $('c-trib').value }).then(function (l) {
      s.textContent = '';
      var o0 = el('option', 'Escolha a comarca'); o0.value = ''; s.appendChild(o0);
      (Array.isArray(l) ? l : []).forEach(function (c) { var o = el('option', c.nome + ' (' + n(c.acoes) + ' ações)'); o.value = c.chave; s.appendChild(o); });
    });
  }
  function ots(sha, prova, nome) {
    var cab = [0x00, 0x4f, 0x70, 0x65, 0x6e, 0x54, 0x69, 0x6d, 0x65, 0x73, 0x74, 0x61, 0x6d, 0x70, 0x73, 0x00, 0x00, 0x50, 0x72, 0x6f, 0x6f, 0x66, 0x00, 0xbf, 0x89, 0xe2, 0xe8, 0x84, 0xe8, 0x92, 0x94, 0x01, 0x08];
    var dig = sha.match(/../g).map(function (h) { return parseInt(h, 16); });
    var pr = atob(prova).split('').map(function (ch) { return ch.charCodeAt(0); });
    var a = el('a', 'Baixar prova .ots', 'btn sec'); a.href = window.URL.createObjectURL(new Blob([new Uint8Array(cab.concat(dig, pr))], { type: 'application/octet-stream' })); a.download = nome + '.ots';
    return a;
  }
  function relatorio() {
    var ch = $('c-com').value, box = $('c-rel');
    if (!ch) return;
    box.textContent = 'Montando o relatório.';
    rpc('instituto_relatorio_comarca', { p_tribunal: $('c-trib').value, p_chave: ch }).then(function (r) {
      box.textContent = '';
      if (!r || r.erro) { box.textContent = (r && (r.erro || r.message)) || 'Não consegui montar agora.'; return; }
      var c = r.comarca_dados, e = r.estado;
      box.appendChild(el('div', r.titulo + ' · base de ' + r.base_em.split('-').reverse().join('/'), 'kicker'));
      box.appendChild(el('h3', r.comarca + ' (' + r.tribunal + ')'));
      if (c.amostra !== 'adequada') box.appendChild(el('p', c.amostra === 'pequena' ? 'Amostra pequena: ' + n(c.merito) + ' julgamentos de mérito. Leia a taxa junto com a margem.' : 'Amostra insuficiente: menos de 10 julgamentos de mérito. Mostramos só o volume.', 'alerta'));
      var kp = el('div', null, 'kp');
      [['Ações de locação', n(c.acoes)], ['Pedido aceito', c.procedencia ? pct(c.procedencia.p) : '—'], ['Tempo mediano', c.tempo_mediano_dias == null ? '—' : n(c.tempo_mediano_dias) + ' dias']].forEach(function (k) {
        var d = el('div'); d.appendChild(el('span', k[0], 'sm')); d.appendChild(el('b', k[1])); kp.appendChild(d);
      });
      box.appendChild(kp);
      var t = el('table', null, 'tab'), th = el('thead'), tr = el('tr');
      ['', r.comarca, 'Estado (' + r.tribunal + ')'].forEach(function (x) { tr.appendChild(el('th', x)); }); th.appendChild(tr); t.appendChild(th);
      var tb = el('tbody');
      [['Ações', n(c.acoes), n(e.acoes)], ['Julgamentos de mérito', n(c.merito), n(e.merito)], ['Procedência', taxa(c), taxa(e)], ['Tempo mediano', dias(c.tempo_mediano_dias), dias(e.tempo_mediano_dias)]].forEach(function (l) {
        var row = el('tr'); l.forEach(function (x) { row.appendChild(el('td', x)); }); tb.appendChild(row);
      });
      t.appendChild(tb); var wrap = el('div'); wrap.className = 'rolar'; wrap.tabIndex = 0; wrap.setAttribute('role', 'region'); wrap.setAttribute('aria-label', 'Comparação com o estado'); wrap.style.overflowX = 'auto'; wrap.appendChild(t); box.appendChild(wrap);
      box.appendChild(el('p', 'Ações por tipo: ' + c.por_classe.map(function (x) { return x.classe + ' ' + n(x.acoes); }).join('; ') + '.', 'sm'));
      box.appendChild(el('p', 'Método: ' + r.metodo, 'sm'));
      box.appendChild(el('p', 'Fonte: ' + r.fonte + ' Não é parecer jurídico.', 'sm'));
      box.appendChild(el('p', 'Código de registro (sha256): ' + r.sha256, 'hash'));
      var ac = el('div', null, 'acoes');
      var pdf = el('button', 'Salvar em PDF', 'btn'); pdf.type = 'button'; pdf.addEventListener('click', function () { window.print(); }); ac.appendChild(pdf);
      var dados = el('a', 'Baixar o texto registrado', 'btn sec'); dados.href = window.URL.createObjectURL(new Blob([r.texto_selado], { type: 'application/json' })); dados.download = 'relatorio-' + ch.replace(/\W+/g, '-') + '.json'; ac.appendChild(dados);
      var st = el('span', 'Registro no Bitcoin: ' + r.selo + '.', 'sm'); ac.appendChild(st);
      box.appendChild(ac);
      setTimeout(function () {
        rpc('instituto_relatorio_prova', { p_sha: r.sha256 }).then(function (p) {
          if (p && p.prova_b64) { st.textContent = 'Registro no Bitcoin: prova pronta.'; ac.appendChild(ots(r.sha256, p.prova_b64, 'relatorio-' + ch.replace(/\W+/g, '-'))); }
        });
      }, 4000);
    });
  }
  $('c-trib').addEventListener('change', function () { $('c-rel').textContent = 'Escolha a comarca para ver o relatório.'; comarcas(); });
  $('c-com').addEventListener('change', relatorio);
  comarcas();
})();
