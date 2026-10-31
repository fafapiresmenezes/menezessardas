# U14 · Ontologia única escritório ↔ Instituto (31/10/2026)

**Cobertura:** 70 de 70 valores dos 5 tipos do escritório mapeados (100%). Só tipos e valores de lista; nenhum dado do escritório foi copiado.

## Contrato → Contrato

Relações: regula (Norma→Contrato); indexado_a (Contrato→Indicador); objeto_de (Imovel→Contrato).

| Campo | Valor no escritório | Classe/relação no Instituto |
|---|---|---|
| tipo | locacao_residencial | Contrato[tipo=locacao_residencial] · regula N-8245-46/47 · ClasseProcessual Despejo |
| tipo | locacao_comercial | Contrato[tipo=locacao_nao_residencial] · regula N-8245-51/56/57 · ClasseProcessual Renovatória |
| tipo | locacao_temporada | Contrato[tipo=temporada] · regula N-8245-48/49/50 |
| tipo | built_to_suit | Contrato[tipo=built_to_suit] · regula N-8245-54-A |
| tipo | comodato | Contrato[tipo=comodato] · fora da Lei 8.245 (Código Civil 579); fora do nicho preditivo |
| tipo | arrendamento | Contrato[tipo=arrendamento] · excluído pelo N-8245-1; fora do nicho preditivo |
| tipo | sla | Contrato[tipo=prestacao_servico] · fora do nicho locação |
| tipo | sla_fornecedor | Contrato[tipo=prestacao_servico] · fora do nicho locação |
| natureza | principal | Contrato |
| natureza | aditivo | Contrato + relação aditiva_de (P-STJ-S214: fiador só responde se anuiu) |
| natureza | subcontrato | Contrato + relação sublocacao_de (N-8245-14/15/16) |
| status | ativo | Contrato[situacao=vigente] |
| status | vencido | Contrato[situacao=prazo_indeterminado|encerrado] · T03 denúncia vazia |
| status | a_renovar | Contrato[situacao=a_renovar] · T06 renovatória |
| garantia | caucao | Garantia[caucao] · N-8245-37-I/38 |
| garantia | fiador | Garantia[fianca] · N-8245-37-II · T10 |
| garantia | seguro_fianca | Garantia[seguro] · N-8245-37-III |
| garantia | titulo_capitalizacao | Garantia[cessao_fiduciaria] · N-8245-37-IV |
| garantia | sem_garantia | Garantia[ausente] · permite cobrança antecipada N-8245-42 e liminar N-8245-59-IX |
| indice_reajuste | ipca | Indicador[IPCA, BCB SGS 433] |
| indice_reajuste | igpm | Indicador[IGP-M, BCB SGS 189] |
| indice_reajuste | inpc | Indicador[INPC, IBGE] |
| indice_reajuste | fixo | Indicador[nenhum] |
| indice_reajuste | sem_reajuste | Indicador[nenhum] |
| indice_reajuste | outro | Indicador[outro] · exige revisão manual |
| periodicidade | mensal | Contrato.periodicidade |
| periodicidade | trimestral | Contrato.periodicidade |
| periodicidade | semestral | Contrato.periodicidade |
| periodicidade | anual | Contrato.periodicidade |
| periodicidade | unica | Contrato.periodicidade |

Nunca sai do escritório: locatario_fornecedor, valor_periodico (só faixa agregada), texto_extraido, caminho_arquivo, notas.

## Imovel → Imovel

Relações: localizado_em (Imovel→UF); objeto_de (Imovel→Contrato).

