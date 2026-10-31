// Laboratório do Instituto: cadastro com 1 consulta grátis, anti-robô por prova de trabalho, consulta.
(function () {
  var FN = 'https://hlraekzvgxdpiiigdxdo.supabase.co/functions/v1/instituto-acesso';
  var KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhscmFla3p2Z3hkcGlpaWdkeGRvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI4ODEzOTksImV4cCI6MjEwODQ1NzM5OX0.yCNPEGDb7tdf1JIY30WKUbE-xZwjQFwygJFJnvBeyrs';
  var $ = function (id) { return document.getElementById(id); };
  var inicio = Date.now(), opcoes = null;
  function chamar(corpo) {
    return fetch(FN, { method: 'POST', headers: { apikey: KEY, Authorization: 'Bearer ' + KEY, 'Content-Type': 'application/json' }, body: JSON.stringify(corpo) })
      .then(function (r) { return r.json().then(function (j) { j._status = r.status; return j; }); })
      .catch(function () { return { erro: 'Sem conexão com o laboratório agora. Tente de novo em instantes.', _status: 0 }; });
  }
  function aviso(t, erro) { var a = $('aviso'); a.hidden = !t; a.textContent = t || ''; a.className = 'msg' + (erro ? ' erro' : ''); }
  function sessao(v) {
    try { if (v === undefined) return localStorage.getItem('theye_sessao'); if (v) localStorage.setItem('theye_sessao', v); else localStorage.removeItem('theye_sessao'); } catch (e) { }
    return v;
  }
  var pct = function (x) { return Math.round(x * 100) + '%'; };
  var hex = function (b) { return Array.prototype.map.call(new Uint8Array(b), function (x) { return ('0' + x.toString(16)).slice(-2); }).join(''); };
  // Prova de trabalho: acha um número que, junto do desafio, gera hash começando com zeros.
  function provar(d) {
    var alvo = new Array(d.bits / 4 + 1).join('0'), enc = new TextEncoder(), n = 0;
    function lote() {
      var ps = [];
      for (var i = 0; i < 400; i++) ps.push(crypto.subtle.digest('SHA-256', enc.encode(d.sal + ':' + (n + i))));
      return Promise.all(ps).then(function (hs) {
        for (var i = 0; i < hs.length; i++) if (hex(hs[i]).indexOf(alvo) === 0) return n + i;
        n += 400; return lote();
      });
    }
    return lote().then(function (nonce) { return { sal: d.sal, emitido: d.emitido, assinatura: d.assinatura, nonce: nonce }; });
  }
  function enviarComProva(form, corpo, botao, rotulo) {
    botao.disabled = true; botao.textContent = 'Verificando que você é uma pessoa…'; aviso('');
    var espera = Math.max(0, 3000 - (Date.now() - inicio));
    return new Promise(function (ok) { setTimeout(ok, espera); })
      .then(function () { return chamar({ acao: 'desafio' }); })
      .then(function (d) { if (d.erro) throw d; return provar(d); })
      .then(function (prova) { corpo.prova = prova; corpo.ms = Date.now() - inicio; corpo.site = form.site.value; return chamar(corpo); })
      .then(function (r) { aviso(r.erro || r.mensagem, !!r.erro); return r; })
      .catch(function (e) { aviso((e && e.erro) || 'Algo falhou. Tente de novo.', true); })
      .then(function (r) { botao.disabled = false; botao.textContent = rotulo; return r; });
  }
  function abas(qual) {
    var cad = qual === 'cad';
    $('aba-cad').setAttribute('aria-selected', cad); $('aba-ent').setAttribute('aria-selected', !cad);
    $('form-cad').hidden = !cad; $('form-ent').hidden = cad; aviso('');
  }
  $('aba-cad').addEventListener('click', function () { abas('cad'); });
  $('aba-ent').addEventListener('click', function () { abas('ent'); });
  $('form-cad').addEventListener('submit', function (ev) {
    ev.preventDefault(); var f = ev.target;
    if (!f.aceite.checked) { aviso('É preciso aceitar os termos e a política de privacidade.', true); return; }
    enviarComProva(f, { acao: 'cadastrar', email: f.email.value, cpf: f.cpf.value, aceite: true }, f.querySelector('button'), 'Criar cadastro');
  });
  $('form-ent').addEventListener('submit', function (ev) {
    ev.preventDefault(); var f = ev.target;
    enviarComProva(f, { acao: 'entrar', email: f.email.value }, f.querySelector('button'), 'Receber link de entrada');
  });
  function preencher(sel, itens, vazio) {
    sel.innerHTML = vazio ? '<option value="">' + vazio + '</option>' : '';
    itens.forEach(function (i) { var o = document.createElement('option'); o.value = i[0]; o.textContent = i[1]; sel.appendChild(o); });
  }
  function atualizarListas() {
    var f = $('form-consulta'), t = f.tribunal.value, c = f.classe.value;
    var classes = opcoes.combinacoes.filter(function (x) { return x.tribunal === t; });
    if (!classes.some(function (x) { return x.classe === c; })) {
      preencher(f.classe, classes.map(function (x) { return [x.classe, x.classe + ' (' + x.n + ' julgados)']; }));
      c = f.classe.value;
    }
    preencher(f.orgao, opcoes.orgaos.filter(function (x) { return x.tribunal === t && x.classe === c; })
      .sort(function (a, b) { return b.n - a.n; }).map(function (x) { return [x.orgao, x.orgao + ' (' + x.n + ')']; }), 'Qualquer uma');
  }
  function mostrarConsulta(m) {
    $('painel-entrada').hidden = true; $('painel-consulta').hidden = false;
    $('quem').textContent = 'Conectado como ' + m.email + (m.membro_ativo ? ' · membro' : m.pode_consultar ? ' · 1 consulta grátis disponível' : ' · consulta grátis já usada');
    if (opcoes) return;
    chamar({ acao: 'opcoes' }).then(function (o) {
      opcoes = o; var f = $('form-consulta');
      var tribs = []; o.combinacoes.forEach(function (x) { if (tribs.indexOf(x.tribunal) < 0) tribs.push(x.tribunal); });
      preencher(f.tribunal, tribs.map(function (t) { return [t, t]; }));
      preencher(f.assunto, o.assuntos.map(function (a) { return [a.c, a.nome + ' (' + a.n + ')']; }), 'Qualquer um');
      atualizarListas();
      f.tribunal.addEventListener('change', atualizarListas); f.classe.addEventListener('change', atualizarListas);
    });
  }
  $('form-consulta').addEventListener('submit', function (ev) {
    ev.preventDefault(); var f = ev.target, b = f.querySelector('button');
    b.disabled = true; b.textContent = 'Calculando…'; aviso('');
    chamar({ acao: 'consultar', sessao: sessao(), tribunal: f.tribunal.value, classe: f.classe.value, orgao: f.orgao.value, assunto: f.assunto.value })
      .then(function (r) {
        b.disabled = false; b.textContent = 'Calcular a probabilidade';
        if (r._status === 401) { sessao(null); location.reload(); return; }
        if (r._status === 402) { aviso('Sua consulta gratuita já foi usada. Para continuar, conheça o plano de membro em Preços.', true); return; }
        if (r.erro) { aviso(r.erro, true); return; }
        var x = r.resultado;
        $('r-a').textContent = pct(x.convencional.p);
        $('r-a2').textContent = 'IC 95%: ' + pct(x.convencional.ic95[0]) + ' a ' + pct(x.convencional.ic95[1]) + ' · ' + x.convencional.n + ' julgados · confiança ' + x.confianca;
        $('r-b').textContent = pct(x.grafo.p);
        $('r-b2').textContent = x.grafo.n_orgao + ' julgados na vara · ' + x.grafo.n_assunto + ' no assunto';
        $('r-nota').textContent = 'Placar atual entre os métodos: ' + x.placar_atual + '. ' + x.aviso + ' Fonte: ' + x.fonte + '.';
        $('resultado').hidden = false;
        mostrarConsulta({ email: $('quem').textContent.replace('Conectado como ', '').split(' · ')[0], membro_ativo: false, pode_consultar: false });
      });
  });
  $('sair').addEventListener('click', function (ev) { ev.preventDefault(); sessao(null); location.hash = ''; location.reload(); });
  // Chegada pelo link do e-mail: #t=TOKEN
  var m = /#t=([0-9a-f]{64})/.exec(location.hash);
  if (m) {
    history.replaceState(null, '', location.pathname);
    aviso('Confirmando seu link…');
    chamar({ acao: 'confirmar', token: m[1] }).then(function (r) {
      if (r.erro) { aviso(r.erro, true); return; }
      sessao(r.sessao); aviso('E-mail confirmado. Faça sua consulta.'); mostrarConsulta(r);
    });
  } else if (sessao()) {
    chamar({ acao: 'estado', sessao: sessao() }).then(function (r) { if (r.erro) { sessao(null); return; } mostrarConsulta(r); });
  }
})();
