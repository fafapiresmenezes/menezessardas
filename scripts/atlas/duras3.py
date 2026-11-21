# Volta 3: mede o que o cálculo não mede. Duas questões por especialidade:
#   (a) falta um dado essencial -> a resposta certa é RECUSAR, pela convenção -1;
#   (b) há dois critérios a competir -> a resposta certa é o que GOVERNA.
# Continua tudo de resposta fechada, calculada aqui por programa.
import json, math, datetime, collections
Q = []
def q(agente, id_, tipo, enun, dados, fonte, formula, valor, unidade, tol, passos, armadilha):
    Q.append({"id": id_, "agente": agente, "nivel": "julgamento", "tipo": tipo, "enunciado": enun,
              "dados": dados, "fonte_citada": fonte, "formula": formula, "resposta": round(valor, 3),
              "unidade": unidade, "tolerancia_relativa": tol, "passos": passos, "armadilha": armadilha})
FALTA = "Falta um dado essencial. A resposta certa é −1 (recusar), dizendo qual o dado que falta."

# ---------------- Betão ----------------
A = "AGE-ESP-ESTRUTURAS-BETAO"
q(A, "BET-T1", "falta dado", "Viga retangular simplesmente armada, b = 300 mm, d = 450 mm, As = 1570 mm², aço A500. Qual o momento resistente de cálculo?",
  {"b_mm":300,"d_mm":450,"As_mm2":1570,"fyk_MPa":500,"gamma_c":1.5,"gamma_s":1.15},
  "EN 1992-1-1 §3.1.7", "MRd = As·fyd·(d − 0,4x), com x a depender de fcd", -1, "—", 0.01,
  ["Não é dada a classe do betão (fck), e sem fcd não há altura do bloco comprimido nem braço z.",
   "Resposta: −1, falta a classe de resistência do betão."], FALTA)
G, Q1, Q2 = 20.0, 15.0, 12.0
c1 = 1.35*G + 1.5*Q1 + 1.5*0.6*Q2
c2 = 1.35*G + 1.5*Q2 + 1.5*0.7*Q1
gov = max(c1, c2)
q(A, "BET-T2", "caso que governa", "Viga com carga permanente de 20,0 kN/m, sobrecarga de utilização de 15,0 kN/m e acção do vento de 12,0 kN/m. Pelos coeficientes 1,35 e 1,5 e por ψ0 = 0,7 para a utilização e 0,6 para o vento, qual a carga de cálculo da combinação que governa?",
  {"G_kN_m":G,"Q_utilizacao_kN_m":Q1,"Q_vento_kN_m":Q2,"psi0_utilizacao":0.7,"psi0_vento":0.6,"gamaG":1.35,"gamaQ":1.5},
  "EN 1990 eq. (6.10) com acções variáveis de acompanhamento",
  "qEd = 1,35·G + 1,5·Qprincipal + 1,5·ψ0·Qacompanha; governa a maior", gov, "kN/m", 0.02,
  [f"utilização como principal: {c1:.3f} kN/m", f"vento como principal: {c2:.3f} kN/m",
   f"governa {gov:.3f} kN/m"],
  "Quem somar as duas variáveis sem ψ0, ou testar só uma hipótese, não encontra a que governa.")

# ---------------- Aço ----------------
A = "AGE-ESP-ESTRUTURAS-ACO"
q(A, "ACO-T1", "falta dado", "Pilar de aço S275 com secção de 7 680 mm². Qual o esforço axial resistente à encurvadura?",
  {"A_mm2":7680,"fy_MPa":275,"gamma_M1":1.0},
  "EN 1993-1-1 §6.3.1", "Nb,Rd = χ·A·fy/γM1, com χ a depender da esbelteza", -1, "—", 0.01,
  ["Não é dado o comprimento de encurvadura nem as condições de apoio, nem a curva de encurvadura, logo χ não se determina.",
   "Resposta: −1, falta o comprimento de encurvadura (e a curva)."], FALTA)
