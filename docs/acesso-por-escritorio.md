# Controle de Acesso por Escritório

**Requisição:** P0 Urgente (15/11/2026, conforme decisão de M)  
**Status:** Implementado com testes  
**Arquitetura:** Modular em `src/lib/escritorio/`

## Visão Geral

A plataforma Instituto THEYE agora suporta múltiplos escritórios/clientes com isolamento completo de dados via RLS (Row Level Security) do Supabase. Cada usuário pode ter acesso a diversos escritórios, com um "escritório atual" onde está trabalhando.

### Dois tipos de usuários especiais

**Marcelo Alexandrino** e **Antonio Costa** (emails: `marcelo@iclub.com.br`, `antonio@iclub.com.br`) são usuários **gratuitos** que:
- Podem acessar tudo que é **grátis** (pesquisas, visualizações, leitura de dados)
- **Estão bloqueados** em qualquer função que custa API
- Recebem aviso: **"Isso gasta dinheiro do Mateus — bloqueado para você"**

## Arquitetura

### Estrutura de Pastas

```
src/lib/escritorio/
├── acesso.ts          # Lógica principal de acesso
├── acesso.test.ts     # Testes de acesso
├── bloqueios.ts       # Bloqueio de funções pagas
├── bloqueios.test.ts  # Testes de bloqueios
└── index.ts           # Exportações
```

### Módulo `acesso.ts`

Gerencia a seleção e validação de escritórios.

**Funções principais:**

- `listarEscritoriosDoUsuario()` — Retorna todos os escritórios do usuário com seus roles
- `verificarUsuarioBloqueado()` — Identifica se é Marcelo ou Antonio
- `temAcessoAoEscritorio(escritorioId)` — Valida permissão de acesso
- `obterEscritorioAtual()` — Retorna o escritório em que está trabalhando agora
- `definirEscritorioAtual(escritorioId)` — Muda o escritório ativo
- `esqueceEscritorio()` — Limpa ao sair ou trocar de conta

**Dados armazenados:**

- `sessionStorage.escritorio-atual-id` — ID do escritório selecionado na aba atual

### Módulo `bloqueios.ts`

Protege funções que custam API.

**Funções pagas definidas:**

| Função | Descrição |
| --- | --- |
| `jusbrasil` | Busca em Jusbrasil (consultas pagas) |
| `ia_analise` | Análise com IA (LLM pago) |
| `ia_geracao` | Geração de documentos com IA |
| `consulta_api_externa` | Consulta a API externa (por requisição) |
| `exportacao_premium` | Exportação com formatação premium |
| `relatorio_analise` | Geração de relatório analítico |

**Funções de proteção:**

- `estaBloqueoEmFuncaoPaga(funcao)` — Verifica se está bloqueado
- `validarAcessoAFuncaoPaga(funcao)` — Lança erro se bloqueado
- `obterAvisoPaga(funcao)` — Retorna aviso antes de usar (ou null se liberado)
- `comBloqueioFuncaoPaga(funcao, callback)` — Wrapper que protege uma função

## Banco de Dados

### Tabela `usuarios_escritorios` (a ser criada)

```sql
create table public.usuarios_escritorios (
  user_id uuid not null references auth.users(id) on delete cascade,
  escritorio_id uuid not null references public.escritorios(id) on delete cascade,
  role text not null check (role in ('admin', 'operador', 'leitor')),
  criado_em timestamptz default now(),
  primary key (user_id, escritorio_id)
);

alter table usuarios_escritorios enable row level security;

-- Política: usuário só vê seus próprios registros
create policy usuarios_escritorios_select on usuarios_escritorios for select
  using (user_id = auth.uid() or (select perfil_atual() = 'admin'));
```

### RLS existente

As tabelas já possuem `escritorio_id` e políticas restrictivas (migrações 116-131):

- `escritorio_id` coluna define o isolamento
- Funções `escritorio_atual()` retorna o escritório do usuário logado
- Política `restrictive` impede cruzamentos de dados

## Uso no Código

### Exemplo 1: Verificar acesso a um escritório

```typescript
import { temAcessoAoEscritorio } from '@/lib/escritorio'

async function acessarEscritorio(id: string) {
  const temAcesso = await temAcessoAoEscritorio(id)
  if (!temAcesso) {
    throw new Error('Sem acesso a este escritório')
  }
  await definirEscritorioAtual(id)
}
```

