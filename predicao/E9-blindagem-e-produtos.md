# Blindagem do site e aba Produtos — 13/11/2026

Pedidos de M, em sequência:

- 21:35 — *"Já coloque, por favor, aí também espaço para doações... aquele cardápio que a gente fez...
  a gente bota uma aba, tipo, bem em cima da soluções de direito... produtos... usa aquele PDF lá
  que a gente fez ontem."*
- 21:38 — *"Proteja o site e todas as páginas e a plataforma com a maior segurança do mundo"*,
  *"blinde"*, *"impossibilite scrapping"*, *"Deixe completamente seguro"*.

## O achado que vale mais que o resto

O arquivo `deploy/vercel.json`, com Content-Security-Policy, HSTS e anti-moldura, existia no
repositório **e nunca era enviado para a Vercel**. A implantação em produção
`dpl_HUsuJzedrSx3TMNgHarkfVu4Tz6X` tinha cinco arquivos: `index.html`, `manifest.webmanifest`,
`robots.txt`, `sitemap.xml`, `sw.js`. Nenhum cabeçalho de segurança chegava ao navegador de ninguém.

Arquivo de configuração que não é enviado é decoração. Agora o `scripts/publicar.sh` copia o
`vercel.json` para a pasta do envio, e `src/lib/cabecalhosDeSeguranca.test.ts` prende as **duas**
pontas: o conteúdo dos cabeçalhos e o fato de ele ser copiado. Onze testes.

Cabeçalhos que passam a valer em **todas** as páginas: CSP sem `unsafe-inline` e sem `unsafe-eval`
no `script-src` (só o próprio domínio e o CDN que serve o build), `frame-ancestors 'none'` mais
`X-Frame-Options: DENY`, HSTS de dois anos com subdomínios e `preload`, `nosniff`,
`Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy` desligando câmera,
microfone, pagamento, USB, bluetooth e mais seis, deixando geolocalização só para o próprio
domínio, `Cross-Origin-Opener-Policy: same-origin`, `Cross-Origin-Resource-Policy: same-site`,
`X-Permitted-Cross-Domain-Policies: none`. `index.html` nunca fica em cache.

## O que a varredura do banco achou

Varredura do próprio Supabase em 21:42, não de memória:

| Achado | Quanto | Estado |
| --- | --- | --- |
| Funções `SECURITY DEFINER` em `public` chamáveis **sem login** | 110 | migração 135, escrita e **não aplicada** |
| Funções chamáveis por qualquer pessoa logada | 137 | **não mexido** — quem vê o quê entre logados é decisão de M |
| Funções sem `search_path` fixo | 9 | migração 135 |
| Esquema de backup `copia_antes_limpeza_20261111` alcançável pela API | 1 esquema, 8 tabelas | migração 135 |
| Proteção contra senha vazada (HaveIBeenPwned) desligada | — | **só M pode ligar**, no painel do Supabase |
| Tabelas com RLS ligado e nenhuma política | 65 | sem risco: RLS ligado sem política **nega** tudo |

Uma função `SECURITY DEFINER` roda com os poderes de quem a criou, e por isso **passa por cima de
toda política de tabela**. Entre as 110 estavam `dados_pix`, `definir_pix`, `painel_escritorios`,
`pedidos_entrada_pendentes`, `gerar_faturas_escritorios`, `definir_papel`,
`kyc_pendentes_reconsulta` e as trinta e tantas `instituto_*` com número de dentro da casa.

A migração 135 fecha todas, menos as **15** que precisam responder sem login, e diz por quê cada
uma: as `portal_*` (o cliente abre `/portal/<token>` por um link, sem conta), `convite_parceiro`
(`/convite/<token>`) e `marca_por_dominio` (a tela de entrada mostra a marca do escritório pelo
domínio, antes do login). Também fecha função de gatilho para todos os papéis da API, e muda o
privilégio padrão do esquema: **função nova não nasce mais aberta**. Sem isso, a próxima função
criada repõe o furo.

A lição que a migração 129 deixou e que a 135 usa: `revoke execute ... from anon` **não tem
efeito**. A permissão não vem de concessão a `anon`, vem da concessão automática a `PUBLIC` que o
Postgres faz em toda função nova. O que funciona é `revoke ... from PUBLIC` e depois `grant` para
quem precisa.

**Por que não apliquei.** Mexe em permissão de banco vivo enquanto a Dra. Fátima está testando a
plataforma jurídica, que M mandou congelar. Se eu errar uma função da tela de entrada, ela não
entra. Espera o toque de M no cartão.

Conferido de verdade, com `set role anon` e sem nenhum login: as **tabelas** já estão fechadas —
`contratos`, `documentos`, `tarefas`, `usuarios_perfis`, `intimacoes`, `alertas`, `fornecedores`,
`lancamentos_horas`, `monitoramentos` e `trilha_auditoria` responderam "permissão negada". Sobram
duas leituras abertas de propósito: `centros_custo_nicho` (4 linhas, todas em zero) e
`instituto.placar_protocolos` (4 linhas). A primeira é o que a migração 128, também escrita e não
aplicada, fecha.

## Sobre "impossibilitar raspagem"

Não dá para impossibilitar, e dizer que dá seria mentira: o que a tela mostra, alguém copia. O que
dá é tornar caro e inútil.

1. **Nada sensível antes da senha.** É por isso que a vitrine de produtos da porta não traz preço
   nenhum: preço vive em `/caderno-de-produtos`, depois do login. Teste prende isso.
2. **A chave do site é pública por desenho.** Está dentro do JavaScript de qualquer visitante. Logo,
   tudo o que `anon` alcança é público de fato — e a migração 135 é o que encolhe esse alcance.
3. **`robots.txt`** fecha tudo menos a porta e nomeia 24 raspadores que se identificam, inclusive os
   de IA. É pedido, não tranca; está escrito no próprio arquivo que é pedido.
4. **Limite de chamadas por minuto** e desafio a robô ficam no painel da Vercel (Firewall), e mudam o
   que todo visitante vê, inclusive a Dra. Fátima testando agora. Espera o sim de M.

## A aba Produtos

Os 21 produtos e os 11 eixos saíram do próprio PDF comercial de 12/11/2026
(`cardapio-produtos-direito-v2.pdf`, 31 páginas), extraídos para
`/mnt/project-files/instituto/cardapio-produtos.json` e dali para `src/data/produtos.ts`. Nada foi
inventado: título, para quem, o que é, entregas, chancela sugerida, preço médio e prazo vêm do
caderno.

`src/components/Produtos.tsx` entra **acima** do quadro das vertentes, na tela de boas-vindas e na
tela de entrada, nas quatro línguas (29 chaves novas por idioma; o teste compara o chinês com o
português e falha se forem iguais). `src/components/Doacoes.tsx` entra depois, com as três formas de
apoio — e **sem meio de pagamento**: a conta do Instituto ainda está sendo aberta, e o teste proíbe
chave PIX, cartão, IBAN ou número de conta na tela. Inventar destino de doação é erro que não se
desfaz.

`/caderno-de-produtos` é a tela de dentro, com preço médio, prazo, entregas e chancela, filtrada por
eixo.
