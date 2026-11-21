# Guiões do Atlas (corpus dos agentes de engenharia)

Estes ficheiros são as ferramentas que montam o Atlas. Ficam aqui no repositório
de propósito: já se perdeu trabalho por ficar só na pasta partilhada.

Ordem em que correm:

1. `colheita-v2.py` (fica na pasta do Atlas, com o estado da colheita) — recolhe
   metadados de repositórios abertos (Zenodo, arXiv, DSpace@MIT, OpenAlex).
2. `classificar-v2.py` — junta a colheita v1 e a v2 sem repetir item, arruma cada
   peça por especialidade, tipo, licença, região e agente, por regra escrita.
   A licença só conta como aberta se estiver na lista de licenças abertas; tudo
   o mais fica como "só-referência" (cita-se, não se guarda).
3. `patch_v2.py` — escreve os números medidos em `src/data/agentesEngenharia.ts`.
4. `biblioteca.py` — passa a porta de qualidade (o título tem de falar da própria
   especialidade) e escreve `public/atlas-biblioteca-v1.jsonl`, a biblioteca que
   se pesquisa na tela.

Provas dos agentes: `gabaritos*.py` escrevem as questões de cálculo fechado,
`corrigir.py` corrige as respostas e `duras.py` escreve as questões de várias
etapas da 2.ª volta. As respostas dos agentes ficam em `provas-cegas/`, onde cada
agente responde sem ver o gabarito.

Nada aqui corre na plataforma: é só para medir e gerar dados.
