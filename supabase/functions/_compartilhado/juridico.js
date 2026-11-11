// ARQUIVO GERADO por scripts/gerar-juridico-funcoes.mjs a partir de src/lib. Não edite à mão.
// @ts-nocheck
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
    ["01-01", "Confraternização Universal"],
    ["01-20", "São Sebastião (Rio)"],
    ["04-21", "Tiradentes"],
    ["04-23", "São Jorge (RJ)"],
    ["05-01", "Dia do Trabalho"],
    ["08-11", "Dia do Advogado (expediente forense)"],
    ["09-07", "Independência"],
    ["10-12", "Nossa Senhora Aparecida"],
    ["10-28", "Dia do Servidor Público (expediente forense suspenso)"],
    ["11-01", "Todos os Santos (Lei 5.010/66)"],
    ["11-02", "Finados"],
    ["11-15", "Proclamação da República"],
    ["11-20", "Consciência Negra"],
    ["12-08", "Nossa Senhora da Conceição (Lei 5.010/66, art. 62)"],
    ["12-25", "Natal"]
  ];
  for (const [md, nome] of fixos) f.set(`${ano}-${md}`, nome);
  const p = pascoa(ano);
  f.set(chave(somaDias(p, -48)), "Carnaval");
  f.set(chave(somaDias(p, -47)), "Carnaval");
  f.set(chave(somaDias(p, -46)), "Quarta-feira de Cinzas (até 14h)");
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
var SEMANA = ["domingo", "segunda-feira", "terça-feira", "quarta-feira", "quinta-feira", "sexta-feira", "sábado"];
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
var CODIGOS = {
  CPC: { nome: "Processo civil (CPC)", sigla: "CPC", regra: "Dias úteis, sem contar o dia do começo (CPC, arts. 219 e 224). Recesso de 20/12 a 20/01 suspende o prazo (art. 220)." },
  CLT: { nome: "Processo do trabalho (CLT)", sigla: "CLT", regra: "Dias úteis, sem contar o dia do começo (CLT, art. 775). Recesso do art. 220 do CPC aplica-se por analogia." },
  CPP: { nome: "Processo penal (CPP)", sigla: "CPP", regra: "Dias corridos; exclui o dia do começo e inclui o do vencimento; vencendo sem expediente, passa ao dia útil seguinte (CPP, art. 798). O prazo conta da intimação, não da juntada (Súmula 710 do STF)." },
  JEC: { nome: "Juizados Especiais (Lei 9.099/95)", sigla: "JEC", regra: "Dias úteis (Lei 9.099/95, art. 12-A). Não há prazo em dobro para a Fazenda nos Juizados da Fazenda (Lei 12.153/2009, art. 7º)." },
  LEF: { nome: "Execução fiscal (Lei 6.830/80)", sigla: "LEF", regra: "Dias úteis (CPC aplicado subsidiariamente). Embargos do executado em 30 dias (art. 16)." },
  MS: { nome: "Mandado de segurança (Lei 12.016/2009)", sigla: "MS", regra: "Impetração em 120 dias (decadência); os demais prazos seguem o CPC." },
  ECA: { nome: "Infância e juventude (ECA)", sigla: "ECA", regra: "Dias corridos, sem o dia do começo e com o do vencimento; vedado o prazo em dobro para a Fazenda e o Ministério Público (Lei 8.069/90, art. 152, § 2º)." },
  LOC: { nome: "Locação (Lei 8.245/91)", sigla: "LOC", regra: "Prazos de direito material em dias corridos (CC, art. 132); os processuais seguem o CPC." },
  CDC: { nome: "Consumidor (CDC)", sigla: "CDC", regra: "Prazos de decadência e prescrição de direito material (Lei 8.078/90)." },
  FAL: { nome: "Recuperação e falência (Lei 11.101/2005)", sigla: "FAL", regra: "Dias corridos (Lei 11.101/2005, art. 189, § 1º, I). Confira se o ato é da recuperação, da falência ou do CPC subsidiário." },
  PRESC: { nome: "Prescrição e decadência", sigla: "PRESC", regra: 'Meses e anos "de data a data" (CC, art. 132, § 3º). Vencendo em dia sem expediente, a data passa ao dia útil seguinte.' }
};
var ATOS_POR_CODIGO = [
  // ---------- CPC ----------
  { id: "cpc-contestacao", codigo: "CPC", ato: "Contestação (procedimento comum)", quantidade: 15, unidade: "dias_uteis", base: "CPC, art. 335", marco: "Data da audiência de conciliação ou da juntada do mandado/AR de citação (art. 335, I a III)", dobro: true },
  { id: "cpc-replica", codigo: "CPC", ato: "Réplica", quantidade: 15, unidade: "dias_uteis", base: "CPC, arts. 350 e 351", dobro: true },
  { id: "cpc-emenda", codigo: "CPC", ato: "Emenda da petição inicial", quantidade: 15, unidade: "dias_uteis", base: "CPC, art. 321", dobro: true },
  { id: "cpc-manifestar-doc", codigo: "CPC", ato: "Manifestação sobre documento juntado", quantidade: 15, unidade: "dias_uteis", base: "CPC, art. 437, § 1º", dobro: true },
  { id: "cpc-laudo", codigo: "CPC", ato: "Manifestação sobre o laudo pericial", quantidade: 15, unidade: "dias_uteis", base: "CPC, art. 477, § 1º", dobro: true },
  { id: "cpc-assistente", codigo: "CPC", ato: "Indicar assistente técnico e apresentar quesitos", quantidade: 15, unidade: "dias_uteis", base: "CPC, art. 465, § 1º", dobro: true },
  { id: "cpc-razoes-finais", codigo: "CPC", ato: "Razões finais escritas", quantidade: 15, unidade: "dias_uteis", base: "CPC, art. 364, § 2º", dobro: true },
  { id: "cpc-impedimento", codigo: "CPC", ato: "Exceção de impedimento ou suspeição", quantidade: 15, unidade: "dias_uteis", base: "CPC, art. 146", marco: "Ciência do fato que causa o impedimento ou a suspeição" },
  { id: "cpc-desconsideracao", codigo: "CPC", ato: "Defesa no incidente de desconsideração da personalidade jurídica", quantidade: 15, unidade: "dias_uteis", base: "CPC, art. 135", dobro: true },
  { id: "cpc-apelacao", codigo: "CPC", ato: "Apelação", quantidade: 15, unidade: "dias_uteis", base: "CPC, art. 1.003, § 5º", dobro: true },
  { id: "cpc-contrarrazoes", codigo: "CPC", ato: "Contrarrazões de apelação", quantidade: 15, unidade: "dias_uteis", base: "CPC, art. 1.010, § 1º", dobro: true },
  { id: "cpc-adesivo", codigo: "CPC", ato: "Recurso adesivo", quantidade: 15, unidade: "dias_uteis", base: "CPC, art. 997, § 2º", marco: "Intimação para contrarrazões", dobro: true },
  { id: "cpc-agravo-instrumento", codigo: "CPC", ato: "Agravo de instrumento", quantidade: 15, unidade: "dias_uteis", base: "CPC, arts. 1.015 e 1.003, § 5º", dobro: true },
  { id: "cpc-agravo-interno", codigo: "CPC", ato: "Agravo interno", quantidade: 15, unidade: "dias_uteis", base: "CPC, art. 1.021", dobro: true },
  { id: "cpc-ed", codigo: "CPC", ato: "Embargos de declaração", quantidade: 5, unidade: "dias_uteis", base: "CPC, art. 1.023", dobro: true },
  { id: "cpc-resp-re", codigo: "CPC", ato: "Recurso especial ou extraordinário", quantidade: 15, unidade: "dias_uteis", base: "CPC, art. 1.003, § 5º", dobro: true },
  { id: "cpc-contrarrazoes-resp", codigo: "CPC", ato: "Contrarrazões de recurso especial ou extraordinário", quantidade: 15, unidade: "dias_uteis", base: "CPC, art. 1.030", dobro: true },
  { id: "cpc-agravo-resp", codigo: "CPC", ato: "Agravo em recurso especial ou extraordinário", quantidade: 15, unidade: "dias_uteis", base: "CPC, art. 1.042", dobro: true },
  { id: "cpc-ro", codigo: "CPC", ato: "Recurso ordinário constitucional", quantidade: 15, unidade: "dias_uteis", base: "CPC, arts. 1.027 e 1.003, § 5º", dobro: true },
  { id: "cpc-embargos-divergencia", codigo: "CPC", ato: "Embargos de divergência", quantidade: 15, unidade: "dias_uteis", base: "CPC, arts. 1.043 e 1.003, § 5º", dobro: true },
  { id: "cpc-pagamento-523", codigo: "CPC", ato: "Pagamento voluntário no cumprimento de sentença", quantidade: 15, unidade: "dias_uteis", base: "CPC, art. 523", dobro: false },
  { id: "cpc-impugnacao", codigo: "CPC", ato: "Impugnação ao cumprimento de sentença", quantidade: 15, unidade: "dias_uteis", base: "CPC, art. 525", marco: "Fim do prazo de pagamento voluntário", dobro: true },
  { id: "cpc-impugnacao-fazenda", codigo: "CPC", ato: "Impugnação da Fazenda ao cumprimento de sentença", quantidade: 30, unidade: "dias_uteis", base: "CPC, art. 535", dobro: false, nota: "O prazo de 30 dias já é o da Fazenda; não se dobra." },
  { id: "cpc-pagamento-829", codigo: "CPC", ato: "Pagamento na execução de título extrajudicial", quantidade: 3, unidade: "dias_uteis", base: "CPC, art. 829", marco: "Citação do executado", dobro: false },
  { id: "cpc-embargos-execucao", codigo: "CPC", ato: "Embargos à execução", quantidade: 15, unidade: "dias_uteis", base: "CPC, art. 915", marco: "Juntada do mandado ou AR de citação", dobro: true },
  { id: "cpc-embargos-fazenda", codigo: "CPC", ato: "Embargos da Fazenda à execução", quantidade: 30, unidade: "dias_uteis", base: "CPC, art. 910", dobro: false, nota: "O prazo de 30 dias já é o da Fazenda; não se dobra." },
  { id: "cpc-alimentos", codigo: "CPC", ato: "Execução de alimentos: pagar, provar o pagamento ou justificar", quantidade: 3, unidade: "dias_uteis", base: "CPC, art. 528", marco: "Citação do executado", dobro: false },
  { id: "cpc-monitoria", codigo: "CPC", ato: "Ação monitória: pagar ou opor embargos", quantidade: 15, unidade: "dias_uteis", base: "CPC, arts. 701 e 702", marco: "Juntada do mandado ou AR de citação", dobro: true },
  { id: "cpc-embargos-terceiro", codigo: "CPC", ato: "Contestação nos embargos de terceiro", quantidade: 15, unidade: "dias_uteis", base: "CPC, art. 679", dobro: true },
  { id: "cpc-prestacao-contas", codigo: "CPC", ato: "Contestação na ação de exigir contas", quantidade: 15, unidade: "dias_uteis", base: "CPC, art. 550", dobro: true },
  { id: "cpc-generico", codigo: "CPC", ato: "Manifestação sem prazo fixado pelo juiz", quantidade: 5, unidade: "dias_uteis", base: "CPC, art. 218, § 3º", dobro: true },
  { id: "cpc-rescisoria", codigo: "CPC", ato: "Ação rescisória", quantidade: 2, unidade: "anos", base: "CPC, art. 975", natureza: "material", marco: "Trânsito em julgado da última decisão" },
  { id: "cpc-juiz-despacho", codigo: "CPC", ato: "Prazo do juiz: despachos", quantidade: 5, unidade: "dias_uteis", base: "CPC, art. 226, I", natureza: "improprio", marco: "Conclusão dos autos", nota: "Prazo impróprio: o descumprimento não gera preclusão, mas pode ser levado à corregedoria." },
  { id: "cpc-juiz-decisao", codigo: "CPC", ato: "Prazo do juiz: decisões interlocutórias", quantidade: 10, unidade: "dias_uteis", base: "CPC, art. 226, II", natureza: "improprio", marco: "Conclusão dos autos", nota: "Prazo impróprio." },
  { id: "cpc-juiz-sentenca", codigo: "CPC", ato: "Prazo do juiz: sentença", quantidade: 30, unidade: "dias_uteis", base: "CPC, art. 226, III", natureza: "improprio", marco: "Conclusão dos autos", nota: "Prazo impróprio." },
  // ---------- CLT ----------
  { id: "clt-ro", codigo: "CLT", ato: "Recurso ordinário", quantidade: 8, unidade: "dias_uteis", base: "CLT, arts. 775 e 895", dobro: true },
  { id: "clt-ap", codigo: "CLT", ato: "Agravo de petição", quantidade: 8, unidade: "dias_uteis", base: "CLT, art. 897, a", dobro: true },
  { id: "clt-ai", codigo: "CLT", ato: "Agravo de instrumento", quantidade: 8, unidade: "dias_uteis", base: "CLT, art. 897, b", dobro: true },
  { id: "clt-rr", codigo: "CLT", ato: "Recurso de revista", quantidade: 8, unidade: "dias_uteis", base: "CLT, art. 896; Lei 5.584/70, art. 6º", dobro: true },
  { id: "clt-contrarrazoes", codigo: "CLT", ato: "Contrarrazões a qualquer recurso", quantidade: 8, unidade: "dias_uteis", base: "Lei 5.584/70, art. 6º", dobro: true },
  { id: "clt-embargos-tst", codigo: "CLT", ato: "Embargos no TST (divergência)", quantidade: 8, unidade: "dias_uteis", base: "CLT, art. 894", dobro: true },
  { id: "clt-ed", codigo: "CLT", ato: "Embargos de declaração", quantidade: 5, unidade: "dias_uteis", base: "CLT, arts. 775 e 897-A", dobro: true },
  { id: "clt-embargos-execucao", codigo: "CLT", ato: "Embargos à execução e impugnação à sentença de liquidação", quantidade: 5, unidade: "dias_uteis", base: "CLT, art. 884", marco: "Garantia da execução ou penhora" },
  { id: "clt-calculos", codigo: "CLT", ato: "Manifestação sobre os cálculos de liquidação", quantidade: 10, unidade: "dias_uteis", base: "CLT, art. 879, § 2º" },
  { id: "clt-falta-grave", codigo: "CLT", ato: "Inquérito para apuração de falta grave (estável)", quantidade: 30, unidade: "dias_corridos", base: "CLT, art. 853; Súmula 403 do STF", natureza: "material", marco: "Suspensão do empregado" },
  { id: "clt-verbas", codigo: "CLT", ato: "Pagamento das verbas rescisórias", quantidade: 10, unidade: "dias_corridos", base: "CLT, art. 477, § 6º", natureza: "material", marco: "Término do contrato" },
  { id: "clt-prescricao-bienal", codigo: "CLT", ato: "Ação trabalhista (prescrição bienal)", quantidade: 2, unidade: "anos", base: "CF, art. 7º, XXIX", natureza: "material", marco: "Extinção do contrato de trabalho", nota: "Dentro desses 2 anos, só se cobra o que ocorreu nos 5 anos anteriores ao ajuizamento (prescrição quinquenal)." },
  // ---------- CPP ----------
  { id: "cpp-resposta", codigo: "CPP", ato: "Resposta à acusação", quantidade: 10, unidade: "dias_corridos", base: "CPP, art. 396", marco: "Citação do acusado" },
  { id: "cpp-memoriais", codigo: "CPP", ato: "Memoriais (alegações finais por escrito)", quantidade: 5, unidade: "dias_corridos", base: "CPP, art. 403, § 3º", nota: "Quando o juiz, pela complexidade, autoriza memoriais em vez de debates orais." },
  { id: "cpp-apelacao", codigo: "CPP", ato: "Apelação criminal (interposição)", quantidade: 5, unidade: "dias_corridos", base: "CPP, art. 593" },
  { id: "cpp-razoes", codigo: "CPP", ato: "Razões de apelação criminal", quantidade: 8, unidade: "dias_corridos", base: "CPP, art. 600", marco: "Intimação para apresentar razões", nota: "Nas contravenções, 3 dias." },
  { id: "cpp-rese", codigo: "CPP", ato: "Recurso em sentido estrito", quantidade: 5, unidade: "dias_corridos", base: "CPP, art. 586" },
  { id: "cpp-razoes-rese", codigo: "CPP", ato: "Razões do recurso em sentido estrito", quantidade: 2, unidade: "dias_corridos", base: "CPP, art. 588", marco: "Intimação para apresentar razões" },
  { id: "cpp-ed", codigo: "CPP", ato: "Embargos de declaração", quantidade: 2, unidade: "dias_corridos", base: "CPP, art. 619" },
  { id: "cpp-infringentes", codigo: "CPP", ato: "Embargos infringentes e de nulidade", quantidade: 10, unidade: "dias_corridos", base: "CPP, art. 609, parágrafo único" },
  { id: "cpp-agravo-execucao", codigo: "CPP", ato: "Agravo em execução penal", quantidade: 5, unidade: "dias_corridos", base: "Lei 7.210/84, art. 197; Súmula 700 do STF" },
  { id: "cpp-resp-re", codigo: "CPP", ato: "Recurso especial ou extraordinário penal", quantidade: 15, unidade: "dias_corridos", base: "CPC, art. 1.003, § 5º, c/c CPP, art. 3º", nota: "O prazo é de 15 dias; confira se o tribunal conta em dias corridos (CPP) ou úteis (CPC)." },
  { id: "cpp-queixa", codigo: "CPP", ato: "Queixa-crime ou representação (decadência)", quantidade: 6, unidade: "meses", base: "CPP, art. 38; CP, art. 103", natureza: "material", marco: "Ciência de quem é o autor do crime" },
  { id: "cpp-queixa-subsidiaria", codigo: "CPP", ato: "Queixa subsidiária (ação privada subsidiária)", quantidade: 6, unidade: "meses", base: "CPP, art. 38", natureza: "material", marco: "Fim do prazo do Ministério Público para denunciar" },
  { id: "cpp-denuncia-preso", codigo: "CPP", ato: "Denúncia: réu preso", quantidade: 5, unidade: "dias_corridos", base: "CPP, art. 46", natureza: "improprio", marco: "Recebimento do inquérito pelo Ministério Público" },
  { id: "cpp-denuncia-solto", codigo: "CPP", ato: "Denúncia: réu solto", quantidade: 15, unidade: "dias_corridos", base: "CPP, art. 46", natureza: "improprio", marco: "Recebimento do inquérito pelo Ministério Público" },
  { id: "cpp-inquerito-preso", codigo: "CPP", ato: "Conclusão do inquérito: indiciado preso", quantidade: 10, unidade: "dias_corridos", base: "CPP, art. 10", natureza: "improprio", marco: "Prisão" },
  { id: "cpp-inquerito-solto", codigo: "CPP", ato: "Conclusão do inquérito: indiciado solto", quantidade: 30, unidade: "dias_corridos", base: "CPP, art. 10", natureza: "improprio", marco: "Instauração do inquérito" },
  // ---------- Juizados ----------
  { id: "jec-recurso", codigo: "JEC", ato: "Recurso inominado", quantidade: 10, unidade: "dias_uteis", base: "Lei 9.099/95, arts. 12-A e 42" },
  { id: "jec-contrarrazoes", codigo: "JEC", ato: "Contrarrazões ao recurso inominado", quantidade: 10, unidade: "dias_uteis", base: "Lei 9.099/95, arts. 12-A e 42, § 2º" },
  { id: "jec-ed", codigo: "JEC", ato: "Embargos de declaração", quantidade: 5, unidade: "dias_uteis", base: "Lei 9.099/95, arts. 12-A e 49" },
  { id: "jec-criminal-apelacao", codigo: "JEC", ato: "Apelação no Juizado Criminal (com as razões)", quantidade: 10, unidade: "dias_uteis", base: "Lei 9.099/95, art. 82, § 1º", nota: "Confira se o tribunal conta em dias úteis ou corridos; na dúvida, use a data mais cedo." },
  // ---------- Execução fiscal ----------
  { id: "lef-garantir", codigo: "LEF", ato: "Pagar ou garantir a execução", quantidade: 5, unidade: "dias_uteis", base: "Lei 6.830/80, art. 8º", marco: "Citação do executado", dobro: false },
  { id: "lef-embargos", codigo: "LEF", ato: "Embargos à execução fiscal", quantidade: 30, unidade: "dias_uteis", base: "Lei 6.830/80, art. 16", marco: "Depósito, juntada da fiança ou intimação da penhora", dobro: false },
  { id: "lef-impugnacao", codigo: "LEF", ato: "Impugnação da Fazenda aos embargos", quantidade: 30, unidade: "dias_uteis", base: "Lei 6.830/80, art. 17", dobro: false },
  { id: "lef-infringentes", codigo: "LEF", ato: "Embargos infringentes (execução de pequeno valor)", quantidade: 10, unidade: "dias_uteis", base: "Lei 6.830/80, art. 34, § 1º" },
  // ---------- Mandado de segurança ----------
  { id: "ms-impetracao", codigo: "MS", ato: "Impetração do mandado de segurança", quantidade: 120, unidade: "dias_corridos", base: "Lei 12.016/2009, art. 23", natureza: "material", marco: "Ciência do ato impugnado", nota: "Decadência: não se suspende nem se interrompe." },
  { id: "ms-informacoes", codigo: "MS", ato: "Informações da autoridade coatora", quantidade: 10, unidade: "dias_corridos", base: "Lei 12.016/2009, art. 7º, I", natureza: "improprio", marco: "Notificação da autoridade" },
  { id: "ms-parecer-mp", codigo: "MS", ato: "Parecer do Ministério Público", quantidade: 10, unidade: "dias_corridos", base: "Lei 12.016/2009, art. 12", natureza: "improprio", marco: "Fim do prazo das informações" },
  { id: "ms-apelacao", codigo: "MS", ato: "Apelação da sentença do mandado de segurança", quantidade: 15, unidade: "dias_uteis", base: "Lei 12.016/2009, art. 14; CPC, art. 1.003, § 5º", dobro: true },
  // ---------- ECA ----------
  { id: "eca-defesa-previa", codigo: "ECA", ato: "Defesa prévia no ato infracional", quantidade: 3, unidade: "dias_corridos", base: "Lei 8.069/90, art. 186, § 3º", marco: "Audiência de apresentação" },
  { id: "eca-resposta-dpf", codigo: "ECA", ato: "Resposta na ação de destituição do poder familiar", quantidade: 10, unidade: "dias_corridos", base: "Lei 8.069/90, art. 158", marco: "Citação" },
  { id: "eca-apelacao", codigo: "ECA", ato: "Apelação", quantidade: 10, unidade: "dias_corridos", base: "Lei 8.069/90, art. 198, II", nota: "Prazo único de 10 dias para o Ministério Público e para a defesa." },
  { id: "eca-agravo", codigo: "ECA", ato: "Agravo de instrumento", quantidade: 10, unidade: "dias_corridos", base: "Lei 8.069/90, art. 198, II" },
  // ---------- Locação ----------
  { id: "loc-purgacao", codigo: "LOC", ato: "Purgação da mora na ação de despejo", quantidade: 15, unidade: "dias_uteis", base: "Lei 8.245/91, art. 62, II", marco: "Citação", nota: "Só uma vez a cada 24 meses (art. 62, parágrafo único)." },
  { id: "loc-preferencia", codigo: "LOC", ato: "Resposta do locatário ao direito de preferência", quantidade: 30, unidade: "dias_corridos", base: "Lei 8.245/91, art. 28", natureza: "material", marco: "Recebimento da notícia da venda" },
  { id: "loc-denuncia-locatario", codigo: "LOC", ato: "Aviso do locatário para devolver o imóvel", quantidade: 30, unidade: "dias_corridos", base: "Lei 8.245/91, art. 6º", natureza: "material", marco: "Entrega do aviso por escrito" },
  { id: "loc-desocupar", codigo: "LOC", ato: "Desocupação após notificação (denúncia vazia)", quantidade: 30, unidade: "dias_corridos", base: "Lei 8.245/91, art. 46, § 2º", natureza: "material", marco: "Notificação ao locatário" },
  { id: "loc-fianca", codigo: "LOC", ato: "Exoneração do fiador: fim da responsabilidade", quantidade: 120, unidade: "dias_corridos", base: "Lei 8.245/91, art. 40, X e parágrafo único", natureza: "material", marco: "Notificação ao locador da exoneração" },
  // ---------- Consumidor ----------
  { id: "cdc-vicio-naoduravel", codigo: "CDC", ato: "Reclamar de vício aparente: produto ou serviço não durável", quantidade: 30, unidade: "dias_corridos", base: "CDC, art. 26, I", natureza: "material", marco: "Entrega do produto ou fim do serviço" },
  { id: "cdc-vicio-duravel", codigo: "CDC", ato: "Reclamar de vício aparente: produto ou serviço durável", quantidade: 90, unidade: "dias_corridos", base: "CDC, art. 26, II", natureza: "material", marco: "Entrega do produto ou fim do serviço", nota: "Vício oculto: o prazo conta de quando o vício fica evidente (art. 26, § 3º)." },
  { id: "cdc-saneamento", codigo: "CDC", ato: "Prazo do fornecedor para sanar o vício", quantidade: 30, unidade: "dias_corridos", base: "CDC, art. 18, § 1º", natureza: "material", marco: "Reclamação do consumidor" },
  { id: "cdc-arrependimento", codigo: "CDC", ato: "Arrependimento de compra fora do estabelecimento", quantidade: 7, unidade: "dias_corridos", base: "CDC, art. 49", natureza: "material", marco: "Assinatura do contrato ou recebimento do produto" },
  { id: "cdc-fato-produto", codigo: "CDC", ato: "Reparação por fato do produto ou do serviço (prescrição)", quantidade: 5, unidade: "anos", base: "CDC, art. 27", natureza: "material", marco: "Conhecimento do dano e de sua autoria" },
  // ---------- Recuperação e falência ----------
  { id: "fal-habilitacao", codigo: "FAL", ato: "Habilitação ou divergência de crédito", quantidade: 15, unidade: "dias_corridos", base: "Lei 11.101/2005, art. 7º, § 1º", marco: "Publicação do edital" },
  { id: "fal-impugnacao", codigo: "FAL", ato: "Impugnação de crédito", quantidade: 10, unidade: "dias_corridos", base: "Lei 11.101/2005, art. 8º", marco: "Publicação do edital com a relação do administrador judicial" },
  { id: "fal-contestacao-impugnacao", codigo: "FAL", ato: "Contestação à impugnação de crédito", quantidade: 5, unidade: "dias_corridos", base: "Lei 11.101/2005, art. 11" },
  { id: "fal-plano", codigo: "FAL", ato: "Apresentar o plano de recuperação judicial", quantidade: 60, unidade: "dias_corridos", base: "Lei 11.101/2005, art. 53", marco: "Publicação da decisão que defere o processamento", nota: "Prazo improrrogável: o descumprimento leva à falência." },
  { id: "fal-objecao", codigo: "FAL", ato: "Objeção ao plano de recuperação judicial", quantidade: 30, unidade: "dias_corridos", base: "Lei 11.101/2005, art. 55", marco: "Publicação do aviso de recebimento do plano" },
  { id: "fal-contestacao-falencia", codigo: "FAL", ato: "Contestação do pedido de falência", quantidade: 10, unidade: "dias_corridos", base: "Lei 11.101/2005, art. 98", marco: "Citação" },
  { id: "fal-deposito", codigo: "FAL", ato: "Depósito elisivo da falência", quantidade: 10, unidade: "dias_corridos", base: "Lei 11.101/2005, art. 98, parágrafo único", marco: "Citação" },
  // ---------- Prescrição e decadência ----------
  { id: "presc-geral", codigo: "PRESC", ato: "Prescrição geral", quantidade: 10, unidade: "anos", base: "CC, art. 205", natureza: "material", marco: "Violação do direito" },
  { id: "presc-reparacao", codigo: "PRESC", ato: "Reparação civil", quantidade: 3, unidade: "anos", base: "CC, art. 206, § 3º, V", natureza: "material", marco: "Fato danoso" },
  { id: "presc-divida", codigo: "PRESC", ato: "Cobrança de dívida líquida constante de instrumento", quantidade: 5, unidade: "anos", base: "CC, art. 206, § 5º, I", natureza: "material", marco: "Vencimento da dívida" },
  { id: "presc-alimentos", codigo: "PRESC", ato: "Cobrança de prestações alimentares", quantidade: 2, unidade: "anos", base: "CC, art. 206, § 2º", natureza: "material", marco: "Vencimento de cada prestação" },
  { id: "presc-seguro", codigo: "PRESC", ato: "Pretensão do segurado contra o segurador", quantidade: 1, unidade: "anos", base: "CC, art. 206, § 1º, II", natureza: "material", marco: "Ciência do fato gerador" },
  { id: "presc-aluguel", codigo: "PRESC", ato: "Cobrança de aluguéis", quantidade: 3, unidade: "anos", base: "CC, art. 206, § 3º, I", natureza: "material", marco: "Vencimento de cada aluguel" },
  { id: "presc-tributo-lancamento", codigo: "PRESC", ato: "Decadência do lançamento do tributo", quantidade: 5, unidade: "anos", base: "CTN, arts. 150, § 4º, e 173", natureza: "material", marco: "Fato gerador (ou 1º de janeiro do ano seguinte, conforme o caso)" },
  { id: "presc-tributo-cobranca", codigo: "PRESC", ato: "Prescrição da cobrança do crédito tributário", quantidade: 5, unidade: "anos", base: "CTN, art. 174", natureza: "material", marco: "Constituição definitiva do crédito" },
  { id: "presc-repeticao", codigo: "PRESC", ato: "Repetição de indébito tributário", quantidade: 5, unidade: "anos", base: "CTN, art. 168", natureza: "material", marco: "Pagamento indevido" },
  { id: "presc-improbidade", codigo: "PRESC", ato: "Ação de improbidade administrativa", quantidade: 8, unidade: "anos", base: "Lei 8.429/92, art. 23 (Lei 14.230/2021)", natureza: "material", marco: "Fato (ou cessação da permanência)" },
  { id: "presc-acao-popular", codigo: "PRESC", ato: "Ação popular", quantidade: 5, unidade: "anos", base: "Lei 4.717/65, art. 21", natureza: "material", marco: "Ato lesivo" }
];
var rotuloPrazo = (a) => {
  const u = a.unidade === "dias_uteis" ? a.quantidade === 1 ? "dia útil" : "dias úteis" : a.unidade === "dias_corridos" ? a.quantidade === 1 ? "dia corrido" : "dias corridos" : a.unidade === "meses" ? a.quantidade === 1 ? "mês" : "meses" : a.quantidade === 1 ? "ano" : "anos";
  return `${a.quantidade} ${u}`;
};
function calcularPrazoPorCodigo(ato2, inicio, prerrogativa = "nenhuma") {
  const avisos = [];
  if (ato2.nota) avisos.push(ato2.nota);
  if (ato2.natureza === "improprio") avisos.push("Prazo impróprio (dirigido ao juiz, ao Ministério Público ou à autoridade): o vencimento não gera preclusão automática.");
  let dobro = false;
  if (prerrogativa !== "nenhuma") {
    if (ato2.dobro) dobro = true;
    else avisos.push("Este ato não admite prazo em dobro (regra própria do código ou prazo já diferenciado).");
  }
  if (dobro && ato2.codigo === "CLT") avisos.push("Na Justiça do Trabalho, o prazo em dobro da Fazenda segue o Decreto-Lei 779/69; confira o caso concreto.");
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
    if (prorrogado) pulados.push({ data: venc, motivo: "vencimento em dia sem expediente: passa ao dia útil seguinte" });
  } else {
    const venc = somarMeses(inicio, ato2.unidade === "anos" ? q * 12 : q);
    final = prorrogarParaDiaUtil(venc);
    prorrogado = final !== venc;
    if (prorrogado) pulados.push({ data: venc, motivo: "vencimento em dia sem expediente: passa ao dia útil seguinte" });
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
  if (i < 0) return limpo.slice(0, 220) + (limpo.length > 220 ? "…" : "");
  const ini = Math.max(0, i - 80);
  return (ini > 0 ? "…" : "") + limpo.slice(ini, i + 140).trim() + (i + 140 < limpo.length ? "…" : "");
}
var recursoDaSentenca = (c) => c === "CLT" ? "clt-ro" : c === "JEC" ? "jec-recurso" : c === "CPP" ? "cpp-apelacao" : "cpc-apelacao";
var edDo = (c) => c === "CLT" ? "clt-ed" : c === "JEC" ? "jec-ed" : c === "CPP" ? "cpp-ed" : "cpc-ed";
var outraRecurso = (c) => {
  const a = ato(recursoDaSentenca(c));
  return `Se for recorrer: ${a.ato.toLowerCase()} em ${rotuloPrazo(a)} (${a.base}).`;
};
var REGRAS = [
  { re: /contrarraz\w* (ao |aos |a |de )?(recurso )?(especial|extraordinario)/, id: () => "cpc-contrarrazoes-resp", texto: "Responder ao recurso especial ou extraordinário (contrarrazões)", confianca: "alta", legal: true },
  { re: /(contrarraz|contraminuta)\w* (ao |de )?agravo|resposta ao agravo/, id: (c) => c === "CLT" ? "clt-contrarrazoes" : "ad-agravo", texto: "Responder ao agravo (contraminuta)", confianca: "alta", legal: true },
  { re: /contrarraz|contra-?razoes|oferecer resposta ao recurso|responder ao recurso/, id: (c) => c === "CLT" ? "clt-contrarrazoes" : c === "JEC" ? "jec-contrarrazoes" : c === "CPP" ? "cpp-razoes" : "cpc-contrarrazoes", texto: "Responder ao recurso da outra parte (contrarrazões)", confianca: "alta", legal: true },
  { re: /sobre (os )?embargos de declaracao|embargos de declaracao opostos|art\.? 1\.?023,? ?§ ?2/, id: (c) => edDo(c), texto: "Responder aos embargos de declaração da outra parte", confianca: "alta", legal: true },
  { re: /replica|sobre a contestacao|em reconvencao|sobre a reconvencao/, id: () => "cpc-replica", texto: "Responder à contestação (réplica)", confianca: "alta", legal: true },
  { re: /laudo pericial|sobre o laudo|esclarecimentos do perito/, id: () => "cpc-laudo", texto: "Dizer o que acha do laudo do perito", confianca: "alta" },
  { re: /quesitos|assistente tecnico|honorarios periciais|proposta de honorarios do perito/, id: () => "cpc-assistente", texto: "Indicar assistente técnico e mandar as perguntas ao perito (quesitos)", confianca: "media" },
  { re: /alegacoes finais|razoes finais|memoriais/, id: (c) => c === "CPP" ? "cpp-memoriais" : "cpc-razoes-finais", texto: "Entregar as alegações finais (memoriais)", confianca: "alta" },
  { re: /emend\w* (a )?(peticao )?inicial|emendar a inicial|emende/, id: () => "cpc-emenda", texto: "Corrigir a petição inicial (emenda)", confianca: "alta" },
  { re: /art\.? 523|pagamento voluntario|efetu\w* o pagamento|pague o debito|pagar o debito/, id: () => "cpc-pagamento-523", texto: "Pagar a dívida ou avisar o cliente para pagar (cumprimento de sentença)", confianca: "alta", legal: true },
  { re: /impugna\w* (ao )?cumprimento|art\.? 525/, id: () => "cpc-impugnacao", texto: "Contestar o cumprimento de sentença (impugnação)", confianca: "media", legal: true },
  { re: /especifi\w* (as )?provas|provas que pretende/, id: () => "cpc-generico", texto: "Dizer quais provas quer produzir", confianca: "media" },
  { re: /para contestar|apresentar contestacao|prazo de contestacao|ofere\w* contestacao|cite-se|fica citad/, id: () => "cpc-contestacao", texto: "Defender o cliente (contestação). Confira de quando conta: audiência, juntada do mandado ou do aviso de recebimento", confianca: "media", legal: true },
  { re: /julgo (im)?procedente|julgo parcialmente|julgo extint|homologo|resolvo o merito|sentenca/, id: (c) => edDo(c), texto: "Saiu a sentença. Ler com o cliente; se houver ponto omisso ou contraditório, embargos de declaração", confianca: "media", outra: outraRecurso, legal: true },
  { re: /acordao|acordam|negaram provimento|deram provimento|por unanimidade|por maioria/, id: (c) => edDo(c), texto: "Saiu o acórdão (decisão do tribunal). Ler; se houver omissão, embargos de declaração", confianca: "media", outra: (c) => c === "CLT" ? "Se for recorrer: recurso de revista em 8 dias úteis (CLT, art. 896)." : c === "JEC" ? void 0 : "Se for recorrer: recurso especial ou extraordinário em 15 dias úteis (CPC, art. 1.003, § 5º).", legal: true },
  { re: /defiro|indefiro|decisao interlocutoria|tutela (de urgencia|antecipada)|liminar/, id: (c) => edDo(c), texto: "Saiu uma decisão no meio do processo. Ler; se prejudicar o cliente, avaliar recurso", confianca: "baixa", outra: (c) => c === "CPC" ? "Se couber agravo de instrumento: 15 dias úteis (CPC, arts. 1.015 e 1.003, § 5º)." : void 0, legal: true },
  { re: /manifest|diga(m)? |digam|ciencia|fale(m)? sobre|cumpra|junte|providencie|recolh\w* (as )?custas|comprove/, id: () => "cpc-generico", texto: "Responder ao que o juiz pediu (manifestação)", confianca: "media" }
];
function atoAdHoc(id, codigo, dias, corridos) {
  if (id === "ad-agravo") return { id, codigo: "CPC", ato: "Contraminuta de agravo", quantidade: 15, unidade: "dias_uteis", base: "CPC, arts. 1.019, II, e 1.021, § 2º", dobro: true };
  const corr = corridos || codigo === "CPP" || codigo === "ECA" || codigo === "FAL";
  return { id: "ad-juiz", codigo, ato: "Prazo dado pelo juiz", quantidade: dias ?? 5, unidade: corr ? "dias_corridos" : "dias_uteis", base: dias ? "Prazo fixado na publicação (CPC, art. 218, § 1º)" : "Sem prazo fixado: 5 dias (CPC, art. 218, § 3º)", dobro: true };
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
    return { ...base, oQueFazer: `Comparecer à audiência ou sessão${aud.hora ? ` às ${aud.hora}` : ""}. Avisar o cliente e as testemunhas`, ato: null, vence: aud.data, diaSemana: diaDaSemana(aud.data), urgencia: urgenciaPara(aud.data, hoje), confianca: "media", trecho: trechoEm(texto, /audiencia|sessao de julgamento|pauta/), avisos: ["Data lida do texto da publicação: confira no processo."] };
  }
  const escrito = prazoEscrito(texto);
  const regra = REGRAS.find((r2) => r2.re.test(t));
  if (!regra) {
    if (escrito) {
      const a2 = atoAdHoc("ad-juiz", codigo, escrito.dias, escrito.corridos);
      const r2 = calcularPrazoPorCodigo(a2, publicadaEm);
      return { ...base, oQueFazer: "Cumprir o que o juiz pediu no prazo escrito na publicação", ato: a2, vence: r2.final, diaSemana: r2.diaSemana, urgencia: urgenciaPara(r2.final, hoje), confianca: "baixa", trecho: trechoEm(texto, RE_PRAZO), avisos: r2.avisos };
    }
    return { ...base, oQueFazer: "Ler a publicação: não achei um pedido com prazo", ato: null, vence: null, diaSemana: null, urgencia: "ler", confianca: "baixa", trecho: trechoEm(texto, /intim|publiq|despacho|decisao/), avisos: [] };
  }
  const id = regra.id(codigo);
  let a = id.startsWith("ad-") ? atoAdHoc(id, codigo) : ato(id);
  const avisos = [];
  if (escrito && !regra.legal && escrito.dias !== a.quantidade) {
    a = { ...a, quantidade: escrito.dias, unidade: escrito.corridos ? "dias_corridos" : a.unidade, base: `Prazo fixado na publicação; ${a.base}` };
  } else if (escrito && regra.legal && escrito.dias !== a.quantidade) {
    avisos.push(`A publicação fala em ${escrito.dias} dias, mas a lei dá ${rotuloPrazo(a)} para este ato. Confira qual vale.`);
  }
  if (id === "cpc-generico" && !escrito) avisos.push("A publicação não diz o prazo: usei 5 dias úteis (CPC, art. 218, § 3º).");
  if (codigo === "CPC" && a.codigo === "CPC" && /fazenda|municipio|estado do|uniao|inss|autarquia|defensoria|ministerio publico/.test(t) && a.dobro) avisos.push("Se o cliente for a Fazenda, o MP ou a Defensoria, o prazo é em dobro.");
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
  vencido: "Já venceu",
  urgente: "Vence em até 5 dias",
  breve: "Vence em até 15 dias",
  depois: "Vence depois",
  ler: "Ler e decidir"
};
var linhaDoPrazo = (l) => `${l.vence ? `Vence ${br(l.vence)} (${l.diaSemana})` : "Sem data"} · ${l.publicacao.numero} · ${l.oQueFazer}${l.ato ? ` · ${rotuloPrazo(l.ato)}, ${l.ato.base}` : ""} · publicado em ${br(l.publicadaEm)}`;
function csvDosPrazos(ls) {
  const esc2 = (s) => `"${s.replace(/"/g, '""')}"`;
  const linhas = ls.map((l) => [l.vence ? br(l.vence) : "", ROTULO_URGENCIA[l.urgencia], l.publicacao.numero, l.publicacao.tribunal ?? "", l.publicacao.orgao ?? "", l.oQueFazer, l.ato ? rotuloPrazo(l.ato) : "", l.ato?.base ?? "", br(l.publicacao.data), br(l.publicadaEm), l.confianca, l.trecho].map((v) => esc2(String(v))).join(";"));
  return ["Vence;Situação;Processo;Tribunal;Órgão;O que fazer;Prazo;Base legal;Disponibilizada;Publicada;Confiança da leitura;Trecho"].concat(linhas).join("\n");
}

