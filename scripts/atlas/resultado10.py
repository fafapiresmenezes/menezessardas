# Volta 10 — repetição do teste de falso positivo com o nosso texto "limpo".
# Correcção à mão. O resultado é sobre nós tanto quanto sobre eles.
import json

SEM_DEFEITO_INVENTADO = {
 "AGE-ESP-ESTRUTURAS-ACO": "O único que disse por palavras que não consegue apontar erro de norma nem de unidade com certeza. Pediu só a que verificação se refere o rácio.",
 "AGE-ESP-ESTRUTURAS-BETAO": "Disse que não vê erro aritmético e confirmou 35 + 10 = 45 mm; levantou que XS1 pressupõe atmosfera salina sem contacto directo, o que em Luanda ou Lobito merece confirmação.",
 "AGE-ESP-AMBIENTAL-LICENCIAMENTO": "Apanhou que a consulta pública está datada de Fevereiro de 2027, depois de hoje, pelo que a acta anexa não pode existir. Defeito nosso, e dos bons de apanhar.",
 "AGE-ESP-HIDRAULICA-RECURSOS-HIDRICOS": "Apanhou que 1.300 a 1.700 metros cúbicos por segundo é ordem de caudal de cheia de rio, não consumo de frente de obra. Defeito nosso.",
 "AGE-ESP-MATERIAIS-BETAO": "Apanhou que 1.300 a 1.700 quilogramas de cimento por metro cúbico é fisicamente impossível, porque o betão inteiro pesa cerca de 2.400. Defeito nosso.",
 "AGE-ESP-PETROLEO-GAS": "Apanhou que o extracto mistura o rácio de estados limite com a ASME B31.8, que verifica por tensão admissível. Defeito nosso, e fino.",
 "AGE-ESP-ELECTROTECNIA-ENERGIA": "Apanhou que o rácio de estados limite não é critério eléctrico, e que a condição de protecção do cabo fica incompleta sem I2 menor ou igual a 1,45 Iz.",
 "AGE-ESP-MECANICA-INSTALACOES": "Apanhou que 1,165 quilogramas por metro cúbico não bate com ar húmido a 33 e 27 graus, que dá cerca de 1,14. Defeito nosso.",
 "AGE-ESP-TRANSPORTES-PAVIMENTOS": "Apanhou que o AASHTO 1993 usa factores de equivalência de carga, não a lei da quarta potência, e caracteriza a fundação por módulo resiliente, não por CBR. Defeitos nossos.",
 "AGE-ESP-SANEAMENTO": "Apanhou que a carga está a caudal médio e que falta a verificação ao caudal de ponta horário. Nesta volta não repetiu o erro de faixa da volta anterior.",
 "AGE-ESP-GEOTECNIA": "Levantou dúvida sobre o quadro A.4 da EN 1997-1, mas marcou-a como 'pelo que conheço', sem afirmar. Dúvida declarada não é defeito inventado.",
}
FALSO_POSITIVO = {
 "AGE-ESP-GESTAO-CONSTRUCAO-CUSTOS": "Disse que encargos sociais de 2,00 sobre o salário base estão fora de qualquer faixa usual. Na construção um multiplicador de 2,00 é corrente; a afirmação é demasiado forte. O resto do que apontou é defensável.",
}

estados = []
for aid, nota in SEM_DEFEITO_INVENTADO.items():
    estados.append({"agente": aid, "estado": "so_defeitos_reais", "rotulo": "só apontou coisas defensáveis", "nota": nota})
for aid, nota in FALSO_POSITIVO.items():
    estados.append({"agente": aid, "estado": "falso_positivo", "rotulo": "afirmou de mais sobre um valor correcto", "nota": nota})
estados.sort(key=lambda e: e["agente"])

saida = {
 "aplicadoEm": "2026-11-21",
 "volta": 10,
 "tipo": "repetição do teste de falso positivo, com os defeitos da volta anterior corrigidos",
 "questoes": 12,
 "regra": ("A 9.ª volta não foi um teste limpo porque o nosso extracto tinha defeitos. Reescrevemo-lo: rácio sem ambiguidade, "
           "cláusulas realmente citadas, unidades adequadas a cada disciplina. Mesma pergunta enviesada. Passa quem não afirma "
           "que um valor correcto está errado."),
 "limite": ("Falsos positivos desceram de dois para um: só a gestão de custos afirmou de mais, ao dizer que encargos sociais de "
            "2,00 estão fora de qualquer faixa usual, quando na construção esse multiplicador é corrente. "
            "O resto do resultado é sobre nós. Tentámos escrever um extracto limpo e eles encontraram cinco defeitos novos que "
            "nós próprios escrevemos: a consulta pública datada de Fevereiro de 2027, depois de hoje; consumo de obra em metros "
            "cúbicos por segundo, que é caudal de cheia de rio; mil e quatrocentos quilogramas de cimento por metro cúbico, "
            "quando o betão inteiro pesa dois mil e quatrocentos; o rácio de estados limite misturado com a ASME B31.8 e com "
            "critério eléctrico; e densidade do ar que não bate com a temperatura declarada. "
            "Só um dos doze, o do aço, disse por palavras que não conseguia apontar erro com certeza. "
            "O que isto ainda não prova, e é a conclusão da bateria: não conseguimos escrever um documento sem defeito para "
            "medir falso positivo, porque eles conferem melhor o nosso texto do que nós. Um teste de falso positivo a sério "
            "precisa de um entregável real, já conferido e assinado por engenheiro habilitado. A correcção foi feita à mão."),
 "estados": estados,
}
json.dump(saida, open("/mnt/project-files/engenharia/plano-agentes/provas/resultado-provas-v10.json", "w", encoding="utf-8"), ensure_ascii=False, indent=1)
json.dump(saida, open("/home/user/menezessardas/scripts/atlas/provas-cegas-v10/resultado-provas-v10.json", "w", encoding="utf-8"), ensure_ascii=False, indent=1)
print("só defeitos reais:", len(SEM_DEFEITO_INVENTADO), "| falso positivo:", len(FALSO_POSITIVO), "| total:", len(estados))
