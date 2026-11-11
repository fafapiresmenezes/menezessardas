-- 110 — Preço novo dos escritórios parceiros (definido por M em 10/11/2026).
--   * Instalação: R$ 15.000,00 em 3 parcelas mensais de R$ 5.000,00, sem juros, nas três primeiras faturas.
--   * Mensalidade: R$ 200,00 por usuário (administrador, operador ou leitor).
--   * Acaba o desconto de 30% do primeiro ano.
-- Publicar JUNTO com a versão da tela que mostra o preço novo (src/lib/precos.ts e contrato de adesão 2.0),
-- para a tela e a fatura não divergirem. A sede continua sem cobrança.
-- Escritórios criados antes de 10/11/2026 (hoje só os de teste) passam à mensalidade nova, sem taxa de instalação.
-- As faturas já emitidas não mudam: preco_usuario fica vazio nelas e a tela as mostra com o preço antigo.

ALTER TABLE public.faturas_escritorio
  ADD COLUMN IF NOT EXISTS preco_usuario numeric,
  ADD COLUMN IF NOT EXISTS instalacao numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS parcela_instalacao integer;

-- Mesma assinatura de antes (mensal_1ano continua existindo para a tela antiga, agora igual a mensal).
CREATE OR REPLACE FUNCTION public.cobranca_escritorios()
RETURNS TABLE(id uuid, nome text, plano text, criado_em timestamp with time zone, operadores bigint, leitores bigint, mensal numeric, mensal_1ano numeric)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  select e.id, e.nome, e.plano, e.criado_em,
    count(p.id) filter (where p.funcao in ('admin','operador')) as operadores,
    count(p.id) filter (where p.funcao = 'leitor') as leitores,
    200::numeric * count(p.id) filter (where p.funcao is not null) as mensal,
    200::numeric * count(p.id) filter (where p.funcao is not null) as mensal_1ano
  from public.escritorios e left join public.usuarios_perfis p on p.escritorio_id = e.id
  where public.eh_sede() and public.perfil_atual() = 'admin'::usuario_funcao
  group by e.id order by e.criado_em;
$$;

CREATE OR REPLACE FUNCTION public.gerar_faturas_escritorios(p_competencia date DEFAULT (date_trunc('month'::text, (CURRENT_DATE)::timestamp with time zone))::date)
RETURNS SETOF faturas_escritorio
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
declare
  e record; v_op int; v_le int; v_mensal numeric; v_inst numeric; v_parc int;
  c_preco constant numeric := 200;        -- por usuário, ao mês
  c_instalacao constant numeric := 15000; -- taxa de instalação
  c_parcelas constant int := 3;           -- sem juros
  c_vigencia constant date := date '2026-11-10'; -- só escritórios criados a partir daqui pagam instalação
  v_comp date := date_trunc('month', p_competencia)::date;
begin
  if auth.uid() is not null and not (public.eh_sede() and public.perfil_atual() = 'admin'::usuario_funcao) then raise exception 'Apenas a administração da sede gera faturas.'; end if;
  for e in select * from public.escritorios where id <> '00000000-0000-0000-0000-000000000001' loop
    select count(*) filter (where funcao in ('admin','operador')), count(*) filter (where funcao = 'leitor') into v_op, v_le from public.usuarios_perfis where escritorio_id = e.id;
    if v_op + v_le = 0 then continue; end if;
    v_mensal := c_preco * (v_op + v_le);
    v_inst := 0; v_parc := null;
    if e.criado_em::date >= c_vigencia then
      select count(*) + 1 into v_parc from public.faturas_escritorio f where f.escritorio_id = e.id and f.instalacao > 0 and f.competencia <> v_comp;
      if v_parc <= c_parcelas then v_inst := round(c_instalacao / c_parcelas, 2); else v_parc := null; end if;
    end if;
    insert into public.faturas_escritorio (escritorio_id, competencia, operadores, leitores, valor_cheio, desconto_pct, valor, vencimento, preco_usuario, instalacao, parcela_instalacao)
      values (e.id, v_comp, v_op, v_le, v_mensal, 0, v_mensal + v_inst, (v_comp + interval '9 days')::date, c_preco, v_inst, v_parc)
      on conflict (escritorio_id, competencia) do nothing;
  end loop;
  return query select * from public.faturas_escritorio where competencia = v_comp order by criado_em;
end $$;
