/**
 * Market Signals Types
 *
 * Core types for market signal generation and tracking across
 * the three pilot markets: Precatórios, Energia Livre, and Carbono
 */

export interface MarketSignal {
  signal_id: string;
  market: 'precatorios' | 'energia_livre' | 'carbono';
  municipality_code?: string;
  partner_name: string;
  signal_type: 'price' | 'volume' | 'sentiment' | 'compliance' | 'event';
  confidence_score: number; // 0-100
  generated_at: string;
  predicted_outcome: boolean;
  predicted_score: number; // 0-100
  accuracy_24h?: number;
}

export interface MarketMetrics {
  market: string;
  total_signals: number;
  accurate_signals: number;
  accuracy_percentage: number;
  avg_confidence: number;
  last_updated: string;
}

export interface PilotMarketConfig {
  market_code: string;
  market_name: string;
  municipalities: string[];
  partners: string[];
  signal_threshold: number;
}

// Market configurations for the 9 pilot programs
export const PILOT_MARKETS: Record<string, PilotMarketConfig> = {
  'precatorios-sp': {
    market_code: 'precatorios',
    market_name: 'Precatórios - São Paulo',
    municipalities: ['SP'],
    partners: ['SP_GOVERNMENT'],
    signal_threshold: 70
  },
  'precatorios-mg': {
    market_code: 'precatorios',
    market_name: 'Precatórios - Minas Gerais',
    municipalities: ['MG'],
    partners: ['MG_GOVERNMENT'],
    signal_threshold: 70
  },
  'precatorios-rj': {
    market_code: 'precatorios',
    market_name: 'Precatórios - Rio de Janeiro',
    municipalities: ['RJ'],
    partners: ['RJ_GOVERNMENT'],
    signal_threshold: 70
  },
  'energia-energisa': {
    market_code: 'energia_livre',
    market_name: 'Energia Livre - ENERGISA',
    municipalities: [],
    partners: ['ENERGISA'],
    signal_threshold: 65
  },
  'energia-cpfl': {
    market_code: 'energia_livre',
    market_name: 'Energia Livre - CPFL',
    municipalities: [],
    partners: ['CPFL'],
    signal_threshold: 65
  },
  'energia-enel': {
    market_code: 'energia_livre',
    market_name: 'Energia Livre - Enel',
    municipalities: [],
    partners: ['ENEL'],
    signal_threshold: 65
  },
  'carbono-inpe': {
    market_code: 'carbono',
    market_name: 'Carbono - INPE',
    municipalities: [],
    partners: ['INPE'],
    signal_threshold: 75
  },
  'carbono-vcs': {
    market_code: 'carbono',
    market_name: 'Carbono - VCS',
    municipalities: [],
    partners: ['VCS'],
    signal_threshold: 75
  },
  'carbono-gold-standard': {
    market_code: 'carbono',
    market_name: 'Carbono - Gold Standard',
    municipalities: [],
    partners: ['GOLD_STANDARD'],
    signal_threshold: 75
  }
};
