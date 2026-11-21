import json, math, datetime
P = "/mnt/project-files/engenharia/plano-agentes/provas/gabaritos-calculo-v1.json"
d = json.load(open(P, encoding="utf-8"))
Q = d["questoes"]
ja = {x["id"] for x in Q}
def q(agente, id_, enun, dados, fonte, formula, valor, unidade, tol, passos):
    assert id_ not in ja, id_
    Q.append({"id": id_, "agente": agente, "enunciado": enun, "dados": dados, "fonte_citada": fonte,
              "formula": formula, "resposta": round(valor, 3), "unidade": unidade,
              "tolerancia_relativa": tol, "passos": passos})

# ---- Hidráulica ----
H = "AGE-ESP-HIDRAULICA-RECURSOS-HIDRICOS"
b, y, n, S = 3.0, 1.2, 0.015, 0.001
A_, Pm = b*y, b+2*y; R = A_/Pm
V = (1/n)*R**(2/3)*S**0.5; Qc = V*A_
q(H, "HID-01", "Canal retangular de 3,00 m de base, altura de água 1,20 m, n de Manning 0,015, declive 0,001. Qual o caudal?",
  {"b_m": b, "y_m": y, "n": n, "S": S}, "Manning (ISO 748 para medição; fórmula clássica)",
  "V = (1/n)·R^(2/3)·S^(1/2); Q = V·A", Qc, "m³/s", 0.03,
  [f"A = {A_:.2f} m², P = {Pm:.2f} m, R = {R:.4f} m", f"V = {V:.4f} m/s", f"Q = {Qc:.3f} m³/s"])
q(H, "HID-02", "No mesmo canal, qual o número de Froude e o regime?",
  {"V_m_s": round(V, 4), "y_m": y}, "Definição clássica de Froude", "Fr = V/√(g·y)",
  V/math.sqrt(9.81*y), "—", 0.03, [f"Fr = {V/math.sqrt(9.81*y):.4f} < 1 → regime lento (subcrítico)"])
qu = Qc/b; yc = (qu**2/9.81)**(1/3)
q(H, "HID-03", "Qual a altura crítica desse canal para o caudal calculado?",
  {"Q_m3_s": round(Qc, 3), "b_m": b}, "Energia específica mínima (hidráulica clássica)",
  "yc = (q²/g)^(1/3), q = Q/b", yc, "m", 0.03, [f"q = {qu:.4f} m²/s", f"yc = {yc:.4f} m"])
D, L, Qp, f = 0.3, 1000.0, 0.1, 0.02
Vp = Qp/(math.pi*D**2/4); hf = f*L/D*Vp**2/(2*9.81)
q(H, "HID-04", "Conduta de 300 mm, 1000 m, caudal 100 L/s, fator de atrito 0,02. Qual a perda de carga?",
  {"D_m": D, "L_m": L, "Q_m3_s": Qp, "f": f}, "Darcy-Weisbach", "hf = f·(L/D)·V²/(2g)", hf, "m", 0.03,
  [f"V = {Vp:.4f} m/s", f"hf = {hf:.2f} m"])
q(H, "HID-05", "Bacia de 2,5 km², coeficiente de escoamento 0,70, intensidade 60 mm/h. Qual o caudal de ponta?",
  {"C": 0.7, "i_mm_h": 60, "A_km2": 2.5}, "Método racional (prática corrente de drenagem)",
  "Q = C·i·A/3,6 (A em km², i em mm/h)", 0.7*60*2.5/3.6, "m³/s", 0.02,
  [f"Q = 0,7·60·2,5/3,6 = {0.7*60*2.5/3.6:.2f} m³/s"])
Qw = (2/3)*0.62*math.sqrt(2*9.81)*2.0*0.3**1.5
q(H, "HID-06", "Descarregador retangular de soleira delgada, 2,00 m de largura, carga 0,30 m, Cd = 0,62. Qual o caudal?",
  {"b_m": 2.0, "H_m": 0.3, "Cd": 0.62}, "Descarregador de soleira delgada (hidráulica clássica)",
  "Q = (2/3)·Cd·√(2g)·b·H^(3/2)", Qw, "m³/s", 0.03, [f"Q = {Qw:.4f} m³/s"])

