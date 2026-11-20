#!/usr/bin/env bash
# Publica a produção À MÃO (reserva): build com TODOS os arquivos no próprio site, empurrado ao ramo gh-pages.
# Desde 20/11/2026 nada sai do jsDelivr nem do GitHub Pages: o index.html cita ./assets/ e a Vercel
# serve tudo (pedido de M: ninguém copia nada). O caminho normal é o workflow "Publicar a plataforma",
# que publica sozinho a cada merge no main quando o VERCEL_TOKEN está cadastrado.
# Este script só serve enquanto o repositório for público: a Vercel busca o ramo gh-pages pelo GitHub.
# Uso: VITE_SUPABASE_URL=... VITE_SUPABASE_ANON_KEY=... scripts/publicar.sh "mensagem"
# Depois: mcp__Vercel__create_deployment com gitSource {type: github, org: fafapiresmenezes,
#   repo: menezessardas, ref: gh-pages}, project theye-club, target production.
set -euo pipefail
cd "$(dirname "$0")/.."
: "${VITE_SUPABASE_URL:?defina VITE_SUPABASE_URL}" "${VITE_SUPABASE_ANON_KEY:?defina VITE_SUPABASE_ANON_KEY}"
MSG="${1:-Deploy}"
SAIDA="${SAIDA:-/tmp/claude-0/index.html}"

# A tela /lastro confere a corrente do trilho, e o arquivo em public/ e' uma COPIA: sem este passo
# ele envelhece a cada volta e a tela mostra uma corrente mais curta do que a de verdade. A fonte
# viva fica na pasta do projeto, que existe so' na maquina do agente: quando ela nao estiver ai,
# segue com a copia que ja esta no repositorio, em vez de falhar a publicacao.
CORRENTE=/mnt/project-files/predicao/trilho-v4-andamento.jsonl
if [ -r "$CORRENTE" ]; then cp "$CORRENTE" public/trilho-v4.jsonl; echo "corrente do trilho atualizada: $(wc -l < public/trilho-v4.jsonl) elos"; fi

rm -rf dist-prod
./node_modules/.bin/vite build --outDir dist-prod >/dev/null
node scripts/carimbar-sw.js dist-prod
grep -q hlraekzvgxdpiiigdxdo dist-prod/assets/*.js || { echo "ERRO: build sem a URL do Supabase"; exit 1; }

git fetch -q origin gh-pages
# robots.txt e sitemap.xml saem de public/, como todo o resto. Antes eram copiados de volta do
# gh-pages a cada publicação, o que congelava os dois arquivos na versão de outubro de 2026: eles
# ainda anunciavam o domínio antigo, e qualquer correção feita no repositório nunca chegava ao ar.
touch dist-prod/.nojekyll
# Os cabeçalhos de segurança (CSP, HSTS, anti-moldura, noai) vão DENTRO do pacote: a Vercel lê o
# vercel.json da raiz do que publica. Sem ele o site sai sem nenhuma dessas proteções.
cp deploy/vercel.json dist-prod/vercel.json

INDICE=$(mktemp -u)
GIT_INDEX_FILE=$INDICE git --work-tree=dist-prod add -A
ARVORE=$(GIT_INDEX_FILE=$INDICE git write-tree)
rm -f "$INDICE"
COMMIT=$(git commit-tree "$ARVORE" -p FETCH_HEAD -m "$MSG")

# Trava: cada arquivo citado no index.html precisa existir no commit.
for arq in $(grep -oE '\./assets/[^"]+' dist-prod/index.html | sed 's#^\./##'); do
  git cat-file -e "$COMMIT:$arq" 2>/dev/null || { echo "ERRO: $arq citado no index.html não está no commit"; exit 1; }
done
grep -q '\.css' dist-prod/index.html || { echo "ERRO: index.html sem CSS"; exit 1; }

git push -q origin "$COMMIT:refs/heads/gh-pages"
echo "gh-pages: $COMMIT"
echo "Agora publicar na Vercel pelo ramo gh-pages (gitSource), alvo production, e conferir como visitante."
