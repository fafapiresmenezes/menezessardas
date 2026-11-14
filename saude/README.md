# THEYE Saúde (fase S, prioridade depois da engenharia)

A mesma plataforma, falando saúde. Estado em 13/11/2026:

| Passo | O que tem aqui | Estado |
|---|---|---|
| S1 | `catalogo-saude.json`: as 55 especialidades da Resolução CFM 2.472/2026, 328 módulos de residência, 24 matérias da graduação (DCN 2014), as 100 primeiras do QS Medicine 2025 e 50 escolas médicas brasileiras de referência | feito; escolas brasileiras sem ordem de ranking e a conferir (RUF, Enade) |
| S2 | acervo: 91 estudos clássicos conhecidos pelo nome, 30 programas de doutorado para buscar teses, busca PubMed pronta por especialidade para completar 500 | parcial: DOI não conferido, nota CAPES a conferir na Sucupira, 0 teses catalogadas (o container não alcança PubMed, OpenAlex nem CAPES) |
| S3 | `consultores-saude.json`: 427 consultores com prompt pronto (55 chefes de especialidade, 328 de módulo, 24 professores da graduação, 20 analistas de dados e mercado) | prompts feitos; avaliação de 20 perguntas por especialidade, revisada por médico, pendente |
| S4 | `corrente-prompts.jsonl`: corrente SHA-256 com um elo por prompt, gênese no trilho do plano mestre v4 (elo A28) | feito; conferida no navegador na tela `/saude` |
| S5 | tela `/saude` (demonstração) | feito; ligar ao assistente depende de publicar a função do servidor, como na engenharia |

Gerar de novo: `python3 saude/ferramentas/gerar_saude.py`. Regra da corrente: `hash = sha256(anterior + json.dumps({n, id, sha256_instrucao, anterior}, ensure_ascii=False, sort_keys=True))`.

Nada aqui é conduta clínica: os consultores são apoio ao médico e ao gestor de saúde.