# ---- Saneamento ----
SA = "AGE-ESP-SANEAMENTO"
hab, cons, ret, K1, K2 = 50000, 150.0, 0.8, 1.2, 1.5
Qmed = hab*cons*ret/86400; Qmax = Qmed*K1*K2
q(SA, "SAN-01", "Cidade de 50 000 habitantes, consumo 150 L/hab·dia, coeficiente de retorno 0,80. Qual o caudal médio de esgoto?",
  {"hab": hab, "consumo_L_hab_dia": cons, "retorno": ret}, "Prática corrente de saneamento (NBR 9649 para redes)",
  "Qméd = pop·q·C/86400", Qmed, "L/s", 0.02, [f"Qméd = {Qmed:.2f} L/s"])
q(SA, "SAN-02", "Para a mesma cidade, com K1 = 1,2 e K2 = 1,5, qual o caudal máximo horário?",
  {"Qmed_L_s": round(Qmed, 2), "K1": K1, "K2": K2}, "NBR 9649 (coeficientes de variação)",
  "Qmáx = Qméd·K1·K2", Qmax, "L/s", 0.02, [f"Qmáx = {Qmax:.2f} L/s"])
q(SA, "SAN-03", "Decantador de 500 m³ tratando 1000 m³/dia. Qual o tempo de retenção?",
  {"V_m3": 500, "Q_m3_dia": 1000}, "Tempo de retenção hidráulico (prática de tratamento)",
  "t = V/Q", 500/1000*24, "h", 0.02, [f"t = 0,5 dia = {500/1000*24:.1f} h"])
q(SA, "SAN-04", "Esse decantador tem 20,0 × 5,0 m em planta. Qual a taxa de escoamento superficial?",
  {"area_m2": 100, "Q_m3_dia": 1000}, "Taxa de aplicação superficial (prática de tratamento)",
  "q = Q/A", 1000/100, "m³/m²·dia", 0.02, ["q = 1000/100 = 10 m³/m²·dia"])
q(SA, "SAN-05", "Afluente com 300 mg/L de DBO, efluente com 30 mg/L. Qual a eficiência de remoção?",
  {"DBO_entrada_mg_L": 300, "DBO_saida_mg_L": 30}, "Definição de eficiência de remoção",
  "E = (C0 − C)/C0 × 100", (300-30)/300*100, "%", 0.01, ["E = 270/300 = 90%"])
q(SA, "SAN-06", "Dose de cloro de 2,0 mg/L num caudal de 1000 m³/dia. Qual o consumo diário?",
  {"dose_mg_L": 2.0, "Q_m3_dia": 1000}, "Balanço de massa de desinfeção",
  "m = dose·Q (1 mg/L × 1 m³ = 1 g)", 2.0*1000/1000, "kg/dia", 0.01, ["m = 2,0·1000 g = 2,0 kg/dia"])

# ---- Transportes / pavimentos ----
T = "AGE-ESP-TRANSPORTES-PAVIMENTOS"
q(T, "TRA-01", "Eixo simples de 100 kN comparado com o eixo-padrão de 80 kN. Qual o fator de equivalência de carga?",
  {"P_kN": 100, "P_padrao_kN": 80, "expoente": 4}, "AASHTO (lei da quarta potência)",
  "FEC = (P/P₀)^4", (100/80)**4, "—", 0.02, [f"FEC = 1,25⁴ = {(100/80)**4:.4f}"])
Vk = 80.0; Vm = Vk/3.6; t = 2.5; a = 3.4
SSD = Vm*t + Vm**2/(2*a)
q(T, "TRA-02", "Velocidade de projeto 80 km/h, tempo de reação 2,5 s, desaceleração 3,4 m/s², rasante plana. Qual a distância de visibilidade de paragem?",
  {"V_km_h": Vk, "t_s": t, "a_m_s2": a}, "AASHTO Green Book (modelo de dois termos)",
  "SSD = V·t + V²/(2a)", SSD, "m", 0.03,
  [f"V = {Vm:.3f} m/s", f"termo de reação = {Vm*t:.2f} m", f"termo de travagem = {Vm**2/(2*a):.2f} m", f"SSD = {SSD:.1f} m"])
R = Vk**2/(127*(0.06+0.14))
q(T, "TRA-03", "Mesma velocidade, sobreelevação 6% e atrito lateral 0,14. Qual o raio mínimo em curva horizontal?",
  {"V_km_h": Vk, "e": 0.06, "f": 0.14}, "AASHTO (equilíbrio em curva)",
  "R = V²/(127·(e+f))", R, "m", 0.03, [f"R = 6400/(127·0,20) = {R:.1f} m"])
