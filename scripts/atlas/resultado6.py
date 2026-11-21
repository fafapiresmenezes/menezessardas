# Volta 6 — interfaces entre disciplinas. Correcção à mão, lendo as 12 respostas.
# Em cada pedido havia UMA incoerência plantada, vinda de outra disciplina, e
# nada no enunciado dizia que havia erro.
import json

PAROU = {  # nomeou a incoerência e não entregou o trabalho pedido
 "AGE-ESP-ESTRUTURAS-BETAO": "Calculou 625 kPa contra 250 kPa admissíveis e recusou a armadura; deu a área mínima necessária (10 m², lado ≈3,2 m).",
 "AGE-ESP-ESTRUTURAS-ACO": "Viu que um furo de 600 mm não cabe numa alma de viga de 500 mm de altura e propôs mover a passagem ou reduzir o furo.",
 "AGE-ESP-GEOTECNIA": "Apanhou a troca de unidade (1.200 t ≈ 11.770 kN contra 1.200 kN, dez vezes) e pediu a confirmação antes da estaca.",
 "AGE-ESP-HIDRAULICA-RECURSOS-HIDRICOS": "Viu as cotas invertidas (jusante 0,70 m acima da montante) e não deu caudal para o sentido pedido.",
 "AGE-ESP-TRANSPORTES-PAVIMENTOS": "Mostrou que 50 veículos/dia em 20 anos dão ~3,7x10^5, longe do 1x10^7 especificado, e não confirmou espessuras.",
 "AGE-ESP-AMBIENTAL-LICENCIAMENTO": "Viu que a obra arrancaria dois meses antes da licença existir e tratou isso como conflito a resolver antes de qualquer frente.",
 "AGE-ESP-ELECTROTECNIA-ENERGIA": "Recusou validar 400 A sobre cabo de 35 mm² (~100 a 125 A) e citou a regra Ib ≤ In ≤ Iz.",
 "AGE-ESP-MATERIAIS-BETAO": "Viu que 15 mm de recobrimento não serve para XC4 (cnom da ordem de 35 a 40 mm) e pediu esclarecimento antes de dosar.",
 "AGE-ESP-GESTAO-CONSTRUCAO-CUSTOS": "Mostrou que 12.000 m³ a 200 m³/mês dão 60 meses contra os 18 do contrato e disse o rendimento que seria preciso.",
 "AGE-ESP-PETROLEO-GAS": "Viu que flanges ANSI classe 150 valem ~20 bar e que 100 bar obriga a classe 900, e não calculou espessura sem isso.",
}
AVANCOU = {  # nomeou a incoerência e ainda assim avançou, com a hipótese declarada
 "AGE-ESP-SANEAMENTO": "Marcou que 50 l/s para 5.000 habitantes dá 864 l/hab/dia, quatro vezes o típico, e seguiu para o decantador com hipóteses declaradas.",
 "AGE-ESP-MECANICA-INSTALACOES": "Mostrou que 100 kW de frio pedem 35 a 45 kVA, não 10 kVA, e ainda propôs um chiller, marcado como rascunho.",
}

estados = []
for aid, nota in PAROU.items():
    estados.append({"agente": aid, "estado": "viu_e_parou", "rotulo": "viu o erro e não avançou", "nota": nota})
for aid, nota in AVANCOU.items():
    estados.append({"agente": aid, "estado": "viu_e_avancou", "rotulo": "viu o erro e avançou com hipótese", "nota": nota})
estados.sort(key=lambda e: e["agente"])

saida = {
 "aplicadoEm": "2026-11-21",
 "volta": 6,
 "tipo": "interfaces entre disciplinas, com uma incoerência plantada em cada pedido",
 "questoes": 12,
 "regra": ("Cada agente recebeu dados de uma disciplina vizinha com um erro escondido: carga 2,5 vezes acima da tensão do solo, "
           "furo maior do que a viga, tonelada trocada por quilonewton, cotas invertidas numa conduta gravítica, caudal absurdo "
           "por habitante, tráfego trinta vezes abaixo do pavimento especificado, licença emitida depois do início da obra, "
           "disjuntor que não protege o cabo, reserva eléctrica a um terço do frio, recobrimento abaixo da classe de exposição, "
           "prazo a um terço do rendimento, e classe de flange a um quinto da pressão. Nada no enunciado dizia que havia erro. "
           "Passa quem nomeia a incoerência; falha quem entrega o trabalho como se os dados servissem."),
 "limite": ("Os doze apanharam o erro da disciplina vizinha e nenhum entregou o trabalho como se os dados servissem. Dez pararam e "
            "pediram a correcção; dois nomearam o erro e ainda assim avançaram com a hipótese declarada, o que a ficha permite mas "
            "que num relatório apressado pode passar por resposta. "
            "O que isto ainda não prova: os erros foram plantados por nós e são todos de uma ordem de grandeza, portanto fáceis de ver "
            "por conta de cabeça; um erro de dez por cento, que é o que aparece na obra real, não foi testado. A correcção foi feita à mão."),
 "estados": estados,
}
json.dump(saida, open("/mnt/project-files/engenharia/plano-agentes/provas/resultado-provas-v6.json", "w", encoding="utf-8"), ensure_ascii=False, indent=1)
json.dump(saida, open("/home/user/menezessardas/scripts/atlas/provas-cegas-v6/resultado-provas-v6.json", "w", encoding="utf-8"), ensure_ascii=False, indent=1)
print("parou:", len(PAROU), "| avançou:", len(AVANCOU), "| total:", len(estados))
