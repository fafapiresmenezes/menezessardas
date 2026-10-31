-- Plano I-02, passo U13: API única de previsão de locação (Instituto -> escritório).
-- Só agregados: o escritório recebe a probabilidade calculada sobre dados públicos do CNJ.
-- Nada do escritório é lido aqui; o uso é contado por dia, sem guardar quem consultou.
create table if not exists instituto.api_uso (
  dia date not null,
  rota text not null,
  chamadas int not null default 0,
  primary key (dia, rota)
);
alter table instituto.api_uso enable row level security;

create or replace function public.previsao_locacao_escritorio(p_tribunal text, p_classe text, p_orgao text default null, p_assunto integer default null)
returns jsonb language plpgsql security definer set search_path = instituto, public as $$
declare r jsonb;
begin
  if auth.uid() is null or not exists (select 1 from public.usuarios_perfis where id = auth.uid()) then
    return jsonb_build_object('erro', 'Acesso só para a equipe do escritório.');
  end if;
  if coalesce(p_tribunal,'') !~* '^TJ[A-Z]{2}$' or coalesce(p_classe,'') = '' then
    return jsonb_build_object('erro', 'Informe tribunal (ex.: TJRJ) e classe.');
  end if;
  r := public.instituto_prever(p_tribunal, p_classe, nullif(p_orgao,''), p_assunto);
  insert into instituto.api_uso(dia, rota, chamadas) values (current_date, 'previsao-locacao', 1)
    on conflict (dia, rota) do update set chamadas = instituto.api_uso.chamadas + 1;
  return r || jsonb_build_object('origem', 'Instituto THEYE', 'api', 'previsao-locacao v1 (U13)');
end $$;
revoke all on function public.previsao_locacao_escritorio(text,text,text,integer) from public, anon;
grant execute on function public.previsao_locacao_escritorio(text,text,text,integer) to authenticated, service_role;
