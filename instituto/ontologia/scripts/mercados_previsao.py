"""Família 4 — mercados de previsão como DADO DE TERCEIROS (Polymarket e Kalshi).

Regra do projeto: nada de predição na plataforma sem calibragem 100% conferida.
Por isso aqui NÃO há predição do Instituto. Guardamos o preço que o mercado mostra
(preço de 0 a 1 do "Sim", que o mercado lê como chance) com data, hora, volume e
endereço, para servir de termômetro externo ao lado das nossas contas.

Filtros escritos (nada escolhido a dedo):
  * mercado aberto na hora da coleta;
  * volume negociado ≥ 10.000 dólares (abaixo disso o preço é ruído de poucos apostadores);
  * título contém um dos termos de busca ligados aos nichos (lista TERMOS).
Fontes: https://gamma-api.polymarket.com/public-search  e
        https://api.elections.kalshi.com/trade-api/v2/events (com mercados).
Resposta bruta de cada pergunta gravada em bruto/mercados/ com hash.
"""
import hashlib
import json
import re
import sys
import time
import urllib.parse
import urllib.error
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

AQUI = Path(__file__).resolve().parent.parent
BRUTO = AQUI / "bruto" / "mercados"
SAIDA = AQUI / "saida" / "mercados_previsao.json"
VOLUME_MIN = 10_000
# esporte FICA (pedido de M, 21/11): serve para treino, mapeamento de jogador e outros usos,
# sem nada de aposta. Só ganha a marca do nicho "Esporte".
# palavra inteira (\b dos dois lados): sem isso "NFL" casava dentro de "iNFLation" (achado da revisão, rodada 5)
ESPORTE = re.compile(r"\b(?:Série A|AFCON|World Cup|Copa|Champions|FIFA|NBA|NFL|UFC|Grand Prix|F1|Olympics?)\b", re.I)
DO_BRUTO = "--do-bruto" in sys.argv  # refaz a saída a partir das respostas já gravadas, sem baixar de novo

TERMOS = {
    "quantum": ["Quântica", "IA e Cibersegurança"],
    "recession": ["Finanças", "B2B"],
    "Brazil": ["Brasil"],
    "Selic": ["Finanças"],
    "AGI": ["IA e Cibersegurança"],
    "OpenAI": ["IA e Cibersegurança"],
    "cyberattack": ["IA e Cibersegurança", "Segurança"],
    "hack": ["IA e Cibersegurança"],
    "hacked": ["IA e Cibersegurança"],
    "oil": ["Petróleo e Mineração", "Energia"],
    "drought": ["Águas", "Agro"],
    "pandemic": ["Saúde"],
    "Fed": ["Finanças"],
    "tariff": ["B2B", "Cadeia distributiva"],
    "Angola": ["Imbono"],
}


def baixar(url, nome):
    if DO_BRUTO:
        corpo = (BRUTO / nome).read_bytes()
        return json.loads(corpo), hashlib.sha256(corpo).hexdigest()
    req = urllib.request.Request(url, headers={"User-Agent": "pesquisa-academica/1.0"})
    for tentativa in range(6):
        try:
            with urllib.request.urlopen(req, timeout=60) as r:
                corpo = r.read()
            break
        except urllib.error.HTTPError as e:
            if e.code != 429 or tentativa == 5:
                raise
            time.sleep(10 * (tentativa + 1))
    (BRUTO / nome).write_bytes(corpo)
    return json.loads(corpo), hashlib.sha256(corpo).hexdigest()


def num(v):
    try:
        return float(v)
    except (TypeError, ValueError):
        return None


def polymarket(agora, regs):
    itens = {}
    for termo, nichos in TERMOS.items():
        url = ("https://gamma-api.polymarket.com/public-search?" +
               urllib.parse.urlencode({"q": termo, "limit_per_type": 50, "events_status": "active"}))
        d, h = baixar(url, f"polymarket_{termo}.json")
        regs.append({"fonte": "Polymarket", "url": url, "sha256": h})
        for e in d.get("events", []):
            if e.get("closed"):
                continue
            for m in e.get("markets", []):
                if m.get("closed") or not m.get("active", True):
                    continue
                vol = num(m.get("volume")) or num(m.get("volumeNum")) or 0
                if vol < VOLUME_MIN:
                    continue
                q = m.get("question") or ""
                if not re.search(rf"\b{re.escape(termo)}\b", q + " " + (e.get("title") or ""), re.I):
                    continue
                try:
                    precos = [float(x) for x in json.loads(m.get("outcomePrices") or "[]")]
                    nomes = json.loads(m.get("outcomes") or "[]")
                except (ValueError, TypeError):
                    continue
                if not precos or "Yes" not in nomes:
                    continue
                sim = precos[nomes.index("Yes")]
                chave = "pm:" + str(m.get("id"))
                itens.setdefault(chave, {
                    "fonte": "Polymarket", "pergunta": q, "evento": e.get("title"),
                    "preco_sim": sim, "volume": vol, "volume_unidade": "dólares negociados",
                    "encerra": m.get("endDate"), "url": f"https://polymarket.com/event/{e.get('slug')}",
                    "coletado_utc": agora, "termos": [], "nichos": set(),
                })
                itens[chave]["termos"].append(termo)
                itens[chave]["nichos"].update(nichos)
        time.sleep(1)
    return itens


