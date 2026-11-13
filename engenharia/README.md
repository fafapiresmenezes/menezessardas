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
