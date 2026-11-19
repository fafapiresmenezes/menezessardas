# Águas v2 — dados do grafo

- `ao-rede-v1.json.gz`: rede de rios e lagos de Angola (passo P09 do Trilho Águas v2).
  - Fonte: Overture Maps, versão 2026-11-18.0, tema base/water (dados do OpenStreetMap). Recorte pela fronteira oficial de Angola (HDX COD-AB, original).
  - Licença: ODbL 1.0, © contribuidores do OpenStreetMap. Quem derivar desta base tem de manter a mesma licença e a atribuição.
  - Conteúdo: 25.974 trechos de rio (o sentido do traço no OpenStreetMap é o sentido da água), 329 lagos e reservatórios ligados à rede, 27.292 ligações "drena para".
  - Ligações "ponte": onde o mapa tem um buraco, ligamos o fim de um trecho ao trecho mais próximo (até 2 km) ou ao trecho do mesmo rio (até 40 km), sempre sem criar volta. Cada ponte vem marcada, com a distância.
  - Tempo de viagem: estimativa por faixa de velocidade (0,3 a 1,5 m/s, central 0,8 m/s), sem vazão medida. A travessia de lagos ainda não é estimada. O P12 refina isso com a vazão do GloFAS.
