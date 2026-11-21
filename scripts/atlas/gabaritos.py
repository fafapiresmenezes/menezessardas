# Gabaritos de cálculo fechado, volta 1: só questões cuja resposta sai de fórmula
# publicada e pode ser reconferida por qualquer pessoa com calculadora.
# A resposta é CALCULADA aqui (não escrita à mão), para o gabarito não trazer erro de conta.
import json, math, datetime

Q = []
def q(agente, id_, enunciado, dados, fonte, formula, valor, unidade, tol, passos):
    Q.append({"id": id_, "agente": agente, "enunciado": enunciado, "dados": dados,
              "fonte_citada": fonte, "formula": formula,
              "resposta": round(valor, 3), "unidade": unidade, "tolerancia_relativa": tol,
              "passos": passos})

# ---------------- Estruturas de betão (Eurocódigo 2) ----------------
A = "AGE-ESP-ESTRUTURAS-BETAO"
fck, fyk = 30.0, 500.0
fcd, fyd = fck/1.5, fyk/1.15
b, d, As = 300.0, 450.0, 1570.0
Fs = As*fyd; x = Fs/(0.8*b*fcd); z = d - 0.4*x; MRd = Fs*z/1e6
q(A, "BET-01", "Viga retangular simplesmente armada, b=300 mm, d=450 mm, As=1570 mm² (5Ø20), C30/37, A500. Qual o momento resistente de cálculo?",
  {"b_mm": b, "d_mm": d, "As_mm2": As, "fck_MPa": fck, "fyk_MPa": fyk, "gamma_c": 1.5, "gamma_s": 1.15},
  "EN 1992-1-1 §3.1.7 (bloco retangular, λ=0,8, η=1,0)", "MRd = As·fyd·(d − 0,4x), x = As·fyd/(0,8·b·fcd)", MRd, "kNm", 0.03,
  [f"fcd = 30/1,5 = {fcd:.2f} MPa; fyd = 500/1,15 = {fyd:.2f} MPa",
   f"Fs = As·fyd = {Fs/1000:.1f} kN", f"x = {x:.1f} mm (x/d = {x/d:.3f} < 0,45)",
   f"z = {z:.1f} mm", f"MRd = {MRd:.1f} kNm"])
k = min(1+math.sqrt(200/d), 2.0); rho = min(As/(b*d), 0.02)
vRdc = 0.12*k*(100*rho*fck)**(1/3); VRdc = vRdc*b*d/1000
vmin = 0.035*k**1.5*fck**0.5
q(A, "BET-02", "Mesma viga, sem armadura de esforço transverso. Qual o esforço transverso resistente?",
  {"b_mm": b, "d_mm": d, "As_mm2": As, "fck_MPa": fck},
  "EN 1992-1-1 eq. (6.2.a) e (6.2.b)", "VRd,c = [CRd,c·k·(100·ρl·fck)^(1/3)]·bw·d, CRd,c = 0,18/γc", VRdc, "kN", 0.03,
  [f"k = 1 + √(200/450) = {k:.3f}", f"ρl = {rho:.5f}", f"v = {vRdc:.4f} MPa (mínimo da eq. 6.2.b: {vmin:.4f} MPa, não governa)",
   f"VRd,c = {VRdc:.1f} kN"])
fctm = 0.3*fck**(2/3); Asmin = max(0.26*fctm/fyk*b*d, 0.0013*b*d)
q(A, "BET-03", "Qual a armadura mínima de tração da mesma secção?",
  {"b_mm": b, "d_mm": d, "fck_MPa": fck, "fyk_MPa": fyk},
  "EN 1992-1-1 §9.2.1.1 eq. (9.1N)", "As,min = máx(0,26·fctm/fyk·bt·d ; 0,0013·bt·d)", Asmin, "mm²", 0.02,
  [f"fctm = 0,3·30^(2/3) = {fctm:.3f} MPa", f"0,26·fctm/fyk·bt·d = {0.26*fctm/fyk*b*d:.1f} mm²",
   f"0,0013·bt·d = {0.0013*b*d:.1f} mm²", f"As,min = {Asmin:.1f} mm²"])
