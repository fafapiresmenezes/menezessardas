#!/usr/bin/env python3
"""
Script para enviar emails sobre bancadas colaborativas do THEYE

Uso:
    python scripts/enviar-emails-bancadas.py --tipo empresas-ia --debug
    python scripts/enviar-emails-bancadas.py --tipo reenvio --debug

Variáveis de ambiente necessárias:
    SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM
"""

import smtplib
import argparse
import os
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime

# Templates
TEMPLATE_BANCADAS = """
Prezados,

O Instituto está formando BANCADAS E NÚCLEOS COLABORATIVOS com profissionais doutores e PhDs.

Esses núcleos funcionam como consórcios colaborativos onde profissionais:
- NÃO precisam fazer parte do estatuto legal (legislação brasileira permite)
- Podem se chancelar com seus nomes/credenciais
- Assinam contratos específicos por projeto (temporário, direto, ou conforme a necessidade)
- Trabalham de forma colaborativa e transparente

Se você ou sua instituição deseja participar das bancadas de pesquisa em:
• Predição Jurídica
• Engenharia
• Saúde
• Ambiental
• Cibersegurança
• Quantum Computing
• Serviços Sociais

Favor contactar: bancadas@theye.club

Toda participação é rastreada por smart contract para transparência total.

---
Instituto de Ontologia com Soluções Multidisciplinares
CNPJ: 34.028.316/0001-14
Email: contato@theye.club
Site: theye.club
"""

def template_ia(nome_empresa):
    return f"""
Prezados,

O Instituto de Ontologia com Soluções Multidisciplinares é uma instituição non-profit brasileira
dedicada a pesquisa colaborativa em áreas estratégicas:

• Cybersecurity (LGPD, detecção de anomalias)
• Quantum Computing (simulação, otimização, criptografia pós-quântica)
• Predição (jurídica, saúde, ambiental, financeira)

Estamos convidando a {nome_empresa} para:

1. Fornecer créditos de API/compute para pesquisa
2. Participar de nossa banca colaborativa (smart contract, transparência total)
3. Acessar resultados de pesquisa em tempo real

Modelo: Consórcio colaborativo, sem fins lucrativos, com pesquisadores doutores/PhDs de universidades
brasileiras e internacionais.

Visite: theye.club/bancadas-colaborativas

CNPJ: 34.028.316/0001-14
Email: contato@theye.club

Agradecemos pela consideração.

---
Instituto de Ontologia com Soluções Multidisciplinares
"""

# Empresas de IA
EMPRESAS_IA = [
    {'nome': 'Anthropic', 'email': 'contact@anthropic.com'},
    {'nome': 'OpenAI', 'email': 'research@openai.com'},
    {'nome': 'Google DeepMind', 'email': 'research@deepmind.google.com'},
    {'nome': 'Meta AI Research', 'email': 'ai-research@meta.com'},
    {'nome': 'Hugging Face', 'email': 'research@huggingface.co'},
    {'nome': 'Microsoft Research', 'email': 'msr@microsoft.com'},
]

# Empresas já contactadas (14 empresas) - ADICIONAR AQUI
EMPRESAS_EXISTENTES = [
    # 'email1@empresa.com',
    # 'email2@empresa.com',
]


def enviar_email(destinatario, assunto, corpo, debug=False):
    """Envia um email"""
    if debug:
        print(f"\n[DEBUG] Para: {destinatario}")
        print(f"[DEBUG] Assunto: {assunto}")
        print(f"[DEBUG] Corpo: {corpo[:100]}...")
        return True

    try:
        # Configurar servidor SMTP
        smtp_host = os.getenv('SMTP_HOST')
        smtp_port = int(os.getenv('SMTP_PORT', '587'))
        smtp_user = os.getenv('SMTP_USER')
        smtp_pass = os.getenv('SMTP_PASS')
        smtp_from = os.getenv('SMTP_FROM', 'contato@theye.club')

        if not all([smtp_host, smtp_user, smtp_pass]):
            print("❌ Erro: Variáveis de ambiente SMTP não configuradas")
            return False

        # Criar mensagem
        msg = MIMEMultipart()
        msg['From'] = smtp_from
        msg['To'] = destinatario
        msg['Subject'] = assunto

        # Adicionar corpo em texto e HTML
        msg.attach(MIMEText(corpo, 'plain'))
        msg.attach(MIMEText(f'<pre>{corpo}</pre>', 'html'))

        # Enviar
        server = smtplib.SMTP(smtp_host, smtp_port)
        server.starttls()
        server.login(smtp_user, smtp_pass)
        server.send_message(msg)
        server.quit()

        return True
    except Exception as e:
        print(f"❌ Erro ao enviar para {destinatario}: {str(e)}")
        return False


def main():
    parser = argparse.ArgumentParser(
        description='Enviar emails sobre bancadas colaborativas'
    )
    parser.add_argument(
        '--tipo',
        choices=['empresas-ia', 'reenvio'],
        default='empresas-ia',
        help='Tipo de envio'
    )
    parser.add_argument(
        '--debug',
        action='store_true',
        help='Modo debug (não envia realmente)'
    )

    args = parser.parse_args()

    print(f"\n📧 ENVIAR EMAILS - TIPO: {args.tipo.upper()}")
    print(f"🔧 DEBUG: {'ATIVADO' if args.debug else 'DESATIVADO'}")
    print(f"⏰ Data/Hora: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")

    emails_para_enviar = []

    if args.tipo == 'empresas-ia':
        emails_para_enviar = [
            {
                'destinatario': emp['email'],
                'assunto': '[CNPJ Instituto] — Participação em Pesquisa Colaborativa (Non-Profit) — Cybersecurity, Quantum Computing',
                'corpo': template_ia(emp['nome']),
                'tipo': 'IA'
            }
            for emp in EMPRESAS_IA
        ]
    elif args.tipo == 'reenvio':
        emails_para_enviar = [
            {
                'destinatario': email,
                'assunto': 'Bancadas Colaborativas THEYE - Novas Oportunidades de Participação',
                'corpo': TEMPLATE_BANCADAS,
                'tipo': 'Reenvio'
            }
            for email in EMPRESAS_EXISTENTES
        ]

    if not emails_para_enviar:
        print("⚠️  Nenhum email para enviar. Verifique a lista de destinatários.")
        return

    print(f"📋 Total de emails a processar: {len(emails_para_enviar)}\n")

    enviados = 0
    erros = 0

    for idx, email in enumerate(emails_para_enviar, 1):
        print(f"[{idx}/{len(emails_para_enviar)}] Processando: {email['destinatario']}...", end=' ')
        if enviar_email(email['destinatario'], email['assunto'], email['corpo'], args.debug):
            print("✅")
            enviados += 1
        else:
            print("❌")
            erros += 1

    print(f"\n{'='*50}")
    print(f"📊 RESUMO FINAL:")
    print(f"{'='*50}")
    print(f"✅ Enviados:  {enviados}")
    print(f"❌ Erros:     {erros}")
    print(f"📧 Total:     {len(emails_para_enviar)}")

    if args.debug:
        print(f"\n🔍 Modo DEBUG - Nenhum email foi realmente enviado")

    print(f"{'='*50}\n")


if __name__ == '__main__':
    main()
