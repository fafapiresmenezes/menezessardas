-- Passo 526: a trilha de auditoria grava o hash com o instante ISO do navegador, mas a linha
-- recebia criado_em = NOW() do servidor; a verificação recalculava com outro instante e acusava
-- "cadeia comprometida" desde o registro nº 1. Aqui cada criado_em volta ao instante exato que
-- entrou no hash (procurado em ±15 s). Nenhum hash é alterado. Novos registros já gravam criado_em.
WITH cand AS (
  SELECT t.seq, date_trunc('milliseconds', t.criado_em) + (g * interval '1 millisecond') AS em
  FROM trilha_auditoria t, generate_series(-15000, 15000) g
), ok AS (
  SELECT DISTINCT ON (c.seq) c.seq, c.em
  FROM cand c JOIN trilha_auditoria t ON t.seq = c.seq
  WHERE t.hash = encode(digest(t.seq||'|'||to_char(c.em AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')||'|'||t.tipo||'|'||coalesce(t.entidade,'')||'|'||coalesce(t.resumo,'')||'|'||t.hash_anterior,'sha256'),'hex')
  ORDER BY c.seq
)
UPDATE trilha_auditoria t SET criado_em = ok.em FROM ok WHERE ok.seq = t.seq AND t.criado_em IS DISTINCT FROM ok.em;
