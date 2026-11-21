# THEYE Engenharia (fase E do plano mestre v4, prioridade 3)

A mesma plataforma do direito, falando engenharia. Estado em 12/11/2026:

| Passo | O que tem aqui | Estado |
|---|---|---|
| E1 | `catalogo-materias.json`: 340 matérias em 27 ramos (inclui o ramo do Instituto: IA, cibersegurança, nuvem, superinteligência), cada uma com ementa, normas, bibliografia e escolas com matéria equivalente | feito; conferência com a grade vigente de cada escola pendente (`conferido_na_grade_vigente: false`) |
| E3 | `consultores.json`: um consultor por matéria, com instrução própria (norma pelo número, conta à vista, aviso de ART) | instruções feitas; avaliação de 20 perguntas por ramo pendente |
| E4 | `src/lib/engenharia/calculo.ts`: combinação de ações, viga biapoiada, flexão simples e cortante (NBR 6118), memória de cálculo | primeira fatia; 20 casos conferidos à mão por outro caminho de cálculo; comparação com exemplos de livro-texto pendente |
| E2 / E7 | tela `/engenharia` (demonstração): cálculo, catálogo, equivalências direito → engenharia, 14 estudos para órgãos públicos | demonstração; separação por empresa depende do A28 |

Gerar de novo: `python3 engenharia/ferramentas/gerar_catalogo.py` (grava os JSON e imprime o sha256 de cada um).

Cálculo de engenharia é apoio: o engenheiro habilitado confere e assina com ART. Normas citadas pelo número, nunca copiadas.

## Volta internacional (20/11/2026)

Pedido de M: normas do mundo todo (obras em Angola, Namíbia, Egito, Europa, Dubai e Brasil) e 500 agentes que façam projeto detalhado, BIM, dimensionamento, quantitativos, CAPEX, otimização de obra e indicadores.

| O quê | Onde | Estado |
|---|---|---|
| Normas por país: 353 referências, 32 assuntos, 8 jurisdições | `ferramentas/dados_normas.py` → `src/lib/engenharia/normas-paises.json` | 88 referências marcadas "conferir" (edição em vigor, anexo nacional ou adoção oficial a confirmar) |
| 500 agentes de produção: 25 disciplinas × 20 trabalhos | `ferramentas/gerar_agentes_500.py` → `agentes-500/agentes-producao-500.json` | fichas e instruções completas; ainda não provados |
| Viga em três normas (NBR 6118, EN 1992-1-1, ACI 318-19), quantitativos e CAPEX com faixa AACE | `src/lib/engenharia/normasEstruturais.ts` | 10 casos conferidos por outro caminho de cálculo (μ/ξ no Eurocódigo, Rn/ρ no ACI), diferença < 1% |
| Aba "Mundo" em /engenharia | `src/components/engenharia/EngenhariaInternacional.tsx` | demonstração |
| PDF com os 500 agentes e a matriz | `ferramentas/gerar_pdf_500.py` (HTML → PDF por Playwright) | 505 páginas |

Base das disciplinas: `ferramentas/dados_disciplinas_v1.py`, cópia de `/mnt/project-files/engenharia/prompts/dados_engenharia.py` (biblioteca de prompts v1).
