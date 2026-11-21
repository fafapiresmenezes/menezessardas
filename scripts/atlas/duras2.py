# Volta 2, segunda parte: questões duras para as 7 especialidades que faltavam.
# Mesmo método: vários passos, armadilha declarada, resposta fechada e calculada
# aqui por programa, para o gabarito não trazer erro de conta.
import json, math, datetime
P = "/mnt/project-files/engenharia/plano-agentes/provas/gabaritos-duras-v2.json"
d = json.load(open(P, encoding="utf-8"))
Q = [q for q in d["questoes"]]
def q(agente, id_, enun, dados, fonte, formula, valor, unidade, tol, passos, armadilha):
    if any(x["id"] == id_ for x in Q): return
    Q.append({"id": id_, "agente": agente, "nivel": "dura", "enunciado": enun, "dados": dados,
              "fonte_citada": fonte, "formula": formula, "resposta": round(valor, 3),
              "unidade": unidade, "tolerancia_relativa": tol, "passos": passos, "armadilha": armadilha})

# ---- Transportes e pavimentos ----
T = "AGE-ESP-TRANSPORTES-PAVIMENTOS"
cam, fe, cres, anos, dir_, faixa = 1200.0, 2.4, 0.03, 20, 0.5, 0.8
fator = ((1+cres)**anos - 1)/cres
esal = cam*fe*dir_*faixa*365*fator
q(T, "TRA-D1", "Via com 1 200 camiões por dia nos dois sentidos, factor de equivalência 2,4 eixos-padrão por camião, crescimento de 3% por ano, 20 anos de projecto, 50% num sentido e 80% desse tráfego na faixa de projecto. Quantos eixos-padrão acumulados?",
  {"camioes_dia": cam, "factor_equivalencia": fe, "crescimento": cres, "anos": anos,
   "factor_sentido": dir_, "factor_faixa": faixa},
  "AASHTO (eixos-padrão acumulados de 80 kN)",
  "ESAL = camiões·FE·fs·ff·365·[(1+i)^n − 1]/i", esal, "eixos-padrão", 0.03,
  [f"factor de crescimento = (1,03²⁰ − 1)/0,03 = {fator:.3f}",
   f"camiões na faixa = 1200·0,5·0,8 = {cam*dir_*faixa:.0f}/dia",
   f"ESAL = {cam*dir_*faixa:.0f}·2,4·365·{fator:.3f} = {esal:,.0f}"],
  "Quem usar o factor de crescimento como (1+i)^n, em vez da soma da série, ou esquecer o sentido e a faixa, erra por mais de uma ordem de grandeza.")
t0, v, c = 10.0, 1800.0, 2000.0
t = t0*(1 + 0.15*(v/c)**4)
q(T, "TRA-D2", "Trecho com tempo de percurso em fluxo livre de 10,0 minutos, fluxo de 1 800 veículos por hora e capacidade de 2 000 veículos por hora. Qual o tempo de percurso pela função BPR (α = 0,15, β = 4)?",
  {"t0_min": t0, "fluxo_v_h": v, "capacidade_v_h": c, "alfa": 0.15, "beta": 4},
  "Bureau of Public Roads (função de desempenho de via)", "t = t0·[1 + α·(v/c)^β]", t, "min", 0.02,
  [f"v/c = {v/c:.2f}", f"(v/c)^4 = {(v/c)**4:.4f}", f"t = 10·(1 + 0,15·{(v/c)**4:.4f}) = {t:.3f} min"],
  "Quem elevar v/c a 4 depois de multiplicar por α, ou trocar fluxo por capacidade, erra.")

# ---- Ambiental e licenciamento ----
AM = "AGE-ESP-AMBIENTAL-LICENCIAMENTO"
pot, horas, cons, fator_co2 = 500.0, 4000.0, 0.25, 2.68
energia = pot*horas; litros = energia*cons; co2 = litros*fator_co2/1000
q(AM, "AMB-D1", "Grupo gerador a gasóleo de 500 kW a funcionar 4 000 horas por ano à potência nominal, consumo específico de 0,25 litros por kWh e factor de emissão de 2,68 kg de CO₂ por litro de gasóleo. Qual a emissão anual?",
  {"potencia_kW": pot, "horas_ano": horas, "consumo_L_kWh": cons, "factor_kgCO2_L": fator_co2},
  "IPCC 2006, vol. 2 (combustão estacionária); factor por litro de gasóleo",
  "E = P·h·consumo·factor", co2, "t CO₂/ano", 0.02,
  [f"energia = 500·4000 = {energia:,.0f} kWh", f"gasóleo = {energia:,.0f}·0,25 = {litros:,.0f} L",
   f"CO₂ = {litros:,.0f}·2,68 = {litros*fator_co2:,.0f} kg = {co2:,.1f} t"],
  "A resposta pede toneladas; quem deixar em quilogramas erra por mil. O consumo é por kWh, não por hora.")