// src/lib/estiloPecas.ts
var LIMITES = {
  frase: [14, 38],
  ritmo: [4, 16],
  paragrafo: [2, 7],
  doutrina: [0, 6],
  jurisprudencia: [0, 6],
  pessoalidade: [0, 1],
  retorica: [0, 1],
  latinismo: [0, 1]
};
var CHAVES = Object.keys(LIMITES);
var ESCOLAS = [
  {
    id: "classica",
    nome: "Clássica erudita",
    descricao: "Períodos longos e bem articulados, vocabulário rico, doutrina clássica e tom solene.",
    parametros: { frase: 33, ritmo: 12, paragrafo: 5, doutrina: 4, jurisprudencia: 1.5, pessoalidade: 0.2, retorica: 0.7, latinismo: 0.7 },
    aberturas: ["parte da natureza do instituto", "situa a questão na tradição do direito civil"],
    fechos: ["retoma o princípio que governa o caso", "conclui com síntese solene do direito invocado"],
    numeracao: "romana"
  },
  {
    id: "didatica",
    nome: "Didática constitucional",
    descricao: 'Frases curtas, ideia por parágrafo, enumerações claras ("em primeiro lugar", "em segundo lugar"), linguagem acessível.',
    parametros: { frase: 18, ritmo: 6, paragrafo: 3, doutrina: 1.5, jurisprudencia: 2.5, pessoalidade: 0.6, retorica: 0.3, latinismo: 0.1 },
    aberturas: ["anuncia em uma frase a tese e os pontos que vai demonstrar", "resume a controvérsia em linguagem simples"],
    fechos: ["recapitula os pontos demonstrados em lista curta", "fecha com a consequência prática da tese"],
    numeracao: "arabica"
  },
  {
    id: "processualista",
    nome: "Processualista sistemática",
    descricao: "Estrutura rigorosa por pressupostos e requisitos, remissões precisas ao CPC, precedentes qualificados (temas repetitivos, súmulas).",
    parametros: { frase: 24, ritmo: 7, paragrafo: 4, doutrina: 2.5, jurisprudencia: 4, pessoalidade: 0.3, retorica: 0.15, latinismo: 0.35 },
    aberturas: ["demonstra primeiro o cabimento e a tempestividade", "organiza o mérito pelos requisitos legais, um a um"],
    fechos: ["amarra cada requisito ao pedido correspondente", "indica o precedente vinculante aplicável"],
    numeracao: "decimal"
  },
  {
    id: "civil-constitucional",
    nome: "Civil-constitucional",
    descricao: "Lê o contrato à luz da função social, da boa-fé objetiva e da dignidade; argumentação por princípios com ancoragem na lei.",
    parametros: { frase: 27, ritmo: 9, paragrafo: 4, doutrina: 3.5, jurisprudencia: 2.5, pessoalidade: 0.35, retorica: 0.45, latinismo: 0.25 },
    aberturas: ["parte da função econômica e social do contrato", "mostra como a boa-fé objetiva orienta a leitura da cláusula"],
    fechos: ["harmoniza a solução com a Constituição e o Código Civil", "mostra o equilíbrio contratual alcançado pelo pedido"],
    numeracao: "romana"
  },
  {
    id: "pragmatica",
    nome: "Pragmática de tribunal superior",
    descricao: "Objetiva, vai direto ao ponto decisivo, prioriza a jurisprudência dominante e a consequência prática da decisão.",
    parametros: { frase: 20, ritmo: 6, paragrafo: 3, doutrina: 0.8, jurisprudencia: 4.5, pessoalidade: 0.25, retorica: 0.1, latinismo: 0.15 },
    aberturas: ["começa pelo ponto que decide a causa", "apresenta o entendimento consolidado do tribunal e encaixa o caso"],
    fechos: ["mostra que o caso se ajusta ao precedente", "aponta o resultado prático e o risco de decisão contrária"],
    numeracao: "arabica"
  },
  {
    id: "empresarial",
    nome: "Corporativa de grande banca",
    descricao: "Sumário executivo no início, seções curtas com títulos informativos, linguagem de negócios, riscos e alternativas explícitos.",
    parametros: { frase: 21, ritmo: 7, paragrafo: 3, doutrina: 1, jurisprudencia: 2, pessoalidade: 0.5, retorica: 0.1, latinismo: 0.05 },
    aberturas: ["abre com sumário executivo de três frases", "apresenta o problema, o impacto e a solução proposta"],
    fechos: ["fecha com quadro de riscos e próximos passos", "resume o que se pede em tópicos objetivos"],
    numeracao: "decimal"
  },
  {
    id: "combativa",
    nome: "Advocacia combativa",
    descricao: "Narrativa forte dos fatos, ênfase na injustiça concreta, perguntas retóricas pontuais e frases curtas de impacto alternadas com longas.",
    parametros: { frase: 22, ritmo: 14, paragrafo: 4, doutrina: 1.5, jurisprudencia: 3, pessoalidade: 0.75, retorica: 0.85, latinismo: 0.2 },
    aberturas: ["abre com o fato mais grave, narrado com concretude", "contrapõe o que foi prometido ao que foi entregue"],
    fechos: ["fecha com frase curta que resume a injustiça a corrigir", "mostra o dano de não decidir agora"],
    numeracao: "romana"
  },
  {
    id: "imobiliaria",
    nome: "Imobiliária técnica",
    descricao: "Precisão de matrícula, cláusula, índice e prazo; remissões à Lei do Inquilinato e à Lei de Registros; tabelas de valores quando cabem.",
    parametros: { frase: 23, ritmo: 8, paragrafo: 3, doutrina: 2, jurisprudencia: 3, pessoalidade: 0.3, retorica: 0.15, latinismo: 0.15 },
    aberturas: ["identifica imóvel, matrícula, contrato e cláusula em discussão", "parte da cronologia do contrato com datas e valores"],
    fechos: ["liga cada valor ou prazo ao dispositivo legal e à cláusula", "resume o débito ou a obrigação em tabela antes dos pedidos"],
    numeracao: "arabica"
  }
];
var REFERENCIAS = [
  { nome: "Rui Barbosa", area: "Constitucional", escola: "classica" },
  { nome: "Pontes de Miranda", area: "Civil e processo", escola: "classica" },
  { nome: "Clóvis Beviláqua", area: "Civil", escola: "classica" },
  { nome: "Miguel Reale", area: "Teoria do direito e Civil", escola: "classica" },
  { nome: "Orlando Gomes", area: "Contratos", escola: "classica" },
  { nome: "Caio Mário da Silva Pereira", area: "Civil", escola: "classica" },
  { nome: "Washington de Barros Monteiro", area: "Civil", escola: "classica" },
  { nome: "Celso de Mello", area: "Constitucional (STF)", escola: "classica" },
  { nome: "Luís Roberto Barroso", area: "Constitucional (STF)", escola: "didatica" },
  { nome: "José Afonso da Silva", area: "Constitucional", escola: "didatica" },
  { nome: "Paulo Bonavides", area: "Constitucional", escola: "didatica" },
  { nome: "Cármen Lúcia", area: "Constitucional (STF)", escola: "didatica" },
  { nome: "Flávio Tartuce", area: "Civil", escola: "didatica" },
  { nome: "Pablo Stolze Gagliano", area: "Civil", escola: "didatica" },
  { nome: "Carlos Roberto Gonçalves", area: "Civil", escola: "didatica" },
  { nome: "Luiz Fux", area: "Processo civil (STF)", escola: "processualista" },
  { nome: "Fredie Didier Jr.", area: "Processo civil", escola: "processualista" },
  { nome: "Humberto Theodoro Júnior", area: "Processo civil", escola: "processualista" },
  { nome: "Cândido Rangel Dinamarco", area: "Processo civil", escola: "processualista" },
  { nome: "José Carlos Barbosa Moreira", area: "Processo civil", escola: "processualista" },
  { nome: "Ada Pellegrini Grinover", area: "Processo coletivo", escola: "processualista" },
  { nome: "Teresa Arruda Alvim", area: "Processo civil", escola: "processualista" },
  { nome: "Luiz Guilherme Marinoni", area: "Processo civil", escola: "processualista" },
  { nome: "Cassio Scarpinella Bueno", area: "Processo civil", escola: "processualista" },
  { nome: "Daniel Amorim Assumpção Neves", area: "Processo civil", escola: "processualista" },
  { nome: "Nelson Nery Junior", area: "Processo e Civil", escola: "processualista" },
  { nome: "Gustavo Tepedino", area: "Civil-constitucional", escola: "civil-constitucional" },
  { nome: "Anderson Schreiber", area: "Civil-constitucional", escola: "civil-constitucional" },
  { nome: "Judith Martins-Costa", area: "Boa-fé e contratos", escola: "civil-constitucional" },
  { nome: "Paulo Lôbo", area: "Civil e Família", escola: "civil-constitucional" },
  { nome: "Maria Celina Bodin de Moraes", area: "Responsabilidade civil", escola: "civil-constitucional" },
  { nome: "Nelson Rosenvald", area: "Civil", escola: "civil-constitucional" },
  { nome: "Ingo Wolfgang Sarlet", area: "Direitos fundamentais", escola: "civil-constitucional" },
  { nome: "Gilmar Mendes", area: "Constitucional (STF)", escola: "civil-constitucional" },
  { nome: "Nancy Andrighi", area: "Direito privado (STJ)", escola: "pragmatica" },
  { nome: "Luis Felipe Salomão", area: "Direito privado (STJ)", escola: "pragmatica" },
  { nome: "Paulo de Tarso Sanseverino", area: "Direito privado (STJ)", escola: "pragmatica" },
  { nome: "Alexandre de Moraes", area: "Constitucional (STF)", escola: "pragmatica" },
  { nome: "Hely Lopes Meirelles", area: "Administrativo", escola: "pragmatica" },
  { nome: "Paulo de Barros Carvalho", area: "Tributário", escola: "processualista" },
  { nome: "Fábio Ulhoa Coelho", area: "Empresarial", escola: "empresarial" },
  { nome: "Rubens Requião", area: "Empresarial", escola: "empresarial" },
  { nome: "Modesto Carvalhosa", area: "Societário", escola: "empresarial" },
  { nome: "Fábio Konder Comparato", area: "Empresarial e Constitucional", escola: "empresarial" },
  { nome: "Sobral Pinto", area: "Advocacia", escola: "combativa" },
  { nome: "Evandro Lins e Silva", area: "Advocacia criminal", escola: "combativa" },
  { nome: "Lenio Streck", area: "Hermenêutica", escola: "combativa" },
  { nome: "Carlos Ayres Britto", area: "Constitucional (STF)", escola: "combativa" },
  { nome: "Sylvio Capanema de Souza", area: "Locação (Lei 8.245/91)", escola: "imobiliaria" },
  { nome: "Gildo dos Santos", area: "Locação", escola: "imobiliaria" },
  { nome: "Arnaldo Rizzardo", area: "Contratos e imobiliário", escola: "imobiliaria" },
  { nome: "Maria Helena Diniz", area: "Civil e registros", escola: "imobiliaria" },
  { nome: "Sílvio de Salvo Venosa", area: "Civil e locação", escola: "imobiliaria" }
];
var FORMATACAO = {
  fonte: "Times New Roman",
  fonteAlternativa: "Georgia",
  corpo: 12,
  citacaoLonga: 11,
  notas: 10,
  entrelinhas: 1.5,
  margens: { superior: 3, inferior: 2, esquerda: 3, direita: 2 },
  recuoPrimeiraLinha: 2,
  recuoCitacao: 4,
  regras: [
    "Endereçamento em caixa alta, seguido de espaço para despacho.",
    "Qualificação das partes em um único parágrafo, com nomes em negrito e caixa alta.",
    "Títulos de seção numerados, em negrito e caixa alta; subtítulos em negrito.",
    "Parágrafos numerados nas peças longas, para facilitar a remissão pelo juiz.",
    "Citação com mais de três linhas em bloco recuado de 4 cm, fonte menor, sem aspas.",
    "Precedentes com tribunal, classe, número, relator, órgão julgador e data.",
    "Negrito com moderação; nada de sublinhado e itálico só para estrangeirismos.",
    "Pedidos em alíneas (a, b, c), cada um em uma linha, verbos no infinitivo.",
    "Fecho com local, data, nome do advogado e número da OAB."
  ]
};
var CONECTIVOS = {
  adicao: ["além disso", "ademais", "some-se a isso", "acresce que", "não bastasse", "também", "de igual modo", "soma-se a esse quadro"],
  oposicao: ["contudo", "todavia", "no entanto", "entretanto", "ocorre que", "sucede que", "ainda assim", "em sentido contrário"],
  conclusao: ["portanto", "assim", "por isso", "logo", "dessa forma", "por conseguinte", "daí resulta que", "em suma"],
  causa: ["porque", "uma vez que", "já que", "visto que", "na medida em que", "dado que", "pois"],
  exemplo: ["por exemplo", "é o caso de", "a título ilustrativo", "veja-se", "basta lembrar"],
  enfase: ["é dizer", "vale dizer", "em outras palavras", "note-se", "convém frisar", "importa sublinhar"]
};
var VICIOS = [
  "abrir parágrafos seguidos com o mesmo conectivo",
  'repetir "outrossim", "destarte" ou "ademais" mais de uma vez na peça',
  "listas com sempre três itens",
  "frases todas do mesmo tamanho",
  'fórmulas vazias como "é de suma importância" ou "cumpre salientar"',
  'adjetivação em série ("clara, evidente e inequívoca")',
  "concluir cada seção com resumo do que acabou de ser dito",
  "travessões em excesso"
];
function gerador(semente) {
  let a = semente >>> 0;
  return () => {
    a = a + 1831565813 >>> 0;
    let t = a;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
function hash32(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
function normal(r) {
  const u = Math.max(r(), 1e-12), v = r();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}
function gama(alfa, r) {
  if (alfa < 1) return gama(alfa + 1, r) * Math.pow(Math.max(r(), 1e-12), 1 / alfa);
  const d = alfa - 1 / 3, c = 1 / Math.sqrt(9 * d);
  for (; ; ) {
    let x = 0, v = 0;
    do {
      x = normal(r);
      v = 1 + c * x;
    } while (v <= 0);
    v = v * v * v;
    const u = r();
    if (u < 1 - 0.0331 * x ** 4 || Math.log(u) < 0.5 * x * x + d * (1 - v + Math.log(v))) return d * v;
  }
}
var limitar = (k, v) => Math.min(LIMITES[k][1], Math.max(LIMITES[k][0], v));
var normalizado = (p) => CHAVES.map((k) => (p[k] - LIMITES[k][0]) / (LIMITES[k][1] - LIMITES[k][0]));
function distancia(a, b) {
  const x = normalizado(a), y = normalizado(b);
  return Math.sqrt(x.reduce((s, xi, i) => s + (xi - y[i]) ** 2, 0) / x.length);
}
var DISTANCIA_MINIMA = 0.12;
var AFINIDADE = {
  imobiliario: ["imobiliaria", "civil-constitucional", "pragmatica"],
  condominial: ["imobiliaria", "pragmatica"],
  registral: ["imobiliaria", "classica"],
  empresarial: ["empresarial", "pragmatica"],
  compliance: ["empresarial", "didatica"],
  consumidor: ["combativa", "civil-constitucional"],
  trabalhista: ["combativa", "pragmatica"],
  penal: ["combativa", "classica"],
  familia: ["civil-constitucional", "didatica"],
  civel: ["civil-constitucional", "processualista"]
};
function chaveArea(area) {
  const a = String(area ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  if (/famil|sucess|inventar/.test(a)) return "familia";
  if (/imobili|locac|condomin/.test(a)) return /condomin/.test(a) ? "condominial" : "imobiliario";
  if (/tribut|fiscal/.test(a)) return "tributario";
  if (/trabalh/.test(a)) return "trabalhista";
  if (/consum/.test(a)) return "consumidor";
  if (/empres|societ|recupera/.test(a)) return "empresarial";
  if (/penal|crim/.test(a)) return "penal";
  if (/constituc|administr|fazenda|public/.test(a)) return "publico";
  if (/registr/.test(a)) return "registral";
  if (/complian/.test(a)) return "compliance";
  if (/civ/.test(a)) return "civel";
  return a;
}
var BANCA = [
  {
    id: "rui-barbosa",
    referencia: "Rui Barbosa",
    especialidade: "Constitucional e tribunais superiores",
    escola: "classica",
    areas: ["publico", "penal"],
    pecas: /mandado de seguran|habeas|extraordin|constitucional/i,
    metodo: "Constrói a peça como defesa de um direito: expõe o fato com gravidade, ergue a tese sobre a Constituição e a encadeia em períodos amplos e bem articulados, com vocabulário preciso e fecho solene.",
    forcas: "força do argumento, domínio do vernáculo, arquitetura do raciocínio",
    evitar: "prolixidade, erudição exibida, períodos que se perdem, citação em língua estrangeira sem tradução"
  },
  {
    id: "pontes-de-miranda",
    referencia: "Pontes de Miranda",
    especialidade: "Civil, família e sucessões",
    escola: "classica",
    areas: ["familia", "registral", "civel"],
    pecas: /invent[aá]rio|partilha|sucess|usucapi|nulidade|anula/i,
    metodo: "Classifica antes de argumentar: identifica a natureza do fato jurídico, separa existência, validade e eficácia, e só então tira a consequência, com rigor conceitual e remissão exata ao artigo.",
    forcas: "precisão conceitual, classificação rigorosa, remissão exata à lei",
    evitar: "hermetismo, neologismos, frases truncadas, excesso de parênteses e de remissões cruzadas"
  },
  {
    id: "barbosa-moreira",
    referencia: "José Carlos Barbosa Moreira",
    especialidade: "Processo civil e recursos",
    escola: "processualista",
    areas: ["civel"],
    pecas: /recurso|apela|agravo|embargos|contrarraz|ac[oó]rd[aã]o|decis[aã]o/i,
    metodo: "Abre pelo cabimento, pela tempestividade e pelo interesse; depois ataca a decisão ponto por ponto, na ordem em que foi fundamentada, com frases limpas e sem um adjetivo sobrando.",
    forcas: "clareza, concisão, ordem lógica, elegância sem enfeite",
    evitar: "ironia, tom professoral, digressão teórica que não serve ao caso"
  },
  {
    id: "barroso",
    referencia: "Luís Roberto Barroso",
    especialidade: "Constitucional e direito público",
    escola: "didatica",
    areas: ["publico", "compliance"],
    pecas: /fazenda|munic[ií]pio|\bestado do\b|\buni[aã]o federal\b|administrativ/i,
    metodo: "Anuncia a tese em uma frase e a demonstra em três ou quatro proposições numeradas, uma ideia por parágrafo, em linguagem que o cliente entenderia, fechando com a consequência prática.",
    forcas: "didatismo, síntese, estrutura visível, linguagem acessível",
    evitar: "frases de efeito, generalidades de princípio sem lei que as sustente, tom de palestra"
  },
  {
    id: "tepedino",
    referencia: "Gustavo Tepedino",
    especialidade: "Contratos e responsabilidade civil",
    escola: "civil-constitucional",
    areas: ["civel", "familia"],
    pecas: /contrat|indeniza|responsabilidade|dano|obriga/i,
    metodo: "Lê o contrato e o dano à luz da boa-fé objetiva, da função social e da dignidade, sempre ancorando o princípio em um artigo do Código Civil e na situação concreta das partes.",
    forcas: "leitura sistemática, equilíbrio entre princípio e regra, sensibilidade ao caso concreto",
    evitar: "abstração demais, princípio usado no lugar da prova, parágrafos longos de teoria"
  },
  {
    id: "nancy-andrighi",
    referencia: "Nancy Andrighi",
    especialidade: "Consumidor e direito privado no STJ",
    escola: "pragmatica",
    areas: ["consumidor", "civel"],
    pecas: /consum|banc|plano de sa[uú]de|especial|r[eé]plica|contesta/i,
    metodo: "Vai direto ao ponto que decide a causa: delimita a controvérsia, mostra o entendimento consolidado do tribunal, encaixa o caso nele e aponta o efeito concreto da decisão para a parte.",
    forcas: "objetividade, foco no ponto decisivo, domínio do precedente, atenção ao efeito prático",
    evitar: "empilhar ementas, colar trechos longos de julgados, precedente sem demonstrar a semelhança com o caso"
  },
  {
    id: "capanema",
    referencia: "Sylvio Capanema de Souza",
    especialidade: "Locação e imobiliário",
    escola: "imobiliaria",
    areas: ["imobiliario", "condominial"],
    pecas: /despejo|loca[cç]|aluguel|renovat|revisional|condom/i,
    metodo: "Parte do contrato, da cláusula e da cronologia, com datas e valores exatos; liga cada um ao artigo da Lei do Inquilinato e resume o débito ou a obrigação antes dos pedidos.",
    forcas: "precisão de datas, valores e cláusulas, conhecimento da prática forense, tom direto",
    evitar: "casuísmo sem fundamento legal, coloquialidade, tabela sem explicação"
  },
  {
    id: "ulhoa-coelho",
    referencia: "Fábio Ulhoa Coelho",
    especialidade: "Empresarial e societário",
    escola: "empresarial",
    areas: ["empresarial"],
    pecas: /societ|s[oó]cio|fal[eê]ncia|recupera[cç][aã]o judicial|t[ií]tulo|cheque|duplicata/i,
    metodo: "Abre com um resumo de três frases, trata a questão pelo risco e pelo custo para a empresa, usa seções curtas com títulos que informam e fecha com o que se pede em tópicos.",
    forcas: "visão de negócio, clareza executiva, seções curtas, quantificação do risco",
    evitar: "jargão corporativo, anglicismos, simplificação que omite o fundamento legal"
  },
  {
    id: "barros-carvalho",
    referencia: "Paulo de Barros Carvalho",
    especialidade: "Tributário e execução fiscal",
    escola: "processualista",
    areas: ["tributario"],
    pecas: /fiscal|tribut|imposto|iptu|icms|\biss\b|d[ií]vida ativa|pr[eé]-executividade/i,
    metodo: "Decompõe a exigência nos seus elementos (fato gerador, sujeito, base, alíquota, tempo) e testa cada um contra a lei e a prova, com linguagem exata e conclusão que decorre do exame.",
    forcas: "rigor analítico, decomposição da norma, exatidão terminológica",
    evitar: "vocabulário de lógica e semiótica, abstração, frases que só o especialista entende"
  },
  {
    id: "sobral-pinto",
    referencia: "Sobral Pinto",
    especialidade: "Advocacia de defesa e trabalhista",
    escola: "combativa",
    areas: ["trabalhista", "penal", "consumidor"],
    pecas: /defesa|tutela|urg[eê]ncia|liminar|alega[cç][oõ]es finais|memoriais|reclama/i,
    metodo: "Narra o fato mais grave com concretude, mostra a injustiça a corrigir e sustenta a tese com firmeza e lealdade, alternando frases curtas de impacto com períodos de fundamentação.",
    forcas: "coragem, narrativa concreta, firmeza com lealdade processual",
    evitar: "indignação em excesso, ataque pessoal à parte ou ao juiz, adjetivação, pergunta retórica repetida"
  }
];
function escolherRedator(opcoes) {
  const area = chaveArea(opcoes.area);
  const titulo = String(opcoes.titulo ?? "");
  const recentes = opcoes.anteriores ?? [];
  const r = gerador(opcoes.semente ?? 1);
  const pontuados = BANCA.map((b) => {
    const posicao = b.areas.indexOf(area);
    const pontos = (posicao === 0 ? 4 : posicao > 0 ? 2.5 : 0) + (b.pecas.test(titulo) ? 3 : 0) - (recentes[0] === b.id ? 2.5 : recentes.slice(1, 3).includes(b.id) ? 1 : 0) + r() * 0.5;
    return { b, pontos };
  });
  return pontuados.sort((x, y) => y.pontos - x.pontos)[0].b;
}
function instrucoesDoRedator(b) {
  return `REDATOR DESTA PEÇA (banca de redatores do escritório): tradição de escrita de ${b.referencia} (${b.especialidade}).
Método: ${b.metodo}
Mantenha as forças dessa tradição: ${b.forcas}.
É proibido reproduzir as fraquezas dela: ${b.evitar}.
Siga o método e o padrão de qualidade dessa tradição. Não copie trechos de obra nenhuma, não cite ${b.referencia} como autor do texto e não lhe atribua frases; se citar obra dele como doutrina, só com certeza, senão "[doutrina a conferir]".`;
}
function sortearPerfil(opcoes) {
  const r = gerador(opcoes.semente);
  const anteriores = (opcoes.anteriores ?? []).map((a) => "parametros" in a ? a.parametros : a);
  const preferidas = opcoes.escolas?.length ? opcoes.escolas : AFINIDADE[chaveArea(opcoes.especialidade)] ?? [];
  let melhor = null;
  for (let t = 1; t <= 24; t++) {
    const quantas = r() < 0.6 ? 2 : 3;
    const pool = [...ESCOLAS];
    const escolhidas = [];
    while (escolhidas.length < quantas) {
      const pesos2 = pool.map((e) => preferidas.includes(e.id) ? opcoes.escolas?.length ? 8 : 3 : 1);
      let alvo = r() * pesos2.reduce((s, p) => s + p, 0);
      let i = 0;
      while (alvo > pesos2[i] && i < pool.length - 1) {
        alvo -= pesos2[i];
        i++;
      }
      escolhidas.push(pool.splice(i, 1)[0]);
    }
    const brutos = escolhidas.map(() => gama(1.2, r));
    const soma = brutos.reduce((s, x) => s + x, 0);
    const pesos = brutos.map((x) => x / soma);
    const parametros = {};
    for (const k of CHAVES) {
      const media = escolhidas.reduce((s, e, i) => s + e.parametros[k] * pesos[i], 0);
      const faixa = LIMITES[k][1] - LIMITES[k][0];
      parametros[k] = Math.round(limitar(k, media + normal(r) * faixa * 0.08) * 100) / 100;
    }
    const dMin = anteriores.length ? Math.min(...anteriores.map((a) => distancia(a, parametros))) : 1;
    const dominante = escolhidas[pesos.indexOf(Math.max(...pesos))];
    const candidato = {
      semente: opcoes.semente,
      mistura: escolhidas.map((e, i) => ({ id: e.id, nome: e.nome, peso: Math.round(pesos[i] * 100) / 100 })).sort((a, b) => b.peso - a.peso),
      parametros,
      conectivos: {},
      abertura: escolhidas[Math.floor(r() * escolhidas.length)].aberturas[Math.floor(r() * 2)],
      fecho: escolhidas[Math.floor(r() * escolhidas.length)].fechos[Math.floor(r() * 2)],
      numeracao: dominante.numeracao,
      distanciaMinima: Math.round(dMin * 1e3) / 1e3,
      tentativas: t
    };
    if (!melhor || candidato.distanciaMinima > melhor.distanciaMinima) melhor = candidato;
    if (dMin >= DISTANCIA_MINIMA) break;
  }
  const usados = new Set((opcoes.usados ?? []).map((u) => u.toLowerCase()));
  for (const [grupo, lista] of Object.entries(CONECTIVOS)) {
    const livres = lista.filter((c) => !usados.has(c));
    const base = livres.length >= 2 ? livres : lista;
    const embaralhada = [...base].sort(() => r() - 0.5);
    melhor.conectivos[grupo] = embaralhada.slice(0, 2);
  }
  return melhor;
}
var nivel = (v, baixo, medio, alto) => v < 0.34 ? baixo : v < 0.67 ? medio : alto;
function instrucoesDoPerfil(p) {
  const q = p.parametros;
  const todos = Object.values(p.conectivos).flat();
  return `PERFIL DE ESCRITA DESTA PEÇA (sorteado para esta peça; a próxima terá outro):
- Escolas misturadas: ${p.mistura.map((m) => `${m.nome} ${Math.round(m.peso * 100)}%`).join(", ")}.
- Referências de escrita desta peça (imite o método e a clareza, nunca copie texto nem atribua frases a eles): ${p.mistura.flatMap((m) => REFERENCIAS.filter((r) => r.escola === m.id).slice(0, 3).map((r) => r.nome)).join(", ")}.
- Frases com cerca de ${Math.round(q.frase)} palavras em média, alternando curtas e longas (variação de ±${Math.round(q.ritmo)} palavras). Nunca deixe três frases seguidas do mesmo tamanho.
- Parágrafos de ${Math.max(2, Math.round(q.paragrafo - 1))} a ${Math.round(q.paragrafo + 1)} frases.
- Doutrina: cerca de ${q.doutrina.toFixed(1).replace(".", ",")} referência(s) a cada 1.000 palavras; jurisprudência: cerca de ${q.jurisprudencia.toFixed(1).replace(".", ",")}. Cite autor e obra só quando tiver certeza; caso contrário marque "[doutrina a conferir]". Precedentes sempre com "[conferir no tribunal]".
- Voz: ${nivel(q.pessoalidade, 'impessoal ("requer-se", "demonstra-se")', "mista, predominando a impessoal", 'primeira pessoa do plural ("requeremos", "demonstraremos")')}. Tom: ${nivel(q.retorica, "sóbrio e técnico", "firme, com ênfase pontual", "enfático, com até duas perguntas retóricas em toda a peça")}. Latinismos: ${nivel(q.latinismo, "evite", "só os consagrados", "pode usar, traduzindo os menos comuns")}.
- Abertura do mérito: ${p.abertura}. Fecho antes dos pedidos: ${p.fecho}.
- Numeração das seções: ${p.numeracao === "romana" ? "romana (I, II, III)" : p.numeracao === "decimal" ? "decimal (1, 1.1, 1.2)" : "arábica (1, 2, 3)"}.
- Conectivos preferidos nesta peça: ${todos.join(", ")}. Cada conectivo no máximo duas vezes.
- Evite: ${VICIOS.join("; ")}.
FORMATAÇÃO (padrão de grandes escritórios): ${FORMATACAO.regras.join(" ")}`;
}
function medirTexto(texto) {
  const limpo = texto.replace(/\r/g, "");
  const paragrafos = limpo.split(/\n\s*\n/).filter((p) => p.trim().length > 40).length;
  const frases = limpo.split(/(?<=[.!?;])\s+(?=[A-ZÁÉÍÓÚÂÊÔÃÕÇ"“(])/).map((f) => f.trim()).filter((f) => f.split(/\s+/).length >= 3);
  const tamanhos = frases.map((f) => f.split(/\s+/).length);
  const media = tamanhos.length ? tamanhos.reduce((s, x) => s + x, 0) / tamanhos.length : 0;
  const desvio = tamanhos.length ? Math.sqrt(tamanhos.reduce((s, x) => s + (x - media) ** 2, 0) / tamanhos.length) : 0;
  const palavras = limpo.toLowerCase().match(/[a-záéíóúâêôãõçà-]+/g) ?? [];
  const amostra = palavras.slice(0, 1e3);
  const minusculo = ` ${limpo.toLowerCase().replace(/\s+/g, " ")} `;
  const conectivos = {};
  for (const c of Object.values(CONECTIVOS).flat()) {
    if (c.length < 5) continue;
    const n = minusculo.split(new RegExp(`[\\s,.;(]${c.replace(/[-]/g, "\\-")}[\\s,.;]`)).length - 1;
    if (n) conectivos[c] = n;
  }
  return {
    palavras: palavras.length,
    frases: frases.length,
    mediaFrase: Math.round(media * 10) / 10,
    desvioFrase: Math.round(desvio * 10) / 10,
    paragrafos,
    riqueza: amostra.length ? Math.round(new Set(amostra).size / amostra.length * 1e3) / 1e3 : 0,
    conectivos,
    maiorRepeticao: Math.max(0, ...Object.values(conectivos))
  };
}
function aderencia(m, p) {
  if (!m.frases) return 0;
  const dFrase = Math.min(1, Math.abs(m.mediaFrase - p.parametros.frase) / p.parametros.frase);
  const dRitmo = Math.min(1, Math.abs(m.desvioFrase - p.parametros.ritmo) / p.parametros.ritmo);
  const penal = m.maiorRepeticao > 2 ? 0.15 : 0;
  return Math.round(Math.max(0, 1 - 0.5 * dFrase - 0.35 * dRitmo - penal) * 100);
}
function instrucoesDeRedacao(p) {
  const q = p.parametros;
  return `REDAÇÃO DESTA RESPOSTA (rotação de estilo; a próxima terá outra):
- Frases com cerca de ${Math.round(Math.min(q.frase, 26))} palavras em média, alternando curtas e longas; nunca três frases seguidas do mesmo tamanho.
- Voz ${nivel(q.pessoalidade, "impessoal", "mista", "na primeira pessoa do plural")}; tom ${nivel(q.retorica, "sóbrio", "firme", "enfático, sem exagero")}.
- Conectivos preferidos: ${Object.values(p.conectivos).flat().join(", ")}. Cada um no máximo duas vezes.
- Evite: ${VICIOS.join("; ")}.
- Esta orientação muda só a redação: mantenha a estrutura, os números, as citações e o formato pedidos acima.`;
}
function amostrasDoAutor(pecas, limite) {
  let total = 0;
  const amostras = [];
  for (const p of pecas) {
    const t = p.texto.slice(0, Math.max(0, limite - total));
    if (!t) break;
    total += t.length;
    amostras.push(`### ${p.titulo}
${t}`);
  }
  return amostras;
}

// src/lib/formatarPeca.ts
function formatacaoFinal(propria) {
  const base = { fonte: FORMATACAO.fonte, corpo: FORMATACAO.corpo, entrelinhas: FORMATACAO.entrelinhas, recuoPrimeiraLinha: FORMATACAO.recuoPrimeiraLinha, margens: { ...FORMATACAO.margens } };
  if (!propria) return base;
  const ok = (v, min, max) => typeof v === "number" && Number.isFinite(v) && v >= min && v <= max;
  if (typeof propria.fonte === "string" && /^[\w À-ÿ-]{2,40}$/.test(propria.fonte)) base.fonte = propria.fonte;
  if (ok(propria.corpo, 8, 16)) base.corpo = propria.corpo;
  if (ok(propria.entrelinhas, 1, 3)) base.entrelinhas = propria.entrelinhas;
  if (ok(propria.recuoPrimeiraLinha, 0, 5)) base.recuoPrimeiraLinha = propria.recuoPrimeiraLinha;
  const m = propria.margens;
  if (m && [m.superior, m.inferior, m.esquerda, m.direita].every((x) => ok(x, 0.5, 6))) base.margens = { ...m };
  return base;
}
var esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
var negrito = (s) => esc(s).replace(/\*\*(.+?)\*\*/g, "<b>$1</b>");
function ehTitulo(linha) {
  const t = linha.trim().replace(/^#+\s*/, "").replace(/\*\*/g, "");
  if (/^#+\s/.test(linha.trim())) return true;
  if (t.length < 4 || t.length > 110) return false;
  const letras = t.replace(/[^A-Za-zÀ-ÿ]/g, "");
  return letras.length >= 4 && letras === letras.toUpperCase() && !/[.;:]$/.test(t);
}
var M = (superior, direita, inferior, esquerda) => ({ superior, direita, inferior, esquerda });
var FORMATOS = [
  { id: "abnt-classico", nome: "Clássico ABNT", base: { fonte: "Times New Roman", corpo: 12, entrelinhas: 1.5, recuoPrimeiraLinha: 2, margens: M(3, 2, 2, 3) }, tituloAlinhado: "left", numeracaoTitulos: "romano", paragrafosNumerados: false, espacoDepois: 6, tituloVersalete: false },
  { id: "banca-numerada", nome: "Grande banca, parágrafos numerados", base: { fonte: "Garamond", corpo: 13, entrelinhas: 1.5, recuoPrimeiraLinha: 0, margens: M(3, 2.5, 2.5, 3) }, tituloAlinhado: "left", numeracaoTitulos: "arabico", paragrafosNumerados: true, espacoDepois: 8, tituloVersalete: false },
  { id: "tribunal-superior", nome: "Tribunal superior (memorial)", base: { fonte: "Book Antiqua", corpo: 12, entrelinhas: 1.5, recuoPrimeiraLinha: 2.5, margens: M(3, 2, 2, 3) }, tituloAlinhado: "center", numeracaoTitulos: "romano", paragrafosNumerados: false, espacoDepois: 6, tituloVersalete: true },
  { id: "corporativo", nome: "Corporativo sóbrio", base: { fonte: "Arial", corpo: 12, entrelinhas: 1.5, recuoPrimeiraLinha: 0, margens: M(2.5, 2.5, 2.5, 3) }, tituloAlinhado: "left", numeracaoTitulos: "arabico", paragrafosNumerados: true, espacoDepois: 10, tituloVersalete: false },
  { id: "cambria-moderno", nome: "Moderno de escritório", base: { fonte: "Cambria", corpo: 12, entrelinhas: 1.5, recuoPrimeiraLinha: 1.5, margens: M(3, 2, 2, 3) }, tituloAlinhado: "left", numeracaoTitulos: "romano", paragrafosNumerados: false, espacoDepois: 8, tituloVersalete: false },
  { id: "palatino-academico", nome: "Acadêmico (parecerista)", base: { fonte: "Palatino Linotype", corpo: 12, entrelinhas: 1.5, recuoPrimeiraLinha: 2, margens: M(3, 2.5, 2.5, 3) }, tituloAlinhado: "center", numeracaoTitulos: "arabico", paragrafosNumerados: true, espacoDepois: 6, tituloVersalete: true },
  { id: "georgia-leitura", nome: "Leitura em tela (PJe)", base: { fonte: "Georgia", corpo: 12, entrelinhas: 1.5, recuoPrimeiraLinha: 1.25, margens: M(2.5, 2.5, 2.5, 2.5) }, tituloAlinhado: "left", numeracaoTitulos: "nenhuma", paragrafosNumerados: false, espacoDepois: 10, tituloVersalete: false },
  { id: "century-contencioso", nome: "Contencioso tradicional", base: { fonte: "Century Schoolbook", corpo: 12, entrelinhas: 1.5, recuoPrimeiraLinha: 2.5, margens: M(3, 2, 2, 3) }, tituloAlinhado: "left", numeracaoTitulos: "romano", paragrafosNumerados: true, espacoDepois: 6, tituloVersalete: false },
  { id: "calibri-agil", nome: "Ágil de contencioso de massa", base: { fonte: "Calibri", corpo: 12, entrelinhas: 1.15, recuoPrimeiraLinha: 1.25, margens: M(2.5, 2, 2, 3) }, tituloAlinhado: "left", numeracaoTitulos: "arabico", paragrafosNumerados: false, espacoDepois: 10, tituloVersalete: false },
  { id: "times-compacto", nome: "Compacto de juizado", base: { fonte: "Times New Roman", corpo: 12, entrelinhas: 1.15, recuoPrimeiraLinha: 1.5, margens: M(2.5, 2, 2, 2.5) }, tituloAlinhado: "left", numeracaoTitulos: "romano", paragrafosNumerados: false, espacoDepois: 6, tituloVersalete: false }
];
function sortearFormato(semente, usados = []) {
  const recentes = new Set(usados.slice(0, FORMATOS.length - 1));
  const livres = FORMATOS.filter((f) => !recentes.has(f.id));
  const lista = livres.length ? livres : FORMATOS;
  return lista[(semente >>> 0) % lista.length];
}
var ROMANOS = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII", "XIII", "XIV", "XV", "XVI", "XVII", "XVIII", "XIX", "XX"];
var semNumero = (t) => t.replace(/^\s*(?:[IVXLC]+|\d+(?:\.\d+)*)\s*(?:[–—.)-]|\.\s*[–—-])?\s+(?=[A-ZÀ-Ý])/, "");
function pecaEmHtml(texto, titulo = "Peça", propria, modelo) {
  if (modelo) return pecaComModelo(texto, titulo, propria, modelo);
  const f = { ...FORMATACAO, ...formatacaoFinal(propria) };
  const blocos = texto.replace(/\r/g, "").split(/\n\s*\n/).map((b) => b.trim()).filter(Boolean);
  const corpo = blocos.map((b) => {
    const linhas = b.split("\n");
    if (linhas.length === 1 && ehTitulo(b)) return `<h2>${negrito(b.replace(/^#+\s*/, "").replace(/\*\*/g, ""))}</h2>`;
    if (linhas.every((l) => /^\s*>/.test(l))) return `<blockquote>${negrito(linhas.map((l) => l.replace(/^\s*>\s?/, "")).join(" "))}</blockquote>`;
    if (linhas.every((l) => /^\s*([-*•]|[a-z]\)|\d+[.)])\s+/.test(l))) {
      return `<ul class="pedidos">${linhas.map((l) => `<li>${negrito(l.replace(/^\s*[-*•]\s+/, ""))}</li>`).join("")}</ul>`;
    }
    return linhas.map((l) => ehTitulo(l) ? `<h2>${negrito(l.replace(/^#+\s*/, "").replace(/\*\*/g, ""))}</h2>` : `<p>${negrito(l)}</p>`).join("");
  }).join("\n");
  const m = f.margens;
  return `<!doctype html><html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word"><head><meta charset="utf-8"><title>${esc(titulo)}</title>
<style>
@page { size: 21cm 29.7cm; margin: ${m.superior}cm ${m.direita}cm ${m.inferior}cm ${m.esquerda}cm; }
body { font-family: '${esc(f.fonte)}', ${f.fonteAlternativa}, serif; font-size: ${f.corpo}pt; line-height: ${f.entrelinhas}; color: #000; }
p { text-align: justify; text-indent: ${f.recuoPrimeiraLinha}cm; margin: 0 0 6pt 0; }
h2 { font-size: ${f.corpo}pt; font-weight: bold; text-transform: uppercase; margin: 18pt 0 6pt 0; }
blockquote { margin: 6pt 0 6pt ${f.recuoCitacao}cm; font-size: ${f.citacaoLonga}pt; line-height: 1; text-align: justify; }
ul.pedidos { list-style: none; margin: 0 0 6pt ${f.recuoPrimeiraLinha}cm; padding: 0; }
ul.pedidos li { text-align: justify; margin-bottom: 4pt; }
</style></head><body>
${corpo}
</body></html>`;
}
var SO_TRACOS = /^\s*(?:[-–—_*=]\s*){3,}$/;
var INICIO_ENDERECAMENTO = /^\**\s*(EXCELENT|EXMO|EXMA|EGR[ÉE]GI|COLEND|AO\s+JU[ÍI]Z|À\s|AO\s|ILUSTR[ÍI]SSIM|MERIT[ÍI]SSIM|DOUTO|SENHOR)/i;
var INICIO_ANEXO = /^\s*(?:#+\s*)?\**\s*PONTOS\s+A\s+CONFERIR/i;
var INICIO_FECHO = /^\s*(nest[ea]s\s+termos|termos\s+em\s+que|pede\s+(e\s+espera\s+)?deferimento|p\.\s*deferimento|pede-se\s+deferimento)/i;
var DATA_DO_FECHO = /(\d{1,2}|\[[^\]]*\])\s+de\s+[a-zç\[\]]+\s+de\s+(\d{4}|\[[^\]]*\])/i;
var ESPACO_DESPACHO = /^\s*[([]\s*espa[çc]o\s+para\s+despacho\s*[)\]]\s*$/i;
var ITEM = /^\s*(?:([-*•])|([a-z]\)|\d+[.)]))\s+/;
function separarPeca(texto) {
  const linhas = texto.replace(/\r/g, "").split("\n").filter((l) => !SO_TRACOS.test(l));
  const iAnexo = linhas.findIndex((l) => INICIO_ANEXO.test(l));
  let corpo = iAnexo >= 0 ? linhas.slice(0, iAnexo) : linhas;
  const anexo = iAnexo >= 0 ? linhas.slice(iAnexo + 1) : [];
  const iEnd = corpo.findIndex((l) => INICIO_ENDERECAMENTO.test(l.trim()));
  const avisos = iEnd > 0 && corpo.slice(0, iEnd).some((l) => l.trim()) && iEnd <= 12 ? corpo.slice(0, iEnd) : [];
  if (avisos.length) corpo = corpo.slice(iEnd);
  return { corpo: corpo.join("\n").trim(), conferir: [...avisos, ...avisos.length && anexo.length ? [""] : [], ...anexo].join("\n").trim() };
}
function pecaComModelo(texto, titulo, propria, md) {
  const f = { ...FORMATACAO, ...md.base, ...propria ? formatacaoFinal({ ...md.base, ...propria }) : {} };
  const { corpo: textoDaPeca, conferir } = separarPeca(texto);
  let nTitulo = 0, nPar = 0, depoisDoPrimeiroTitulo = false, houveParagrafo = false, noFecho = false, assinaturas = 0;
  const tituloHtml = (bruto) => {
    const sem = bruto.replace(/^#+\s*/, "").replace(/\*\*/g, "").trim();
    const limpo = semNumero(sem);
    const secao = limpo !== sem || /^(D[OA]S?\s|PRELIMINAR|M[ÉE]RITO|S[ÍI]NTESE|CONCLUS|PEDIDO|REQUERIMENTO|TEMPESTIVIDADE|CABIMENTO|RESUMO|BREVE|RAZ[ÕO]ES|FUNDAMENT|INTRODU)/.test(limpo);
    if (!secao) return houveParagrafo ? `<p class="nome"><b>${negrito(limpo)}</b></p>` : `<p class="cx"><b>${negrito(limpo)}</b></p>`;
    nTitulo++;
    depoisDoPrimeiroTitulo = true;
    const prefixo = md.numeracaoTitulos === "romano" ? `${ROMANOS[nTitulo - 1] ?? nTitulo} – ` : md.numeracaoTitulos === "arabico" ? `${nTitulo}. ` : "";
    return `<h2>${negrito(prefixo + limpo)}</h2>`;
  };
  const item = (l) => {
    const m2 = l.match(ITEM);
    const marca = m2[1] ? "–" : m2[2];
    return `<p class="item"><span class="marca">${esc(marca)}</span> ${negrito(l.replace(ITEM, ""))}</p>`;
  };
  const linhaHtml = (l) => {
    if (ESPACO_DESPACHO.test(l)) return '<p class="despacho">&nbsp;</p>';
    if (noFecho) {
      if (DATA_DO_FECHO.test(l)) return `<p class="data">${negrito(l)}</p>`;
      assinaturas++;
      return `<p class="${assinaturas === 1 ? "ass primeira" : "ass"}">${negrito(l.replace(/\*\*/g, ""))}</p>`;
    }
    if (INICIO_FECHO.test(l)) {
      noFecho = true;
      return `<p class="fecho">${negrito(l)}</p>`;
    }
    if (ehTitulo(l)) return tituloHtml(l);
    if (ITEM.test(l)) return item(l);
    if (!houveParagrafo && !depoisDoPrimeiroTitulo && l.length < 110 && !/,\s*$/.test(l)) return `<p class="ref">${negrito(l)}</p>`;
    houveParagrafo = true;
    if (md.paragrafosNumerados && depoisDoPrimeiroTitulo) {
      nPar++;
      return `<p class="num"><span class="n">${nPar}.</span> ${negrito(l)}</p>`;
    }
    return `<p>${negrito(l)}</p>`;
  };
  const blocos = textoDaPeca.split(/\n\s*\n/).map((b) => b.trim()).filter(Boolean);
  const corpo = blocos.map((b) => {
    const linhas = b.split("\n").filter((l) => l.trim());
    if (linhas.length && linhas.every((l) => /^\s*>/.test(l))) return `<blockquote>${negrito(linhas.map((l) => l.replace(/^\s*>\s?/, "")).join(" "))}</blockquote>`;
    return linhas.map(linhaHtml).join("");
  }).join("\n");
  const folha = conferir ? `
<br clear="all" style="page-break-before:always; mso-break-type:section-break">
<div class="conferir"><p class="conferir-titulo"><b>PONTOS A CONFERIR ANTES DE PROTOCOLAR</b></p>
<p class="conferir-aviso">Esta folha é só para o advogado responsável. Não faz parte da peça: apague antes de protocolar.</p>
${conferir.split("\n").filter((l) => l.trim()).map((l) => `<p class="conferir-item">${negrito(l)}</p>`).join("\n")}</div>` : "";
  const m = f.margens;
  return `<!doctype html><html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word"><head><meta charset="utf-8"><title>${esc(titulo)}</title>
<meta name="formatacao" content="${esc(md.id)}">
<style>
@page { size: 21cm 29.7cm; margin: ${m.superior}cm ${m.direita}cm ${m.inferior}cm ${m.esquerda}cm; }
body { font-family: '${esc(f.fonte)}', ${f.fonteAlternativa}, serif; font-size: ${f.corpo}pt; line-height: ${f.entrelinhas}; color: #000; }
p { text-align: justify; text-indent: ${f.recuoPrimeiraLinha}cm; margin: 0 0 ${md.espacoDepois}pt 0; orphans: 2; widows: 2; }
p.num, p.cx, p.ref, p.nome, p.data, p.ass, p.despacho, p.item, .conferir p { text-indent: 0; }
p.cx { text-align: left; margin-bottom: 0; }
p.despacho { margin: 0; height: 3cm; line-height: 3cm; }
p.ref { text-align: left; margin-bottom: 0; }
p.nome { text-align: center; margin: 14pt 0; letter-spacing: 0.06em; }
p.num .n { font-weight: bold; display: inline-block; min-width: 1cm; }
p.item { margin-left: ${(f.recuoPrimeiraLinha || 1.25) + 0.75}cm; text-indent: -0.75cm; }
p.item .marca { display: inline-block; min-width: 0.75cm; text-indent: 0; }
p.fecho { margin-top: 12pt; }
p.data { text-align: right; margin: 12pt 0 0 0; }
p.ass { text-align: center; margin: 0; font-weight: normal; }
p.ass.primeira { margin-top: 42pt; font-weight: bold; }
h2 { font-size: ${f.corpo}pt; font-weight: bold; text-transform: uppercase; text-align: ${md.tituloAlinhado}; margin: 18pt 0 ${md.espacoDepois}pt 0; page-break-after: avoid;${md.tituloVersalete ? " font-variant: small-caps; letter-spacing: 0.04em;" : ""} }
blockquote { margin: 6pt 0 ${md.espacoDepois}pt ${f.recuoCitacao}cm; font-size: ${f.citacaoLonga}pt; line-height: 1; text-align: justify; }
.conferir { font-family: Arial, Helvetica, sans-serif; font-size: 10.5pt; line-height: 1.3; }
.conferir p { text-align: left; margin: 0 0 6pt 0; }
p.conferir-titulo { font-size: 12pt; margin-bottom: 2pt; }
p.conferir-aviso { font-style: italic; border-bottom: 1px solid #000; padding-bottom: 6pt; margin-bottom: 10pt; }
</style></head><body>
${corpo}${folha}
</body></html>`;
}
export {
  ATOS_POR_CODIGO,
  BANCA,
  CODIGOS,
  FORMATOS,
  ROTULO_URGENCIA,
  aderencia,
  amostrasDoAutor,
  audienciaNoTexto,
  br,
  calcularPrazoPorCodigo,
  chaveArea,
  codigoDoProcesso,
  csvDosPrazos,
  dataDaPublicacao,
  diasEntre,
  escolherRedator,
  formatacaoFinal,
  hash32,
  instrucoesDeRedacao,
  instrucoesDoPerfil,
  instrucoesDoRedator,
  lerIntimacao,
  lerTodas,
  linhaDoPrazo,
  medirTexto,
  pecaEmHtml,
  prazoEscrito,
  rotuloPrazo,
  semAcento,
  somarDias,
  sortearFormato,
  sortearPerfil,
  urgenciaPara
};
