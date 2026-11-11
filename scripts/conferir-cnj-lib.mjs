// Gerado por: node scripts/conferir-cnj.mjs --empacotar (não editar à mão)
// supabase/functions/_compartilhado/cnj.ts
var DATAJUD_KEY = "APIKey cDZHYzlZa0JadVREZDJCendQbXY6SkJlTzNjLV9TRENyQk1RdnFKZGRQdw==";
var COMUNICA = "https://comunicaapi.pje.jus.br/api/v1/comunicacao";
var UF_TR = ["", "ac", "al", "ap", "am", "ba", "ce", "dft", "es", "go", "ma", "mt", "ms", "mg", "pa", "pb", "pr", "pe", "pi", "rj", "rn", "rs", "ro", "rr", "sc", "se", "sp", "to"];
var ESPERA = () => Number(Deno.env.get("FONTES_ESPERA_MS") ?? "700");
var limpa = (s) => s.replace(/<br\s*\/?>/gi, "\n").replace(/<[^>]+>/g, " ").replace(/[ \t]+/g, " ").replace(/\n\s*/g, "\n").trim();
var dorme = (ms) => new Promise((r) => setTimeout(r, ms));
function indicesDataJud(numero) {
  const d = numero.replace(/\D/g, "");
  if (d.length !== 20) return [];
  const j = d[13], tr = Number(d.slice(14, 16));
  if (j === "3") return ["stj"];
  if (j === "4") return tr >= 1 && tr <= 6 ? [`trf${tr}`] : [];
  if (j === "5") return tr === 0 ? ["tst"] : tr <= 24 ? [`trt${tr}`] : [];
  if (j === "6") return tr === 0 ? ["tse"] : UF_TR[tr] ? tr === 7 ? ["tre-dft", "tre-df"] : [`tre-${UF_TR[tr]}`] : [];
  if (j === "7") return ["stm"];
  if (j === "8") return UF_TR[tr] ? [`tj${UF_TR[tr]}`] : [];
  if (j === "9") return { 13: ["tjmmg"], 21: ["tjmrs"], 26: ["tjmsp"] }[tr] ?? [];
  return [];
}
async function buscar(url, init = {}, tentativas = 3) {
  for (let i = 0; i < tentativas; i++) {
    const r = await fetch(url, { ...init, signal: AbortSignal.timeout(3e4) }).catch(() => null);
    if (r && r.status !== 429 && r.status < 500) return r;
    if (i < tentativas - 1) await dorme(ESPERA() * (i + 1));
    else return r;
  }
  return null;
}
async function datajud(numero) {
  const indices = indicesDataJud(numero);
  if (!indices.length) return { ok: false, erro: "Este tribunal n\xE3o est\xE1 no DataJud (STF e CNJ n\xE3o publicam l\xE1) ou o n\xFAmero \xE9 inv\xE1lido." };
  for (const indice of indices) {
    const r = await buscar(`https://api-publica.datajud.cnj.jus.br/api_publica_${indice}/_search`, {
      method: "POST",
      headers: { Authorization: DATAJUD_KEY, "Content-Type": "application/json" },
      body: JSON.stringify({ size: 10, query: { match: { numeroProcesso: numero.replace(/\D/g, "") } } })
    });
    if (r?.status === 404) continue;
    if (!r?.ok) return { ok: false, erro: `DataJud ${r?.status ?? "sem resposta"}` };
    const hits = ((await r.json().catch(() => ({})))?.hits?.hits ?? []).map((h) => h._source).filter(Boolean);
    if (!hits.length) return { ok: true, encontrado: false, indice };
    const movs = /* @__PURE__ */ new Map();
    for (const h of hits) for (const m of h.movimentos ?? []) {
      const comp = (m.complementosTabelados ?? []).map((c) => c.nome || c.descricao).filter(Boolean).join("; ");
      const chave2 = `${m.dataHora}|${m.codigo ?? m.nome}`;
      if (!movs.has(chave2)) movs.set(chave2, { data: m.dataHora, nome: m.nome, grau: h.grau ?? "", complemento: comp || void 0 });
    }
    const h0 = hits[0];
    return {
      ok: true,
      encontrado: true,
      indice,
      tribunal: h0.tribunal,
      classe: h0.classe?.nome,
      orgao: h0.orgaoJulgador?.nome,
      graus: [...new Set(hits.map((h) => h.grau).filter(Boolean))],
      sistema: h0.sistema?.nome,
      formato: h0.formato?.nome,
      ajuizamento: h0.dataAjuizamento,
      sigilo: h0.nivelSigilo ?? 0,
      ultimaAtualizacao: h0.dataHoraUltimaAtualizacao,
      assuntos: [...new Set(hits.flatMap((h) => (h.assuntos ?? []).map((a) => a.nome)).filter(Boolean))],
      movimentos: [...movs.values()].sort((a, b) => String(b.data).localeCompare(String(a.data)))
    };
  }
  return { ok: true, encontrado: false, indice: indices[0] };
}
function itemComunica(i) {
  const partes = (i.destinatarios ?? []).map((d) => ({ nome: String(d.nome ?? "").trim(), polo: d.polo ?? null })).filter((d) => d.nome);
  const advogados = (i.destinatarioadvogados ?? []).map((a) => a.advogado ?? a).map((a) => ({ nome: String(a.nome ?? "").trim(), oab: a.numero_oab ? `${a.numero_oab}/${a.uf_oab ?? ""}` : null })).filter((a) => a.nome);
  return {
    id: String(i.id ?? `${i.numero_processo}-${i.data_disponibilizacao}`),
    data: String(i.data_disponibilizacao ?? "").slice(0, 10),
    tribunal: i.siglaTribunal ?? null,
    orgao: i.nomeOrgao ?? null,
    tipo: i.tipoComunicacao ?? null,
    documento: i.tipoDocumento ?? null,
    classe: i.nomeClasse ?? null,
    numero: String(i.numeroprocessocommascara ?? i.numero_processo ?? ""),
    texto: limpa(String(i.texto ?? "")).slice(0, 2e4),
    link: i.link ?? null,
    partes,
    advogados
  };
}
async function comunica(f, inicio, fim, maxPaginas = 5) {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(f)) if (v) p.set(k, v);
  if (inicio && fim) {
    p.set("dataDisponibilizacaoInicio", inicio);
    p.set("dataDisponibilizacaoFim", fim);
  }
  p.set("itensPorPagina", "100");
  const itens = [];
  let total = 0;
  for (let pagina = 1; pagina <= maxPaginas; pagina++) {
    p.set("pagina", String(pagina));
    const r = await buscar(`${COMUNICA}?${p}`);
    if (!r?.ok) return { ok: false, erro: `Comunica PJe ${r?.status ?? "sem resposta"}`, itens, total };
    const d = await r.json().catch(() => ({ items: [] }));
    total = Number(d.count ?? total);
    const lote = d.items ?? [];
    itens.push(...lote.map(itemComunica));
    if (lote.length < 100) break;
    if (pagina < maxPaginas) await dorme(ESPERA());
  }
  return { ok: true, itens, total, incompleto: total > itens.length };
}

