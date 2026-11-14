# D4 · Pesquisa: computação quântica e cibersegurança

Relatório do THEYE Institute, 13/11/2026. Fontes lidas no mesmo dia nas páginas do NIST
(csrc.nist.gov), citadas no fim. Este relatório é estudo, não recomendação de produto.

## 1. O que o NIST já padronizou, com data

| Norma | Algoritmo | Para que serve | Situação |
| --- | --- | --- | --- |
| FIPS 203 | ML-KEM | combinar chave secreta por canal aberto | final, 13/08/2024 |
| FIPS 204 | ML-DSA | assinatura digital | final, 13/08/2024 |
| FIPS 205 | SLH-DSA | assinatura digital, baseada em hash | final, 13/08/2024 |
| FN-DSA (Falcon) | assinatura digital | assinatura mais curta | em desenvolvimento; o NIST **não** publica número de FIPS nem data |
| HQC | segunda via de combinação de chave | reserva do ML-KEM | selecionado em 11/03/2025; rascunho a ser publicado e versão final "em aproximadamente dois anos" a contar daquele anúncio |

Duas frases do NIST que mudam o tom da conversa: as três normas de 2024 "podem e devem ser
colocadas em uso agora", e o NIST "vai depreciar e por fim remover os algoritmos vulneráveis ao
quântico de suas normas até 2035, com os sistemas de alto risco migrando muito antes".

**Correção de um erro comum:** HQC não é o "quinto algoritmo". O NIST o chama de seleção da quarta
rodada e **segundo** mecanismo de encapsulamento de chave, depois do ML-KEM.

## 2. O que a plataforma usa hoje, e o que de fato está exposto

Levantamento feito no repositório, não de memória.

| O que é | Como funciona hoje | Exposição ao quântico | O que fazer |
| --- | --- | --- | --- |
| Corrente do trilho (`src/lib/trilho.ts`) | sha256 encadeado | **baixa**. O algoritmo de Grover corta a busca por colisão pela metade do expoente: um hash de 256 bits fica com cerca de 128 bits de força, que ninguém quebra | nada a fazer agora; manter 256 bits e não cair para 128 |
| Selo diário de documentos (`selar-documentos`) | árvore de hashes sha256, raiz carimbada | **baixa**, pelo mesmo motivo | nada a fazer |
| Carimbo no Bitcoin (OpenTimestamps) | prova de inclusão por hash; a rede usa ECDSA para mover moeda | **do nosso lado, baixa**. A prova de data é hash, não assinatura nossa. O risco é da rede Bitcoin, não do carimbo já emitido | acompanhar, não migrar |
| Assinatura eletrônica no portal (`assinaturas_eletronicas`) | guarda `hash_texto` e `hash_assinatura` (sha256 do aceite) | **média, e é aqui que dói**. Hash prova integridade, mas **não prova quem assinou com chave criptográfica**: hoje a prova de autoria é o registro de aceite no banco mais o selo de data | é o único item que pede trabalho de verdade: ver a seção 3 |
| Entrada na plataforma, tráfego | TLS do Supabase e da Vercel | **média, e não é nossa** | depende do fornecedor; quando Vercel e Supabase ligarem ML-KEM no TLS, nós herdamos |
| Senha e segundo fator | hash de senha do Supabase, TOTP | **baixa** | nada a fazer |

**A conclusão que importa, e que contraria a intuição:** a parte "blockchain" do nosso lastro é a
que menos precisa de migração, porque é feita de hash, e hash resiste bem ao quântico. Quem corre
risco é assinatura de chave pública — e o nosso ponto fraco não é o algoritmo da assinatura, é o
fato de a assinatura eletrônica ainda não usar chave do assinante. Dizer "nosso blockchain é
pós-quântico" seria vender fumaça; dizer "a nossa assinatura eletrônica ainda não é assinatura
criptográfica" é a verdade, e é o que o plano abaixo resolve.

## 3. Plano de migração do selo e da assinatura

Três etapas, cada uma verificável sozinha. Nenhuma delas está feita; este documento é o plano.

**Etapa 1 — inventário que se atualiza (pequena).** Uma lista no código, com teste, de todo lugar
onde a plataforma usa criptografia, com o algoritmo, o tamanho e a exposição. Está nesta volta:
`src/lib/posQuantico.ts` e seu teste. Serve para a etapa 3 não começar por uma caça ao tesouro.

**Etapa 2 — assinatura com chave do assinante (média).** A assinatura eletrônica passa a gerar um
par de chaves no aparelho de quem assina, assinar o hash do texto e guardar a assinatura e a chave
pública. Começa com ECDSA P-256, porque é o que o navegador oferece hoje pela Web Crypto, e **já
guardando o campo do algoritmo**, para a etapa 3 ser troca de valor e não mudança de esquema.
Sem isso, migrar depois exige mexer em dado assinado, o que ninguém quer fazer.

**Etapa 3 — assinatura dupla (grande).** Cada assinatura nova passa a carregar duas: a clássica e
uma ML-DSA (FIPS 204). As duas juntas, porque assinatura só pós-quântica hoje não é aceita por
quase nenhum verificador, e assinatura só clássica é o que queremos deixar de ter. Depende de uma
biblioteca de ML-DSA auditada para o navegador; quando esta etapa for executada, a escolha da
biblioteca tem de ser justificada com a auditoria dela, não com a popularidade.

**O que NÃO está no plano, de propósito:** trocar o sha256 da corrente, trocar o carimbo do
Bitcoin, e prometer data. O NIST fala de 2035 para remover o que é vulnerável; nossa etapa 2 cabe
em semanas, e a etapa 3 depende de biblioteca de terceiro que ainda vai ser avaliada.

## 4. Teste de Mosca, aplicado a nós

A conta de Mosca: há risco quando o tempo de sigilo exigido (x) mais o tempo de migração (y)
passam da chegada do computador quântico capaz (z). A plataforma já tem essa conta, em
`src/components/CiberQuantica.tsx` (`testeMosca`).

Para um contrato que precisa valer 10 anos (x = 10), com migração estimada em 2 anos (y = 2) e
usando 2035 como marco do NIST (z = 9, a partir de 2026): **10 + 2 > 9 → há risco**, com folga
negativa de 3 anos. É por isso que a etapa 2 não espera: documento assinado hoje tem de continuar
verificável depois.

Esse z é um marco administrativo (a data em que o NIST remove o que é vulnerável), não uma previsão
de quando a máquina chega. Ninguém sabe essa data, e esta é uma previsão com incerteza declarada:
o que se faz com ela é reduzir y, que é a única das três variáveis que está na nossa mão.

## Fontes

- NIST, projeto de criptografia pós-quântica: https://csrc.nist.gov/projects/post-quantum-cryptography (atualizada em 27/10/2026)
- NIST, lista de FIPS: https://csrc.nist.gov/publications/fips (FIPS 203, 204 e 205, todas de 13/08/2024, situação "Final")
- NIST, anúncio do HQC: https://csrc.nist.gov/news/2025/hqc-announced-as-a-4th-round-selection (11/03/2025)
- NIST, anúncio das três normas: https://csrc.nist.gov/projects/post-quantum-cryptography/pqc-standards (13/08/2024)
- NIST IR 8547 (depreciação até 2035) e NIST IR 8545 (razões da escolha do HQC): citadas pelas páginas acima, não lidas nesta volta.
