# menezessardas
Repositório do escitório

## Publicação

- **Demo** (dados fictícios, sem banco): build com `npm run build` (sai em `dist/`), publicada como página no claude.ai.
- **Produção** (Supabase real): build com as variáveis `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` para `dist-prod/` (pasta fora do git). O conteúdo de `dist-prod/` vai para o branch `gh-pages`, que o GitHub Pages serve em https://fafapiresmenezes.github.io/menezessardas/ (endereço reserva). O endereço principal, https://menezes-sardas-contratos.vercel.app/, é um `index.html` na Vercel que carrega os mesmos arquivos do branch `gh-pages` via CDN (jsDelivr), fixados no commit.
- Para publicar uma versão nova de produção: rebuildar `dist-prod/`, gravar um novo commit no `gh-pages`, e republicar o `index.html` da Vercel apontando para o novo commit.
- A chave anon do Supabase é pública por desenho (vai a todo navegador); a proteção dos dados é feita por RLS no banco. Ela não entra no `main`.