// src/lib/prazos.ts
function pascoa(ano) {
  const a = ano % 19, b = Math.floor(ano / 100), c = ano % 100, d = Math.floor(b / 4), e = b % 4;
  const f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
  const mes = Math.floor((h + l - 7 * m + 114) / 31), dia = (h + l - 7 * m + 114) % 31 + 1;
  return new Date(Date.UTC(ano, mes - 1, dia));
}
var chave = (d) => d.toISOString().slice(0, 10);
var somaDias = (d, n) => new Date(d.getTime() + n * 864e5);
function feriados(ano) {
  const f = /* @__PURE__ */ new Map();
  const fixos = [
    ["01-01", "Confraterniza\xE7\xE3o Universal"],
    ["01-20", "S\xE3o Sebasti\xE3o (Rio)"],
    ["04-21", "Tiradentes"],
    ["04-23", "S\xE3o Jorge (RJ)"],
    ["05-01", "Dia do Trabalho"],
    ["08-11", "Dia do Advogado (expediente forense)"],
    ["09-07", "Independ\xEAncia"],
    ["10-12", "Nossa Senhora Aparecida"],
    ["10-28", "Dia do Servidor P\xFAblico (expediente forense suspenso)"],
    ["11-01", "Todos os Santos (Lei 5.010/66)"],
    ["11-02", "Finados"],
    ["11-15", "Proclama\xE7\xE3o da Rep\xFAblica"],
    ["11-20", "Consci\xEAncia Negra"],
    ["12-08", "Nossa Senhora da Concei\xE7\xE3o (Lei 5.010/66, art. 62)"],
    ["12-25", "Natal"]
  ];
  for (const [md, nome] of fixos) f.set(`${ano}-${md}`, nome);
  const p = pascoa(ano);
  f.set(chave(somaDias(p, -48)), "Carnaval");
  f.set(chave(somaDias(p, -47)), "Carnaval");
  f.set(chave(somaDias(p, -46)), "Quarta-feira de Cinzas (at\xE9 14h)");
  f.set(chave(somaDias(p, -3)), "Quinta-feira Santa");
  f.set(chave(somaDias(p, -2)), "Sexta-feira Santa");
  f.set(chave(somaDias(p, 60)), "Corpus Christi");
  return f;
}
function recesso(d) {
  const m = d.getUTCMonth() + 1, dia = d.getUTCDate();
  return m === 12 && dia >= 20 || m === 1 && dia <= 20;
}
function diaUtil(d) {
  const dow = d.getUTCDay();
  if (dow === 0 || dow === 6) return "fim de semana";
  if (recesso(d)) return "recesso forense (art. 220 CPC)";
  return feriados(d.getUTCFullYear()).get(chave(d)) ?? null;
}
function calcularPrazo(inicio, dias, emDobro = false) {
  const total = emDobro ? dias * 2 : dias;
  let d = /* @__PURE__ */ new Date(`${inicio}T00:00:00Z`);
  const pulados = [];
  let contados = 0;
  while (contados < total) {
    d = somaDias(d, 1);
    const motivo = diaUtil(d);
    if (motivo) {
      if (motivo !== "fim de semana") pulados.push({ data: chave(d), motivo });
    } else contados++;
  }
  return { final: chave(d), diasContados: total, pulados };
}

// src/lib/ferramentas/base.ts
var DIA = 864e5;
var paraData = (iso2) => /* @__PURE__ */ new Date(`${iso2}T00:00:00Z`);
var iso = (d) => d.toISOString().slice(0, 10);
var somarDias = (dataIso, n) => iso(new Date(paraData(dataIso).getTime() + n * DIA));
var diasEntre = (a, b) => Math.round((paraData(b).getTime() - paraData(a).getTime()) / DIA);
function br(dataIso) {
  const [a, m, d] = dataIso.split("-");
  return `${d}/${m}/${a}`;
}
var SEMANA = ["domingo", "segunda-feira", "ter\xE7a-feira", "quarta-feira", "quinta-feira", "sexta-feira", "s\xE1bado"];
var diaDaSemana = (dataIso) => SEMANA[paraData(dataIso).getUTCDay()];
function somarMeses(dataIso, meses) {
  const d = paraData(dataIso);
  const ano = d.getUTCFullYear(), mes = d.getUTCMonth() + meses, dia = d.getUTCDate();
  const alvo = new Date(Date.UTC(ano, mes, 1));
  const ultimo = new Date(Date.UTC(alvo.getUTCFullYear(), alvo.getUTCMonth() + 1, 0)).getUTCDate();
  if (dia > ultimo) return iso(new Date(Date.UTC(alvo.getUTCFullYear(), alvo.getUTCMonth() + 1, 1)));
  return iso(new Date(Date.UTC(alvo.getUTCFullYear(), alvo.getUTCMonth(), dia)));
}
function semExpediente(dataIso) {
  const d = paraData(dataIso);
  const dow = d.getUTCDay();
  if (dow === 0 || dow === 6) return "fim de semana";
  return feriados(d.getUTCFullYear()).get(dataIso) ?? null;
}
function prorrogarParaDiaUtil(dataIso) {
  let d = dataIso;
  for (let i = 0; i < 30 && semExpediente(d); i++) d = somarDias(d, 1);
  return d;
}