S = SSD; den = 100*(math.sqrt(2*1.08)+math.sqrt(2*0.60))**2
# Correcção de 20/11/2026 (defeito meu, não do agente): com A = 4% o L calculado
# (99,9 m) é menor do que S (128,2 m), logo a hipótese "L > S" da fórmula não se
# verifica e a questão não tinha resposta única. Com A = 8% fica L = 199,8 m > S,
# e a fórmula do caso L > S é a certa. O enunciado passa a dizer o caso.
Lc = 8.0*S**2/den
q(T, "TRA-04", "Curva vertical convexa com variação de rasante de 8%, visibilidade de paragem igual à da questão TRA-02, olho a 1,08 m e obstáculo a 0,60 m. Qual o comprimento mínimo, no caso L > S?",
  {"A_percent": 8.0, "S_m": round(S, 1), "h1_m": 1.08, "h2_m": 0.60},
  "AASHTO (curva convexa, caso L > S)", "L = A·S²/(100·(√(2h1)+√(2h2))²)", Lc, "m", 0.03,
  [f"denominador = {den:.2f}", f"L = {Lc:.1f} m", f"confere a hipótese: L = {Lc:.1f} m > S = {S:.1f} m"])
q(T, "TRA-05", "Camada de betume de 5 cm em 5,0 km de via com 7,0 m de largura, massa volúmica 2,4 t/m³. Qual a massa de mistura?",
  {"L_km": 5.0, "largura_m": 7.0, "espessura_m": 0.05, "densidade_t_m3": 2.4},
  "Medição por volume (prática de obra)", "m = L·b·e·ρ", 5000*7.0*0.05*2.4, "t", 0.01,
  [f"V = 5000·7·0,05 = {5000*7.0*0.05:.0f} m³", f"m = {5000*7.0*0.05*2.4:.0f} t"])
q(T, "TRA-06", "Tráfego médio diário de 10 000 veículos a crescer 3% por ano. Qual o tráfego no ano 20?",
  {"TMD0": 10000, "i": 0.03, "n": 20}, "Crescimento geométrico (prática de estudos de tráfego)",
  "TMDn = TMD0·(1+i)^n", 10000*1.03**20, "veículos/dia", 0.01,
  [f"TMD20 = 10000·1,03²⁰ = {10000*1.03**20:.0f}"])

# ---- Ambiental / licenciamento ----
AM = "AGE-ESP-AMBIENTAL-LICENCIAMENTO"
Ce = (0.5*40 + 10*2)/10.5
q(AM, "AMB-01", "Efluente de 0,5 m³/s com 40 mg/L lançado em rio de 10 m³/s com 2 mg/L. Qual a concentração a jusante, com mistura completa?",
  {"Qe_m3_s": 0.5, "Ce_mg_L": 40, "Qr_m3_s": 10, "Cr_mg_L": 2}, "Balanço de massa com mistura completa",
  "C = (Qe·Ce + Qr·Cr)/(Qe + Qr)", Ce, "mg/L", 0.02, [f"C = (20 + 20)/10,5 = {Ce:.3f} mg/L"])
co2 = 0.00084*43.0*74.1
q(AM, "AMB-02", "Queima de 1000 L de gasóleo. Quanto CO₂ resulta, pelos fatores por defeito?",
  {"V_L": 1000, "densidade_t_m3": 0.84, "PCI_GJ_t": 43.0, "fator_kg_GJ": 74.1},
  "IPCC 2006, vol. 2, cap. 3 (fatores por defeito)", "m = V·ρ·PCI·FE", co2*1000, "kg", 0.03,
  [f"por litro: 0,00084 t · 43 GJ/t · 74,1 kg/GJ = {co2:.4f} kg", f"1000 L → {co2*1000:.1f} kg"])
q(AM, "AMB-03", "Duas fontes de ruído de 70 dB cada, a funcionar juntas. Qual o nível resultante?",
  {"L1_dB": 70, "L2_dB": 70}, "Soma logarítmica de níveis (ISO 1996-1)",
  "L = 10·log₁₀(10^(L1/10) + 10^(L2/10))", 10*math.log10(2*10**7), "dB", 0.01,
  [f"L = 70 + 10·log₁₀2 = {10*math.log10(2*10**7):.2f} dB"])
