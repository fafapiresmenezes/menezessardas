// T1-T4: Trilho Maintenance

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

async function verifyTrilhoIntegrity(): Promise<{
  valid: boolean;
  total_elos: number;
  broken_links: string[];
}> {
  console.log("[T1] Verifying trilho hash chain integrity...");

  const client = supabase();
  const { data: elos } = await client
    .from("trilho_elos")
    .select("elo_number, content_hash, parent_hash")
    .order("elo_number");

  const brokenLinks: string[] = [];

  if (elos && elos.length > 0) {
    let prevHash = "";

    for (const elo of elos) {
      if (elo.elo_number > 1 && elo.parent_hash !== prevHash) {
        brokenLinks.push(`Elo ${elo.elo_number}: parent hash mismatch`);
      }
      prevHash = elo.content_hash;
    }
  }

  const valid = brokenLinks.length === 0;
  console.log(
    `[T1] ✓ Trilho integrity: ${valid ? "VALID" : "BROKEN"} (${elos?.length || 0} elos)`
  );

  return {
    valid,
    total_elos: elos?.length || 0,
    broken_links: brokenLinks,
  };
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

async function createTrilhoSnapshot(version: string): Promise<void> {
  console.log(`[T3] Creating trilho snapshot v${version}...`);

  const client = supabase();
  const state = await getTrilhoState();

  const { error } = await client.from("trilho_versions").insert({
    version,
    snapshot_data: state,
    created_at: new Date().toISOString(),
  });

  if (error) throw error;
  console.log(`[T3] ✓ Created snapshot v${version}`);
}

async function getTrilhoVersions(): Promise<unknown[]> {
  const client = supabase();
  const { data, error } = await client
    .from("trilho_versions")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) return [];
  return data || [];
}

Deno.serve(async (req: Request) => {
  if (req.method !== "GET" && req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  try {
    const url = new URL(req.url);

    if (url.pathname === "/t1-trilho-maintenance/verify" && req.method === "GET") {
      const result = await verifyTrilhoIntegrity();
      return json({ status: "success", data: result });
    }

    if (url.pathname === "/t1-trilho-maintenance/state" && req.method === "GET") {
      const state = await getTrilhoState();
      return json({ status: "success", data: state });
    }

    if (url.pathname === "/t1-trilho-maintenance/snapshot" && req.method === "POST") {
      const body = await req.json();
      await createTrilhoSnapshot(body.version);
      return json({ status: "success", message: "Snapshot created" });
    }

    if (url.pathname === "/t1-trilho-maintenance/versions" && req.method === "GET") {
      const versions = await getTrilhoVersions();
      return json({ status: "success", data: versions });
    }

    return json({ error: "Not found" }, 404);
  } catch (error) {
    console.error("Error:", error);
    return json({ error: String(error) }, 500);
  }
});
