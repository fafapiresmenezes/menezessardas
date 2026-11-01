(async () => {
  const $ = (id) => document.getElementById(id)
  const el = (t, txt, attrs = {}) => { const e = document.createElement(t); if (txt != null) e.textContent = txt; Object.entries(attrs).forEach(([k, v]) => e.setAttribute(k, v)); return e }
  const link = (id) => el('a', id, { href: '/o/' + encodeURIComponent(id) })
  const r = await fetch('/o.json').then((x) => x.json()).catch(() => null)
  const corpo = $('corpo')
  if (!r) { corpo.append(el('p', 'Não foi possível carregar os termos agora.')); return }
  const id = decodeURIComponent(location.pathname.replace(/^\/o\/?/, '').replace(/\.html$/, ''))
  const n = id && r.nos[id]
  if (!n) {
    if (id) corpo.append(el('p', 'Termo não encontrado: ' + id))
    const b = el('input', null, { class: 'busca', type: 'search', placeholder: 'Filtrar termos', 'aria-label': 'Filtrar termos' })
    const l = el('div', null, { class: 'lista' })
    const desenhar = () => { l.replaceChildren(...Object.entries(r.nos).filter(([k, v]) => (k + ' ' + v.rotulo).toLowerCase().includes(b.value.toLowerCase())).map(([k, v]) => { const a = link(k); a.textContent = v.rotulo + ' (' + k + ')'; return a })) }
    b.addEventListener('input', desenhar); desenhar()
    corpo.append(el('p', Object.keys(r.nos).length + ' termos com endereço permanente.'), b, l); return
  }
  document.title = n.rotulo + ' · Instituto THEYE'
  $('tipo').textContent = n.tipo; $('titulo').textContent = n.rotulo; $('uri').textContent = r.base + id
  const dl = el('dl')
  const linha = (k, v) => { dl.append(el('dt', k)); const d = el('dd'); if (v instanceof Node) d.append(v); else d.textContent = v; dl.append(d) }
  if (n.descricao) linha('Descrição', n.descricao)
  if (n.comentario) linha('Nota', n.comentario)
  if (n.codigo) linha('Código TPU-CNJ', n.codigo)
  if (n.urn) linha('URN LexML', n.urn)
  if (n.fonte) { const a = /^https?:/.test(n.fonte) ? el('a', n.fonte, { href: n.fonte, rel: 'noopener', target: '_blank' }) : n.fonte; linha('Fonte', a) }
  for (const [k, rot] of [['dominio', 'Domínio'], ['alcance', 'Alcance'], ['subclasse_de', 'Subclasse de']]) if (n[k]) linha(rot, r.nos[n[k]] ? link(n[k]) : n[k])
  const lista = (arr, inv) => { const d = el('div'); arr.forEach(([p, o]) => { const s = el('div'); s.append(el('span', inv ? '← ' : '→ '), link(p), el('span', ' '), r.nos[o] ? link(o) : el('span', o)); d.append(s) }); return d }
  if (n.ligacoes) linha('Ligações', lista(n.ligacoes))
  if (n.citado_por) linha('Citado por', lista(n.citado_por, true))
  corpo.append(dl)
})()