// src/lib/prazos/codigos.ts
var ATOS_POR_CODIGO = [
  // ---------- CPC ----------
  { id: "cpc-contestacao", codigo: "CPC", ato: "Contesta\xE7\xE3o (procedimento comum)", quantidade: 15, unidade: "dias_uteis", base: "CPC, art. 335", marco: "Data da audi\xEAncia de concilia\xE7\xE3o ou da juntada do mandado/AR de cita\xE7\xE3o (art. 335, I a III)", dobro: true },
  { id: "cpc-replica", codigo: "CPC", ato: "R\xE9plica", quantidade: 15, unidade: "dias_uteis", base: "CPC, arts. 350 e 351", dobro: true },
  { id: "cpc-emenda", codigo: "CPC", ato: "Emenda da peti\xE7\xE3o inicial", quantidade: 15, unidade: "dias_uteis", base: "CPC, art. 321", dobro: true },
  { id: "cpc-manifestar-doc", codigo: "CPC", ato: "Manifesta\xE7\xE3o sobre documento juntado", quantidade: 15, unidade: "dias_uteis", base: "CPC, art. 437, \xA7 1\xBA", dobro: true },
  { id: "cpc-laudo", codigo: "CPC", ato: "Manifesta\xE7\xE3o sobre o laudo pericial", quantidade: 15, unidade: "dias_uteis", base: "CPC, art. 477, \xA7 1\xBA", dobro: true },
  { id: "cpc-assistente", codigo: "CPC", ato: "Indicar assistente t\xE9cnico e apresentar quesitos", quantidade: 15, unidade: "dias_uteis", base: "CPC, art. 465, \xA7 1\xBA", dobro: true },
  { id: "cpc-razoes-finais", codigo: "CPC", ato: "Raz\xF5es finais escritas", quantidade: 15, unidade: "dias_uteis", base: "CPC, art. 364, \xA7 2\xBA", dobro: true },
  { id: "cpc-impedimento", codigo: "CPC", ato: "Exce\xE7\xE3o de impedimento ou suspei\xE7\xE3o", quantidade: 15, unidade: "dias_uteis", base: "CPC, art. 146", marco: "Ci\xEAncia do fato que causa o impedimento ou a suspei\xE7\xE3o" },
  { id: "cpc-desconsideracao", codigo: "CPC", ato: "Defesa no incidente de desconsidera\xE7\xE3o da personalidade jur\xEDdica", quantidade: 15, unidade: "dias_uteis", base: "CPC, art. 135", dobro: true },
  { id: "cpc-apelacao", codigo: "CPC", ato: "Apela\xE7\xE3o", quantidade: 15, unidade: "dias_uteis", base: "CPC, art. 1.003, \xA7 5\xBA", dobro: true },
  { id: "cpc-contrarrazoes", codigo: "CPC", ato: "Contrarraz\xF5es de apela\xE7\xE3o", quantidade: 15, unidade: "dias_uteis", base: "CPC, art. 1.010, \xA7 1\xBA", dobro: true },
  { id: "cpc-adesivo", codigo: "CPC", ato: "Recurso adesivo", quantidade: 15, unidade: "dias_uteis", base: "CPC, art. 997, \xA7 2\xBA", marco: "Intima\xE7\xE3o para contrarraz\xF5es", dobro: true },
  { id: "cpc-agravo-instrumento", codigo: "CPC", ato: "Agravo de instrumento", quantidade: 15, unidade: "dias_uteis", base: "CPC, arts. 1.015 e 1.003, \xA7 5\xBA", dobro: true },
  { id: "cpc-agravo-interno", codigo: "CPC", ato: "Agravo interno", quantidade: 15, unidade: "dias_uteis", base: "CPC, art. 1.021", dobro: true },
  { id: "cpc-ed", codigo: "CPC", ato: "Embargos de declara\xE7\xE3o", quantidade: 5, unidade: "dias_uteis", base: "CPC, art. 1.023", dobro: true },
  { id: "cpc-resp-re", codigo: "CPC", ato: "Recurso especial ou extraordin\xE1rio", quantidade: 15, unidade: "dias_uteis", base: "CPC, art. 1.003, \xA7 5\xBA", dobro: true },
  { id: "cpc-contrarrazoes-resp", codigo: "CPC", ato: "Contrarraz\xF5es de recurso especial ou extraordin\xE1rio", quantidade: 15, unidade: "dias_uteis", base: "CPC, art. 1.030", dobro: true },
  { id: "cpc-agravo-resp", codigo: "CPC", ato: "Agravo em recurso especial ou extraordin\xE1rio", quantidade: 15, unidade: "dias_uteis", base: "CPC, art. 1.042", dobro: true },
  { id: "cpc-ro", codigo: "CPC", ato: "Recurso ordin\xE1rio constitucional", quantidade: 15, unidade: "dias_uteis", base: "CPC, arts. 1.027 e 1.003, \xA7 5\xBA", dobro: true },
  { id: "cpc-embargos-divergencia", codigo: "CPC", ato: "Embargos de diverg\xEAncia", quantidade: 15, unidade: "dias_uteis", base: "CPC, arts. 1.043 e 1.003, \xA7 5\xBA", dobro: true },
  { id: "cpc-pagamento-523", codigo: "CPC", ato: "Pagamento volunt\xE1rio no cumprimento de senten\xE7a", quantidade: 15, unidade: "dias_uteis", base: "CPC, art. 523", dobro: false },
  { id: "cpc-impugnacao", codigo: "CPC", ato: "Impugna\xE7\xE3o ao cumprimento de senten\xE7a", quantidade: 15, unidade: "dias_uteis", base: "CPC, art. 525", marco: "Fim do prazo de pagamento volunt\xE1rio", dobro: true },
  { id: "cpc-impugnacao-fazenda", codigo: "CPC", ato: "Impugna\xE7\xE3o da Fazenda ao cumprimento de senten\xE7a", quantidade: 30, unidade: "dias_uteis", base: "CPC, art. 535", dobro: false, nota: "O prazo de 30 dias j\xE1 \xE9 o da Fazenda; n\xE3o se dobra." },
  { id: "cpc-pagamento-829", codigo: "CPC", ato: "Pagamento na execu\xE7\xE3o de t\xEDtulo extrajudicial", quantidade: 3, unidade: "dias_uteis", base: "CPC, art. 829", marco: "Cita\xE7\xE3o do executado", dobro: false },
  { id: "cpc-embargos-execucao", codigo: "CPC", ato: "Embargos \xE0 execu\xE7\xE3o", quantidade: 15, unidade: "dias_uteis", base: "CPC, art. 915", marco: "Juntada do mandado ou AR de cita\xE7\xE3o", dobro: true },
  { id: "cpc-embargos-fazenda", codigo: "CPC", ato: "Embargos da Fazenda \xE0 execu\xE7\xE3o", quantidade: 30, unidade: "dias_uteis", base: "CPC, art. 910", dobro: false, nota: "O prazo de 30 dias j\xE1 \xE9 o da Fazenda; n\xE3o se dobra." },
  { id: "cpc-alimentos", codigo: "CPC", ato: "Execu\xE7\xE3o de alimentos: pagar, provar o pagamento ou justificar", quantidade: 3, unidade: "dias_uteis", base: "CPC, art. 528", marco: "Cita\xE7\xE3o do executado", dobro: false },
  { id: "cpc-monitoria", codigo: "CPC", ato: "A\xE7\xE3o monit\xF3ria: pagar ou opor embargos", quantidade: 15, unidade: "dias_uteis", base: "CPC, arts. 701 e 702", marco: "Juntada do mandado ou AR de cita\xE7\xE3o", dobro: true },
  { id: "cpc-embargos-terceiro", codigo: "CPC", ato: "Contesta\xE7\xE3o nos embargos de terceiro", quantidade: 15, unidade: "dias_uteis", base: "CPC, art. 679", dobro: true },
  { id: "cpc-prestacao-contas", codigo: "CPC", ato: "Contesta\xE7\xE3o na a\xE7\xE3o de exigir contas", quantidade: 15, unidade: "dias_uteis", base: "CPC, art. 550", dobro: true },
  { id: "cpc-generico", codigo: "CPC", ato: "Manifesta\xE7\xE3o sem prazo fixado pelo juiz", quantidade: 5, unidade: "dias_uteis", base: "CPC, art. 218, \xA7 3\xBA", dobro: true },
  { id: "cpc-rescisoria", codigo: "CPC", ato: "A\xE7\xE3o rescis\xF3ria", quantidade: 2, unidade: "anos", base: "CPC, art. 975", natureza: "material", marco: "Tr\xE2nsito em julgado da \xFAltima decis\xE3o" },
  { id: "cpc-juiz-despacho", codigo: "CPC", ato: "Prazo do juiz: despachos", quantidade: 5, unidade: "dias_uteis", base: "CPC, art. 226, I", natureza: "improprio", marco: "Conclus\xE3o dos autos", nota: "Prazo impr\xF3prio: o descumprimento n\xE3o gera preclus\xE3o, mas pode ser levado \xE0 corregedoria." },
  { id: "cpc-juiz-decisao", codigo: "CPC", ato: "Prazo do juiz: decis\xF5es interlocut\xF3rias", quantidade: 10, unidade: "dias_uteis", base: "CPC, art. 226, II", natureza: "improprio", marco: "Conclus\xE3o dos autos", nota: "Prazo impr\xF3prio." },
  { id: "cpc-juiz-sentenca", codigo: "CPC", ato: "Prazo do juiz: senten\xE7a", quantidade: 30, unidade: "dias_uteis", base: "CPC, art. 226, III", natureza: "improprio", marco: "Conclus\xE3o dos autos", nota: "Prazo impr\xF3prio." },
  // ---------- CLT ----------
  { id: "clt-ro", codigo: "CLT", ato: "Recurso ordin\xE1rio", quantidade: 8, unidade: "dias_uteis", base: "CLT, arts. 775 e 895", dobro: true },
  { id: "clt-ap", codigo: "CLT", ato: "Agravo de peti\xE7\xE3o", quantidade: 8, unidade: "dias_uteis", base: "CLT, art. 897, a", dobro: true },
  { id: "clt-ai", codigo: "CLT", ato: "Agravo de instrumento", quantidade: 8, unidade: "dias_uteis", base: "CLT, art. 897, b", dobro: true },
  { id: "clt-rr", codigo: "CLT", ato: "Recurso de revista", quantidade: 8, unidade: "dias_uteis", base: "CLT, art. 896; Lei 5.584/70, art. 6\xBA", dobro: true },
  { id: "clt-contrarrazoes", codigo: "CLT", ato: "Contrarraz\xF5es a qualquer recurso", quantidade: 8, unidade: "dias_uteis", base: "Lei 5.584/70, art. 6\xBA", dobro: true },
  { id: "clt-embargos-tst", codigo: "CLT", ato: "Embargos no TST (diverg\xEAncia)", quantidade: 8, unidade: "dias_uteis", base: "CLT, art. 894", dobro: true },
  { id: "clt-ed", codigo: "CLT", ato: "Embargos de declara\xE7\xE3o", quantidade: 5, unidade: "dias_uteis", base: "CLT, arts. 775 e 897-A", dobro: true },
  { id: "clt-embargos-execucao", codigo: "CLT", ato: "Embargos \xE0 execu\xE7\xE3o e impugna\xE7\xE3o \xE0 senten\xE7a de liquida\xE7\xE3o", quantidade: 5, unidade: "dias_uteis", base: "CLT, art. 884", marco: "Garantia da execu\xE7\xE3o ou penhora" },
  { id: "clt-calculos", codigo: "CLT", ato: "Manifesta\xE7\xE3o sobre os c\xE1lculos de liquida\xE7\xE3o", quantidade: 10, unidade: "dias_uteis", base: "CLT, art. 879, \xA7 2\xBA" },
  { id: "clt-falta-grave", codigo: "CLT", ato: "Inqu\xE9rito para apura\xE7\xE3o de falta grave (est\xE1vel)", quantidade: 30, unidade: "dias_corridos", base: "CLT, art. 853; S\xFAmula 403 do STF", natureza: "material", marco: "Suspens\xE3o do empregado" },
  { id: "clt-verbas", codigo: "CLT", ato: "Pagamento das verbas rescis\xF3rias", quantidade: 10, unidade: "dias_corridos", base: "CLT, art. 477, \xA7 6\xBA", natureza: "material", marco: "T\xE9rmino do contrato" },
  { id: "clt-prescricao-bienal", codigo: "CLT", ato: "A\xE7\xE3o trabalhista (prescri\xE7\xE3o bienal)", quantidade: 2, unidade: "anos", base: "CF, art. 7\xBA, XXIX", natureza: "material", marco: "Extin\xE7\xE3o do contrato de trabalho", nota: "Dentro desses 2 anos, s\xF3 se cobra o que ocorreu nos 5 anos anteriores ao ajuizamento (prescri\xE7\xE3o quinquenal)." },
  // ---------- CPP ----------
  { id: "cpp-resposta", codigo: "CPP", ato: "Resposta \xE0 acusa\xE7\xE3o", quantidade: 10, unidade: "dias_corridos", base: "CPP, art. 396", marco: "Cita\xE7\xE3o do acusado" },
  { id: "cpp-memoriais", codigo: "CPP", ato: "Memoriais (alega\xE7\xF5es finais por escrito)", quantidade: 5, unidade: "dias_corridos", base: "CPP, art. 403, \xA7 3\xBA", nota: "Quando o juiz, pela complexidade, autoriza memoriais em vez de debates orais." },
  { id: "cpp-apelacao", codigo: "CPP", ato: "Apela\xE7\xE3o criminal (interposi\xE7\xE3o)", quantidade: 5, unidade: "dias_corridos", base: "CPP, art. 593" },
  { id: "cpp-razoes", codigo: "CPP", ato: "Raz\xF5es de apela\xE7\xE3o criminal", quantidade: 8, unidade: "dias_corridos", base: "CPP, art. 600", marco: "Intima\xE7\xE3o para apresentar raz\xF5es", nota: "Nas contraven\xE7\xF5es, 3 dias." },
  { id: "cpp-rese", codigo: "CPP", ato: "Recurso em sentido estrito", quantidade: 5, unidade: "dias_corridos", base: "CPP, art. 586" },
  { id: "cpp-razoes-rese", codigo: "CPP", ato: "Raz\xF5es do recurso em sentido estrito", quantidade: 2, unidade: "dias_corridos", base: "CPP, art. 588", marco: "Intima\xE7\xE3o para apresentar raz\xF5es" },
  { id: "cpp-ed", codigo: "CPP", ato: "Embargos de declara\xE7\xE3o", quantidade: 2, unidade: "dias_corridos", base: "CPP, art. 619" },
  { id: "cpp-infringentes", codigo: "CPP", ato: "Embargos infringentes e de nulidade", quantidade: 10, unidade: "dias_corridos", base: "CPP, art. 609, par\xE1grafo \xFAnico" },
  { id: "cpp-agravo-execucao", codigo: "CPP", ato: "Agravo em execu\xE7\xE3o penal", quantidade: 5, unidade: "dias_corridos", base: "Lei 7.210/84, art. 197; S\xFAmula 700 do STF" },
  { id: "cpp-resp-re", codigo: "CPP", ato: "Recurso especial ou extraordin\xE1rio penal", quantidade: 15, unidade: "dias_corridos", base: "CPC, art. 1.003, \xA7 5\xBA, c/c CPP, art. 3\xBA", nota: "O prazo \xE9 de 15 dias; confira se o tribunal conta em dias corridos (CPP) ou \xFAteis (CPC)." },
  { id: "cpp-queixa", codigo: "CPP", ato: "Queixa-crime ou representa\xE7\xE3o (decad\xEAncia)", quantidade: 6, unidade: "meses", base: "CPP, art. 38; CP, art. 103", natureza: "material", marco: "Ci\xEAncia de quem \xE9 o autor do crime" },
  { id: "cpp-queixa-subsidiaria", codigo: "CPP", ato: "Queixa subsidi\xE1ria (a\xE7\xE3o privada subsidi\xE1ria)", quantidade: 6, unidade: "meses", base: "CPP, art. 38", natureza: "material", marco: "Fim do prazo do Minist\xE9rio P\xFAblico para denunciar" },
  { id: "cpp-denuncia-preso", codigo: "CPP", ato: "Den\xFAncia: r\xE9u preso", quantidade: 5, unidade: "dias_corridos", base: "CPP, art. 46", natureza: "improprio", marco: "Recebimento do inqu\xE9rito pelo Minist\xE9rio P\xFAblico" },
  { id: "cpp-denuncia-solto", codigo: "CPP", ato: "Den\xFAncia: r\xE9u solto", quantidade: 15, unidade: "dias_corridos", base: "CPP, art. 46", natureza: "improprio", marco: "Recebimento do inqu\xE9rito pelo Minist\xE9rio P\xFAblico" },
  { id: "cpp-inquerito-preso", codigo: "CPP", ato: "Conclus\xE3o do inqu\xE9rito: indiciado preso", quantidade: 10, unidade: "dias_corridos", base: "CPP, art. 10", natureza: "improprio", marco: "Pris\xE3o" },
  { id: "cpp-inquerito-solto", codigo: "CPP", ato: "Conclus\xE3o do inqu\xE9rito: indiciado solto", quantidade: 30, unidade: "dias_corridos", base: "CPP, art. 10", natureza: "improprio", marco: "Instaura\xE7\xE3o do inqu\xE9rito" },
  // ---------- Juizados ----------
  { id: "jec-recurso", codigo: "JEC", ato: "Recurso inominado", quantidade: 10, unidade: "dias_uteis", base: "Lei 9.099/95, arts. 12-A e 42" },
  { id: "jec-contrarrazoes", codigo: "JEC", ato: "Contrarraz\xF5es ao recurso inominado", quantidade: 10, unidade: "dias_uteis", base: "Lei 9.099/95, arts. 12-A e 42, \xA7 2\xBA" },
  { id: "jec-ed", codigo: "JEC", ato: "Embargos de declara\xE7\xE3o", quantidade: 5, unidade: "dias_uteis", base: "Lei 9.099/95, arts. 12-A e 49" },
  { id: "jec-criminal-apelacao", codigo: "JEC", ato: "Apela\xE7\xE3o no Juizado Criminal (com as raz\xF5es)", quantidade: 10, unidade: "dias_uteis", base: "Lei 9.099/95, art. 82, \xA7 1\xBA", nota: "Confira se o tribunal conta em dias \xFAteis ou corridos; na d\xFAvida, use a data mais cedo." },
  // ---------- Execução fiscal ----------
  { id: "lef-garantir", codigo: "LEF", ato: "Pagar ou garantir a execu\xE7\xE3o", quantidade: 5, unidade: "dias_uteis", base: "Lei 6.830/80, art. 8\xBA", marco: "Cita\xE7\xE3o do executado", dobro: false },
  { id: "lef-embargos", codigo: "LEF", ato: "Embargos \xE0 execu\xE7\xE3o fiscal", quantidade: 30, unidade: "dias_uteis", base: "Lei 6.830/80, art. 16", marco: "Dep\xF3sito, juntada da fian\xE7a ou intima\xE7\xE3o da penhora", dobro: false },
  { id: "lef-impugnacao", codigo: "LEF", ato: "Impugna\xE7\xE3o da Fazenda aos embargos", quantidade: 30, unidade: "dias_uteis", base: "Lei 6.830/80, art. 17", dobro: false },
  { id: "lef-infringentes", codigo: "LEF", ato: "Embargos infringentes (execu\xE7\xE3o de pequeno valor)", quantidade: 10, unidade: "dias_uteis", base: "Lei 6.830/80, art. 34, \xA7 1\xBA" },
  // ---------- Mandado de segurança ----------
  { id: "ms-impetracao", codigo: "MS", ato: "Impetra\xE7\xE3o do mandado de seguran\xE7a", quantidade: 120, unidade: "dias_corridos", base: "Lei 12.016/2009, art. 23", natureza: "material", marco: "Ci\xEAncia do ato impugnado", nota: "Decad\xEAncia: n\xE3o se suspende nem se interrompe." },
  { id: "ms-informacoes", codigo: "MS", ato: "Informa\xE7\xF5es da autoridade coatora", quantidade: 10, unidade: "dias_corridos", base: "Lei 12.016/2009, art. 7\xBA, I", natureza: "improprio", marco: "Notifica\xE7\xE3o da autoridade" },
  { id: "ms-parecer-mp", codigo: "MS", ato: "Parecer do Minist\xE9rio P\xFAblico", quantidade: 10, unidade: "dias_corridos", base: "Lei 12.016/2009, art. 12", natureza: "improprio", marco: "Fim do prazo das informa\xE7\xF5es" },
  { id: "ms-apelacao", codigo: "MS", ato: "Apela\xE7\xE3o da senten\xE7a do mandado de seguran\xE7a", quantidade: 15, unidade: "dias_uteis", base: "Lei 12.016/2009, art. 14; CPC, art. 1.003, \xA7 5\xBA", dobro: true },
  // ---------- ECA ----------
  { id: "eca-defesa-previa", codigo: "ECA", ato: "Defesa pr\xE9via no ato infracional", quantidade: 3, unidade: "dias_corridos", base: "Lei 8.069/90, art. 186, \xA7 3\xBA", marco: "Audi\xEAncia de apresenta\xE7\xE3o" },
  { id: "eca-resposta-dpf", codigo: "ECA", ato: "Resposta na a\xE7\xE3o de destitui\xE7\xE3o do poder familiar", quantidade: 10, unidade: "dias_corridos", base: "Lei 8.069/90, art. 158", marco: "Cita\xE7\xE3o" },
  { id: "eca-apelacao", codigo: "ECA", ato: "Apela\xE7\xE3o", quantidade: 10, unidade: "dias_corridos", base: "Lei 8.069/90, art. 198, II", nota: "Prazo \xFAnico de 10 dias para o Minist\xE9rio P\xFAblico e para a defesa." },
  { id: "eca-agravo", codigo: "ECA", ato: "Agravo de instrumento", quantidade: 10, unidade: "dias_corridos", base: "Lei 8.069/90, art. 198, II" },
  // ---------- Locação ----------
  { id: "loc-purgacao", codigo: "LOC", ato: "Purga\xE7\xE3o da mora na a\xE7\xE3o de despejo", quantidade: 15, unidade: "dias_uteis", base: "Lei 8.245/91, art. 62, II", marco: "Cita\xE7\xE3o", nota: "S\xF3 uma vez a cada 24 meses (art. 62, par\xE1grafo \xFAnico)." },
  { id: "loc-preferencia", codigo: "LOC", ato: "Resposta do locat\xE1rio ao direito de prefer\xEAncia", quantidade: 30, unidade: "dias_corridos", base: "Lei 8.245/91, art. 28", natureza: "material", marco: "Recebimento da not\xEDcia da venda" },
  { id: "loc-denuncia-locatario", codigo: "LOC", ato: "Aviso do locat\xE1rio para devolver o im\xF3vel", quantidade: 30, unidade: "dias_corridos", base: "Lei 8.245/91, art. 6\xBA", natureza: "material", marco: "Entrega do aviso por escrito" },
  { id: "loc-desocupar", codigo: "LOC", ato: "Desocupa\xE7\xE3o ap\xF3s notifica\xE7\xE3o (den\xFAncia vazia)", quantidade: 30, unidade: "dias_corridos", base: "Lei 8.245/91, art. 46, \xA7 2\xBA", natureza: "material", marco: "Notifica\xE7\xE3o ao locat\xE1rio" },
  { id: "loc-fianca", codigo: "LOC", ato: "Exonera\xE7\xE3o do fiador: fim da responsabilidade", quantidade: 120, unidade: "dias_corridos", base: "Lei 8.245/91, art. 40, X e par\xE1grafo \xFAnico", natureza: "material", marco: "Notifica\xE7\xE3o ao locador da exonera\xE7\xE3o" },
  // ---------- Consumidor ----------
  { id: "cdc-vicio-naoduravel", codigo: "CDC", ato: "Reclamar de v\xEDcio aparente: produto ou servi\xE7o n\xE3o dur\xE1vel", quantidade: 30, unidade: "dias_corridos", base: "CDC, art. 26, I", natureza: "material", marco: "Entrega do produto ou fim do servi\xE7o" },
  { id: "cdc-vicio-duravel", codigo: "CDC", ato: "Reclamar de v\xEDcio aparente: produto ou servi\xE7o dur\xE1vel", quantidade: 90, unidade: "dias_corridos", base: "CDC, art. 26, II", natureza: "material", marco: "Entrega do produto ou fim do servi\xE7o", nota: "V\xEDcio oculto: o prazo conta de quando o v\xEDcio fica evidente (art. 26, \xA7 3\xBA)." },
  { id: "cdc-saneamento", codigo: "CDC", ato: "Prazo do fornecedor para sanar o v\xEDcio", quantidade: 30, unidade: "dias_corridos", base: "CDC, art. 18, \xA7 1\xBA", natureza: "material", marco: "Reclama\xE7\xE3o do consumidor" },
  { id: "cdc-arrependimento", codigo: "CDC", ato: "Arrependimento de compra fora do estabelecimento", quantidade: 7, unidade: "dias_corridos", base: "CDC, art. 49", natureza: "material", marco: "Assinatura do contrato ou recebimento do produto" },
  { id: "cdc-fato-produto", codigo: "CDC", ato: "Repara\xE7\xE3o por fato do produto ou do servi\xE7o (prescri\xE7\xE3o)", quantidade: 5, unidade: "anos", base: "CDC, art. 27", natureza: "material", marco: "Conhecimento do dano e de sua autoria" },
  // ---------- Recuperação e falência ----------
  { id: "fal-habilitacao", codigo: "FAL", ato: "Habilita\xE7\xE3o ou diverg\xEAncia de cr\xE9dito", quantidade: 15, unidade: "dias_corridos", base: "Lei 11.101/2005, art. 7\xBA, \xA7 1\xBA", marco: "Publica\xE7\xE3o do edital" },
  { id: "fal-impugnacao", codigo: "FAL", ato: "Impugna\xE7\xE3o de cr\xE9dito", quantidade: 10, unidade: "dias_corridos", base: "Lei 11.101/2005, art. 8\xBA", marco: "Publica\xE7\xE3o do edital com a rela\xE7\xE3o do administrador judicial" },
  { id: "fal-contestacao-impugnacao", codigo: "FAL", ato: "Contesta\xE7\xE3o \xE0 impugna\xE7\xE3o de cr\xE9dito", quantidade: 5, unidade: "dias_corridos", base: "Lei 11.101/2005, art. 11" },
  { id: "fal-plano", codigo: "FAL", ato: "Apresentar o plano de recupera\xE7\xE3o judicial", quantidade: 60, unidade: "dias_corridos", base: "Lei 11.101/2005, art. 53", marco: "Publica\xE7\xE3o da decis\xE3o que defere o processamento", nota: "Prazo improrrog\xE1vel: o descumprimento leva \xE0 fal\xEAncia." },
  { id: "fal-objecao", codigo: "FAL", ato: "Obje\xE7\xE3o ao plano de recupera\xE7\xE3o judicial", quantidade: 30, unidade: "dias_corridos", base: "Lei 11.101/2005, art. 55", marco: "Publica\xE7\xE3o do aviso de recebimento do plano" },
  { id: "fal-contestacao-falencia", codigo: "FAL", ato: "Contesta\xE7\xE3o do pedido de fal\xEAncia", quantidade: 10, unidade: "dias_corridos", base: "Lei 11.101/2005, art. 98", marco: "Cita\xE7\xE3o" },
  { id: "fal-deposito", codigo: "FAL", ato: "Dep\xF3sito elisivo da fal\xEAncia", quantidade: 10, unidade: "dias_corridos", base: "Lei 11.101/2005, art. 98, par\xE1grafo \xFAnico", marco: "Cita\xE7\xE3o" },
  // ---------- Prescrição e decadência ----------
  { id: "presc-geral", codigo: "PRESC", ato: "Prescri\xE7\xE3o geral", quantidade: 10, unidade: "anos", base: "CC, art. 205", natureza: "material", marco: "Viola\xE7\xE3o do direito" },
  { id: "presc-reparacao", codigo: "PRESC", ato: "Repara\xE7\xE3o civil", quantidade: 3, unidade: "anos", base: "CC, art. 206, \xA7 3\xBA, V", natureza: "material", marco: "Fato danoso" },
  { id: "presc-divida", codigo: "PRESC", ato: "Cobran\xE7a de d\xEDvida l\xEDquida constante de instrumento", quantidade: 5, unidade: "anos", base: "CC, art. 206, \xA7 5\xBA, I", natureza: "material", marco: "Vencimento da d\xEDvida" },
  { id: "presc-alimentos", codigo: "PRESC", ato: "Cobran\xE7a de presta\xE7\xF5es alimentares", quantidade: 2, unidade: "anos", base: "CC, art. 206, \xA7 2\xBA", natureza: "material", marco: "Vencimento de cada presta\xE7\xE3o" },
  { id: "presc-seguro", codigo: "PRESC", ato: "Pretens\xE3o do segurado contra o segurador", quantidade: 1, unidade: "anos", base: "CC, art. 206, \xA7 1\xBA, II", natureza: "material", marco: "Ci\xEAncia do fato gerador" },
  { id: "presc-aluguel", codigo: "PRESC", ato: "Cobran\xE7a de alugu\xE9is", quantidade: 3, unidade: "anos", base: "CC, art. 206, \xA7 3\xBA, I", natureza: "material", marco: "Vencimento de cada aluguel" },
  { id: "presc-tributo-lancamento", codigo: "PRESC", ato: "Decad\xEAncia do lan\xE7amento do tributo", quantidade: 5, unidade: "anos", base: "CTN, arts. 150, \xA7 4\xBA, e 173", natureza: "material", marco: "Fato gerador (ou 1\xBA de janeiro do ano seguinte, conforme o caso)" },
  { id: "presc-tributo-cobranca", codigo: "PRESC", ato: "Prescri\xE7\xE3o da cobran\xE7a do cr\xE9dito tribut\xE1rio", quantidade: 5, unidade: "anos", base: "CTN, art. 174", natureza: "material", marco: "Constitui\xE7\xE3o definitiva do cr\xE9dito" },
  { id: "presc-repeticao", codigo: "PRESC", ato: "Repeti\xE7\xE3o de ind\xE9bito tribut\xE1rio", quantidade: 5, unidade: "anos", base: "CTN, art. 168", natureza: "material", marco: "Pagamento indevido" },
  { id: "presc-improbidade", codigo: "PRESC", ato: "A\xE7\xE3o de improbidade administrativa", quantidade: 8, unidade: "anos", base: "Lei 8.429/92, art. 23 (Lei 14.230/2021)", natureza: "material", marco: "Fato (ou cessa\xE7\xE3o da perman\xEAncia)" },
  { id: "presc-acao-popular", codigo: "PRESC", ato: "A\xE7\xE3o popular", quantidade: 5, unidade: "anos", base: "Lei 4.717/65, art. 21", natureza: "material", marco: "Ato lesivo" }
];
var rotuloPrazo = (a) => {
  const u = a.unidade === "dias_uteis" ? a.quantidade === 1 ? "dia \xFAtil" : "dias \xFAteis" : a.unidade === "dias_corridos" ? a.quantidade === 1 ? "dia corrido" : "dias corridos" : a.unidade === "meses" ? a.quantidade === 1 ? "m\xEAs" : "meses" : a.quantidade === 1 ? "ano" : "anos";
  return `${a.quantidade} ${u}`;
};
function calcularPrazoPorCodigo(ato2, inicio, prerrogativa = "nenhuma") {
  const avisos = [];
  if (ato2.nota) avisos.push(ato2.nota);
  if (ato2.natureza === "improprio") avisos.push("Prazo impr\xF3prio (dirigido ao juiz, ao Minist\xE9rio P\xFAblico ou \xE0 autoridade): o vencimento n\xE3o gera preclus\xE3o autom\xE1tica.");
  let dobro = false;
  if (prerrogativa !== "nenhuma") {
    if (ato2.dobro) dobro = true;
    else avisos.push("Este ato n\xE3o admite prazo em dobro (regra pr\xF3pria do c\xF3digo ou prazo j\xE1 diferenciado).");
  }
  if (dobro && ato2.codigo === "CLT") avisos.push("Na Justi\xE7a do Trabalho, o prazo em dobro da Fazenda segue o Decreto-Lei 779/69; confira o caso concreto.");
  const q = dobro ? ato2.quantidade * 2 : ato2.quantidade;
  let final;
  let pulados = [];
  let prorrogado = false;
  if (ato2.unidade === "dias_uteis") {
    const r = calcularPrazo(inicio, q);
    final = r.final;
    pulados = r.pulados;
  } else if (ato2.unidade === "dias_corridos") {
    const venc = somarDias(inicio, q);
    final = prorrogarParaDiaUtil(venc);
    prorrogado = final !== venc;
    if (prorrogado) pulados.push({ data: venc, motivo: "vencimento em dia sem expediente: passa ao dia \xFAtil seguinte" });
  } else {
    const venc = somarMeses(inicio, ato2.unidade === "anos" ? q * 12 : q);
    final = prorrogarParaDiaUtil(venc);
    prorrogado = final !== venc;
    if (prorrogado) pulados.push({ data: venc, motivo: "vencimento em dia sem expediente: passa ao dia \xFAtil seguinte" });
  }
  if (ato2.unidade !== "dias_uteis" && diaUtil(paraData(final))) avisos.push("A data final cai em dia sem expediente; confira a regra do tribunal.");
  return { final, diaSemana: diaDaSemana(final), unidade: ato2.unidade, quantidade: q, pulados, avisos, prorrogado };
}