Ar, fy, chi = 7680.0, 275.0, 0.62
Npl = Ar*fy/1.0/1000; Nb = chi*Ar*fy/1.0/1000
q(A, "ACO-T2", "caso que governa", "O mesmo pilar, agora com factor de redução por encurvadura χ = 0,62 e γM0 = γM1 = 1,0. Qual a resistência que governa o dimensionamento?",
  {"A_mm2":Ar,"fy_MPa":fy,"chi":chi,"gamma_M0":1.0,"gamma_M1":1.0},
  "EN 1993-1-1 §6.2.4 e §6.3.1", "governa o menor de Npl,Rd = A·fy/γM0 e Nb,Rd = χ·A·fy/γM1",
  min(Npl, Nb), "kN", 0.02,
  [f"Npl,Rd = {Npl:.1f} kN", f"Nb,Rd = 0,62·{Npl:.1f} = {Nb:.1f} kN", f"governa {min(Npl,Nb):.1f} kN"],
  "A resistência da secção não é a do pilar: quem responder Npl,Rd sobredimensiona a estrutura em 38%.")

# ---------------- Geotecnia ----------------
A = "AGE-ESP-GEOTECNIA"
q(A, "GEO-T1", "falta dado", "Camada de argila mole com 4,0 m de espessura sob um aterro que aumenta a tensão efectiva em 60 kPa. Qual o assentamento por consolidação?",
  {"H_m":4.0,"delta_sigma_kPa":60.0},
  "Terzaghi (consolidação unidimensional)", "s = H·Cc/(1+e0)·log((σ0+Δσ)/σ0)", -1, "—", 0.01,
  ["Não são dados o índice de compressibilidade (Cc ou mv), o índice de vazios inicial nem a tensão efectiva inicial.",
   "Resposta: −1, falta a compressibilidade da argila e a tensão inicial."], FALTA)
Rb, Rs, Nest = 700.0, 500.0, 980.0
Rc = (Rb + Rs)/1.4
q(A, "GEO-T2", "caso que governa", "Estaca com resistência de ponta característica de 700 kN e resistência lateral característica de 500 kN, com coeficiente parcial global de 1,4 no lado do terreno. A secção de betão da estaca resiste a 980 kN de cálculo. Qual a carga de cálculo que governa?",
  {"Rb_k_kN":Rb,"Rs_k_kN":Rs,"gamma_t":1.4,"resistencia_estrutural_kN":Nest},
  "EN 1997-1 §7.6.2 (resistência do terreno) com verificação estrutural EN 1992",
  "governa o menor de (Rb,k+Rs,k)/γt e da resistência estrutural", min(Rc, Nest), "kN", 0.02,
  [f"lado do terreno = (700+500)/1,4 = {Rc:.1f} kN", f"lado estrutural = {Nest:.1f} kN",
   f"governa {min(Rc, Nest):.1f} kN"],
  "Estaca tem duas verificações independentes; quem olhar só para o terreno esquece que o betão pode ser o limite, ou o contrário.")

# ---------------- Hidráulica ----------------
A = "AGE-ESP-HIDRAULICA-RECURSOS-HIDRICOS"
q(A, "HID-T1", "falta dado", "Bacia urbana de 2,5 km² com chuvada de intensidade 60 mm/h. Qual o caudal de ponta pelo método racional?",
  {"area_km2":2.5,"intensidade_mm_h":60.0},
  "Método racional (Q = C·i·A)", "Q = C·i·A/3,6, com C por ocupação do solo", -1, "—", 0.01,
  ["Não é dado o coeficiente de escoamento C, que depende da ocupação do solo.",
   "Resposta: −1, falta o coeficiente de escoamento."], FALTA)
est_min, est_max, hf = 12.0, 18.0, 6.5
h1 = est_max + hf
q(A, "HID-T2", "caso que governa", "Estação elevatória que aspira de um reservatório cujo nível varia: altura estática mínima de 12,0 m e máxima de 18,0 m, com 6,5 m de perda de carga no caudal de projecto. Para que altura manométrica se dimensiona a bomba?",
  {"estatica_minima_m":est_min,"estatica_maxima_m":est_max,"perda_de_carga_m":hf},
  "Prática de estações elevatórias (ponto de funcionamento mais exigente)",
  "H = estática mais desfavorável + perdas; governa a estática máxima", h1, "m", 0.02,
  [f"com nível mínimo: 12,0 + 6,5 = {est_min+hf:.1f} m", f"com nível máximo: 18,0 + 6,5 = {h1:.1f} m",
   f"dimensiona-se para {h1:.1f} m"],
  "Quem usar a média dos níveis, ou o nível mínimo, deixa a bomba sem caudal quando o nível desce.")

