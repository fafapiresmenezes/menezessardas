# Volta 2: questões DURAS, de vários passos, com armadilha. Continuam de cálculo
# fechado (resposta verificável), mas exigem montar a combinação, escolher o caso
# que governa ou converter unidades antes de aplicar a fórmula.
import json, math, datetime
Q = []
def q(agente, id_, enun, dados, fonte, formula, valor, unidade, tol, passos, armadilha):
    Q.append({"id": id_, "agente": agente, "nivel": "dura", "enunciado": enun, "dados": dados,
              "fonte_citada": fonte, "formula": formula, "resposta": round(valor, 3), "unidade": unidade,
              "tolerancia_relativa": tol, "passos": passos, "armadilha": armadilha})

# ---- Betão ----
A = "AGE-ESP-ESTRUTURAS-BETAO"
G = (5.0+1.5)*3.0; Qv = 3.0*3.0; qEd = 1.35*G + 1.5*Qv; MEd = qEd*6.0**2/8
q(A, "BET-D1", "Laje maciça de 0,20 m (betão armado, 25 kN/m³) com revestimento de 1,5 kN/m² e sobrecarga de utilização de 3,0 kN/m². A viga apoia-se simplesmente, tem 6,00 m de vão e recebe 3,00 m de largura de laje. Despreza o peso próprio da viga. Qual o momento de cálculo a meio vão, na combinação fundamental?",
  {"h_laje_m":0.20,"gama_betao_kN_m3":25,"revestimento_kN_m2":1.5,"sobrecarga_kN_m2":3.0,"vao_m":6.0,"largura_influencia_m":3.0,"gamaG":1.35,"gamaQ":1.5},
  "EN 1990 eq. (6.10) e EN 1991-1-1 quadro A.1", "qEd = 1,35·G + 1,5·Q, com G e Q por metro de viga; MEd = qEd·L²/8",
  MEd, "kNm", 0.03,
  [f"peso próprio da laje = 25·0,20 = 5,0 kN/m²; permanente total = 6,5 kN/m²",
   f"G = 6,5·3,0 = {G:.1f} kN/m; Q = 3,0·3,0 = {Qv:.1f} kN/m",
   f"qEd = 1,35·{G:.1f} + 1,5·{Qv:.1f} = {qEd:.3f} kN/m", f"MEd = {qEd:.3f}·36/8 = {MEd:.1f} kNm"],
  "Quem somar as cargas sem os coeficientes parciais, ou esquecer o peso próprio da laje, erra. A largura de influência tem de multiplicar antes de aplicar os coeficientes.")
VEd = qEd*6.0/2; VRdc = 88.225
q(A, "BET-D2", "A mesma viga tem a secção da questão BET-02 (b = 300 mm, d = 450 mm, As = 1570 mm², C30/37), sem armadura de esforço transverso. Qual a razão entre o esforço transverso de cálculo no apoio e o resistente sem estribos?",
  {"qEd_kN_m":round(qEd,3),"vao_m":6.0,"VRdc_kN":VRdc},
  "EN 1992-1-1 §6.2.2", "VEd = qEd·L/2; razão = VEd/VRd,c", VEd/VRdc, "—", 0.03,
  [f"VEd = {qEd:.3f}·6/2 = {VEd:.1f} kN", f"razão = {VEd:.1f}/{VRdc:.1f} = {VEd/VRdc:.3f} > 1 → precisa de estribos"],
  "A armadilha é responder 'sim, verifica' por olhar só a resistência. A razão passa de 1: a secção não passa sem estribos.")
# ---- Aço ----
B = "AGE-ESP-ESTRUTURAS-ACO"
Aipe, fy, Iz = 5381.0, 235.0, 603.8e4
Ncr = math.pi**2*210000*Iz/4000**2
lam = math.sqrt(Aipe*fy/Ncr)
# curva b: alfa=0.34
alfa=0.34
phi = 0.5*(1+alfa*(lam-0.2)+lam**2); chi = 1/(phi+math.sqrt(phi**2-lam**2))
Nb = chi*Aipe*fy/1000
q(B, "ACO-D1", "Pilar IPE 300 em S235, bi-articulado, 4,00 m, encurvadura em torno do eixo fraco, curva de encurvadura b (α = 0,34), γM1 = 1,0. Qual a resistência à encurvadura por flexão?",
  {"perfil":"IPE 300","L_mm":4000,"A_mm2":Aipe,"Iz_mm4":Iz,"fy_MPa":fy,"alpha":alfa,"gamma_M1":1.0},
  "EN 1993-1-1 §6.3.1.2, eq. (6.47) a (6.49)",
  "Ncr = π²EIz/L²; λ̄ = √(A·fy/Ncr); Φ = 0,5[1+α(λ̄−0,2)+λ̄²]; χ = 1/(Φ+√(Φ²−λ̄²)); Nb,Rd = χ·A·fy/γM1",
  Nb, "kN", 0.03,
  [f"Ncr = {Ncr/1000:.1f} kN", f"λ̄ = {lam:.4f}", f"Φ = {phi:.4f}", f"χ = {chi:.4f}", f"Nb,Rd = {Nb:.1f} kN"],
  "Quem parar em Npl,Rd (1264,5 kN) ou em Ncr (782,2 kN) erra: a resistência é bem menor que as duas.")
