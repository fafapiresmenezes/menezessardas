/**
 * Trilho v6 Monitoring — Signal Accuracy, Pilot Programs, Backtest Results
 */

import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export interface SignalAccuracyMetrics {
  market: string;
  total_signals: number;
  accurate_signals: number;
  accuracy_percentage: number;
  mean_error: number;
  std_dev: number;
  confidence_score: number;
}

export interface PilotProgramMetrics {
  market: string;
  active_pilots: number;
  total_signals_generated: number;
  total_accurate: number;
  avg_accuracy: number;
  total_revenue_brl: number;
}

export interface BacktestMetrics {
  market_code: string;
  market_name: string;
  accuracy: number;
  precision: number;
  recall: number;
  f1_score: number;
  auc_roc: number;
}

export interface HealthReport {
  timestamp: string;
  trilho_state: {
    current_elo: number;
    total_elos: number;
    completion_percentage: number;
    phase: string;
  };
  signals: SignalAccuracyMetrics[];
  pilots: PilotProgramMetrics[];
  backtests: BacktestMetrics[];
  system_status: "healthy" | "warning" | "critical";
}

export async function getSignalAccuracy(market: string): Promise<SignalAccuracyMetrics> {
  const { data: errors } = await supabase
    .from("prediction_errors")
    .select("error_margin, actual_outcome")
    .eq("market", market);

  const { data: signals } = await supabase
    .from("market_signals")
    .select("*")
    .eq("market_name", market);

  if (!errors || errors.length === 0) {
    return {
      market,
      total_signals: signals?.length || 0,
      accurate_signals: 0,
      accuracy_percentage: 0,
      mean_error: 0,
      std_dev: 0,
      confidence_score: 0,
    };
  }

  const accurateSignals = errors.filter((e: any) => e.actual_outcome).length;
  const totalSignals = errors.length;
  const accuracyPercentage = (accurateSignals / totalSignals) * 100;
  const errorMargins = errors.map((e: any) => e.error_margin);
  const meanError =
    errorMargins.reduce((a: number, b: number) => a + b, 0) / errorMargins.length;
  const variance =
    errorMargins.reduce((sum: number, e: number) => sum + Math.pow(e - meanError, 2), 0) /
    errorMargins.length;
  const stdDev = Math.sqrt(variance);
  const confidenceScore = Math.max(0, 100 - meanError);

  return {
    market,
    total_signals: totalSignals,
    accurate_signals: accurateSignals,
    accuracy_percentage: Math.round(accuracyPercentage * 100) / 100,
    mean_error: Math.round(meanError * 100) / 100,
    std_dev: Math.round(stdDev * 100) / 100,
    confidence_score: Math.round(confidenceScore * 100) / 100,
  };
}

export async function getPilotMetrics(market: string): Promise<PilotProgramMetrics> {
  const { data: pilots } = await supabase
    .from("pilot_programs")
    .select("*")
    .eq("market", market)
    .eq("status", "active");

  if (!pilots || pilots.length === 0) {
    return {
      market,
      active_pilots: 0,
      total_signals_generated: 0,
      total_accurate: 0,
      avg_accuracy: 0,
      total_revenue_brl: 0,
    };
  }

  const totalSignals = pilots.reduce((sum: number, p: any) => sum + (p.signals_generated || 0), 0);
  const totalAccurate = pilots.reduce((sum: number, p: any) => sum + (p.signals_accurate || 0), 0);
  const totalRevenue = pilots.reduce((sum: number, p: any) => sum + (p.revenue_brl || 0), 0);
  const avgAccuracy = totalSignals > 0 ? (totalAccurate / totalSignals) * 100 : 0;

  return {
    market,
    active_pilots: pilots.length,
    total_signals_generated: totalSignals,
    total_accurate: totalAccurate,
    avg_accuracy: Math.round(avgAccuracy * 100) / 100,
    total_revenue_brl: Math.round(totalRevenue * 100) / 100,
  };
}

export async function getBacktestMetrics(market: string): Promise<BacktestMetrics | null> {
  const { data } = await supabase
    .from("backtest_results")
    .select("*")
    .eq("market_code", market)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  return data || null;
}

export async function generateHealthReport(): Promise<HealthReport> {
  console.log("[MONITORING] Generating health report...");

  const markets = ["PRECATORIOS", "ENERGIA_LIVRE", "CARBONO"];
  const signals = await Promise.all(
    markets.map((m) => getSignalAccuracy(m))
  );
  const pilots = await Promise.all(
    markets.map((m) => getPilotMetrics(m))
  );
  const backtests = await Promise.all(
    markets.map((m) => getBacktestMetrics(m))
  ).then((results) => results.filter((r) => r !== null));

  const avgAccuracy =
    signals.reduce((sum: number, s) => sum + s.accuracy_percentage, 0) / signals.length;
  const systemStatus = avgAccuracy >= 80 ? "healthy" : avgAccuracy >= 60 ? "warning" : "critical";

  const report: HealthReport = {
    timestamp: new Date().toISOString(),
    trilho_state: {
      current_elo: 116,
      total_elos: 116,
      completion_percentage: 100,
      phase: "Complete",
    },
    signals,
    pilots,
    backtests: backtests as BacktestMetrics[],
    system_status: systemStatus,
  };

  console.log(`[MONITORING] ✓ Health report generated (Status: ${systemStatus})`);
  return report;
}

export default {
  getSignalAccuracy,
  getPilotMetrics,
  getBacktestMetrics,
  generateHealthReport,
};
