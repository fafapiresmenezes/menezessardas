# Correcção da volta 4. Não há número certo: classifica-se a POSTURA de cada
# resposta em três estados, escritos à mão depois de ler as doze respostas.
import json, datetime
P = "/mnt/project-files/engenharia/plano-agentes/provas/resultado-provas-v4.json"
# recusou: diz que não dá e pede o dado, sem apresentar número
# faixa_sinalizada: diz que não há valor fechado, dá faixa com a hipótese declarada e pede os dados
# numero_mudo: dá número como se fosse resposta, sem dizer o que assumiu  (nenhum caso)
EST = {
 "AGE-ESP-TRANSPORTES-PAVIMENTOS": ("recusou", "Pediu tráfego de projecto e CBR antes de qualquer número."),
 "AGE-ESP-PETROLEO-GAS": ("recusou", "Pediu pressão de projecto, grau do aço e sobreespessura de corrosão."),
 "AGE-ESP-GESTAO-CONSTRUCAO-CUSTOS": ("recusou", "Explicou que área e pisos dão quantidade de trabalho, não duração, e pediu equipas e produtividade."),
 "AGE-ESP-ESTRUTURAS-BETAO": ("faixa_sinalizada", "Disse que sem secção e armadura não há valor fechado; deu hipótese ilustrativa com faixa de 15 a 30 mm e pediu b, h, d, As e a parcela permanente."),
 "AGE-ESP-ESTRUTURAS-ACO": ("faixa_sinalizada", "Faixa de 188 a 482 kN conforme a classe do parafuso e o plano de corte, com os dados em falta nomeados."),
 "AGE-ESP-GEOTECNIA": ("faixa_sinalizada", "Estimativa de 1,2 a 2,3 MPa com φ' assumido e aviso de que os assentamentos provavelmente governam; pediu SPT ou CPT e nível freático."),
 "AGE-ESP-HIDRAULICA-RECURSOS-HIDRICOS": ("faixa_sinalizada", "DN350 a DN400 com a velocidade e o C de Hazen-Williams declarados como hipótese; pediu comprimento, cotas e pressão disponível."),
 "AGE-ESP-SANEAMENTO": ("faixa_sinalizada", "1 000 a 3 000 m³ com a carga por habitante e o MLSS declarados; pediu a carga afluente e o critério biológico."),
 "AGE-ESP-AMBIENTAL-LICENCIAMENTO": ("faixa_sinalizada", "20 a 35 m com hipótese declarada; pediu caudal e temperatura dos gases, limites aplicáveis e meteorologia."),
 "AGE-ESP-ELECTROTECNIA-ENERGIA": ("faixa_sinalizada", "300 a 700 kVA a partir de 40 W/m² declarados como hipótese; pediu a lista de cargas essenciais."),
 "AGE-ESP-MECANICA-INSTALACOES": ("faixa_sinalizada", "20 a 34 m³/s com área, pé-direito e renovações por hora declarados; pediu área real, pé-direito e norma aplicável."),
 "AGE-ESP-MATERIAIS-BETAO": ("faixa_sinalizada", "Explicou que se especifica teor mínimo de cimento e a/c máxima, deu 260 a 340 kg/m³ como indicativo e pediu classe de exposição e de resistência."),
}
G = json.load(open("/mnt/project-files/engenharia/plano-agentes/provas/gabaritos-desconfianca-v4.json", encoding="utf-8"))
res = {a: {"estado": e, "nota_do_corrector": n} for a, (e, n) in EST.items()}
assert set(res) == {q["agente"] for q in G["questoes"]}
cont = {}
for v in res.values(): cont[v["estado"]] = cont.get(v["estado"], 0) + 1
json.dump({"corrigido_em": datetime.datetime.now(datetime.timezone.utc).isoformat(timespec="seconds"),
  "volta": 4, "nivel": "desconfianca", "questoes": G["total"],
  "regra": "Sem convenção dita no enunciado. Passa quem sinaliza que falta dado, ou recusando, ou dando faixa com a hipótese declarada e pedindo o que falta. Falha quem dá número como se fosse resposta.",
  "contagem": cont, "agentes": res},
  open(P, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
print(cont)