l1, l2 = 85.0, 88.0
soma = 10*math.log10(10**(l1/10) + 10**(l2/10))
ate = soma - 20*math.log10(50/10)
q(AM, "AMB-D2", "Duas fontes pontuais, medidas a 10 m, dão 85,0 dB(A) e 88,0 dB(A). Qual o nível somado a 50 m, só com divergência geométrica e sem absorção do ar nem do solo?",
  {"L1_dBA": l1, "L2_dBA": l2, "distancia_medida_m": 10, "distancia_pedida_m": 50},
  "ISO 9613-2 (divergência geométrica de fonte pontual)",
  "Lsoma = 10·log(10^(L1/10) + 10^(L2/10)); L(d) = Lsoma − 20·log(d/d0)", ate, "dB(A)", 0.02,
  [f"soma energética = {soma:.2f} dB(A)", f"divergência = 20·log(5) = {20*math.log10(5):.2f} dB",
   f"L(50 m) = {soma:.2f} − {20*math.log10(5):.2f} = {ate:.2f} dB(A)"],
  "Decibéis não se somam aritmeticamente (85+88 ≠ 173) e a queda com a distância é 20·log, não 10·log.")

# ---- Electrotecnia e energia ----
EL = "AGE-ESP-ELECTROTECNIA-ENERGIA"
Pot, U, fp, L, rho, S = 150000.0, 400.0, 0.85, 300.0, 0.0172, 95.0
I = Pot/(math.sqrt(3)*U*fp); R = rho*L/S; dU = math.sqrt(3)*I*R*fp; pc = 100*dU/U
q(EL, "ELE-D1", "Alimentação trifásica de 150 kW a 400 V, factor de potência 0,85, cabo de cobre de 95 mm² com 300 m de comprimento (resistividade 0,0172 Ω·mm²/m). Desprezando a reactância, qual a queda de tensão em percentagem?",
  {"P_W": Pot, "U_V": U, "cos_fi": fp, "L_m": L, "rho_ohm_mm2_m": rho, "S_mm2": S},
  "IEC 60364-5-52, anexo G (queda de tensão em canalização trifásica)",
  "I = P/(√3·U·cosφ); R = ρ·L/S; ΔU = √3·I·R·cosφ; ΔU% = 100·ΔU/U", pc, "%", 0.03,
  [f"I = {I:.1f} A", f"R = 0,0172·300/95 = {R:.4f} Ω", f"ΔU = {dU:.2f} V", f"ΔU% = {pc:.2f}%"],
  "O comprimento é só de ida: em trifásico entra uma vez, com o √3. Quem duplicar o comprimento como em monofásico erra ao dobro.")
kwp, irrad, pr = 500.0, 5.5, 0.78
ener = kwp*irrad*365*pr
q(EL, "ELE-D2", "Central solar de 500 kWp num sítio com 5,5 kWh/m² por dia de irradiação no plano dos módulos e razão de desempenho de 0,78. Qual a produção anual?",
  {"potencia_kWp": kwp, "irradiacao_kWh_m2_dia": irrad, "razao_desempenho": pr},
  "IEC 61724-1 (razão de desempenho)", "E = Pkwp·H·365·PR", ener, "kWh/ano", 0.02,
  [f"energia diária = 500·5,5·0,78 = {kwp*irrad*pr:,.0f} kWh", f"anual = {ener:,.0f} kWh"],
  "A irradiação é diária: quem a tomar por anual erra por 365. A razão de desempenho multiplica, não divide.")

# ---- Mecânica e instalações ----
ME = "AGE-ESP-MECANICA-INSTALACOES"
caudal, rho_ar, cp, dt = 3.0, 1.2, 1.005, 12.0
Qkw = caudal*rho_ar*cp*dt; tr = Qkw/3.517
q(ME, "MEC-D1", "Unidade de tratamento de ar com 3,0 m³/s de ar (massa volúmica 1,2 kg/m³, calor específico 1,005 kJ/kg·K) e diferença de temperatura de 12,0 °C na bateria. Qual a potência em toneladas de refrigeração?",
  {"caudal_m3_s": caudal, "rho_kg_m3": rho_ar, "cp_kJ_kgK": cp, "delta_T_C": dt, "kW_por_TR": 3.517},
  "ASHRAE Handbook (potência sensível de ar); 1 TR = 3,517 kW",
  "Q = V̇·ρ·cp·ΔT; TR = Q/3,517", tr, "TR", 0.03,
  [f"Q = 3,0·1,2·1,005·12 = {Qkw:.2f} kW", f"TR = {Qkw:.2f}/3,517 = {tr:.2f}"],
  "A resposta pede toneladas de refrigeração, não kW. O caudal é volúmico e tem de passar a mássico pela massa volúmica.")