// src/lib/escritorio/lerIntimacao.ts
var semAcento = (s) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\s+/g, " ");
var ato = (id) => ATOS_POR_CODIGO.find((a) => a.id === id);
function codigoDoProcesso(numero, orgao = "", classe = "") {
  const d = numero.replace(/\D/g, "");
  const j = d.length === 20 ? d[13] : "";
  const o = semAcento(`${orgao ?? ""} ${classe ?? ""}`);
  if (j === "5") return "CLT";
  if (/infancia|juventude|ato infracional/.test(o)) return "ECA";
  if (/criminal|penal|acao penal|inquerito|habeas corpus|execucao penal|vec\b|violencia domestica|juri\b/.test(o)) return "CPP";
  if (/juizado|turma recursal|jec\b|jef\b/.test(o)) return "JEC";
  if (/execucao fiscal/.test(o)) return "LEF";
  if (/recuperacao judicial|falencia/.test(o)) return "FAL";
  return "CPC";
}
var NUMEROS = { um: 1, uma: 1, dois: 2, duas: 2, tres: 3, quatro: 4, cinco: 5, seis: 6, sete: 7, oito: 8, nove: 9, dez: 10, doze: 12, quinze: 15, vinte: 20, trinta: 30, quarenta: 40, sessenta: 60, noventa: 90 };
var NUM = `(\\d{1,3}|${Object.keys(NUMEROS).join("|")})`;
var RE_PRAZO = new RegExp(`(?:prazo (?:comum |sucessivo |improrrogavel )?de|no prazo de|em|dentro de) ${NUM}\\s*(?:\\([^)]{0,20}\\)\\s*)?dias?(\\s+uteis|\\s+corridos)?`);
function prazoEscrito(texto) {
  const m = semAcento(texto).match(RE_PRAZO);
  if (!m) return null;
  const dias = /^\d+$/.test(m[1]) ? Number(m[1]) : NUMEROS[m[1]];
  if (!dias || dias > 120) return null;
  return { dias, corridos: /corridos/.test(m[2] ?? "") };
}
function audienciaNoTexto(texto) {
  const t = semAcento(texto);
  const i = t.search(/audiencia|sessao de julgamento|pauta de julgamento/);
  if (i < 0) return null;
  const janela = t.slice(Math.max(0, i - 120), i + 260);
  const m = janela.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/) ?? janela.match(/(\d{1,2}) de (janeiro|fevereiro|marco|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro) de (\d{4})/);
  if (!m) return null;
  const meses = ["janeiro", "fevereiro", "marco", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
  const mes = /^\d+$/.test(m[2]) ? Number(m[2]) : meses.indexOf(m[2]) + 1;
  if (mes < 1 || mes > 12) return null;
  const h = janela.match(/(\d{1,2})\s*(?:h|:)\s*(\d{2})?/);
  return { data: `${m[3]}-${String(mes).padStart(2, "0")}-${String(Number(m[1])).padStart(2, "0")}`, hora: h ? `${h[1].padStart(2, "0")}:${h[2] ?? "00"}` : null };
}
function trechoEm(texto, re) {
  const limpo = texto.replace(/\s+/g, " ").trim();
  const i = semAcento(limpo).search(re);
  if (i < 0) return limpo.slice(0, 220) + (limpo.length > 220 ? "\u2026" : "");
  const ini = Math.max(0, i - 80);
  return (ini > 0 ? "\u2026" : "") + limpo.slice(ini, i + 140).trim() + (i + 140 < limpo.length ? "\u2026" : "");
}
var recursoDaSentenca = (c) => c === "CLT" ? "clt-ro" : c === "JEC" ? "jec-recurso" : c === "CPP" ? "cpp-apelacao" : "cpc-apelacao";
var edDo = (c) => c === "CLT" ? "clt-ed" : c === "JEC" ? "jec-ed" : c === "CPP" ? "cpp-ed" : "cpc-ed";
var outraRecurso = (c) => {
  const a = ato(recursoDaSentenca(c));
  return `Se for recorrer: ${a.ato.toLowerCase()} em ${rotuloPrazo(a)} (${a.base}).`;
};
var REGRAS = [
  { re: /contrarraz\w* (ao |aos |a |de )?(recurso )?(especial|extraordinario)/, id: () => "cpc-contrarrazoes-resp", texto: "Responder ao recurso especial ou extraordin\xE1rio (contrarraz\xF5es)", confianca: "alta", legal: true },
  { re: /(contrarraz|contraminuta)\w* (ao |de )?agravo|resposta ao agravo/, id: (c) => c === "CLT" ? "clt-contrarrazoes" : "ad-agravo", texto: "Responder ao agravo (contraminuta)", confianca: "alta", legal: true },
  { re: /contrarraz|contra-?razoes|oferecer resposta ao recurso|responder ao recurso/, id: (c) => c === "CLT" ? "clt-contrarrazoes" : c === "JEC" ? "jec-contrarrazoes" : c === "CPP" ? "cpp-razoes" : "cpc-contrarrazoes", texto: "Responder ao recurso da outra parte (contrarraz\xF5es)", confianca: "alta", legal: true },
  { re: /sobre (os )?embargos de declaracao|embargos de declaracao opostos|art\.? 1\.?023,? ?§ ?2/, id: (c) => edDo(c), texto: "Responder aos embargos de declara\xE7\xE3o da outra parte", confianca: "alta", legal: true },
  { re: /replica|sobre a contestacao|em reconvencao|sobre a reconvencao/, id: () => "cpc-replica", texto: "Responder \xE0 contesta\xE7\xE3o (r\xE9plica)", confianca: "alta", legal: true },
  { re: /laudo pericial|sobre o laudo|esclarecimentos do perito/, id: () => "cpc-laudo", texto: "Dizer o que acha do laudo do perito", confianca: "alta" },
  { re: /quesitos|assistente tecnico|honorarios periciais|proposta de honorarios do perito/, id: () => "cpc-assistente", texto: "Indicar assistente t\xE9cnico e mandar as perguntas ao perito (quesitos)", confianca: "media" },
  { re: /alegacoes finais|razoes finais|memoriais/, id: (c) => c === "CPP" ? "cpp-memoriais" : "cpc-razoes-finais", texto: "Entregar as alega\xE7\xF5es finais (memoriais)", confianca: "alta" },
  { re: /emend\w* (a )?(peticao )?inicial|emendar a inicial|emende/, id: () => "cpc-emenda", texto: "Corrigir a peti\xE7\xE3o inicial (emenda)", confianca: "alta" },
  { re: /art\.? 523|pagamento voluntario|efetu\w* o pagamento|pague o debito|pagar o debito/, id: () => "cpc-pagamento-523", texto: "Pagar a d\xEDvida ou avisar o cliente para pagar (cumprimento de senten\xE7a)", confianca: "alta", legal: true },
  { re: /impugna\w* (ao )?cumprimento|art\.? 525/, id: () => "cpc-impugnacao", texto: "Contestar o cumprimento de senten\xE7a (impugna\xE7\xE3o)", confianca: "media", legal: true },
  { re: /especifi\w* (as )?provas|provas que pretende/, id: () => "cpc-generico", texto: "Dizer quais provas quer produzir", confianca: "media" },
  { re: /para contestar|apresentar contestacao|prazo de contestacao|ofere\w* contestacao|cite-se|fica citad/, id: () => "cpc-contestacao", texto: "Defender o cliente (contesta\xE7\xE3o). Confira de quando conta: audi\xEAncia, juntada do mandado ou do aviso de recebimento", confianca: "media", legal: true },
  { re: /julgo (im)?procedente|julgo parcialmente|julgo extint|homologo|resolvo o merito|sentenca/, id: (c) => edDo(c), texto: "Saiu a senten\xE7a. Ler com o cliente; se houver ponto omisso ou contradit\xF3rio, embargos de declara\xE7\xE3o", confianca: "media", outra: outraRecurso, legal: true },
  { re: /acordao|acordam|negaram provimento|deram provimento|por unanimidade|por maioria/, id: (c) => edDo(c), texto: "Saiu o ac\xF3rd\xE3o (decis\xE3o do tribunal). Ler; se houver omiss\xE3o, embargos de declara\xE7\xE3o", confianca: "media", outra: (c) => c === "CLT" ? "Se for recorrer: recurso de revista em 8 dias \xFAteis (CLT, art. 896)." : c === "JEC" ? void 0 : "Se for recorrer: recurso especial ou extraordin\xE1rio em 15 dias \xFAteis (CPC, art. 1.003, \xA7 5\xBA).", legal: true },
  { re: /defiro|indefiro|decisao interlocutoria|tutela (de urgencia|antecipada)|liminar/, id: (c) => edDo(c), texto: "Saiu uma decis\xE3o no meio do processo. Ler; se prejudicar o cliente, avaliar recurso", confianca: "baixa", outra: (c) => c === "CPC" ? "Se couber agravo de instrumento: 15 dias \xFAteis (CPC, arts. 1.015 e 1.003, \xA7 5\xBA)." : void 0, legal: true },
  { re: /manifest|diga(m)? |digam|ciencia|fale(m)? sobre|cumpra|junte|providencie|recolh\w* (as )?custas|comprove/, id: () => "cpc-generico", texto: "Responder ao que o juiz pediu (manifesta\xE7\xE3o)", confianca: "media" }
];
function atoAdHoc(id, codigo, dias, corridos) {
  if (id === "ad-agravo") return { id, codigo: "CPC", ato: "Contraminuta de agravo", quantidade: 15, unidade: "dias_uteis", base: "CPC, arts. 1.019, II, e 1.021, \xA7 2\xBA", dobro: true };
  const corr = corridos || codigo === "CPP" || codigo === "ECA" || codigo === "FAL";
  return { id: "ad-juiz", codigo, ato: "Prazo dado pelo juiz", quantidade: dias ?? 5, unidade: corr ? "dias_corridos" : "dias_uteis", base: dias ? "Prazo fixado na publica\xE7\xE3o (CPC, art. 218, \xA7 1\xBA)" : "Sem prazo fixado: 5 dias (CPC, art. 218, \xA7 3\xBA)", dobro: true };
}
function urgenciaPara(vence, hoje) {
  if (!vence) return "ler";
  const d = diasEntre(hoje, vence);
  return d < 0 ? "vencido" : d <= 5 ? "urgente" : d <= 15 ? "breve" : "depois";
}
var dataDaPublicacao = (disponibilizacao) => prorrogarParaDiaUtil(somarDias(disponibilizacao, 1));
function lerIntimacao(p, hoje) {
  const codigo = codigoDoProcesso(p.numero, p.orgao, p.classe);
  const texto = `${p.tipo ?? ""} ${p.documento ?? ""} ${p.texto ?? ""}`;
  const t = semAcento(texto);
  const publicadaEm = dataDaPublicacao(p.data);
  const base = { chave: `${p.id}`, publicacao: p, codigo, publicadaEm, avisos: [] };
  const aud = /pauta|audiencia|sessao de julgamento/.test(t) ? audienciaNoTexto(texto) : null;
  if (aud && aud.data >= p.data) {
    return { ...base, oQueFazer: `Comparecer \xE0 audi\xEAncia ou sess\xE3o${aud.hora ? ` \xE0s ${aud.hora}` : ""}. Avisar o cliente e as testemunhas`, ato: null, vence: aud.data, diaSemana: diaDaSemana(aud.data), urgencia: urgenciaPara(aud.data, hoje), confianca: "media", trecho: trechoEm(texto, /audiencia|sessao de julgamento|pauta/), avisos: ["Data lida do texto da publica\xE7\xE3o: confira no processo."] };
  }
  const escrito = prazoEscrito(texto);
  const regra = REGRAS.find((r2) => r2.re.test(t));
  if (!regra) {
    if (escrito) {
      const a2 = atoAdHoc("ad-juiz", codigo, escrito.dias, escrito.corridos);
      const r2 = calcularPrazoPorCodigo(a2, publicadaEm);
      return { ...base, oQueFazer: "Cumprir o que o juiz pediu no prazo escrito na publica\xE7\xE3o", ato: a2, vence: r2.final, diaSemana: r2.diaSemana, urgencia: urgenciaPara(r2.final, hoje), confianca: "baixa", trecho: trechoEm(texto, RE_PRAZO), avisos: r2.avisos };
    }
    return { ...base, oQueFazer: "Ler a publica\xE7\xE3o: n\xE3o achei um pedido com prazo", ato: null, vence: null, diaSemana: null, urgencia: "ler", confianca: "baixa", trecho: trechoEm(texto, /intim|publiq|despacho|decisao/), avisos: [] };
  }
  const id = regra.id(codigo);
  let a = id.startsWith("ad-") ? atoAdHoc(id, codigo) : ato(id);
  const avisos = [];
  if (escrito && !regra.legal && escrito.dias !== a.quantidade) {
    a = { ...a, quantidade: escrito.dias, unidade: escrito.corridos ? "dias_corridos" : a.unidade, base: `Prazo fixado na publica\xE7\xE3o; ${a.base}` };
  } else if (escrito && regra.legal && escrito.dias !== a.quantidade) {
    avisos.push(`A publica\xE7\xE3o fala em ${escrito.dias} dias, mas a lei d\xE1 ${rotuloPrazo(a)} para este ato. Confira qual vale.`);
  }
  if (id === "cpc-generico" && !escrito) avisos.push("A publica\xE7\xE3o n\xE3o diz o prazo: usei 5 dias \xFAteis (CPC, art. 218, \xA7 3\xBA).");
  if (codigo === "CPC" && a.codigo === "CPC" && /fazenda|municipio|estado do|uniao|inss|autarquia|defensoria|ministerio publico/.test(t) && a.dobro) avisos.push("Se o cliente for a Fazenda, o MP ou a Defensoria, o prazo \xE9 em dobro.");
  const r = calcularPrazoPorCodigo(a, publicadaEm);
  return {
    ...base,
    oQueFazer: regra.texto,
    ato: a,
    vence: r.final,
    diaSemana: r.diaSemana,
    urgencia: urgenciaPara(r.final, hoje),
    confianca: regra.confianca,
    trecho: trechoEm(texto, regra.re),
    outra: regra.outra?.(codigo),
    avisos: [...avisos, ...r.avisos]
  };
}
var ORDEM = { vencido: 0, urgente: 1, breve: 2, depois: 3, ler: 4 };
function lerTodas(pubs, hoje) {
  const vistas = /* @__PURE__ */ new Set();
  const lidas = [];
  for (const p of pubs) {
    if (vistas.has(p.id)) continue;
    vistas.add(p.id);
    lidas.push(lerIntimacao(p, hoje));
  }
  const unicas = /* @__PURE__ */ new Map();
  for (const l of lidas) {
    const k = `${l.publicacao.numero.replace(/\D/g, "")}|${l.ato?.id ?? l.oQueFazer}|${l.vence ?? l.publicacao.id}`;
    if (!unicas.has(k)) unicas.set(k, l);
  }
  return [...unicas.values()].sort((x, y) => ORDEM[x.urgencia] - ORDEM[y.urgencia] || (x.vence ?? "9999").localeCompare(y.vence ?? "9999") || y.publicacao.data.localeCompare(x.publicacao.data));
}
var ROTULO_URGENCIA = {
  vencido: "J\xE1 venceu",
  urgente: "Vence em at\xE9 5 dias",
  breve: "Vence em at\xE9 15 dias",
  depois: "Vence depois",
  ler: "Ler e decidir"
};
function csvDosPrazos(ls) {
  const esc = (s) => `"${s.replace(/"/g, '""')}"`;
  const linhas = ls.map((l) => [l.vence ? br(l.vence) : "", ROTULO_URGENCIA[l.urgencia], l.publicacao.numero, l.publicacao.tribunal ?? "", l.publicacao.orgao ?? "", l.oQueFazer, l.ato ? rotuloPrazo(l.ato) : "", l.ato?.base ?? "", br(l.publicacao.data), br(l.publicadaEm), l.confianca, l.trecho].map((v) => esc(String(v))).join(";"));
  return ["Vence;Situa\xE7\xE3o;Processo;Tribunal;\xD3rg\xE3o;O que fazer;Prazo;Base legal;Disponibilizada;Publicada;Confian\xE7a da leitura;Trecho"].concat(linhas).join("\n");
}
export {
  COMUNICA,
  DATAJUD_KEY,
  ESPERA,
  ROTULO_URGENCIA,
  buscar,
  comunica,
  csvDosPrazos,
  datajud,
  dorme,
  indicesDataJud,
  itemComunica,
  lerTodas,
  limpa,
  somarDias
};
