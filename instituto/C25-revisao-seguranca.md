# C25 · Revisão de segurança do Instituto THEYE (02/11/2026)

Escopo: 7 Edge functions do Instituto (instituto-acesso, instituto-agentes, coletor-instituto, coletor-motor, previsao-locacao, alerta-teste-agentes, ancorar-hash), 15 RPCs públicas `instituto_*`, schema `instituto` (35 tabelas), cabeçalhos do site. Fontes: código no repositório, Supabase Security Advisor, testes em produção via pg_net.

Resultado: **0 achado alto ou crítico.** 2 médios e 1 baixo corrigidos no mesmo dia.

| # | Severidade | Achado | Correção | Conferência |
|---|---|---|---|---|
| 1 | Média | 7 funções `instituto.i11_*` executáveis por `anon` e com search_path mutável (Advisor 0011) | revoke de public/anon/authenticated; search_path fixo | `has_function_privilege('anon', …)` = false nas 7 |
| 2 | Média | Corrida na consulta grátis: dois pedidos simultâneos podiam usar duas consultas | índice único parcial `consultas_uma_gratis` + RPC `instituto_registrar_consulta_v2` que grava antes de responder (402 no 2º) | instituto-acesso v4; teste vitest novo; produção: desafio 200, sessão falsa 401, prova falsa 400 |
| 3 | Baixa | Assinatura do desafio anti-robô comparada com `===` (tempo variável) | função `iguais` em tempo constante | idem |
| 4 | Info | 14 RPCs SECURITY DEFINER abertas a `anon` (Advisor 0028/0029) | intencional: só agregados públicos; as que escrevem (`instituto_vitais`, `instituto_relatar_incidente`) têm teto diário | revisado item a item |
| 5 | Info | 34 tabelas com RLS e sem policy (Advisor 0008) | intencional: acesso só por RPC; `placar_protocolos` tem leitura pública por policy | — |
| 6 | Info | Proteção de senha vazada desligada (Auth) | é do login do escritório; ativação no painel do Supabase já pendente no thread principal | — |

Já cobertos antes: injeção de prompt (C26, 20/20), CSP/HSTS/X-Frame-Options no vercel.json, CORS por lista, segredos só no servidor, CPF e IP como HMAC, cotas e teto dos agentes.