fctd = 0.7*fctm/1.5; fbd = 2.25*fctd; lb = (20/4)*(fyd/fbd)
q(A, "BET-04", "Comprimento de amarração de referência de um Ø20 em boas condições de aderência, tensão igual a fyd.",
  {"phi_mm": 20, "fck_MPa": fck, "fyk_MPa": fyk, "eta1": 1.0, "eta2": 1.0},
  "EN 1992-1-1 §8.4.2 e §8.4.3", "lb,rqd = (φ/4)·(σsd/fbd), fbd = 2,25·η1·η2·fctd", lb, "mm", 0.03,
  [f"fctk,0,05 = 0,7·fctm = {0.7*fctm:.3f} MPa; fctd = {fctd:.3f} MPa", f"fbd = {fbd:.3f} MPa",
   f"lb,rqd = 5·({fyd:.1f}/{fbd:.3f}) = {lb:.0f} mm"])
Ac = 400.0*400.0; Asc = 1257.0; NRd = (0.85*fcd*(Ac-Asc) + Asc*fyd)/1000
q(A, "BET-05", "Pilar curto 400×400 mm, C30/37, 4Ø20, carga centrada. Qual a resistência à compressão?",
  {"secao_mm": "400x400", "As_mm2": Asc, "fck_MPa": fck, "fyk_MPa": fyk},
  "EN 1992-1-1 §6.1 (compressão centrada, αcc = 0,85)", "NRd = 0,85·fcd·(Ac − As) + As·fyd", NRd, "kN", 0.03,
  [f"0,85·fcd·(Ac−As) = {0.85*fcd*(Ac-Asc)/1000:.0f} kN", f"As·fyd = {Asc*fyd/1000:.0f} kN", f"NRd = {NRd:.0f} kN"])

# ---------------- Estruturas metálicas (Eurocódigo 3) ----------------
B = "AGE-ESP-ESTRUTURAS-ACO"
Aipe, Wpl, Iz = 5381.0, 628.4e3, 603.8e4
fy = 235.0
Npl = Aipe*fy/1000
q(B, "ACO-01", "IPE 300 em S235, tração centrada. Qual a resistência plástica da secção?",
  {"perfil": "IPE 300", "A_mm2": Aipe, "fy_MPa": fy, "gamma_M0": 1.0},
  "EN 1993-1-1 eq. (6.6)", "Npl,Rd = A·fy/γM0", Npl, "kN", 0.02,
  [f"Npl,Rd = {Aipe:.0f}·235/1,0 = {Npl:.1f} kN"])
Mpl = Wpl*fy/1e6
q(B, "ACO-02", "IPE 300 em S235, flexão em torno do eixo forte, secção classe 1. Qual o momento plástico resistente?",
  {"perfil": "IPE 300", "Wpl_y_mm3": Wpl, "fy_MPa": fy, "gamma_M0": 1.0},
  "EN 1993-1-1 eq. (6.13)", "Mpl,Rd = Wpl·fy/γM0", Mpl, "kNm", 0.02,
  [f"Mpl,Rd = 628,4·10³·235/10⁶ = {Mpl:.1f} kNm"])
bf, tf, tw, r = 150.0, 10.7, 7.1, 15.0
Av = Aipe - 2*bf*tf + (tw + 2*r)*tf
Vpl = Av*fy/(math.sqrt(3))/1000
q(B, "ACO-03", "IPE 300 em S235. Qual o esforço transverso plástico resistente?",
  {"perfil": "IPE 300", "b_mm": bf, "tf_mm": tf, "tw_mm": tw, "r_mm": r, "fy_MPa": fy},
  "EN 1993-1-1 §6.2.6 (Av para perfis laminados em I, carga paralela à alma)",
  "Av = A − 2·b·tf + (tw + 2r)·tf; Vpl,Rd = Av·(fy/√3)/γM0", Vpl, "kN", 0.03,
  [f"Av = {Av:.0f} mm²", f"Vpl,Rd = {Vpl:.1f} kN"])