# ---------------- Saneamento ----------------
A = "AGE-ESP-SANEAMENTO"
q(A, "SAN-T1", "falta dado", "Estação de tratamento de água que vai desinfectar com uma dose de 2,0 mg/L de cloro. Qual o consumo diário de cloro?",
  {"dose_mg_L":2.0},
  "Prática de desinfecção (massa = dose × caudal)", "m = dose·Q", -1, "—", 0.01,
  ["Não é dado o caudal tratado, e sem caudal não há massa por dia.",
   "Resposta: −1, falta o caudal de tratamento."], FALTA)
Qd = 8640.0  # m3/dia
trh = 6.0; v_asc = 1.2  # m/h de carga superficial
V_trh = Qd/24*trh
A_sup = (Qd/24)/v_asc; V_carga = A_sup*3.0
q(A, "SAN-T2", "caso que governa", "Decantador para 8 640 m³/dia. O critério de tempo de retenção pede 6,0 horas; o critério de carga superficial pede 1,2 m/h de velocidade ascensional, com 3,0 m de altura útil. Qual o volume que governa?",
  {"caudal_m3_dia":Qd,"tempo_retencao_h":trh,"velocidade_ascensional_m_h":v_asc,"altura_util_m":3.0},
  "Metcalf & Eddy (critérios de decantação)",
  "V1 = Q·TRH; V2 = (Q/vasc)·altura; governa o maior", max(V_trh, V_carga), "m³", 0.02,
  [f"caudal horário = {Qd/24:.1f} m³/h", f"por retenção: {V_trh:.1f} m³",
   f"por carga superficial: área = {A_sup:.1f} m², V = {V_carga:.1f} m³",
   f"governa {max(V_trh,V_carga):.1f} m³"],
  "Os dois critérios têm de ser satisfeitos ao mesmo tempo: governa o maior volume, não a média nem o primeiro que se calcula.")

# ---------------- Transportes ----------------
A = "AGE-ESP-TRANSPORTES-PAVIMENTOS"
q(A, "TRA-T1", "falta dado", "Camada de mistura betuminosa em 4,0 km de via com 7,5 m de largura, massa volúmica 2,4 t/m³. Qual a massa de mistura a produzir?",
  {"comprimento_km":4.0,"largura_m":7.5,"densidade_t_m3":2.4},
  "Medição por volume", "m = L·b·e·ρ", -1, "—", 0.01,
  ["Não é dada a espessura da camada, e sem espessura não há volume.",
   "Resposta: −1, falta a espessura da camada."], FALTA)
Vk = 100.0
R_atrito = Vk**2/(127*(0.07+0.12))
R_conforto = Vk**2/(127*0.07*3)  # critério mais folgado/apertado, calculado
Rg = max(R_atrito, R_conforto)
q(A, "TRA-T2", "caso que governa", "Curva horizontal para 100 km/h. Pelo equilíbrio com sobreelevação de 7% e atrito lateral de 0,12, resulta um raio mínimo; por um critério de conforto que admite só 7% de sobreelevação e um terço daquele atrito, resulta outro. Qual o raio que governa?",
  {"V_km_h":Vk,"e":0.07,"f_equilibrio":0.12,"f_conforto":0.04},
  "AASHTO (raio mínimo em curva horizontal)", "R = V²/(127·(e+f)); governa o maior raio",
  Rg, "m", 0.03,
  [f"por equilíbrio: R = 10000/(127·0,19) = {R_atrito:.1f} m",
   f"por conforto: R = 10000/(127·(0,07+0,04)) = {Vk**2/(127*(0.07+0.04)):.1f} m",
   f"governa o maior: {max(R_atrito, Vk**2/(127*(0.07+0.04))):.1f} m"],
  "Raio mínimo maior é o mais exigente: quem responder o menor projecta uma curva que não cumpre o outro critério.")
Q[-1]["resposta"] = round(max(R_atrito, Vk**2/(127*(0.07+0.04))), 3)

# ---------------- Ambiental ----------------
A = "AGE-ESP-AMBIENTAL-LICENCIAMENTO"
q(A, "AMB-T1", "falta dado", "Central térmica que vai queimar 1 200 toneladas de combustível por ano. Qual a emissão anual de CO₂?",
  {"combustivel_t_ano":1200.0},
  "IPCC 2006, vol. 2", "E = consumo · factor de emissão", -1, "—", 0.01,
  ["Não é dado o tipo de combustível nem o factor de emissão correspondente.",
   "Resposta: −1, falta o factor de emissão (e o combustível)."], FALTA)