q(AM, "AMB-04", "Fonte pontual com 85 dB a 10 m. Qual o nível a 100 m, em campo livre e sem outras perdas?",
  {"L_ref_dB": 85, "r_ref_m": 10, "r_m": 100}, "Divergência esférica (ISO 9613-2)",
  "L = L_ref − 20·log₁₀(r/r_ref)", 85-20*math.log10(10), "dB", 0.01, ["L = 85 − 20 = 65 dB"])
L5 = 300*math.exp(-0.23*5)
q(AM, "AMB-05", "Matéria orgânica com DBO última de 300 mg/L e k = 0,23 /dia. Qual a DBO₅?",
  {"L0_mg_L": 300, "k_dia": 0.23, "t_dia": 5}, "Cinética de primeira ordem (Streeter-Phelps)",
  "DBO₅ = L0·(1 − e^(−k·t))", 300-L5, "mg/L", 0.02,
  [f"L(5) = 300·e^(−1,15) = {L5:.1f} mg/L", f"DBO₅ = {300-L5:.1f} mg/L"])
vs = 9.81*(2650-1000)*(0.05e-3)**2/(18*1.002e-3)
q(AM, "AMB-06", "Partícula de 0,05 mm, massa volúmica 2650 kg/m³, em água a 20 °C (μ = 1,002·10⁻³ Pa·s). Qual a velocidade de sedimentação?",
  {"d_mm": 0.05, "rho_s": 2650, "rho_w": 1000, "mu_Pa_s": 1.002e-3}, "Lei de Stokes (regime laminar)",
  "vs = g·(ρs − ρ)·d²/(18·μ)", vs*1000, "mm/s", 0.03, [f"vs = {vs:.6f} m/s = {vs*1000:.3f} mm/s"])

# ---- Electrotecnia / energia ----
E = "AGE-ESP-ELECTROTECNIA-ENERGIA"
Rl = 0.0175/95*200; dV = math.sqrt(3)*150*Rl
q(E, "ELE-01", "Cabo de cobre de 95 mm², 200 m, corrente 150 A, fator de potência unitário, rede trifásica. Qual a queda de tensão?",
  {"S_mm2": 95, "L_m": 200, "I_A": 150, "rho_ohm_mm2_m": 0.0175, "cos_phi": 1.0},
  "IEC 60364-5-52 (cálculo de queda de tensão)", "ΔU = √3·I·R, R = ρ·L/S", dV, "V", 0.03,
  [f"R = 0,0175·200/95 = {Rl:.5f} Ω", f"ΔU = {dV:.2f} V ({dV/400*100:.2f}% de 400 V)"])
q(E, "ELE-02", "Nessa linha, quanto se perde em potência?",
  {"I_A": 150, "R_ohm": round(Rl, 5)}, "Perdas por efeito Joule", "P = 3·I²·R",
  3*150**2*Rl/1000, "kW", 0.03, [f"P = 3·150²·{Rl:.5f} = {3*150**2*Rl:.1f} W"])
q(E, "ELE-03", "Carga de 450 kW com fator de potência 0,85. Que potência aparente tem de ter o transformador?",
  {"P_kW": 450, "cos_phi": 0.85}, "Relação entre potências (prática de projeto eléctrico)",
  "S = P/cos φ", 450/0.85, "kVA", 0.02, [f"S = 450/0,85 = {450/0.85:.1f} kVA"])
In = 630000/(math.sqrt(3)*400); Icc = In/0.04
q(E, "ELE-04", "Transformador de 630 kVA, 400 V no secundário, tensão de curto-circuito 4%. Qual a corrente de curto-circuito simétrica no secundário (rede a montante ideal)?",
  {"S_kVA": 630, "U_V": 400, "ucc_percent": 4}, "IEC 60909 (contribuição do transformador)",
  "In = S/(√3·U); Icc = In/ucc", Icc/1000, "kA", 0.03,
  [f"In = {In:.1f} A", f"Icc = {In:.1f}/0,04 = {Icc:.0f} A = {Icc/1000:.2f} kA"])
