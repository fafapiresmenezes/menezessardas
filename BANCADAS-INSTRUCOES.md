# Bancadas Colaborativas THEYE - Instruções de Implementação

## Status: 3 tarefas principais

### ✅ TAREFA 1: Template de E-mail com Detalhes de Bancadas

**Arquivos criados:**
- `/src/lib/bancadas.ts` - Constantes, templates de email e funções
- `/scripts/enviar-emails-bancadas.py` - Script Python para envio
- `/scripts/enviar-emails-bancadas.js` - Script Node.js para envio

**Template disponível em:**
```typescript
import { emailBancadasTemplate } from '@/lib/bancadas'
```

**Como usar:**
1. Adicionar o template ao final de emails existentes para as 14 empresas já contactadas
2. Usar o script para reenvio automático

---

### ✅ TAREFA 2: Nova Página `/bancadas-colaborativas`

**Arquivos criados:**
- `/src/pages/BancadasColaborativasPage.tsx` - Página completa com formulário
- `/src/App.tsx` - Rota adicionada (pública, sem login)
- `/database/migrations/0001_create_bancadas_inscritos.sql` - Schema do Supabase
- `/src/lib/supabase.ts` - Tipo Database atualizado

**Funcionalidades:**
- ✅ Listagem de 7 bancadas com status (Preparação / Aceitando / Em Operação)
- ✅ Formulário de inscrição (público)
- ✅ Salva dados em Supabase table `bancadas_inscritos`
- ✅ RLS configurado (append-only para público)
- ✅ Validação de formulário com mensagens

**Acessar em:**
```
http://localhost:5173/#/bancadas-colaborativas
```

---

### ✅ TAREFA 3: E-mails para Empresas de IA

**Empresas de destino:**
1. Anthropic (contact@anthropic.com)
2. OpenAI (research@openai.com)
3. Google DeepMind (research@deepmind.google.com)
4. Meta AI Research (ai-research@meta.com)
5. Hugging Face (research@huggingface.co)
6. Microsoft Research (msr@microsoft.com)

**Como enviar:**
```bash
# Modo debug (simula envio, não envia realmente)
python scripts/enviar-emails-bancadas.py --tipo empresas-ia --debug

# Enviar realmente (requer variáveis de ambiente SMTP)
python scripts/enviar-emails-bancadas.py --tipo empresas-ia
```

---

## Configuração do Supabase

### 1. Executar migration

```bash
# Via Supabase CLI
supabase migration up

# Ou via SQL direto no editor SQL do Supabase
# Copiar conteúdo de database/migrations/0001_create_bancadas_inscritos.sql
```

### 2. Atualizar type Database (já feito)

A table `bancadas_inscritos` já está configurada em `/src/lib/supabase.ts`:

```typescript
bancadas_inscritos: {
  Row: {
    id: number
    nome_completo: string
    titulo_academico: string | null
    instituicao: string | null
    pais: string | null
    areas_interesse: string[]
    cv_linkedin: string | null
    email: string
    concorda_termos: boolean
    data_inscricao: string
    created_at: string
  }
}
```

---

## Configuração de Envio de E-mail

### Variáveis de ambiente necessárias:

```env
SMTP_HOST=smtp.seu-servidor.com
SMTP_PORT=587
SMTP_USER=seu-usuario@seu-servidor.com
SMTP_PASS=sua-senha
SMTP_FROM=contato@theye.club
```

### Provedores recomendados:
- **SendGrid** (gratuito: 100 emails/dia)
- **Resend** (API clean, built for devs)
- **AWS SES** (pay-as-you-go)
- **Gmail SMTP** (para testes - menos confiável para produção)

---

## Como usar a página de bancadas

### Para usuários finais:
1. Acessar `theye.club/bancadas-colaborativas`
2. Clicar em "Bancadas em Formação" para ver a lista
3. Clicar em "Inscrever-se" para preenchero formulário
4. Submeter inscrição

### Para admin (verificar inscrições):
```typescript
// No Supabase Dashboard
// Ir em: Database > Table Editor > bancadas_inscritos
// Visualizar todas as inscrições

// Ou via SQL
SELECT * FROM bancadas_inscritos ORDER BY data_inscricao DESC;
```

---

## Próximos passos (opcional)

1. **Confirmar emails das empresas existentes** - Adicionar à lista `EMPRESAS_EXISTENTES`
2. **Testar envio com --debug** primeiro
3. **Configurar SMTP** para produção
4. **Adicionar confirmação de email** para inscritos
5. **Dashboard admin** para visualizar inscrições
6. **Integração com smart contracts** para rastreamento

---

## Troubleshooting

### Erro: "bancadas_inscritos table doesn't exist"
→ Execute a migration SQL no editor do Supabase

### Erro: "RLS policy violation"
→ Verifique se a policy de INSERT está ativa e configurada corretamente

### E-mails não enviados
→ Verifique variáveis de ambiente SMTP
→ Teste com `--debug` primeiro
→ Confirme credenciais SMTP

---

## Checklist de Conclusão

- [x] Template de email criado
- [x] Página /bancadas-colaborativas criada
- [x] Formulário de inscrição funcional
- [x] Supabase table criada e configurada
- [x] RLS policies configuradas
- [x] Scripts de envio de email criados
- [x] Rotas adicionadas ao App.tsx
- [ ] Migration SQL executada no Supabase
- [ ] SMTP configurado em produção
- [ ] Emails de teste enviados
- [ ] 14 empresas existentes contactadas com template atualizado
- [ ] 6 empresas de IA contactadas

---

## Estrutura de arquivos

```
menezessardas/
├── src/
│   ├── lib/
│   │   ├── bancadas.ts                    # ✨ NOVO
│   │   └── supabase.ts                    # ✏️ ATUALIZADO
│   ├── pages/
│   │   ├── BancadasColaborativasPage.tsx # ✨ NOVO
│   │   └── App.tsx                        # ✏️ ATUALIZADO
│   └── ...
├── database/
│   └── migrations/
│       └── 0001_create_bancadas_inscritos.sql  # ✨ NOVO
├── scripts/
│   ├── enviar-emails-bancadas.py          # ✨ NOVO
│   └── enviar-emails-bancadas.js          # ✨ NOVO
└── BANCADAS-INSTRUCOES.md                 # ✨ NOVO (este arquivo)
```

---

**Data de Conclusão:** 2026-11-15  
**Autor:** Claude Haiku 4.5  
**CNPJ:** 34.028.316/0001-14
