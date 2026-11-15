/**
 * T1-T4: Trilho Maintenance
 * 
 * T1: Trilho integrity (hash chain verification)
 * T2: State management
 * T3: Versioning  
 * T4: Export/snapshot
 */

import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// ============================================================================
// T1: Hash Chain Integrity
// ============================================================================

export async function verifyTrilhoIntegrity(): Promise<{
  valid: boolean;
  total_elos: number;
  broken_links: string[];
}> {
  console.log("[T1] Verifying trilho hash chain integrity...");

  const { data: elos } = await supabase
    .from("trilho_elos")
    .select("elo_number, content_hash, parent_hash")
    .order("elo_number");

  const brokenLinks: string[] = [];

  if (elos && elos.length > 0) {
    let prevHash = "";

    for (const elo of elos) {
      // Verify this elo's hash
      const contentHash = crypto.createHash("sha256").update(JSON.stringify(elo.content_hash)).digest("hex");

      if (contentHash !== elo.content_hash) {
        brokenLinks.push(`Elo ${elo.elo_number}: content hash mismatch`);
      }

      // Verify parent link
      if (elo.elo_number > 1 && elo.parent_hash !== prevHash) {
        brokenLinks.push(`Elo ${elo.elo_number}: parent hash mismatch`);
      }

      prevHash = elo.content_hash;
    }
  }

  const valid = brokenLinks.length === 0;
  console.log(`[T1] ✓ Trilho integrity: ${valid ? "VALID" : "BROKEN"} (${elos?.length || 0} elos)`);

  return {
    valid,
    total_elos: elos?.length || 0,
    broken_links: brokenLinks,
  };
}

// ============================================================================
// T2: State Management
// ============================================================================

export interface TrilhoState {
  phase: string;
  current_elo: number;
  total_elos: number;
  medicao: number;
  status: "active" | "paused" | "completed";
  last_update: string;
}

export async function getTrilhoState(): Promise<TrilhoState> {
  const { data: elos } = await supabase
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

// ============================================================================
// T3: Versioning
// ============================================================================

export async function createTrilhoSnapshot(version: string): Promise<void> {
  console.log(`[T3] Creating trilho snapshot v${version}...`);

  const state = await getTrilhoState();

  const { error } = await supabase.from("trilho_versions").insert({
    version,
    snapshot_data: state,
    created_at: new Date().toISOString(),
  });

  if (error) throw error;
  console.log(`[T3] ✓ Created snapshot v${version}`);
}

export async function getTrilhoVersions(): Promise<any[]> {
  const { data, error } = await supabase
    .from("trilho_versions")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data || [];
}

// ============================================================================
// T4: Export
// ============================================================================

export async function exportTrilho(): Promise<string> {
  console.log("[T4] Exporting trilho...");

  const { data: elos } = await supabase.from("trilho_elos").select("*").order("elo_number");

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

  const json = JSON.stringify(exportData, null, 2);
  console.log(`[T4] ✓ Exported ${elos?.length || 0} elos`);

  return json;
}

export default {
  verifyTrilhoIntegrity,
  getTrilhoState,
  createTrilhoSnapshot,
  getTrilhoVersions,
  exportTrilho,
};