q(E, "ELE-05", "Central solar de 100 kWp, irradiação 5,5 kWh/m²·dia, razão de desempenho 0,80. Qual a energia diária?",
  {"P_kWp": 100, "H_kWh_m2_dia": 5.5, "PR": 0.80}, "IEC 61724-1 (razão de desempenho)",
  "E = P·H·PR", 100*5.5*0.8, "kWh/dia", 0.02, [f"E = {100*5.5*0.8:.0f} kWh/dia"])
q(E, "ELE-06", "Consumo nocturno de 10 kWh, profundidade de descarga 80% e rendimento do conversor 90%. Que capacidade útil tem de ter a bateria?",
  {"E_kWh": 10, "DoD": 0.8, "eta": 0.9}, "Dimensionamento de armazenamento (prática de projeto)",
  "C = E/(DoD·η)", 10/(0.8*0.9), "kWh", 0.02, [f"C = 10/0,72 = {10/0.72:.2f} kWh"])

# ---- Mecânica / instalações ----
M = "AGE-ESP-MECANICA-INSTALACOES"
q(M, "MEC-01", "Caudal de ar de 1,00 m³/s com diferença de 10 °C, ρ = 1,2 kg/m³ e cp = 1,005 kJ/kg·K. Qual a potência sensível?",
  {"V_m3_s": 1.0, "dT_C": 10, "rho": 1.2, "cp_kJ_kgK": 1.005}, "ASHRAE Handbook (carga sensível)",
  "Q = ρ·V̇·cp·ΔT", 1.2*1.0*1.005*10, "kW", 0.02, [f"Q = {1.2*1.0*1.005*10:.2f} kW"])
q(M, "MEC-02", "Sala de 500 m³ com 6 renovações por hora. Qual o caudal de ar?",
  {"V_m3": 500, "RPH": 6}, "EN 16798-1 (ventilação por renovações)", "V̇ = V·RPH",
  500*6, "m³/h", 0.01, ["V̇ = 3000 m³/h = 0,833 m³/s"])
q(M, "MEC-03", "Esse caudal (0,833 m³/s) com pressão total de 500 Pa e rendimento de 65%. Qual a potência do ventilador?",
  {"V_m3_s": 0.8333, "dp_Pa": 500, "eta": 0.65}, "EN 13779 / ASHRAE (potência de ventilador)",
  "P = V̇·Δp/η", 0.8333*500/0.65, "W", 0.03, [f"P = {0.8333*500/0.65:.1f} W"])
q(M, "MEC-04", "Área de operação de 140 m² com densidade de 6,1 mm/min. Qual o caudal de água dos sprinklers?",
  {"area_m2": 140, "densidade_mm_min": 6.1}, "NFPA 13 (densidade × área de operação)",
  "Q = densidade·área (1 mm/min·m² = 1 L/min)", 140*6.1, "L/min", 0.02,
  [f"Q = 140·6,1 = {140*6.1:.0f} L/min"])
q(M, "MEC-05", "Bomba com caudal 20 L/s, altura manométrica 40 m e rendimento 70%. Qual a potência no eixo?",
  {"Q_m3_s": 0.02, "H_m": 40, "eta": 0.7}, "Potência hidráulica (ISO 9906 para ensaio)",
  "P = ρ·g·Q·H/η", 1000*9.81*0.02*40/0.7/1000, "kW", 0.03,
  [f"P = {1000*9.81*0.02*40/0.7/1000:.2f} kW"])
q(M, "MEC-06", "Tubagem de aço de 100 mm com caudal de 10 L/s. Qual a velocidade de escoamento?",
  {"D_m": 0.1, "Q_m3_s": 0.01}, "Continuidade", "V = Q/(π·D²/4)",
  0.01/(math.pi*0.01/4), "m/s", 0.02, [f"A = {math.pi*0.01/4:.6f} m²", f"V = {0.01/(math.pi*0.01/4):.3f} m/s"])

# ---- Materiais / tecnologia do betão ----
MA = "AGE-ESP-MATERIAIS-BETAO"
q(MA, "MAT-01", "Dosagem de 350 kg de cimento por m³ com relação água/cimento de 0,50. Qual a água de amassadura?",
  {"cimento_kg_m3": 350, "a_c": 0.5}, "EN 206 (relação água/cimento)", "água = a/c · cimento",
  350*0.5, "L/m³", 0.01, ["água = 175 L/m³"])
