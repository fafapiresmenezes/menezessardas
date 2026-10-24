-- Seed data for fictional test properties and contracts

-- Insert 12 properties
INSERT INTO imoveis (endereco, tipo, uso_atual, proprietario_nome, matricula_rgi, iptu_valid, habite_se, alvara, avcb, notas)
VALUES
  ('Av. Paulista 1000, São Paulo, SP', 'comercial', 'locado', 'João Silva', '123456789', true, true, true, true, 'Edifício comercial moderno'),
  ('Rua Oscar Freire 500, São Paulo, SP', 'residencial', 'proprio', 'Maria Santos', '123456790', true, true, false, false, 'Apartamento funcional'),
  ('Lagoa Rodrigo de Freitas 200, Rio de Janeiro, RJ', 'residencial', 'locado', 'Pedro Costa', '123456791', true, true, false, false, 'Vista para a lagoa'),
  ('Copacabana Praia 100, Rio de Janeiro, RJ', 'hotel', 'locado', 'Hotel ABC Ltda', '123456792', true, true, true, true, 'Hotel boutique 5 estrelas'),
  ('Morumbi Apt 1501, São Paulo, SP', 'residencial', 'proprio', 'Ana Oliveira', '123456793', true, true, false, false, 'Duplex com varanda'),
  ('Vila Mariana Loja 10, São Paulo, SP', 'comercial', 'locado', 'Loja XYZ Ltda', '123456794', true, false, true, false, 'Loja de varejo premium'),
  ('Pinheiros Garagem A1, São Paulo, SP', 'garagem', 'locado', 'João Silva', '123456795', true, false, false, false, 'Garagem climatizada'),
  ('Icaraí Terreno 500m², Niterói, RJ', 'terreno', 'vago', 'Dev Imóveis Ltda', '123456796', true, false, false, false, 'Terreno urbano ótima localização'),
  ('Jardins Apto 401, São Paulo, SP', 'residencial', 'em_construcao', 'Incorporadora ABC', '123456797', false, false, false, false, 'Em construção, previsão entrega 2026'),
  ('Bela Vista Loja, São Paulo, SP', 'comercial', 'locado', 'Loja 2 Ltda', '123456798', true, false, true, false, 'Loja de moda'),
  ('Santo André Apt 201, São Paulo, SP', 'residencial', 'locado', 'Carlos Mendes', '123456799', true, true, false, false, 'Apartamento bem localizado'),
  ('São Caetano Conjunto, São Paulo, SP', 'comercial', 'proprio', 'Empresas XYZ', '123456800', true, true, true, false, 'Conjunto comercial corporativo');

-- Insert 7 contracts with vencimentos em 2025-2026
INSERT INTO contratos (imovel_id, tipo, locatario_fornecedor, data_inicio, data_vencimento, valor_periodico, indice_reajuste, data_ultimo_reajuste, status, notas)
VALUES
  (
    (SELECT id FROM imoveis WHERE endereco = 'Av. Paulista 1000, São Paulo, SP'),
    'locacao_comercial',
    'Empresa Tech Brasil Ltda',
    '2023-06-15',
    '2025-12-15',
    15000.00,
    'ipca',
    '2024-06-15',
    'ativo',
    'Contrato com cláusula de renovação automática'
  ),
  (
    (SELECT id FROM imoveis WHERE endereco = 'Lagoa Rodrigo de Freitas 200, Rio de Janeiro, RJ'),
    'locacao_residencial',
    'Empresa Consultoria RJ',
    '2022-03-01',
    '2025-08-31',
    4500.00,
    'igpm',
    '2024-03-01',
    'ativo',
    'Apartamento com gerenciador'
  ),
  (
    (SELECT id FROM imoveis WHERE endereco = 'Copacabana Praia 100, Rio de Janeiro, RJ'),
    'locacao_comercial',
    'Grupo Hoteleiro América',
    '2021-01-10',
    '2025-06-30',
    50000.00,
    'fixo',
    '2024-01-10',
    'ativo',
    'Aluguel fixo anual, renovação negociada'
  ),
  (
    (SELECT id FROM imoveis WHERE endereco = 'Vila Mariana Loja 10, São Paulo, SP'),
    'locacao_comercial',
    'Varejo Moda Ltda',
    '2023-09-01',
    '2025-11-30',
    8000.00,
    'ipca',
    '2024-09-01',
    'ativo',
    'Loja de marcas internacionais'
  ),
  (
    (SELECT id FROM imoveis WHERE endereco = 'Pinheiros Garagem A1, São Paulo, SP'),
    'locacao_residencial',
    'João Silva',
    '2022-12-15',
    '2025-04-15',
    800.00,
    'fixo',
    NULL,
    'ativo',
    'Garagem mensal'
  ),
  (
    (SELECT id FROM imoveis WHERE endereco = 'Santo André Apt 201, São Paulo, SP'),
    'locacao_residencial',
    'Carlos da Silva',
    '2024-01-01',
    '2025-09-30',
    2800.00,
    'ipca',
    '2024-01-01',
    'ativo',
    'Aluguel residencial com IPCA'
  ),
  (
    (SELECT id FROM imoveis WHERE endereco = 'Bela Vista Loja, São Paulo, SP'),
    'sla',
    'Provedor Telecom Brasil',
    '2023-05-15',
    '2026-05-14',
    5000.00,
    'outro',
    '2024-05-15',
    'ativo',
    'SLA de fornecimento de internet corporativa'
  );

-- Insert test user profile (after you create user in Auth)
-- UPDATE: You should create the user in Supabase Auth first, then insert profile:
-- INSERT INTO usuarios_perfis (id, email, nome_completo, funcao)
-- VALUES ('USER_UUID_HERE', 'admin@exemplo.com', 'Admin Teste', 'admin');

-- Auto-generate alerts for the contracts (trigger will fire on insert)
-- The calcular_dias_restantes trigger will create alerts automatically

-- If you want to manually create some test alerts:
-- (This is optional if the trigger is working)
INSERT INTO alertas (contrato_id, imovel_id, tipo_alerta, dias_restantes, data_evento, lido)
SELECT
  contratos.id,
  contratos.imovel_id,
  'vencimento'::alerta_tipo,
  (contratos.data_vencimento - CURRENT_DATE) as dias_restantes,
  contratos.data_vencimento,
  false
FROM contratos
WHERE (contratos.data_vencimento - CURRENT_DATE) <= 120 AND (contratos.data_vencimento - CURRENT_DATE) >= 0;