L = 4000.0; E = 210000.0
Ncr = math.pi**2*E*Iz/L**2/1000
q(B, "ACO-04", "Pilar IPE 300 bi-articulado, 4,00 m, encurvadura em torno do eixo fraco. Qual a carga crítica de Euler?",
  {"perfil": "IPE 300", "L_mm": L, "Iz_mm4": Iz, "E_MPa": E},
  "EN 1993-1-1 §6.3.1.3 (Ncr elástico, caso de Euler)", "Ncr = π²·E·Iz/L²", Ncr, "kN", 0.02,
  [f"Ncr = π²·210000·6,038·10⁶/4000² = {Ncr:.1f} kN"])
lam = math.sqrt(Aipe*fy/(Ncr*1000))
q(B, "ACO-05", "Para esse mesmo pilar, qual a esbelteza normalizada?",
  {"A_mm2": Aipe, "fy_MPa": fy, "Ncr_kN": round(Ncr, 1)},
  "EN 1993-1-1 eq. (6.50)", "λ̄ = √(A·fy/Ncr)", lam, "—", 0.02,
  [f"λ̄ = √({Aipe:.0f}·235/{Ncr*1000:.0f}) = {lam:.4f}"])
Fv = 0.6*800*245/1.25/1000
q(B, "ACO-06", "Parafuso M20 classe 8.8, corte simples, plano de corte na zona roscada. Qual a resistência ao corte?",
  {"parafuso": "M20 8.8", "As_mm2": 245, "fub_MPa": 800, "alpha_v": 0.6, "gamma_M2": 1.25},
  "EN 1993-1-8 quadro 3.4", "Fv,Rd = αv·fub·As/γM2", Fv, "kN", 0.02,
  [f"Fv,Rd = 0,6·800·245/1,25 = {Fv:.1f} kN"])

# ---------------- Geotecnia ----------------
G = "AGE-ESP-GEOTECNIA"
phi = 30.0; Ka = (1-math.sin(math.radians(phi)))/(1+math.sin(math.radians(phi)))
H, gama = 5.0, 18.0; Pa = 0.5*Ka*gama*H**2
q(G, "GEO-01", "Muro de 5,00 m, aterro arenoso seco, γ = 18 kN/m³, φ' = 30°, superfície horizontal, muro sem atrito. Qual o empuxo ativo total por metro?",
  {"H_m": H, "gama_kN_m3": gama, "phi_graus": phi},
  "Rankine (teoria clássica; ver também EN 1997-1 anexo C)", "Ka = (1−sen φ')/(1+sen φ'); Pa = ½·Ka·γ·H²", Pa, "kN/m", 0.02,
  [f"Ka = {Ka:.4f}", f"Pa = ½·{Ka:.4f}·18·25 = {Pa:.1f} kN/m, aplicado a H/3 = {H/3:.2f} m da base"])
cu, D = 50.0, 1.5
qu = 5.14*cu + gama*D
q(G, "GEO-02", "Sapata corrida sobre argila saturada, cu = 50 kPa, assente a 1,50 m, γ = 18 kN/m³. Qual a capacidade de carga última a curto prazo?",
  {"cu_kPa": cu, "D_m": D, "gama_kN_m3": gama},
  "Prandtl/Skempton, condição não drenada (Nc = 5,14 para sapata corrida)", "qu = 5,14·cu + γ·D", qu, "kPa", 0.03,
  [f"5,14·50 = {5.14*cu:.0f} kPa", f"γ·D = {gama*D:.0f} kPa", f"qu = {qu:.0f} kPa"])