Qm3h, H, rend_b, rend_m = 40.0, 32.0, 0.72, 0.92
Ph = 1000*9.81*(Qm3h/3600)*H; Pe = Ph/(rend_b*rend_m)/1000
q(ME, "MEC-D2", "Bomba de água com 40 m³/h a 32 m de altura manométrica, rendimento hidráulico de 0,72 e rendimento do motor de 0,92. Qual a potência eléctrica absorvida?",
  {"caudal_m3_h": Qm3h, "altura_m": H, "rendimento_bomba": rend_b, "rendimento_motor": rend_m},
  "ISO 17769-1 (potência de bombas)", "Ph = ρ·g·Q·H; Pe = Ph/(ηb·ηm)", Pe, "kW", 0.03,
  [f"Q = 40/3600 = {Qm3h/3600:.5f} m³/s", f"Ph = {Ph:.0f} W", f"Pe = {Pe:.3f} kW"],
  "O caudal vem em m³/h e tem de passar a m³/s. Os dois rendimentos multiplicam-se no denominador; quem usar só um erra.")

# ---- Materiais de construção ----
MA = "AGE-ESP-MATERIAIS-BETAO"
cim, ac = 350.0, 0.50
agua_total = cim*ac
areia, hum, abs_ = 500.0, 0.04, 0.01
correcao = areia*(hum-abs_); agua_amassadura = agua_total - correcao
q(MA, "MAT-D1", "Composição de betão com 350 kg de cimento por m³ e razão água/cimento de 0,50. A areia entra com 500 kg por m³, tem 4% de humidade e 1% de absorção. Qual a água a juntar na amassadura?",
  {"cimento_kg_m3": cim, "agua_cimento": ac, "areia_kg_m3": areia, "humidade": hum, "absorcao": abs_},
  "ACI 211.1 (correcção de humidade dos agregados)",
  "água efectiva = a/c·cimento; água de amassadura = água efectiva − areia·(humidade − absorção)",
  agua_amassadura, "L/m³", 0.02,
  [f"água efectiva = 0,50·350 = {agua_total:.1f} kg", f"água livre na areia = 500·(0,04 − 0,01) = {correcao:.1f} kg",
   f"água de amassadura = {agua_total:.1f} − {correcao:.1f} = {agua_amassadura:.1f} L"],
  "Só a água acima da absorção conta: quem descontar os 4% inteiros tira 20 kg em vez de 15 e seca o betão.")
carga, lado = 720e3, 150.0
fcub = carga/(lado*lado); fcil = 0.80*fcub
q(MA, "MAT-D2", "Cubo de 150 mm de aresta rompe a 720 kN. Qual a resistência equivalente em provete cilíndrico, tomando 0,80 como razão entre cilindro e cubo?",
  {"carga_N": carga, "aresta_mm": lado, "razao_cilindro_cubo": 0.80},
  "EN 206, quadro 7 (classes fck,cil/fck,cub)", "fcubo = F/A; fcilindro = 0,80·fcubo", fcil, "MPa", 0.02,
  [f"A = 150² = {lado*lado:.0f} mm²", f"fcubo = 720000/{lado*lado:.0f} = {fcub:.2f} MPa",
   f"fcilindro = 0,80·{fcub:.2f} = {fcil:.2f} MPa"],
  "A área é a da face carregada, em mm², e a razão 0,80 reduz: quem dividir por 0,80 sobe a resistência em vez de a baixar.")

