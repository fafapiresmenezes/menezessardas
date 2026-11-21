// Gerado de /mnt/project-files/aguas/satelite/v2 (Trilho Águas v2, 21/11/2026). Diagnóstico, não previsão.
export type Rotulo = 'MEDIDO' | 'ESTIMADO' | 'A CONFIRMAR' | '2 FONTES'
export const GUANDU = {
  municipios: 19,
  dboCentral: 58453,
  dboAlta: 74371,
  cargas: [{"municipio": "Nova Iguaçu", "horas": 0, "dbo": 14776, "semColeta": 15}, {"municipio": "Volta Redonda", "horas": 37, "dbo": 8500, "semColeta": 0}, {"municipio": "Queimados", "horas": 14, "dbo": 6744, "semColeta": 17}, {"municipio": "Barra Mansa", "horas": 42, "dbo": 6188, "semColeta": 8}, {"municipio": "Japeri", "horas": 10, "dbo": 5042, "semColeta": 31}, {"municipio": "Seropédica", "horas": 0, "dbo": 3446, "semColeta": 33}, {"municipio": "Itaguaí", "horas": 5, "dbo": 3362, "semColeta": 20}, {"municipio": "Resende", "horas": 57, "dbo": 2390, "semColeta": 0}, {"municipio": "Paracambi", "horas": 13, "dbo": 1953, "semColeta": 36}],
  iqa: [{"estacao": "QM270", "rio": "Rio Queimados", "media": 29.6, "classe": "RUIM"}, {"estacao": "QM271", "rio": "Rio Queimados", "media": 31.4, "classe": "RUIM"}, {"estacao": "PO290", "rio": "Rio dos Poços", "media": 34.7, "classe": "RUIM"}, {"estacao": "GN200", "rio": "Rio Guandu", "media": 69.0, "classe": "MÉDIA"}, {"estacao": "GN201", "rio": "Rio Guandu", "media": 72.5, "classe": "BOA"}, {"estacao": "LG351", "rio": "Ribeirão das Lajes", "media": 74.9, "classe": "BOA"}],
}
export const LUANDA = {
  predios: [{"ponto": "Kwanza", "ate24h": 5341, "de1a3dias": 19236, "de3a7dias": 55164, "mais7dias": 78413}, {"ponto": "Bengo", "ate24h": 17452, "de1a3dias": 3498, "de3a7dias": 266, "mais7dias": null}],
  etas: [{"nome": "ETA Candelabro (Sistema 1)", "rio": "Bengo", "capacidade": 210000, "confirmada": false}, {"nome": "Quilonga Grande", "rio": "Kwanza", "capacidade": 518000, "confirmada": true}, {"nome": "Sistema Bita", "rio": "Kwanza", "capacidade": 259200, "confirmada": true}, {"nome": "ETA Kifangondo", "rio": "Bengo (pelo nome do lugar; a confirmar)", "capacidade": null, "confirmada": false}, {"nome": "ETA Luanda Sul", "rio": "a confirmar", "capacidade": null, "confirmada": false}, {"nome": "ETA Kilamba", "rio": "a confirmar", "capacidade": null, "confirmada": false}, {"nome": "ETA Calumbo", "rio": "Kwanza (Calumbo fica na margem do Kwanza; a confirmar)", "capacidade": null, "confirmada": false}],
  colera: { casos: 36536, mortes: 903, desde: '7/1/2025', ate: '19/2/2026' },
}