sig = 2*18.0 + 4*20.0; u = 4*9.81; sigl = sig - u
q(G, "GEO-03", "Perfil com nível de água a 2,00 m: 0–2 m γ = 18 kN/m³, 2–6 m γsat = 20 kN/m³. Qual a tensão vertical efetiva a 6,00 m?",
  {"NA_m": 2.0, "gama_kN_m3": 18.0, "gama_sat_kN_m3": 20.0, "z_m": 6.0, "gama_w_kN_m3": 9.81},
  "Princípio das tensões efetivas de Terzaghi", "σ'v = σv − u", sigl, "kPa", 0.02,
  [f"σv = 2·18 + 4·20 = {sig:.0f} kPa", f"u = 4·9,81 = {u:.2f} kPa", f"σ'v = {sigl:.2f} kPa"])
Cc, e0, Hc, s0, ds = 0.3, 0.9, 4000.0, 100.0, 80.0
Sc = Cc/(1+e0)*Hc*math.log10((s0+ds)/s0)
q(G, "GEO-04", "Camada de argila normalmente consolidada de 4,00 m, Cc = 0,30, e0 = 0,90, σ'0 = 100 kPa, acréscimo de 80 kPa. Qual o assentamento por consolidação?",
  {"Cc": Cc, "e0": e0, "H_mm": Hc, "sigma0_kPa": s0, "delta_sigma_kPa": ds},
  "Terzaghi, consolidação unidimensional", "Sc = Cc/(1+e0)·H·log₁₀((σ'0+Δσ)/σ'0)", Sc, "mm", 0.03,
  [f"Cc/(1+e0) = {Cc/(1+e0):.5f}", f"log₁₀(1,8) = {math.log10(1.8):.5f}", f"Sc = {Sc:.1f} mm"])
Tv, Hdr, cv = 0.848, 2.0, 3.0
t = Tv*Hdr**2/cv
q(G, "GEO-05", "Mesma camada, drenada pelas duas faces, cv = 3,0 m²/ano. Em quanto tempo atinge 90% da consolidação?",
  {"U_percent": 90, "Tv": Tv, "H_dr_m": Hdr, "cv_m2_ano": cv},
  "Terzaghi (Tv = 0,848 para U = 90%)", "t = Tv·H_dr²/cv", t, "anos", 0.03,
  [f"t = 0,848·4/3 = {t:.3f} anos ≈ {t*12:.1f} meses"])
phi2, beta = 32.0, 20.0
FS = math.tan(math.radians(phi2))/math.tan(math.radians(beta))
q(G, "GEO-06", "Talude infinito em areia seca sem coesão, φ' = 32°, inclinação 20°. Qual o fator de segurança?",
  {"phi_graus": phi2, "beta_graus": beta},
  "Equilíbrio de talude infinito (solo granular seco)", "FS = tan φ'/tan β", FS, "—", 0.02,
  [f"tan 32° = {math.tan(math.radians(phi2)):.4f}; tan 20° = {math.tan(math.radians(beta)):.4f}", f"FS = {FS:.3f}"])

saida = {
  "emitido": datetime.date.today().isoformat(),
  "volta": 1,
  "metodo": "Só questões de cálculo fechado: a resposta sai de fórmula publicada e é reconferível com calculadora. O gabarito foi calculado por programa, não escrito à mão. Nenhuma norma é copiada: só se cita o número da cláusula.",
  "aviso": "Estes gabaritos não substituem a revisão de engenheiro habilitado. Servem para dar nota à parte calculável; a parte de julgamento fica por provar.",
  "total": len(Q),
  "por_agente": {a: sum(1 for x in Q if x["agente"] == a) for a in sorted({x["agente"] for x in Q})},
  "questoes": Q,
}
p = "/mnt/project-files/engenharia/plano-agentes/provas/gabaritos-calculo-v1.json"
json.dump(saida, open(p, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
print("gabaritos:", len(Q), saida["por_agente"])
for x in Q: print(" ", x["id"], x["resposta"], x["unidade"])