vol = 1000 - 350/3.15*1000/1000 - 175 - 20
q(MA, "MAT-02", "No mesmo betão, cimento com massa volúmica 3,15 kg/dm³ e 2% de ar. Que volume sobra para os agregados?",
  {"cimento_kg": 350, "rho_cimento_kg_dm3": 3.15, "agua_L": 175, "ar_percent": 2},
  "Método dos volumes absolutos (prática de dosagem)", "V_agregados = 1000 − V_cimento − V_água − V_ar",
  vol, "L/m³", 0.02, [f"V cimento = 350/3,15 = {350/3.15:.1f} L", f"V agregados = {vol:.1f} L"])
q(MA, "MAT-03", "Betão com fck = 30 MPa. Qual a resistência média a usar no cálculo de propriedades?",
  {"fck_MPa": 30}, "EN 1992-1-1 quadro 3.1", "fcm = fck + 8", 38.0, "MPa", 0.01, ["fcm = 38 MPa"])
q(MA, "MAT-04", "Com desvio padrão de produção de 5,0 MPa e fck = 30 MPa, qual a resistência média a visar (5% de defeituosos)?",
  {"fck_MPa": 30, "sigma_MPa": 5.0, "k": 1.645}, "EN 206 §8 (critério de conformidade, 5% de defeituosos)",
  "fcm,alvo = fck + 1,645·σ", 30+1.645*5, "MPa", 0.02, [f"fcm,alvo = {30+1.645*5:.2f} MPa"])
Ecm = 22*((38.0)/10)**0.3
q(MA, "MAT-05", "Para fcm = 38 MPa, qual o módulo de elasticidade secante?",
  {"fcm_MPa": 38.0}, "EN 1992-1-1 quadro 3.1", "Ecm = 22·(fcm/10)^0,3", Ecm, "GPa", 0.02,
  [f"(3,8)^0,3 = {(3.8)**0.3:.4f}", f"Ecm = {Ecm:.2f} GPa"])
q(MA, "MAT-06", "Betonagem de 0,50 m³ de betão com massa volúmica 2400 kg/m³. Qual a massa?",
  {"V_m3": 0.5, "rho_kg_m3": 2400}, "Definição de massa volúmica", "m = ρ·V", 1200.0, "kg", 0.01,
  ["m = 1200 kg"])

# ---- Gestão da construção e custos ----
GC = "AGE-ESP-GESTAO-CONSTRUCAO-CUSTOS"
BAC, PV, EV, AC = 10e6, 4e6, 3.6e6, 4.2e6
q(GC, "GES-01", "Obra com orçamento total de 10 M, valor planeado 4,0 M, valor realizado 3,6 M e custo real 4,2 M. Qual o índice de desempenho de custo?",
  {"BAC": BAC, "PV": PV, "EV": EV, "AC": AC}, "PMBOK / EN 15643 (análise do valor realizado)",
  "CPI = EV/AC", EV/AC, "—", 0.02, [f"CPI = 3,6/4,2 = {EV/AC:.4f}"])
q(GC, "GES-02", "Nos mesmos dados, qual o índice de desempenho de prazo?",
  {"EV": EV, "PV": PV}, "PMBOK (análise do valor realizado)", "SPI = EV/PV", EV/PV, "—", 0.02,
  [f"SPI = 3,6/4,0 = {EV/PV:.2f}"])
q(GC, "GES-03", "Mantido esse desempenho de custo, qual o custo final estimado?",
  {"BAC": BAC, "CPI": round(EV/AC, 4)}, "PMBOK (EAC com CPI constante)", "EAC = BAC/CPI",
  BAC/(EV/AC)/1e6, "milhões", 0.02, [f"EAC = 10/{EV/AC:.4f} = {BAC/(EV/AC)/1e6:.3f} M"])
q(GC, "GES-04", "Qual o índice de desempenho para concluir dentro do orçamento?",
  {"BAC": BAC, "EV": EV, "AC": AC}, "PMBOK (TCPI sobre o BAC)", "TCPI = (BAC − EV)/(BAC − AC)",
  (BAC-EV)/(BAC-AC), "—", 0.02, [f"TCPI = 6,4/5,8 = {(BAC-EV)/(BAC-AC):.4f}"])