| Campo | Valor no escritório | Classe/relação no Instituto |
|---|---|---|
| tipo | residencial | Imovel[uso=residencial, subtipo=residencial] |
| tipo | apartamento | Imovel[uso=residencial, subtipo=apartamento] |
| tipo | casa | Imovel[uso=residencial, subtipo=casa] |
| tipo | comercial | Imovel[uso=nao_residencial, subtipo=comercial] |
| tipo | hotel | Imovel[uso=nao_residencial, subtipo=hotel] |
| tipo | garagem | Imovel[uso=nao_residencial, subtipo=garagem] |
| tipo | terreno | Imovel[uso=nao_residencial, subtipo=terreno] |
| tipo | loja | Imovel[uso=nao_residencial, subtipo=loja] |
| tipo | sala_comercial | Imovel[uso=nao_residencial, subtipo=sala_comercial] |
| tipo | conjunto_comercial | Imovel[uso=nao_residencial, subtipo=conjunto_comercial] |
| tipo | edificio | Imovel[uso=nao_residencial, subtipo=edificio] |
| tipo | galpao | Imovel[uso=nao_residencial, subtipo=galpao] |
| uso_atual | locado | Imovel[situacao=locado] · objeto_de Contrato |
| uso_atual | vago | Imovel[situacao=vago] |
| uso_atual | proprio | Imovel[situacao=uso_proprio] |
| uso_atual | uso_proprio | Imovel[situacao=uso_proprio] · T04 retomada |
| uso_atual | comodato | Imovel[situacao=comodato] |
| uso_atual | em_construcao | Imovel[situacao=obra] |
| uso_atual | em_desenvolvimento | Imovel[situacao=obra] |
| uso_atual | em_construcao_sem_contrato | Imovel[situacao=obra] |
| documentos | iptu_valid | Documento[IPTU] · Prazo iptu_vencimento |
| documentos | habite_se | Documento[Habite-se] |
| documentos | alvara | Documento[Alvará] |
| documentos | avcb | Documento[AVCB] |

Nunca sai do escritório: endereco, proprietario_nome, matricula_rgi, notas.

## Locatario → TipoDeParte

| Campo | Valor no escritório | Classe/relação no Instituto |
|---|---|---|
| papel | locatario | TipoDeParte[locatario] |
| papel | locador | TipoDeParte[locador] |
| papel | fiador | TipoDeParte[fiador] (novo valor proposto v0.7) |

Nunca sai do escritório: nome, CPF/CNPJ, contato.

## Caso → Processo

Relações: tem_classe; tramita_em; trata_de; resulta_em Decisao; invoca Tese.

| Campo | Valor no escritório | Classe/relação no Instituto |
|---|---|---|
| tipo | caso | Processo (número só como hash, via numero_processo) |
| tipo | projeto | fora da ontologia (gestão interna) |
| nivel | projeto | agrupador interno, sem classe |
| nivel | tarefa | Movimento interno, sem classe |
| area | Cível | Processo[ramo=civel] · nicho locação quando classe ∈ mapa_classe |
| area | Trabalhista | Processo[ramo=trabalho] · fora do nicho |
| area | Compliance | fora da ontologia (consultivo) |

Nunca sai do escritório: cliente, titulo, descricao, honorários, portal_token.

## Prazo → Prazo (tipo novo proposto v0.7: data-limite com Norma de origem)

Relações: prazo_de (Prazo→Contrato|Imovel|Processo); fixado_por (Prazo→Norma).

| Campo | Valor no escritório | Classe/relação no Instituto |
|---|---|---|
| alerta_tipo | vencimento | Prazo[fim_contrato] · fixado_por N-8245-46/56 |
| alerta_tipo | reajuste | Prazo[reajuste] · Indicador do contrato; revisional N-8245-19 após 3 anos |
| alerta_tipo | avcb_vencimento | Prazo[documento AVCB] |
| alerta_tipo | iptu_vencimento | Prazo[documento IPTU] |
| alerta_tipo | alvara_vencimento | Prazo[documento Alvará] |
| intimacao | prazo_final | Prazo[processual] · registra Movimento do Processo (DJEN) |

Nunca sai do escritório: texto da intimação, destinatários, OAB.

## Propostas para a ontologia v0.7

Prazo, Garantia e Documento como tipos próprios; fiador como valor de TipoDeParte; relações aditiva_de e sublocacao_de. Entram na v0.7 com fonte oficial em cada nó.