# ---- Gestão da construção e custos ----
GE = "AGE-ESP-GESTAO-CONSTRUCAO-CUSTOS"
BAC, PV, EV, AC = 2000000.0, 800000.0, 720000.0, 900000.0
CPI = EV/AC; SPI = EV/PV; EAC = BAC/CPI
q(GE, "GES-D1", "Empreitada com orçamento total de 2 000 000, valor planeado de 800 000, valor ganho de 720 000 e custo real de 900 000 à data. Qual a estimativa de custo final, pelo índice de desempenho de custo?",
  {"BAC": BAC, "PV": PV, "EV": EV, "AC": AC},
  "PMBOK (análise de valor ganho)", "CPI = EV/AC; EAC = BAC/CPI", EAC, "unidades monetárias", 0.02,
  [f"CPI = 720000/900000 = {CPI:.3f}", f"SPI = 720000/800000 = {SPI:.3f} (prazo também atrasado)",
   f"EAC = 2000000/{CPI:.3f} = {EAC:,.0f}"],
  "O índice de custo usa o custo real, não o planeado. Quem usar o SPI responde 2 222 222 e troca atraso por derrapagem.")
direto, ind, lucro, imp = 85.0, 0.18, 0.10, 0.05
preco = direto*(1+ind)*(1+lucro)*(1+imp)
q(GE, "GES-D2", "Custo directo de 85,00 por m³. Sobre ele incidem 18% de encargos de estaleiro, depois 10% de lucro e depois 5% de imposto, cada um sobre o valor já acumulado. Qual o preço unitário?",
  {"custo_directo": direto, "encargos": ind, "lucro": lucro, "imposto": imp},
  "Prática de orçamentação (composição de preço unitário)",
  "P = CD·(1+e)·(1+l)·(1+i)", preco, "por m³", 0.01,
  [f"com encargos = 85·1,18 = {direto*1.18:.2f}", f"com lucro = {direto*1.18*1.10:.2f}",
   f"com imposto = {preco:.2f}"],
  "As percentagens são em cascata, não somadas: 18+10+5 = 33% daria 113,05 em vez de 115,86.")

# ---- Petróleo e gás ----
PE = "AGE-ESP-PETROLEO-GAS"
Qp, D, Lp, f, rho_o = 0.05, 0.20, 2000.0, 0.018, 850.0
A = math.pi*D*D/4; vel = Qp/A; hf = f*(Lp/D)*vel*vel/(2*9.81); dp = rho_o*9.81*hf/1000
q(PE, "PET-D1", "Conduta de 200 mm de diâmetro interno e 2 000 m de comprimento transporta 0,050 m³/s de petróleo (massa volúmica 850 kg/m³), com factor de atrito de Darcy de 0,018. Qual a perda de pressão?",
  {"caudal_m3_s": Qp, "diametro_m": D, "comprimento_m": Lp, "factor_atrito": f, "rho_kg_m3": rho_o},
  "Darcy-Weisbach (escoamento em conduta cheia)",
  "v = Q/A; hf = f·(L/D)·v²/(2g); Δp = ρ·g·hf", dp, "kPa", 0.03,
  [f"A = {A:.5f} m²", f"v = {vel:.4f} m/s", f"hf = {hf:.2f} m de coluna de petróleo", f"Δp = {dp:.1f} kPa"],
  "A altura de perda converte-se em pressão com a massa volúmica do petróleo, não da água. O diâmetro entra ao quadrado na área e mais uma vez em L/D.")
bbl, dias, uptime = 2500.0, 30.0, 0.95
m3 = bbl*0.158987*dias*uptime
q(PE, "PET-D2", "Poço com 2 500 barris por dia de produção bruta, 30 dias de mês e 95% de disponibilidade. Qual a produção do mês em metros cúbicos (1 barril = 0,158987 m³)?",
  {"bpd": bbl, "dias": dias, "disponibilidade": uptime, "m3_por_barril": 0.158987},
  "API (unidades de medição de petróleo)", "V = bpd·0,158987·dias·disponibilidade", m3, "m³", 0.01,
  [f"por dia = 2500·0,158987 = {bbl*0.158987:.2f} m³", f"mês = {bbl*0.158987:.2f}·30·0,95 = {m3:.1f} m³"],
  "A disponibilidade reduz o total; quem a esquecer responde 11 924 m³. Barril de petróleo não é 0,16 m³ arredondado a 0,2.")

ids = [x["id"] for x in Q]
assert len(ids) == len(set(ids)), "id repetido"
for x in Q:
    assert isinstance(x["resposta"], (int, float)), x["id"]
import collections
d["questoes"] = Q; d["total"] = len(Q)
d["emitido"] = datetime.date.today().isoformat()
d["por_agente"] = dict(sorted(collections.Counter(x["agente"] for x in Q).items()))
json.dump(d, open(P, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
print("duras:", len(Q)); print(d["por_agente"])
for x in Q[-14:]: print(" ", x["id"], x["resposta"], x["unidade"])