q(B, "ACO-D2", "Para o mesmo pilar, qual a razão entre a resistência à encurvadura e a resistência plástica da secção?",
  {"Nb_kN":round(Nb,1),"Npl_kN":round(Aipe*fy/1000,1)},
  "EN 1993-1-1 §6.3.1.2", "razão = Nb,Rd/Npl,Rd = χ", Nb/(Aipe*fy/1000), "—", 0.03,
  [f"razão = {Nb:.1f}/{Aipe*fy/1000:.1f} = {Nb/(Aipe*fy/1000):.4f}", "é o próprio χ"],
  "A razão é χ. Quem calcular 1/λ̄² ou outra conta solta não chega ao mesmo número.")
# ---- Geotecnia ----
Gg = "AGE-ESP-GEOTECNIA"
Ka = (1-math.sin(math.radians(30)))/(1+math.sin(math.radians(30)))
Pa = 0.5*Ka*18*5**2; Pq = Ka*20*5
Pt = Pa+Pq
braco = (Pa*(5/3) + Pq*(5/2))/Pt
q(Gg, "GEO-D1", "Muro de 5,00 m, aterro arenoso seco (γ = 18 kN/m³, φ' = 30°), superfície horizontal com sobrecarga uniforme de 20 kPa, muro sem atrito. Qual o empuxo ativo total por metro?",
  {"H_m":5.0,"gama_kN_m3":18.0,"phi_graus":30.0,"sobrecarga_kPa":20.0},
  "Rankine com sobrecarga uniforme", "Pa = ½·Ka·γ·H² + Ka·q·H", Pt, "kN/m", 0.03,
  [f"Ka = {Ka:.4f}", f"parcela do solo = {Pa:.1f} kN/m (a H/3)", f"parcela da sobrecarga = {Pq:.1f} kN/m (a H/2)", f"total = {Pt:.1f} kN/m"],
  "Quem esquecer a sobrecarga responde 75 kN/m. A sobrecarga dá diagrama rectangular, não triangular.")
q(Gg, "GEO-D2", "No mesmo muro, a que altura acima da base atua a resultante do empuxo?",
  {"Pa_solo_kN_m":round(Pa,1),"Pa_sobrecarga_kN_m":round(Pq,1),"H_m":5.0},
  "Composição de momentos das duas parcelas", "z = (Pa_solo·H/3 + Pa_q·H/2)/(Pa_solo + Pa_q)", braco, "m", 0.03,
  [f"momento = {Pa:.1f}·1,667 + {Pq:.1f}·2,5 = {Pa*(5/3)+Pq*2.5:.1f} kN·m/m", f"z = {braco:.3f} m"],
  "Não é H/3 nem H/2: é a média ponderada das duas parcelas.")
# ---- Hidráulica ----
H = "AGE-ESP-HIDRAULICA-RECURSOS-HIDRICOS"
# canal trapezoidal b=3, z=1.5, y=1.2, n=0.015, S=0.001
b_,z_,y_,n_,S_ = 3.0,1.5,1.2,0.015,0.001
Ar = (b_+z_*y_)*y_; Pr = b_+2*y_*math.sqrt(1+z_**2); Rr = Ar/Pr
Vr = (1/n_)*Rr**(2/3)*S_**0.5; Qr = Vr*Ar
q(H, "HID-D1", "Canal trapezoidal de base 3,00 m, taludes 1V:1,5H, altura de água 1,20 m, n = 0,015, declive 0,001. Qual o caudal?",
  {"b_m":b_,"z":z_,"y_m":y_,"n":n_,"S":S_},
  "Manning em secção trapezoidal", "A = (b+z·y)·y; P = b+2y√(1+z²); Q = (1/n)·A·R^(2/3)·S^(1/2)",
  Qr, "m³/s", 0.03,
  [f"A = {Ar:.3f} m²", f"P = {Pr:.3f} m", f"R = {Rr:.4f} m", f"V = {Vr:.4f} m/s", f"Q = {Qr:.3f} m³/s"],
  "O perímetro do trapézio não é b+2y: tem o factor √(1+z²) nos taludes. Quem usar a fórmula do canal retangular erra.")
