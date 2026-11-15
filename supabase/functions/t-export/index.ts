// T4: Trilho Export — Full state and elos export

import { createClient } from "jsr:@supabase/supabase-js@2";

const supabase = () =>
  createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

interface TrilhoState {
  phase: string;
  current_elo: number;
  total_elos: number;
  medicao: number;
  status: "active" | "paused" | "completed";
  last_update: string;
}

function getPhaseFromElo(eloNumber: number): string {
  if (eloNumber < 15) return "A";
  if (eloNumber < 30) return "B";
  if (eloNumber < 50) return "C";
  if (eloNumber < 80) return "E";
  if (eloNumber < 95) return "S";
  if (eloNumber < 105) return "G";
  if (eloNumber < 110) return "B";
  if (eloNumber < 114) return "D";
  if (eloNumber < 116) return "T";
  return "Complete";
}

async function getTrilhoState(): Promise<TrilhoState> {
  const client = supabase();
  const { data: elos } = await client
    .from("trilho_elos")
    .select("elo_number")
    .order("elo_number", { ascending: false })
    .limit(1);

  const currentElo = elos && elos.length > 0 ? elos[0].elo_number : 0;
  const medicao = Math.round((currentElo / 116) * 100 * 10) / 10;

  return {
    phase: getPhaseFromElo(currentElo),
    current_elo: currentElo,
    total_elos: 116,
    medicao,
    status: currentElo < 116 ? "active" : "completed",
    last_update: new Date().toISOString(),
  };
}

async function exportTrilho(): Promise<{
  metadata: Record<string, unknown>;
  state: TrilhoState;
  elos: unknown[];
}> {
  console.log("[T4] Exporting trilho...");

  const client = supabase();
  const { data: elos } = await client
    .from("trilho_elos")
    .select("*")
    .order("elo_number");

  const state = await getTrilhoState();

  const exportData = {
    metadata: {
      exported_at: new Date().toISOString(),
      version: state.medicao,
      phase: state.phase,
    },
    state,
    elos: elos || [],
  };

  console.log(`[T4] ✓ Exported ${elos?.length || 0} elos`);
  return exportData;
}

async function exportBoletimArchive(): Promise<unknown[]> {
  console.log("[T4] Exporting boletim archive...");

  const client = supabase();
  const { data } = await client
    .from("boletim_archive")
    .select("*")
    .order("issue_number", { ascending: false });

  console.log(`[T4] ✓ Exported ${data?.length || 0} boletim issues`);
  return data || [];
}

async function exportBacktestResults(): Promise<unknown[]> {
  console.log("[T4] Exporting backtest results...");

  const client = supabase();
  const { data } = await client.from("backtest_results").select("*");

  console.log(`[T4] ✓ Exported ${data?.length || 0} backtest results`);
  return data || [];
}

async function exportPilotPrograms(): Promise<unknown[]> {
  console.log("[T4] Exporting pilot programs...");

  const client = supabase();
  const { data } = await client.from("pilot_programs").select("*");

  console.log(`[T4] ✓ Exported ${data?.length || 0} pilot programs`);
  return data || [];
}

Deno.serve(async (req: Request) => {
  if (req.method !== "GET" && req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  try {
    const url = new URL(req.url);

    if (url.pathname === "/t-export/trilho" && req.method === "GET") {
      const data = await exportTrilho();
      return json({ status: "success", data });
    }

    if (url.pathname === "/t-export/boletim" && req.method === "GET") {
      const data = await exportBoletimArchive();
      return json({ status: "success", data });
    }

    if (url.pathname === "/t-export/backtest" && req.method === "GET") {
      const data = await exportBacktestResults();
      return json({ status: "success", data });
    }

    if (url.pathname === "/t-export/pilots" && req.method === "GET") {
      const data = await exportPilotPrograms();
      return json({ status: "success", data });
    }

    if (url.pathname === "/t-export/full" && req.method === "GET") {
      const [trilho, boletim, backtest, pilots] = await Promise.all([
        exportTrilho(),
        exportBoletimArchive(),
        exportBacktestResults(),
        exportPilotPrograms(),
      ]);

      return json({
        status: "success",
        data: {
          trilho,
          boletim,
          backtest,
          pilots,
          exported_at: new Date().toISOString(),
        },
      });
    }

    return json({ error: "Not found" }, 404);
  } catch (error) {
    console.error("Error:", error);
    return json({ error: String(error) }, 500);
  }
});
