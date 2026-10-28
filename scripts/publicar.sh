#!/usr/bin/env bash
# Publica a produção: build, branch gh-pages e index.html da Vercel gerado a partir do próprio build.
# Trava: só gera o index.html se TODOS os arquivos que ele cita existirem no commit publicado no gh-pages.
# Uso: VITE_SUPABASE_URL=... VITE_SUPABASE_ANON_KEY=... scripts/publicar.sh "mensagem"
# Saída: caminho do index.html pronto para enviar à Vercel (create_deployment), sem editar à mão.
set -euo pipefail
cd "$(dirname "$0")/.."
: "${VITE_SUPABASE_URL:?defina VITE_SUPABASE_URL}" "${VITE_SUPABASE_ANON_KEY:?defina VITE_SUPABASE_ANON_KEY}"
MSG="${1:-Deploy}"
SAIDA="${SAIDA:-/tmp/claude-0/index.html}"

rm -rf dist-prod
./node_modules/.bin/vite build --outDir dist-prod >/dev/null
grep -q hlraekzvgxdpiiigdxdo dist-prod/assets/*.js || { echo "ERRO: build sem a URL do Supabase"; exit 1; }

git fetch -q origin gh-pages
git show FETCH_HEAD:robots.txt > dist-prod/robots.txt
git show FETCH_HEAD:sitemap.xml > dist-prod/sitemap.xml
touch dist-prod/.nojekyll

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
sed "s#\./assets/#https://cdn.jsdelivr.net/gh/fafapiresmenezes/menezessardas@$COMMIT/assets/#g" dist-prod/index.html > "$SAIDA"
echo "gh-pages: $COMMIT"
echo "index.html pronto: $SAIDA (enviar este arquivo exatamente como está)"