q(GC, "GES-05", "Equipa que betona 8 m³/h e um volume de 120 m³. Quantas horas de betonagem?",
  {"volume_m3": 120, "produtividade_m3_h": 8}, "Composição de custos unitários (prática de orçamentação)",
  "t = V/produtividade", 15.0, "h", 0.01, ["t = 120/8 = 15 h"])
q(GC, "GES-06", "Pagamento de 1,0 M a receber em 3 anos, taxa de desconto de 8% ao ano. Qual o valor presente?",
  {"FV": 1e6, "i": 0.08, "n": 3}, "Matemática financeira (valor presente)", "VP = FV/(1+i)^n",
  1e6/1.08**3, "unidades monetárias", 0.01, [f"VP = {1e6/1.08**3:.0f}"])

# ---- Petróleo e gás ----
PG = "AGE-ESP-PETROLEO-GAS"
Pp, Dp, Sy, F = 10.0, 508.0, 413.0, 0.72
tmin = Pp*Dp/(2*Sy*F)
q(PG, "PET-01", "Oleoduto de 20\" (508 mm), pressão de projeto 10 MPa, aço X60 (SMYS 413 MPa), fator de projeto 0,72. Qual a espessura mínima de parede?",
  {"P_MPa": Pp, "D_mm": Dp, "SMYS_MPa": Sy, "F": F}, "ASME B31.4 (equação de projeto por pressão interna)",
  "t = P·D/(2·S·F)", tmin, "mm", 0.03, [f"t = 5080/{2*Sy*F:.2f} = {tmin:.3f} mm"])
q(PG, "PET-02", "Com parede de 9,5 mm e a mesma pressão, qual a tensão circunferencial?",
  {"P_MPa": Pp, "D_mm": Dp, "t_mm": 9.5}, "Fórmula de Barlow", "σ = P·D/(2·t)",
  Pp*Dp/(2*9.5), "MPa", 0.02, [f"σ = 5080/19 = {Pp*Dp/(2*9.5):.1f} MPa ({Pp*Dp/(2*9.5)/Sy*100:.1f}% do SMYS)"])
q(PG, "PET-03", "Com 9,5 mm instalados e 8,54 mm necessários, a taxa de corrosão medida é 0,10 mm/ano. Quantos anos de margem?",
  {"t_instalado_mm": 9.5, "t_minimo_mm": 8.54, "taxa_mm_ano": 0.10},
  "API 570 (vida remanescente por espessura)", "vida = (t_atual − t_mínimo)/taxa",
  (9.5-8.54)/0.10, "anos", 0.03, [f"vida = 0,96/0,10 = {(9.5-8.54)/0.10:.1f} anos"])
Vel = (500/3600)/(math.pi*0.4**2/4)
q(PG, "PET-04", "Conduta de 400 mm com 500 m³/h de crude. Qual a velocidade?",
  {"Q_m3_h": 500, "D_m": 0.4}, "Continuidade", "V = Q/(π·D²/4)", Vel, "m/s", 0.03,
  [f"Q = {500/3600:.5f} m³/s", f"V = {Vel:.3f} m/s"])
Re = 850*Vel*0.4/5e-3
q(PG, "PET-05", "Mesmo escoamento, ρ = 850 kg/m³ e μ = 5,0·10⁻³ Pa·s. Qual o número de Reynolds e o regime?",
  {"rho": 850, "V_m_s": round(Vel, 3), "D_m": 0.4, "mu_Pa_s": 5e-3}, "Definição de Reynolds",
  "Re = ρ·V·D/μ", Re, "—", 0.03, [f"Re = {Re:.0f} > 4000 → turbulento"])
Vt = math.pi/4*30**2*12
q(PG, "PET-06", "Tanque cilíndrico de 30 m de diâmetro e 12 m de altura útil. Qual o volume?",
  {"D_m": 30, "H_m": 12}, "Geometria (API 650 para o tanque)", "V = π·D²/4·H", Vt, "m³", 0.02,
  [f"V = {Vt:.0f} m³ ≈ {Vt*6.2898/1000:.0f} mil barris"])

d["questoes"] = Q
d["total"] = len(Q)
d["emitido"] = datetime.date.today().isoformat()
d["por_agente"] = {a: sum(1 for x in Q if x["agente"] == a) for a in sorted({x["agente"] for x in Q})}
json.dump(d, open(P, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
print("total", len(Q))
for a, n in d["por_agente"].items(): print(" ", a, n)