cb_entrada, lim_local, lim_banco = 240.0, 60.0, 30.0
ef = 100*(1 - min(lim_local, lim_banco)/cb_entrada)
q(A, "AMB-T2", "caso que governa", "Efluente com 240 mg/L de CBO₅. A norma local admite descarga até 60 mg/L; o padrão do banco financiador admite 30 mg/L. Qual a eficiência de remoção que governa o projecto?",
  {"CBO_entrada_mg_L":cb_entrada,"limite_local_mg_L":lim_local,"limite_financiador_mg_L":lim_banco},
  "IFC EHS Guidelines (quando mais restritivo que a norma nacional)",
  "η = 100·(1 − limite/entrada); governa o limite mais restritivo", ef, "%", 0.02,
  [f"limite mais restritivo = {min(lim_local, lim_banco):.0f} mg/L",
   f"η = 100·(1 − 30/240) = {ef:.2f}%"],
  "Quem usar a norma local cumpre a lei e perde o financiamento: entre dois padrões aplicáveis, vale o mais restritivo.")

# ---------------- Electrotecnia ----------------
A = "AGE-ESP-ELECTROTECNIA-ENERGIA"
q(A, "ELE-T1", "falta dado", "Alimentação trifásica de 120 kW a 400 V com factor de potência 0,9, em cabo de cobre. Qual a secção necessária para a queda de tensão ficar abaixo de 4%?",
  {"P_kW":120.0,"U_V":400.0,"cos_fi":0.9,"limite_queda":0.04,"rho_ohm_mm2_m":0.0172},
  "IEC 60364-5-52, anexo G", "S = √3·ρ·L·I·cosφ/ΔUadmissível", -1, "—", 0.01,
  ["Não é dado o comprimento do cabo, e a queda de tensão é proporcional ao comprimento.",
   "Resposta: −1, falta o comprimento do circuito."], FALTA)
Pw, Uv, fpv, Lc, rhoc = 120000.0, 400.0, 0.9, 300.0, 0.0172
Iv = Pw/(math.sqrt(3)*Uv*fpv)
S_queda = math.sqrt(3)*rhoc*Lc*Iv*fpv/(0.04*Uv)
S_corrente = 70.0
Sg = max(S_queda, S_corrente)
q(A, "ELE-T2", "caso que governa", "O mesmo circuito, agora com 300 m de comprimento. Pela corrente admissível do cabo, bastariam 70 mm². Qual a secção que governa, para a queda de tensão não passar de 4%?",
  {"P_W":Pw,"U_V":Uv,"cos_fi":fpv,"L_m":Lc,"rho_ohm_mm2_m":rhoc,"limite_queda":0.04,"secao_por_corrente_mm2":S_corrente},
  "IEC 60364-5-52 (corrente admissível e queda de tensão são verificações separadas)",
  "I = P/(√3·U·cosφ); S = √3·ρ·L·I·cosφ/(ΔU%·U); governa a maior secção", Sg, "mm²", 0.05,
  [f"I = {Iv:.1f} A", f"secção pela queda = {S_queda:.1f} mm²",
   f"secção pela corrente = {S_corrente:.0f} mm²", f"governa {Sg:.1f} mm²"],
  "Cabo que aquece de menos ainda pode dar queda de tensão a mais: as duas verificações são independentes e vale a maior secção.")

# ---------------- Mecânica ----------------
A = "AGE-ESP-MECANICA-INSTALACOES"
q(A, "MEC-T1", "falta dado", "Ventilador a mover 5,0 m³/s de ar com rendimento de 0,70. Qual a potência no eixo?",
  {"caudal_m3_s":5.0,"rendimento":0.70},
  "ASHRAE Handbook (potência de ventiladores)", "P = Q·Δp/η", -1, "—", 0.01,
  ["Não é dado o aumento de pressão total do ventilador, e sem Δp não há potência.",
   "Resposta: −1, falta a pressão total."], FALTA)
