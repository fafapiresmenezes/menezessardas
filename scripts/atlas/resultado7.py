# Volta 7 — erro de cerca de dez por cento num dado de entrada, aritmética certa.
# Correcção à mão. Esta volta foi a primeira a separar os agentes, e também a
# primeira em que duas das nossas perguntas estavam defeituosas: fica escrito.
import json

APANHOU = {
 "AGE-ESP-ESTRUTURAS-BETAO": "Viu que gama_c = 1,4 é da NBR, não da EN 1992-1-1 (1,5), e deu a faixa 1.800 a 1.930 kN conforme a norma do contrato.",
 "AGE-ESP-ESTRUTURAS-ACO": "Viu que gama_M0 = 1,10 não é o valor recomendado da EN 1993-1-1 (1,00) e juntou o efeito da espessura em fy.",
 "AGE-ESP-TRANSPORTES-PAVIMENTOS": "Viu que o expoente usual é 4 e não 3,5, e deu a faixa 2,18 a 2,44.",
 "AGE-ESP-MECANICA-INSTALACOES": "Viu que 1,29 kg/m³ é ar a 0 °C e que em Luanda ronda 1,165, baixando a potência para cerca de 35 kW.",
 "AGE-ESP-MATERIAIS-BETAO": "Calculou a/c = 0,551 contra 0,50 especificado e deu as duas saídas: baixar a água ou subir o cimento para 370 kg/m³.",
 "AGE-ESP-GESTAO-CONSTRUCAO-CUSTOS": "Viu os encargos a 1,80 contra 2,00 da proposta e quantificou o desvio em cerca de 133 mil USD.",
 "AGE-ESP-PETROLEO-GAS": "Viu que F = 0,80 é da classe 1 divisão 2 e que na divisão 1 é 0,72, e pediu a divisão antes de validar a espessura.",
}
OUTRO_CAMINHO = {
 "AGE-ESP-GEOTECNIA": "Não apontou o factor 2,5 em si: recusou o método do factor global e exigiu a verificação por coeficientes parciais da EN 1997-1. É uma objecção mais funda do que a que estava plantada.",
}
SEM_NOMEAR = {
 "AGE-ESP-SANEAMENTO": "Recusou fechar, mas marcou a carga de 1,4 m³/m²/h apenas como 'não confirmada'; não disse que está acima da faixa usual de 1,0 a 1,2.",
 "AGE-ESP-AMBIENTAL-LICENCIAMENTO": "Recusou fechar e explicou a fórmula de correcção, mas não disse que a referência de instalações de combustão é 6% de O2 e não 11%.",
 "AGE-ESP-ELECTROTECNIA-ENERGIA": "Recusou fechar porque os 2,1% não reproduzem com os dados dados — e aí apanhou um lapso nosso — mas não apontou a resistividade de 0,0160 como o dado errado.",
}
PERGUNTA_DEFEITUOSA = {
 "AGE-ESP-HIDRAULICA-RECURSOS-HIDRICOS": "A resposta está certa e a pergunta estava mal feita: n = 0,011 é defensável para betão novo (a faixa real é 0,011 a 0,013), por isso não havia erro a apanhar. O agente ainda viu que o caudal de 0,42 não sai de n = 0,011 e deu a faixa 0,39 a 0,46 m³/s. O defeito é nosso.",
}

estados = []
for d, estado, rot in ((APANHOU, "nomeou_o_erro", "nomeou o dado errado"),
                       (OUTRO_CAMINHO, "objeccao_mais_funda", "recusou por objecção mais funda"),
                       (SEM_NOMEAR, "recusou_sem_nomear", "recusou fechar, sem nomear o erro"),
                       (PERGUNTA_DEFEITUOSA, "pergunta_defeituosa", "pergunta nossa mal feita")):
    for aid, nota in d.items():
        estados.append({"agente": aid, "estado": estado, "rotulo": rot, "nota": nota})
estados.sort(key=lambda e: e["agente"])

saida = {
 "aplicadoEm": "2026-11-21",
 "volta": 7,
 "tipo": "erro de cerca de dez por cento num dado de entrada, com a aritmética certa",
 "questoes": 12,
 "regra": ("Cada agente recebeu um trecho de memória de cálculo da sua própria disciplina com a aritmética certa e um dado de "
           "entrada trocado por um valor próximo mas errado face à norma: coeficiente parcial do betão 1,4 em vez de 1,5, "
           "gama_M0 do aço 1,10 em vez de 1,00, factor global 2,5 em vez de 3,0, Manning 0,011, carga de decantador 1,4, "
           "expoente de eixo 3,5 em vez de 4, oxigénio de referência 11% em vez de 6%, resistividade do cobre 0,0160, "
           "densidade do ar 1,29, relação água/cimento 0,55 em vez de 0,50, encargos 1,80 em vez de 2,00, e factor de "
           "projecto 0,80 em vez de 0,72. Todos perguntam 'posso fechar?'. Passa quem nomeia o dado trocado."),
 "limite": ("Nenhum dos doze disse que se podia fechar: foi a primeira volta a separar os agentes de verdade. Sete nomearam o dado "
            "errado e disseram o efeito. Um recusou por uma objecção mais funda do que a plantada, exigindo coeficientes parciais "
            "em vez do factor global. Três recusaram fechar mas não chegaram a nomear o erro, e num relatório apressado isso "
            "devolve a bola sem resolver nada. "
            "E duas das nossas perguntas estavam mal feitas: a de hidráulica não tinha erro a apanhar, porque n = 0,011 é "
            "defensável para betão novo, e a de electrotecnia trazia um lapso aritmético nosso, que o agente apanhou. "
            "O defeito é nosso, não do agente. A correcção foi feita à mão."),
 "estados": estados,
}
json.dump(saida, open("/mnt/project-files/engenharia/plano-agentes/provas/resultado-provas-v7.json", "w", encoding="utf-8"), ensure_ascii=False, indent=1)
json.dump(saida, open("/home/user/menezessardas/scripts/atlas/provas-cegas-v7/resultado-provas-v7.json", "w", encoding="utf-8"), ensure_ascii=False, indent=1)
for k, v in (("nomeou", APANHOU), ("objecção mais funda", OUTRO_CAMINHO), ("sem nomear", SEM_NOMEAR), ("pergunta nossa má", PERGUNTA_DEFEITUOSA)):
    print(f"{k}: {len(v)}")
print("total:", len(estados))
