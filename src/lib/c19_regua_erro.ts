/**
 * C19: Régua de Erro — Calibration & Error Measurement
 * 
 * Tracks prediction error across the trilho:
 * - Signal vs. actual outcome comparison
 * - Error calibration by market and municipality
 * - Confidence interval refinement
 */

import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export interface ErrorMeasurement {
  signal_id: string;
  predicted_score: number;
  predicted_type: string;
  actual_outcome: boolean;
  prediction_date: string;
  outcome_date: string;
  error_margin: number;
  days_to_resolution: number;
  market: string;
  municipality: string;
}

export async function recordPredictionError(
  signalId: string,
  predicted: number,
  actual: boolean,
  market: string,
  municipality: string
): Promise<void> {
  console.log(`[C19] Recording prediction error for signal ${signalId}...`);

  const errorMargin = Math.abs(predicted - (actual ? 100 : 0));

  const { error } = await supabase.from("prediction_errors").insert({
    signal_id: signalId,
    predicted_score: predicted,
    actual_outcome: actual,
    error_margin: errorMargin,
    market,
    municipality,
    recorded_at: new Date().toISOString(),
  });

  if (error) throw error;
  console.log(`[C19] ✓ Recorded error margin: ${errorMargin.toFixed(1)}`);
}

export async function getCalibrationCurve(market: string): Promise<number[]> {
  const { data, error } = await supabase
    .from("prediction_errors")
    .select("predicted_score, actual_outcome")
    .eq("market", market)
    .order("predicted_score");

  if (error) throw error;

  // Compute calibration curve (expected accuracy at each predicted probability)
  const bins = 10;
  const curve: number[] = new Array(bins).fill(0);
  const counts: number[] = new Array(bins).fill(0);

  for (const row of data || []) {
    const bin = Math.floor((row.predicted_score / 100) * bins);
    if (bin >= 0 && bin < bins) {
      curve[bin] += row.actual_outcome ? 1 : 0;
      counts[bin] += 1;
    }
  }

  return curve.map((sum, i) => (counts[i] > 0 ? sum / counts[i] : 0));
}

export async function getErrorStatistics(market: string): Promise<{
  mean_error: number;
  median_error: number;
  std_dev: number;
  total_predictions: number;
}> {
  const { data, error } = await supabase
    .from("prediction_errors")
    .select("error_margin")
    .eq("market", market);

  if (error) throw error;

  const errors = (data || []).map((row: any) => row.error_margin);
  if (errors.length === 0) {
    return { mean_error: 0, median_error: 0, std_dev: 0, total_predictions: 0 };
  }

  const mean = errors.reduce((a: number, b: number) => a + b, 0) / errors.length;
  const sorted = errors.sort((a: number, b: number) => a - b);
  const median =
    sorted.length % 2 === 0
      ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
      : sorted[Math.floor(sorted.length / 2)];
  const variance = errors.reduce((sum: number, e: number) => sum + Math.pow(e - mean, 2), 0) / errors.length;
  const stdDev = Math.sqrt(variance);

  return {
    mean_error: Math.round(mean * 100) / 100,
    median_error: Math.round(median * 100) / 100,
    std_dev: Math.round(stdDev * 100) / 100,
    total_predictions: errors.length,
  };
}

export default {
  recordPredictionError,
  getCalibrationCurve,
  getErrorStatistics,
};
