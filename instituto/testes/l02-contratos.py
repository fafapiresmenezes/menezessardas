# Passo L02: 10 contratos de locação fictícios com respostas esperadas (índice, garantia, prazo, defeito plantado).
import json, random
random.seed(42)
casos = [
 dict(id=1, tipo='residencial', prazo=30, indice='IGP-M', garantia=['fiador'], multa=3, defeito=None),
 dict(id=2, tipo='residencial', prazo=12, indice='IPCA', garantia=['caução','fiador'], multa=3, defeito='garantia dupla (art. 37 p.ú.)'),
 dict(id=3, tipo='comercial', prazo=60, indice='IGP-M', garantia=['seguro-fiança'], multa=6, defeito=None),
 dict(id=4, tipo='residencial', prazo=30, indice='INPC', garantia=['caução'], multa=3, caucao_meses=4, defeito='caução acima de 3 aluguéis (art. 38 §2º)'),
 dict(id=5, tipo='residencial', prazo=30, indice='IPCA', garantia=['título de capitalização'], multa=3, defeito='reajuste semestral (Lei 10.192/01 exige 12 meses)', reajuste='semestral'),
 dict(id=6, tipo='comercial', prazo=36, indice='IGP-M', garantia=['fiador'], multa=3, defeito='renúncia à renovatória em contrato de 5 anos não se aplica; prazo 36 meses sem direito'),
 dict(id=7, tipo='residencial', prazo=30, indice='IPCA', garantia=['fiador'], multa=3, defeito='locatário renuncia a indenização por benfeitorias necessárias (Súmula 335 só permite úteis/voluptuárias? art. 35)'),
 dict(id=8, tipo='temporada', prazo=3, indice='não consta', garantia=['caução'], multa=0, defeito=None),
 dict(id=9, tipo='residencial', prazo=30, indice='IGP-M', garantia=['fiador'], multa=3, defeito='multa integral sem proporcionalidade (art. 4º)', multa_integral=True),
 dict(id=10, tipo='residencial', prazo=30, indice='IVAR', garantia=['seguro-fiança'], multa=3, defeito=None),
]
def texto(c):
    g = ' e, cumulativamente, '.join({
      'fiador':'FIADOR: Fulano de Tal, que responde solidariamente até a entrega das chaves',
      'caução':f"CAUÇÃO em dinheiro equivalente a {c.get('caucao_meses',3)} (três) aluguéis" if c.get('caucao_meses',3)==3 else f"CAUÇÃO em dinheiro equivalente a {c['caucao_meses']} (quatro) aluguéis",
      'seguro-fiança':'SEGURO-FIANÇA contratado pelo LOCATÁRIO junto a seguradora autorizada pela SUSEP',
      'título de capitalização':'TÍTULO DE CAPITALIZAÇÃO no valor de 10 aluguéis'}[x] for x in c['garantia'])
    finalidade = {'residencial':'exclusivamente residencial','comercial':'comercial, para loja de roupas','temporada':'para temporada, nos termos do art. 48 da Lei 8.245/91'}[c['tipo']]
    reaj = 'não haverá reajuste' if c['indice']=='não consta' else f"O aluguel será reajustado a cada {'6 (seis)' if c.get('reajuste')=='semestral' else '12 (doze)'} meses pela variação acumulada do {c['indice']}"
    multa = 'Não há multa por devolução antecipada.' if c['multa']==0 else (f"Em caso de devolução antecipada, o LOCATÁRIO pagará multa de {c['multa']} aluguéis, integral, independentemente do tempo decorrido." if c.get('multa_integral') else f"Em caso de devolução antecipada, o LOCATÁRIO pagará multa de {c['multa']} aluguéis, proporcional ao tempo restante do contrato (art. 4º da Lei 8.245/91).")
    extra = ''
    if c['id']==6: extra = 'CLÁUSULA DÉCIMA: O LOCATÁRIO renuncia expressamente ao direito à ação renovatória. '
    if c['id']==7: extra = 'CLÁUSULA NONA: O LOCATÁRIO renuncia a qualquer indenização ou retenção por benfeitorias, inclusive as necessárias. '
    unidade = 'meses' if c['tipo']!='temporada' else 'meses (noventa dias)'
    return (f"CONTRATO DE LOCAÇÃO DE IMÓVEL. LOCADOR: Beltrano de Souza, CPF 000.000.000-00. LOCATÁRIO: Ciclano da Silva, CPF 111.111.111-11. "
      f"IMÓVEL: Rua Fictícia, 100, apto 201, Rio de Janeiro/RJ. CLÁUSULA PRIMEIRA: A locação é {finalidade}. "
      f"CLÁUSULA SEGUNDA: O prazo é de {c['prazo']} {unidade}, com início em 01/12/2026. CLÁUSULA TERCEIRA: O aluguel mensal é de R$ 3.200,00, com vencimento no dia 5 de cada mês, pago por PIX ao LOCADOR. "
      f"CLÁUSULA QUARTA: {reaj}. CLÁUSULA QUINTA: Encargos de condomínio ordinário e IPTU ficam a cargo do LOCATÁRIO; despesas extraordinárias de condomínio cabem ao LOCADOR (art. 22, X). "
      f"CLÁUSULA SEXTA: {multa} CLÁUSULA SÉTIMA: Garantia: {g}. CLÁUSULA OITAVA: O imóvel é entregue em bom estado, conforme vistoria anexa, e deve ser devolvido no mesmo estado, ressalvado o desgaste natural. {extra}"
      f"CLÁUSULA FINAL: Fica eleito o foro da comarca do Rio de Janeiro. Rio de Janeiro, 20 de novembro de 2026.")
out = [dict(c, texto=texto(c)) for c in casos]
json.dump(out, open('l02-contratos.json','w'), ensure_ascii=False, indent=1)
print([len(o['texto']) for o in out])