# conduta com bomba: perda + altura geométrica
Dp,Lp,Qp,fp = 0.25,800.0,0.06,0.022
Vp = Qp/(math.pi*Dp**2/4); hf = fp*Lp/Dp*Vp**2/(2*9.81); Hman = 25.0+hf
Pb = 1000*9.81*Qp*Hman/0.72/1000
q(H, "HID-D2", "Bombagem de 60 L/s por conduta de 250 mm e 800 m, f = 0,022, desnível geométrico de 25,00 m, rendimento do grupo 72%. Qual a potência no eixo?",
  {"Q_m3_s":Qp,"D_m":Dp,"L_m":Lp,"f":fp,"desnivel_m":25.0,"eta":0.72},
  "Darcy-Weisbach + potência hidráulica", "hf = f(L/D)V²/2g; Hman = Hgeo + hf; P = ρgQHman/η",
  Pb, "kW", 0.03,
  [f"V = {Vp:.4f} m/s", f"hf = {hf:.2f} m", f"Hman = {Hman:.2f} m", f"P = {Pb:.2f} kW"],
  "Quem usar só o desnível geométrico subestima a bomba. A perda de carga tem de entrar na altura manométrica.")
# ---- Saneamento ----
SA = "AGE-ESP-SANEAMENTO"
Qmed = 50000*150*0.8/86400; Qmax = Qmed*1.2*1.5; Qinf = 0.5*2.0  # 0,5 L/s·km em 2 km? usar 0,2 L/s/km * 10 km
Qinf = 0.2*10
Qdim = Qmax + Qinf
q(SA, "SAN-D1", "Cidade de 50 000 habitantes, 150 L/hab·dia, retorno 0,80, K1 = 1,2, K2 = 1,5, mais infiltração de 0,20 L/s por km em 10 km de coletor. Qual o caudal de dimensionamento?",
  {"hab":50000,"consumo_L_hab_dia":150,"retorno":0.8,"K1":1.2,"K2":1.5,"infiltracao_L_s_km":0.2,"extensao_km":10},
  "NBR 9649 (caudais de projecto de rede de esgoto)", "Qdim = Qméd·K1·K2 + taxa·extensão",
  Qdim, "L/s", 0.02,
  [f"Qméd = {Qmed:.2f} L/s", f"Qmáx = {Qmax:.2f} L/s", f"infiltração = {Qinf:.1f} L/s", f"Qdim = {Qdim:.2f} L/s"],
  "A infiltração soma depois dos coeficientes, não antes: multiplicá-la por K1·K2 inflaciona o caudal.")
# ETA: dose de coagulante e massa de lodo
Qeta = 1000.0  # m3/dia
dose = 40.0  # mg/L sulfato de alumínio
lodo = (dose*0.25 + 30*0.9)*Qeta/1000
q(SA, "SAN-D2", "Estação de 1000 m³/dia com dose de coagulante de 40 mg/L (produz 0,25 kg de lodo por kg aplicado) e remoção de 30 mg/L de sólidos suspensos com 90% de captura. Qual a massa de lodo seco por dia?",
  {"Q_m3_dia":Qeta,"dose_mg_L":dose,"fator_lodo_coagulante":0.25,"SS_removidos_mg_L":30,"captura":0.9},
  "Balanço de massa de lodo (prática de tratamento)", "m = (dose·f + SS·captura)·Q",
  lodo, "kg/dia", 0.03,
  [f"do coagulante: 40·0,25 = 10 mg/L → 10 kg/dia", f"dos sólidos: 30·0,9 = 27 mg/L → 27 kg/dia", f"total = {lodo:.1f} kg/dia"],
  "Quem somar a dose inteira como lodo responde 67 kg/dia. Só parte do coagulante vira lodo.")
json.dump({"emitido": datetime.date.today().isoformat(), "volta": 2, "nivel": "duras",
           "metodo": "Questões de vários passos, com armadilha declarada, mas sempre de resposta fechada e reconferível. Gabarito calculado por programa.",
           "total": len(Q),
           "por_agente": {a: sum(1 for x in Q if x["agente"]==a) for a in sorted({x["agente"] for x in Q})},
           "questoes": Q},
          open("/mnt/project-files/engenharia/plano-agentes/provas/gabaritos-duras-v2.json","w",encoding="utf-8"), ensure_ascii=False, indent=1)
print("duras:", len(Q))
for x in Q: print(" ", x["id"], x["resposta"], x["unidade"])
