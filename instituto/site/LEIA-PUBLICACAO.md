# Como o site do Instituto é publicado (desde 01/11/2026, passo C12)

O projeto Vercel `instituto-theye` recebe só o `vercel.json`. Cada página, script, estilo e fonte é servida
por reescrita para `raw.githubusercontent.com/.../<commit fixo>/instituto/site/...`, com Content-Type,
CSP e cache definidos no `vercel.json`. Para publicar uma mudança:
1. commit e push no `main`;
2. trocar o commit fixo no `vercel.json` (todas as linhas `destination`) e publicar só esse arquivo;
3. conferir o md5 de produção (pg_net) contra o arquivo local e o Content-Type `text/css` do base.css.
Arquivos estáticos enviados no deploy teriam prioridade sobre as reescritas, por isso o deploy leva só o vercel.json.