def kalshi(agora, regs):
    itens, cursor, paginas = {}, None, 0
    while paginas < 120:
        p = {"limit": 200, "status": "open", "with_nested_markets": "true"}
        if cursor:
            p["cursor"] = cursor
        url = "https://api.elections.kalshi.com/trade-api/v2/events?" + urllib.parse.urlencode(p)
        d, h = baixar(url, f"kalshi_pagina_{paginas:02d}.json")
        regs.append({"fonte": "Kalshi", "url": url, "sha256": h})
        for e in d.get("events", []):
            titulo = e.get("title") or ""
            for m in e.get("markets", []) or []:
                texto = titulo + " " + (m.get("title") or "") + " " + (m.get("yes_sub_title") or "")
                achados = [t for t in TERMOS if re.search(rf"\b{re.escape(t)}\b", texto, re.I)]
                if not achados:
                    continue
                vol_contratos = num(m.get("volume_fp")) or num(m.get("volume")) or 0
                preco = num(m.get("last_price_dollars")) or (num(m.get("last_price")) or 0) / 100
                face = num(m.get("notional_value_dollars")) or 1.0
                # volume_fp conta CONTRATOS; × valor de face (US$ 1) dá dólares DE FACE, não dólares negociados.
                # A API não traz dólares negociados, então as duas plataformas não são comparáveis entre si.
                vol = vol_contratos * face
                if vol < VOLUME_MIN or m.get("status") not in ("active", "open"):
                    continue
                itens["ks:" + m["ticker"]] = {
                    "fonte": "Kalshi", "pergunta": (m.get("title") or titulo) +
                    (f" — {m.get('yes_sub_title')}" if m.get("yes_sub_title") else ""),
                    "evento": titulo, "preco_sim": preco, "volume": vol, "volume_unidade": "contratos × US$ 1 de face",
                    "contratos": vol_contratos,
                    "encerra": m.get("close_time"),
                    "url": f"https://kalshi.com/markets/{(e.get('series_ticker') or '').lower()}",
                    "coletado_utc": agora, "termos": achados,
                    "nichos": set(n for t in achados for n in TERMOS[t]),
                }
        cursor = d.get("cursor")
        paginas += 1
        if not cursor:
            break
        time.sleep(2)
    return itens, paginas


def main():
    BRUTO.mkdir(parents=True, exist_ok=True)
    agora = (json.loads(SAIDA.read_text())["coletado_utc"] if DO_BRUTO
             else datetime.now(timezone.utc).isoformat(timespec="seconds"))
    regs = []
    itens = polymarket(agora, regs)
    k, paginas = kalshi(agora, regs)
    itens.update(k)
    lista = []
    marcados_esporte = 0
    for v in list(itens.values()):
        if ESPORTE.search((v["pergunta"] or "") + " " + (v["evento"] or "")):
            marcados_esporte += 1
            v["nichos"].add("Esporte")
        v["nichos"] = sorted(v["nichos"])
        assert 0 <= v["preco_sim"] <= 1, v
        # aberto, mas com data de encerramento já vencida na hora da coleta (aguarda resolução)
        v["data_vencida"] = bool(v["encerra"]) and v["encerra"][:19] < agora[:19]
        lista.append(v)
    # ordena DENTRO de cada plataforma: as unidades de volume são diferentes
    lista.sort(key=lambda v: (v["fonte"] != "Polymarket", -v["volume"]))
    saida = {
        "familia": 4,
        "nome": "Mercados de previsão (dado de terceiros)",
        "aviso": ("Preço de mercado, não predição do Instituto. Ninguém aqui calibrou estes números; "
                  "servem só de termômetro externo, com data e endereço."),
        "coletado_utc": agora,
        "filtros": {"marca_esporte": ESPORTE.pattern, "aberto": True, "volume_minimo": VOLUME_MIN,
                    "volume_aviso": ("Polymarket: dólares negociados. Kalshi: contratos × US$ 1 de face (a API não "
                                     "informa dólares negociados). O piso de 10 mil vale na unidade de cada plataforma; "
                                     "volumes NÃO se comparam entre as duas."), "termos": list(TERMOS)},
        "paginas_kalshi_lidas": paginas,
        "marcados_como_esporte": marcados_esporte,
        "com_data_vencida": sum(v["data_vencida"] for v in lista),
        "mercados": lista,
        "registros": regs,
    }
    SAIDA.write_text(json.dumps(saida, ensure_ascii=False, indent=1))
    print(len(lista), "mercados;", sum(v["fonte"] == "Polymarket" for v in lista), "Polymarket,",
          sum(v["fonte"] == "Kalshi" for v in lista), "Kalshi; páginas Kalshi", paginas)
    for v in lista[:25]:
        print(f"{v['fonte'][:4]} {v['preco_sim']:.3f} {v['volume']:>12,.0f} {v['pergunta'][:90]}")


if __name__ == "__main__":
    main()
