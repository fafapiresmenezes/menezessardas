# Bancadas Colaborativas - Quick Start Guide

## 🚀 5 Passos para Ativar Tudo

### Passo 1: Executar Migration SQL (5 min)
```
1. Abrir: https://app.supabase.com/project/YOUR_PROJECT/sql
2. Copiar conteúdo de: database/migrations/0001_create_bancadas_inscritos.sql
3. Executar
4. Verificar que a table "bancadas_inscritos" foi criada
```

### Passo 2: Verificar Página Funcionando (5 min)
```bash
cd /home/user/menezessardas
npm run dev

# Acessar em navegador:
# http://localhost:5173/#/bancadas-colaborativas
```

✅ Você deve ver:
- Aba "Bancadas em Formação" com 7 áreas
- Aba "Inscrever-se" com formulário
- Sem erros no console

### Passo 3: Testar Envio de Emails (10 min)
```bash
# Modo debug (não envia realmente)
python scripts/enviar-emails-bancadas.py --tipo empresas-ia --debug

# Você deve ver preview de todos os 6 emails
```

### Passo 4: Configurar SMTP (15 min)
```
Escolher um provider:
- SendGrid (https://sendgrid.com) - Recomendado
- Resend (https://resend.dev) - Moderno
- AWS SES (https://aws.amazon.com/pt/ses/)

Criar arquivo .env.local:
```
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASS=SG.xxxxxxxxxxxxx
SMTP_FROM=contato@theye.club
```

### Passo 5: Enviar Emails (20 min)
```bash
# 1. Preencher lista de 14 empresas existentes
# Editar: DATA_EMAILS_BANCADAS.json
# Na array "empresas_existentes", adicionar os 14 emails

# 2. Enviar para empresas existentes
python scripts/enviar-emails-bancadas.py --tipo reenvio

# 3. Enviar para 6 empresas de IA
python scripts/enviar-emails-bancadas.py --tipo empresas-ia

# Fim!
```

---

## 📱 Acessar a Página

Depois de tudo instalado:
```
http://seu-dominio.com/#/bancadas-colaborativas
```

---

## 📊 Verificar Inscrições

### Via Dashboard Supabase:
```
1. Ir em: https://app.supabase.com/project/YOUR_PROJECT/editor
2. Clicar em: bancadas_inscritos
3. Ver todas as inscrições em tempo real
```

### Via SQL:
```sql
SELECT * FROM bancadas_inscritos ORDER BY data_inscricao DESC;
```

---

## 🐛 Troubleshooting

| Problema | Solução |
|----------|---------|
| "Table doesn't exist" | Execute a migration SQL |
| Página em branco | Verifique console do navegador |
| Erro ao salvar inscrição | Verifique RLS policies no Supabase |
| Emails não enviam | Verifique variáveis de ambiente SMTP |
| Connection refused | Verifique host/port SMTP |

---

## 💡 Dicas

- Use `--debug` sempre para testar primeiro
- Configure SMTP ANTES de enviar emails reais
- Teste com 1 email antes de enviar em massa
- Monitore a tabela `bancadas_inscritos` no Supabase
- Backup dos emails enviados para histórico

---

## 📞 Contatos

- **Email**: bancadas@theye.club
- **Site**: theye.club/bancadas-colaborativas
- **CNPJ**: 34.028.316/0001-14

---

**Tempo total estimado: 1h**

✨ Tudo pronto para começar!
