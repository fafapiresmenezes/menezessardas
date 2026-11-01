// Plano I-03, passo C12: orçamento de desempenho do site do Instituto THEYE.
// Roda o Lighthouse (celular) nas páginas principais e falha se qualquer categoria ficar abaixo de 95.
// A falha do GitHub Actions é o alerta: o GitHub avisa por e-mail o dono do repositório.
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, appendFileSync } from 'node:fs';
const BASE = process.env.SITE || 'https://instituto-theye.vercel.app';
const PAGINAS = ['/', '/laboratorio.html', '/agentes.html', '/placar.html', '/ontologia.html'];
const LIMITE = Number(process.env.LIMITE || 95);
const linhas = [], falhas = [];
for (const p of PAGINAS) {
  const saida = `lh${p.replace(/[^a-z]/g, '_') || '_'}.json`;
  execFileSync('npx', ['-y', 'lighthouse@12.6.1', BASE + p, '--quiet', '--output=json', `--output-path=${saida}`,
    '--only-categories=performance,accessibility,best-practices,seo', '--chrome-flags=--headless=new --no-sandbox'], { stdio: 'inherit' });
  const r = JSON.parse(readFileSync(saida, 'utf8'));
  const n = Object.fromEntries(Object.entries(r.categories).map(([k, v]) => [k, Math.round(v.score * 100)]));
  linhas.push({ pagina: p, ...n });
  for (const [k, v] of Object.entries(n)) if (v < LIMITE) falhas.push(`${p} ${k} = ${v}`);
}
writeFileSync('lighthouse-resumo.json', JSON.stringify({ quando: new Date().toISOString(), limite: LIMITE, linhas, falhas }, null, 1));
const tabela = ['| Página | Desempenho | Acessibilidade | Boas práticas | SEO |', '|---|---|---|---|---|',
  ...linhas.map(l => `| ${l.pagina} | ${l.performance} | ${l.accessibility} | ${l['best-practices']} | ${l.seo} |`)].join('\n');
if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, `## Lighthouse diário (limite ${LIMITE})\n\n${tabela}\n\n${falhas.length ? '**Alerta:** ' + falhas.join('; ') : 'Tudo acima do limite.'}\n`);
console.log(tabela);
if (falhas.length) { console.error('ALERTA abaixo de ' + LIMITE + ': ' + falhas.join('; ')); process.exit(1); }
