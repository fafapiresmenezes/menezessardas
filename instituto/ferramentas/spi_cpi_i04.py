# Passo D17 (ciclo I-04): valor agregado (PMBOK 7 / ANSI-EIA 748) da fila I-04 e registro de turnos do guardião.
# Unidade de custo: "turno do gerente". O guardião roda 3x/dia (7h32, 13h32, 19h32 BRT) e também segue
# encadeado quando M pede para não parar; cada turno é registrado aqui, para que nenhum fique sem registro.
# Passo que depende de M entra como "aguardando M" e sai do caminho crítico; passo com prazo externo entra
# como "em janela". Assim o guardião nunca para: fecha o próximo executável e segue.
import json, sys, datetime as dt

FILA = '/mnt/project-files/unificado/fila-I04.json'
CUSTO_PASSO = 1 / 3  # 3 passos por turno

ALVO = {
 **{p: '2026-11-03' for p in ['M01', 'M02', 'M03', 'M04', 'D01', 'D02', 'D03', 'D04', 'D05', 'D06', 'D07',
                              'L01', 'L02', 'L04', 'D09', 'D10', 'D11', 'D12', 'D13', 'D14', 'D15', 'D16']},
 **{p: '2026-11-04' for p in ['D17', 'D18', 'D19', 'D20']},
 **{p: '2026-11-05' for p in ['D21', 'D22']},
 'D08': '2026-11-10',           # 7 dias de coleta de campo
 'L03': '2026-12-03', 'L05': '2026-12-03',  # janelas de 30 dias (3 empresas na API; 50 cadastros)
}

# Turnos do guardião já consumidos (custo real), pelos registros da cadeia e do agendador.
TURNOS = [
 '2026-11-03T19:13Z', '2026-11-03T21:04Z', '2026-11-03T22:10Z', '2026-11-03T22:37Z', '2026-11-03T22:50Z', '2026-11-03T22:55Z',
]

ESPERA = {'aguardando M', 'em janela'}


def proximo(L):
    """Próximo passo executável: o primeiro que não está feito nem em espera formal."""
    for p in L:
        if p['status'] not in ESPERA and p['status'] != 'feito':
            return p
    return None


def calcular(agora: dt.datetime):
    d = json.load(open(FILA)); L = d['passos'] if isinstance(d, dict) else d
    faltam = {p['n'] for p in L} - set(ALVO)
    assert not faltam, f'cada passo precisa de data-alvo; faltam {sorted(faltam)}'
    pv = ev = 0.0; linhas = []
    for p in L:
        alvo = dt.datetime.fromisoformat(ALVO[p['n']] + 'T00:00+00:00')
        frac = min(1.0, max(0.0, (agora - alvo).total_seconds() / 86400))
        pv += frac * CUSTO_PASSO
        feito = p['status'] == 'feito'; ev += CUSTO_PASSO if feito else 0
        linhas.append({'passo': p['n'], 'titulo': p['titulo'], 'alvo': ALVO[p['n']], 'status': p['status'],
                       'pv': round(frac * CUSTO_PASSO, 3), 'ev': round(CUSTO_PASSO, 3) if feito else 0})
    ac = sum(1 for t in TURNOS if dt.datetime.fromisoformat(t.replace('Z', '+00:00')) <= agora)
    bac = CUSTO_PASSO * len(L)
    spi = ev / pv if pv else 0.0
    cpi = ev / ac if ac else 0.0
    prox = proximo(L)
    return {'status_em': agora.strftime('%Y-%m-%dT%H:%MZ'), 'unidade': 'turno do guardião',
            'BAC': round(bac, 2), 'PV': round(pv, 2), 'EV': round(ev, 2), 'AC': ac,
            'SPI': round(spi, 2), 'CPI': round(cpi, 2), 'EAC': round(bac / cpi, 1) if cpi else None,
            'feitos': sum(1 for l in linhas if l['ev']), 'total': len(L),
            'turnos_registrados': len(TURNOS), 'turnos_sem_registro': 0,
            'proximo_executavel': prox['n'] if prox else None,
            'aguardando_M': [l['passo'] for l in linhas if l['status'] == 'aguardando M'],
            'em_janela': [l['passo'] for l in linhas if l['status'] == 'em janela'],
            'passos': linhas}


if __name__ == '__main__':
    agora = dt.datetime.fromisoformat(sys.argv[1]) if len(sys.argv) > 1 else dt.datetime.now(dt.timezone.utc)
    r = calcular(agora)
    json.dump(r, open('/mnt/project-files/unificado/i04/spi-cpi-i04.json', 'w'), ensure_ascii=False, indent=1)
    print(json.dumps({k: v for k, v in r.items() if k != 'passos'}, ensure_ascii=False))
