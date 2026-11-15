// C19: Régua de Erro — Calibration & Error Measurement

import { createClient } from "jsr:@supabase/supabase-js@2";

const supabase = () =>
  createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

async function recordPredictionError(
  signalId: string,
  predicted: number,
  actual: boolean,
  market: string,
  municipality: string
): Promise<void> {
  console.log(`[C19] Recording prediction error for signal ${signalId}...`);

  const errorMargin = Math.abs(predicted - (actual ? 100 : 0));
  const client = supabase();

  const { error } = await client.from("prediction_errors").insert({
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

async function getCalibrationCurve(market: string): Promise<number[]> {
  const client = supabase();
  const { data, error } = await client
    .from("prediction_errors")
    .select("predicted_score, actual_outcome")
    .eq("market", market)
    .order("predicted_score");

  if (error) return [];

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

async function getErrorStatistics(market: string): Promise<{
  mean_error: number;
  median_error: number;
  std_dev: number;
  total_predictions: number;
}> {
  const client = supabase();
  const { data, error } = await client
    .from("prediction_errors")
    .select("error_margin")
    .eq("market", market);

  if (error)
    return { mean_error: 0, median_error: 0, std_dev: 0, total_predictions: 0 };

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
  const variance =
    errors.reduce((sum: number, e: number) => sum + Math.pow(e - mean, 2), 0) /
    errors.length;
  const stdDev = Math.sqrt(variance);

  return {
    mean_error: Math.round(mean * 100) / 100,
    median_error: Math.round(median * 100) / 100,
    std_dev: Math.round(stdDev * 100) / 100,
    total_predictions: errors.length,
  };
}

Deno.serve(async (req: Request) => {
  if (req.method !== "GET" && req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  try {
    const url = new URL(req.url);

    if (url.pathname === "/c19-regua-erro/record" && req.method === "POST") {
      const body = await req.json();
      await recordPredictionError(
        body.signal_id,
        body.predicted,
        body.actual,
        body.market,
        body.municipality
      );
      return json({ status: "success", message: "Error recorded" });
    }

    if (url.pathname === "/c19-regua-erro/calibration" && req.method === "GET") {
      const market = url.searchParams.get("market");
      if (!market) return json({ error: "Missing market parameter" }, 400);
      const curve = await getCalibrationCurve(market);
      return json({ status: "success", data: curve });
    }

    if (url.pathname === "/c19-regua-erro/statistics" && req.method === "GET") {
      const market = url.searchParams.get("market");
      if (!market) return json({ error: "Missing market parameter" }, 400);
      const stats = await getErrorStatistics(market);
      return json({ status: "success", data: stats });
    }

    return json({ error: "Not found" }, 404);
  } catch (error) {
    console.error("Error:", error);
    return json({ error: String(error) }, 500);
  }
});