### Exemplo 2: Proteger uma função paga

```typescript
import { comBloqueioFuncaoPaga } from '@/lib/escritorio'

async function buscarEmJusbrasil(query: string) {
  return comBloqueioFuncaoPaga('jusbrasil', async () => {
    const resultado = await supabase.functions.invoke('jusbrasil-search', {
      body: { query }
    })
    return resultado.data
  })
}
```

### Exemplo 3: Mostrar aviso antes de usar função paga

```typescript
import { obterAvisoPaga } from '@/lib/escritorio'

async function tentarAnalisarComIA() {
  const aviso = await obterAvisoPaga('ia_analise')
  if (aviso) {
    // Mostrar modal: "Marcelo — Isso gasta dinheiro do Mateus — bloqueado"
    alert(aviso)
    return
  }
  // Proceder normalmente
  await executarAnaliseIA()
}
```

## Testes

### Rodar testes

```bash
npm test -- acesso.test.ts
npm test -- bloqueios.test.ts
```

### Cobertura de testes

**acesso.test.ts:**
- ✓ Identificação de Marcelo Alexandrino
- ✓ Identificação de Antonio Costa
- ✓ Case-insensitive em emails
- ✓ Listagem de escritórios
- ✓ Validação de acesso
- ✓ Seleção de escritório
- ✓ Limpeza de dados

**bloqueios.test.ts:**
- ✓ Detecção de bloqueio por usuário
- ✓ Validação com erro apropiado
- ✓ Avisos corretos
- ✓ Execução com proteção

## Migração do Banco

### Criar tabela `usuarios_escritorios`

```sql
-- migration: 132_usuarios_escritorios.sql
create table public.usuarios_escritorios (
  user_id uuid not null references auth.users(id) on delete cascade,
  escritorio_id uuid not null references public.escritorios(id) on delete cascade,
  role text not null check (role in ('admin', 'operador', 'leitor')),
  criado_em timestamptz default now(),
  primary key (user_id, escritorio_id)
);

alter table usuarios_escritorios enable row level security;

create policy usuarios_escritorios_select on usuarios_escritorios for select
  using (user_id = auth.uid() or perfil_atual() = 'admin');

create policy usuarios_escritorios_insert_delete on usuarios_escritorios for insert, delete
  using (perfil_atual() = 'admin');
```

### Criar seletor de escritório na UI

O componente de seleção de escritório será adicionado ao header (próximo ao nome do escritório).

## Checklist de Implementação

- [x] Módulo `acesso.ts` com funções principais
- [x] Módulo `bloqueios.ts` com proteção de funções pagas
- [x] Testes automatizados (acesso.test.ts, bloqueios.test.ts)
- [x] Identificação de Marcelo e Antonio por email
- [x] Documentação (este arquivo)
- [ ] Tabela `usuarios_escritorios` no banco
- [ ] Componente seletor de escritório no header
- [ ] Integração em componentes que usam funções pagas
- [ ] Aviso visual para usuários bloqueados

## Decisões de Design

### Por que `sessionStorage` e não banco?

O escritório atual é uma **preferência da sessão**, não um estado permanente:
- Não é sincronizado entre abas
- É limpo ao fazer logout
- É rápido e não depende de rede

### Por que lista de emails em vez de coluna?

Marcelo e Antonio são:
- Exceções configuradas globalmente
- Não justificam coluna de banco
- Fáceis de adicionar/remover na lista

### Por que bloquear e não apenas avisar?

Decisão de M (15/11/2026): evitar custos acidentais com usuários que não devem gerar faturas.

## Próximos Passos

1. **Criar tabela no banco** (`usuarios_escritorios`)
2. **Adicionar seletor de escritório** no header (dropdown de `listarEscritoriosDoUsuario`)
3. **Integrar bloqueios** em endpoints de funções pagas
4. **Adicionar UI de aviso** quando usuário bloqueado tenta acessar função paga
5. **Testar com dados reais** (Marcelo e Antonio no banco)

## Referências

- Inventário A28: `database/A28-inventario-por-escritorio.md`
- Migração 130: isolamento de arquivos por escritório
- Migração 131: cada escritório vê seu próprio dado
