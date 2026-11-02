# Pré-registro I-12 · Modelo C2 (grafo com precedentes e órgão julgador)

Instituto THEYE · selado por OpenTimestamps antes de qualquer ajuste · 02/11/2026

## 1. Pergunta
O modelo C2 (variáveis de B + grafo de normas, teses e precedentes + histórico do órgão julgador por assunto) tem Brier menor que o modelo convencional B nas ações de locação decididas **depois** deste pré-registro?

## 2. Motivo
No I-11 o grafo (C) empatou com B no total (C−B = +0,0016, IC95 −0,0006 a +0,0038) e perdeu nas ações propostas pelo locatário (consignação, renovatória: 0,1902 contra 0,1857) e no TJRJ (0,1526 contra 0,1475) (C20, /modelo.html#subgrupos). C2 acrescenta o que faltava nesses grupos.

## 3. Dados
- Fonte: DataJud/CNJ, mesmas classes de locação e 6 tribunais (TJRJ, TJSP, TJMG, TJRS, TJPR, TJDFT), coleta diária já em curso.
- Desfecho: procedência total ou parcial = 1; improcedência = 0; sem mérito e acordo ficam fora (mesma regra do I-11).
- Treino: todos os casos com desfecho de mérito até 02/11/2026 (inclusive), os 4.901 da base I-11 e os que chegarem com data_desfecho ≤ 02/11/2026.
- Teste: casos com data_desfecho entre 03/11/2026 e 31/01/2027, coletados até 15/02/2027. Mínimo de 300 casos; se faltar, o teste é adiado em blocos de 30 dias até chegar a 300, sem olhar as métricas antes.

## 4. Modelos (fixados agora)
- A: taxa-base por tribunal e classe (suavização +1/+2).
- B: regressão logística L2 com tribunal, classe, ano de ajuizamento e assunto principal (idêntica ao I-11).
- C: B + normas, teses e precedente (idêntica ao I-11).
- **C2**: C + (a) taxa de procedência do órgão julgador no mesmo assunto, codificada fora da dobra e suavizada com m = 10 (como no I-11); (b) indicador de precedente vinculante aplicável (STJ Súmulas 214, 268, 335, 549; STF Temas 295 e 1127) **por polo**: se a tese favorece o locador ou o locatário; (c) interação classe × polo que propõe (locador: despejos; locatário: consignação e renovatória; qualquer: revisional).
- Regularização: λ escolhido por validação cruzada temporal em 5 blocos do treino, na grade {0,1; 0,3; 1; 3; 10}, igual para todos os modelos.
- Otimizador: o mesmo do I-11 (AdaGrad, 400 iterações, bias sem penalidade).

## 5. Métricas e regra de decisão
- Principal: diferença de Brier C2 − B no teste, com IC95 por bootstrap pareado (2.000 reamostragens, semente 0,12).
- Veredito: **C2 vence** se o IC95 inteiro ficar abaixo de zero **e** o ECE de C2 for ≤ 5%; **C2 perde** se o IC95 inteiro ficar acima de zero; senão **inconclusivo**. Publicado no placar em qualquer caso.
- Secundárias (não decidem): log-loss, AUC, ECE, Brier por tribunal e por polo (como em C20).

## 6. O que não pode mudar
Não se altera variável, λ, grade, período, desfecho ou regra depois deste selo. Correção de erro de código é registrada com data antes de rodar as métricas, como no I-11. Resultado negativo é publicado.

## 7. Privacidade
Só metadados públicos; número do processo em código irreversível; órgão julgador entra só como taxa agregada por assunto, nunca como perfil de juiz (Resolução CNJ 615/2025; usos indevidos do cartão do modelo).
