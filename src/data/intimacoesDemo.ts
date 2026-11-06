import { emDias } from '@/lib/datas'

/**
 * Passo A06 (Régua Global R1): intimações fictícias para a demonstração, sem
 * OAB real nem rede. Todas trazem o rótulo "dado fictício" no texto, cobrem os
 * três níveis de urgência (vencida, crítica, regular) e um processo no formato CNJ.
 */
export function intimacoesDemo() {
  const rotulo = '[Demonstração · dado fictício] '
  return [
    { id: 900001, oab: '123456/RJ', data_disponibilizacao: emDias(-3), tribunal: 'TJRJ', orgao: '12ª Vara Cível da Capital', tipo: 'Intimação', classe: 'Ação de despejo por falta de pagamento', numero_processo: '0801234-56.2026.8.19.0001', texto: rotulo + 'Fica a parte autora intimada para se manifestar sobre a contestação no prazo de 15 dias.', link: null, lida: false, prazo_dias: 15, prazo_final: emDias(2), tarefa_id: null },
    { id: 900002, oab: '123456/RJ', data_disponibilizacao: emDias(-1), tribunal: 'TJRJ', orgao: '3ª Vara Empresarial', tipo: 'Intimação', classe: 'Ação renovatória', numero_processo: '0805678-90.2026.8.19.0001', texto: rotulo + 'Designada audiência de conciliação. Intimem-se as partes.', link: null, lida: false, prazo_dias: 5, prazo_final: emDias(9), tarefa_id: null },
    { id: 900003, oab: '98765/RJ', data_disponibilizacao: emDias(-20), tribunal: 'TRT1', orgao: '45ª Vara do Trabalho do Rio de Janeiro', tipo: 'Intimação', classe: 'Reclamação trabalhista', numero_processo: '0100123-45.2026.5.01.0045', texto: rotulo + 'Intime-se a reclamada para apresentar quesitos periciais em 5 dias.', link: null, lida: false, prazo_dias: 5, prazo_final: emDias(-1), tarefa_id: null },
  ]
}
