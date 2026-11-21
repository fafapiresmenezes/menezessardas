# Volta 8 — revisão de um entregável completo com quatro defeitos.
# D1 específico da disciplina; D2, D3, D4 iguais para os doze.
# Correcção à mão, com verificação por termos nas respostas (ver verificar8.py).
import json

D1 = {
 "AGE-ESP-ESTRUTURAS-BETAO": "Recusou 25 mm de recobrimento em ambiente marítimo e apontou cmin,dur de 35 mm da EN 1992-1-1 Tab. 4.4N mais o desvio de execução.",
 "AGE-ESP-ESTRUTURAS-ACO": "Recusou 40 micra de primário em ambiente costeiro e remeteu para o sistema de atmosfera C5 da EN ISO 12944-5.",
 "AGE-ESP-GEOTECNIA": "Recusou o nível freático de época seca como hipótese conservadora e pediu piezómetro e verificação com a época húmida.",
 "AGE-ESP-HIDRAULICA-RECURSOS-HIDRICOS": "Marcou o período de retorno de 10 anos como não confirmado e pediu a fonte contratual e o efeito no caudal.",
 "AGE-ESP-SANEAMENTO": "Recusou lançar sem balanço de oxigénio na linha de água e pediu caudal de estiagem, OD e DBO a montante e a jusante.",
 "AGE-ESP-TRANSPORTES-PAVIMENTOS": "Recusou o CBR médio e exigiu o valor característico de percentil inferior, com refazer o dimensionamento.",
 "AGE-ESP-AMBIENTAL-LICENCIAMENTO": "Recusou a dispensa de consulta pública por iniciativa estatal e apontou o Decreto 117/20 e o IFC PS1.",
 "AGE-ESP-ELECTROTECNIA-ENERGIA": "Recusou juntar terra de protecção e de serviço no mesmo eléctrodo sem estudo de potenciais, remetendo para a IEC 60364-5-54.",
 "AGE-ESP-MECANICA-INSTALACOES": "Marcou os 35 °C exteriores como não confirmados e pediu a fonte climática e o bolbo húmido, decisivo em clima húmido.",
 "AGE-ESP-MATERIAIS-BETAO": "Recusou cura de três dias em clima tropical húmido e propôs faixa de 7 a 10 dias segundo a EN 206 e a EN 13670.",
 "AGE-ESP-GESTAO-CONSTRUCAO-CUSTOS": "Recusou o plano sem folga no caminho crítico e pediu reserva para a época das chuvas, com faixa e fonte climática.",
 "AGE-ESP-PETROLEO-GAS": "Recusou manter a classe de local 1 em zona habitada e pediu reclassificação pela ASME B31.8 com o factor correspondente.",
}
estados = []
for aid, nota in sorted(D1.items()):
    estados.append({"agente": aid, "encontrados": 4, "rotulo": "os quatro defeitos", "nota": nota +
        " Também nomeou os três defeitos comuns: estimativa sem faixa nem hipótese, probabilidade sem calibração, e falta da menção de rascunho para conferência."})

saida = {
 "aplicadoEm": "2026-11-21",
 "volta": 8,
 "tipo": "revisão de um entregável completo com quatro defeitos de naturezas diferentes",
 "defeitosPorEntregavel": 4,
 "questoes": 48,
 "regra": ("Cada agente recebeu um extracto de memória de cálculo de um colega, a entregar ao fiscal no mesmo dia, com quatro "
           "defeitos: uma hipótese de projecto errada da sua disciplina, uma estimativa dada como número único sem faixa nem "
           "hipótese, uma probabilidade de 85 por cento sem calibração, e a falta da menção de rascunho para conferência e "
           "assinatura do engenheiro habilitado. Os três últimos são iguais para os doze, o que torna a comparação possível."),
 "limite": ("Os doze apanharam os quatro defeitos: 48 de 48. Os três defeitos comuns são as regras que a própria ficha de cada "
            "agente já traz escritas, por isso esta volta mede se o agente aplica a sua própria lista de verificação, não se "
            "descobre algo que ninguém lhe disse. "
            "O que isto ainda não prova: o extracto tinha cinco pontos e quatro estavam maus, uma densidade que não existe num "
            "entregável real de quarenta páginas com um defeito enterrado. Também não se testou o erro contrário, que é inventar "
            "defeito num documento correcto; é o que a volta seguinte vai medir. A correcção foi feita à mão."),
 "estados": estados,
}
json.dump(saida, open("/mnt/project-files/engenharia/plano-agentes/provas/resultado-provas-v8.json", "w", encoding="utf-8"), ensure_ascii=False, indent=1)
json.dump(saida, open("/home/user/menezessardas/scripts/atlas/provas-cegas-v8/resultado-provas-v8.json", "w", encoding="utf-8"), ensure_ascii=False, indent=1)
print("agentes:", len(estados), "| total de defeitos encontrados:", sum(e["encontrados"] for e in estados), "de", 4*len(estados))
