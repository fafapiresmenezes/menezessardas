// Teste no navegador contra a produção, com login real (EMAIL e SENHA no ambiente). Roda fora do sandbox do Claude, que não alcança o site.
import { chromium } from 'playwright'
const BASE = 'https://menezes-sardas-contratos.vercel.app/'
const ROTAS = ['inicio','dashboard','projetos','intimacoes','imoveis','imoveis/novo','contrato/novo','agenda','alertas','relatorios','indicadores','fornecedores','assistente','previsoes','instituto','legislacao','fontes','trilha','equipe','settings']
const res = []
const b = await chromium.launch()
for (const [nome, vw] of [['desktop',{width:1366,height:800}],['celular',{width:390,height:844}]]) {
  const ctx = await b.newContext({ viewport: vw })
  const p = await ctx.newPage()
  let erros = []
  p.on('pageerror', e => erros.push('JS: ' + e.message))
  p.on('console', m => { if (m.type()==='error') erros.push('console: ' + m.text().slice(0,200)) })
  p.on('response', r => { if (r.status() >= 400 && !r.url().includes('favicon')) erros.push(`HTTP ${r.status()} ${r.url().slice(0,140)}`) })
  await p.goto(BASE, { waitUntil: 'networkidle' })
  const css = await p.evaluate(() => getComputedStyle(document.body).fontFamily)
  await p.fill('input[type=email]', process.env.EMAIL); await p.fill('input[type=password]', process.env.SENHA)
  await p.click('button[type=submit]'); await p.waitForTimeout(4000)
  // login abre a tela de entrada; o tour de boas-vindas aparece no primeiro painel
  await p.goto(BASE + '#/dashboard', { waitUntil: 'networkidle' }); await p.waitForTimeout(1500)
  res.push({ vista: nome, rota: 'login', url: p.url(), fonte: css, erros }); erros = []
  // fecha boas-vindas se aparecer
  for (const t of ['Pular','Fechar','Agora não']) { const x = p.getByRole('button',{name:t}); if (await x.count()) await x.first().click().catch(()=>{}) }
  for (const r of ROTAS) {
    erros = []
    await p.goto(BASE + '#/' + r, { waitUntil: 'networkidle' }).catch(e => erros.push('nav '+e.message))
    await p.waitForTimeout(2500)
    const info = await p.evaluate(() => ({ h: document.querySelector('h1,h2')?.textContent?.trim().slice(0,60), txt: document.body.innerText.length, larg: document.documentElement.scrollWidth, carregando: /Carregando/.test(document.body.innerText), erroTela: (document.body.innerText.match(/(Não foi possível[^\n]{0,80}|Erro[^\n]{0,80}|undefined|NaN)/) || [null])[0] }))
    res.push({ vista: nome, rota: r, ...info, overflow: info.larg > vw.width + 2, erros: [...erros] })
  }
  await ctx.close()
}
await b.close()
console.log(JSON.stringify(res))