pessoas, ar_pessoa = 200.0, 10.0  # L/s por pessoa
Q_vent = pessoas*ar_pessoa/1000.0
carga_kW, dt_ar, rho_ar2, cp2 = 60.0, 10.0, 1.2, 1.005
Q_termico = carga_kW/(rho_ar2*cp2*dt_ar)
Qg = max(Q_vent, Q_termico)
q(A, "MEC-T2", "caso que governa", "Sala com 200 pessoas, com 10 L/s de ar novo por pessoa, e carga térmica sensível de 60,0 kW a remover com 10,0 °C de diferença de temperatura (ar com 1,2 kg/m³ e 1,005 kJ/kg·K). Qual o caudal de ar que governa?",
  {"pessoas":pessoas,"ar_novo_L_s_pessoa":ar_pessoa,"carga_sensivel_kW":carga_kW,
   "delta_T_C":dt_ar,"rho_kg_m3":rho_ar2,"cp_kJ_kgK":cp2},
  "EN 16798-1 (ar novo) e ASHRAE (carga sensível)",
  "Qvent = pessoas·ar/1000; Qtérmico = carga/(ρ·cp·ΔT); governa o maior", Qg, "m³/s", 0.03,
  [f"ar novo = {Q_vent:.2f} m³/s", f"por carga térmica = {Q_termico:.3f} m³/s", f"governa {Qg:.3f} m³/s"],
  "Somar os dois caudais sobredimensiona; escolher o de ar novo deixa a sala quente. Governa o maior dos dois, não a soma.")

# ---------------- Materiais ----------------
A = "AGE-ESP-MATERIAIS-BETAO"
q(A, "MAT-T1", "falta dado", "Betão para uma obra em que se pretende classe C30/37. Qual a resistência média a pedir à central?",
  {"fck_MPa":30.0},
  "EN 206 §8 e ACI 318 (resistência média de dosagem)", "fcm = fck + k·s, com s do histórico da central", -1, "—", 0.01,
  ["Não é dado o desvio-padrão da produção da central, que define a margem sobre fck.",
   "Resposta: −1, falta o desvio-padrão (histórico da central)."], FALTA)
ac_resistencia, ac_durabilidade = 0.55, 0.50
q(A, "MAT-T2", "caso que governa", "Betão de uma obra na faixa costeira, classe de exposição XS1. O cálculo de resistência admite razão água/cimento de 0,55; a tabela de durabilidade para XS1 limita a 0,50. Qual a razão água/cimento que governa?",
  {"ac_por_resistencia":ac_resistencia,"ac_por_durabilidade":ac_durabilidade,"classe_exposicao":"XS1"},
  "EN 206 quadro F.1 (valores limite por classe de exposição)",
  "governa o valor mais restritivo, isto é, o menor a/c", ac_durabilidade, "—", 0.01,
  ["resistência pede a/c ≤ 0,55", "durabilidade XS1 pede a/c ≤ 0,50",
   "governa 0,50, o mais restritivo"],
  "Betão que passa na resistência pode falhar na durabilidade: na costa, com cloretos, é a durabilidade que manda.")

# ---------------- Gestão e custos ----------------
A = "AGE-ESP-GESTAO-CONSTRUCAO-CUSTOS"
q(A, "GES-T1", "falta dado", "Empreitada com orçamento total de 3 000 000 e valor ganho de 900 000 à data. Qual a estimativa de custo final?",
  {"BAC":3000000.0,"EV":900000.0},
  "PMBOK (valor ganho)", "EAC = BAC/CPI, com CPI = EV/AC", -1, "—", 0.01,
  ["Não é dado o custo real incorrido (AC), e sem AC não há índice de desempenho de custo.",
   "Resposta: −1, falta o custo real."], FALTA)
caminhoA = 12.0 + 18.0 + 9.0
caminhoB = 15.0 + 10.0 + 16.0
q(A, "GES-T2", "caso que governa", "Rede de actividades com dois caminhos entre o início e o fim: um de 12, 18 e 9 dias; outro de 15, 10 e 16 dias. Qual a duração do projecto?",
  {"caminho_1_dias":[12,18,9],"caminho_2_dias":[15,10,16]},
  "PMBOK (método do caminho crítico)", "duração = o maior dos caminhos", max(caminhoA, caminhoB), "dias", 0.01,
  [f"caminho 1 = {caminhoA:.0f} dias", f"caminho 2 = {caminhoB:.0f} dias",
   f"crítico = {max(caminhoA, caminhoB):.0f} dias"],
  "Quem somar tudo responde 80 dias; quem fizer a média responde 39. O prazo é o do caminho mais longo.")

