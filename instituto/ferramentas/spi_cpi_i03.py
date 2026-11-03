# Passo C22 (ciclo I-03): valor agregado (PMBOK 7 / ANSI-EIA 748) do ciclo I-03.
# Unidade de custo: "turno do gerente" (execução agendada 3x/dia). Orçamento: 1/3 de turno por passo (3 passos por turno).
# Linha de base fixada em 02/11/2026 10:50Z; datas-alvo seguem a ordem da fila e prazos fixos dos próprios KPIs.
import json, sys, datetime as dt
FILA = '/mnt/project-files/unificado/fila-I03.json'
ALVO = {  # data-alvo de cada passo
 **{c: '2026-11-01' for c in ['C01','C02','C03','C04','C07','C08','C11','C12','C13','C15']},
 **{c: '2026-11-02' for c in ['C05','C06','C09','C16','C20','C26','C30','C22']},
 **{c: '2026-11-03' for c in ['C23','C24','C25','C27','C28']},
 **{c: '2026-11-04' for c in ['C21']},
 'C17': '2026-11-05',   # DOI depende de conta Zenodo de M
 'C10': '2026-11-08',   # 7 dias de dados de campo
 'C14': '2026-11-09',   # 5 avaliadores SUS
 'C19': '2026-11-30',   # rodada externa do protocolo I-11
 'C18': '2026-12-02', 'C29': '2026-12-02',  # janelas de 30 dias
}
CUSTO_PASSO = 1/3
# Turnos do gerente já consumidos (custo real), pelos registros da cadeia e do agendador.
TURNOS = ['2026-11-01T10:30Z', '2026-11-01T16:32Z', '2026-11-01T22:32Z', '2026-11-02T10:33Z', '2026-11-02T16:32Z', '2026-11-02T22:32Z', '2026-11-03T10:32Z', '2026-11-03T16:33Z']

def calcular(agora: dt.datetime):
    L = json.load(open(FILA)); L = L['passos'] if isinstance(L, dict) else L
    assert set(ALVO) == {p['n'] for p in L}, 'cada passo precisa de data-alvo'
    pv = ev = 0.0; linhas = []
    for p in L:
        alvo = dt.datetime.fromisoformat(ALVO[p['n']] + 'T00:00+00:00')
        frac = min(1.0, max(0.0, (agora - alvo).total_seconds() / 86400))  # valor planejado entra ao longo do dia-alvo
        pv += frac * CUSTO_PASSO
        feito = p['status'] == 'feito'; ev += CUSTO_PASSO if feito else 0
        linhas.append({'passo': p['n'], 'titulo': p['titulo'], 'alvo': ALVO[p['n']], 'status': p['status'], 'pv': round(frac * CUSTO_PASSO, 3), 'ev': CUSTO_PASSO if feito else 0})
    ac = sum(1 for t in TURNOS if dt.datetime.fromisoformat(t.replace('Z', '+00:00')) <= agora)
    bac = CUSTO_PASSO * len(L)
    spi, cpi = ev / pv, ev / ac
    eac = bac / cpi
    return {'status_em': agora.strftime('%Y-%m-%dT%H:%MZ'), 'unidade': 'turno do gerente', 'BAC': round(bac, 2), 'PV': round(pv, 2), 'EV': round(ev, 2), 'AC': ac,
            'SPI': round(spi, 2), 'CPI': round(cpi, 2), 'EAC': round(eac, 1), 'feitos': sum(1 for l in linhas if l['ev']),
            'atrasados_por_M': [l['passo'] for l in linhas if l['pv'] > 0 and not l['ev'] and l['status'] == 'aguardando M'], 'passos': linhas}

if __name__ == '__main__':
    agora = dt.datetime.fromisoformat(sys.argv[1]) if len(sys.argv) > 1 else dt.datetime.now(dt.timezone.utc)
    r = calcular(agora)
    json.dump(r, open('/mnt/project-files/unificado/i03/spi-cpi.json', 'w'), ensure_ascii=False, indent=1)
    print({k: v for k, v in r.items() if k != 'passos'})