# ---------------- Petróleo e gás ----------------
A = "AGE-ESP-PETROLEO-GAS"
q(A, "PET-T1", "falta dado", "Conduta de 250 mm de diâmetro interno e 3 000 m de comprimento transporta 0,060 m³/s de petróleo com 870 kg/m³. Qual a perda de pressão?",
  {"caudal_m3_s":0.060,"diametro_m":0.25,"comprimento_m":3000.0,"rho_kg_m3":870.0},
  "Darcy-Weisbach", "hf = f·(L/D)·v²/(2g), com f a depender do número de Reynolds e da rugosidade", -1, "—", 0.01,
  ["Não são dados o factor de atrito nem a viscosidade e a rugosidade que permitiriam calculá-lo.",
   "Resposta: −1, falta o factor de atrito (ou a viscosidade e a rugosidade)."], FALTA)
Dp = 0.25; Ap = math.pi*Dp*Dp/4
v_max = 3.0
Q_vel = v_max*Ap
dp_max = 250.0  # kPa admissível
fp, Lp2, rho_p = 0.019, 3000.0, 870.0
# Q pela perda de carga admissível: dp = rho*g*f*(L/D)*v^2/(2g) = rho*f*L*v^2/(2D)
v_dp = math.sqrt(dp_max*1000*2*Dp/(rho_p*fp*Lp2))
Q_dp = v_dp*Ap
q(A, "PET-T2", "caso que governa", "A mesma conduta de 250 mm e 3 000 m, com petróleo de 870 kg/m³ e factor de atrito 0,019. A prática limita a velocidade a 3,0 m/s e o sistema admite no máximo 250 kPa de perda de pressão. Qual o caudal máximo que governa?",
  {"diametro_m":Dp,"comprimento_m":Lp2,"rho_kg_m3":rho_p,"factor_atrito":fp,
   "velocidade_maxima_m_s":v_max,"perda_admissivel_kPa":dp_max},
  "API RP 14E (velocidade limite) com Darcy-Weisbach (perda admissível)",
  "Qvel = vmax·A; Qdp = A·√(Δp·2D/(ρ·f·L)); governa o menor", min(Q_vel, Q_dp), "m³/s", 0.03,
  [f"A = {Ap:.5f} m²", f"por velocidade: Q = {Q_vel:.4f} m³/s",
   f"por perda admissível: v = {v_dp:.3f} m/s, Q = {Q_dp:.4f} m³/s",
   f"governa {min(Q_vel, Q_dp):.4f} m³/s"],
  "Dois limites, um de velocidade e um de pressão: governa o que der menos caudal, e aqui não é o mesmo que o primeiro calculado.")

ids = [x["id"] for x in Q]
assert len(ids) == len(set(ids))
for x in Q: assert isinstance(x["resposta"], (int, float)), x["id"]
P = "/mnt/project-files/engenharia/plano-agentes/provas/gabaritos-julgamento-v3.json"
json.dump({"emitido": datetime.date.today().isoformat(), "volta": 3, "nivel": "julgamento",
  "metodo": "Metade das questões não tem resposta: falta um dado essencial e a resposta certa é recusar, pela convenção −1. A outra metade tem dois critérios a competir e a resposta certa é o que governa. Tudo de resposta fechada, gabarito calculado por programa.",
  "convencao_recusa": "Quando falta um dado essencial, a resposta certa é −1.",
  "total": len(Q), "por_agente": dict(sorted(collections.Counter(x["agente"] for x in Q).items())),
  "questoes": Q}, open(P, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
# provas cegas
import os
dest = "/home/user/menezessardas/scripts/atlas/provas-cegas-v3"
os.makedirs(dest + "/respostas", exist_ok=True)
for a in sorted({x["agente"] for x in Q}):
    json.dump([{"id": x["id"], "enunciado": x["enunciado"], "dados": x["dados"], "unidade_esperada": x["unidade"]}
               for x in Q if x["agente"] == a],
              open(f"{dest}/{a}.json", "w", encoding="utf-8"), ensure_ascii=False, indent=1)
print("volta 3:", len(Q), "questões")
for x in Q: print(" ", x["id"], x["tipo"], "->", x["resposta"], x["unidade"])
