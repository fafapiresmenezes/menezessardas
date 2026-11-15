/**
 * C14: Pilotos — Market Pilots
 * 
 * Pilot programs for signal validation:
 * - Precatórios pilot with partner municipalities
 * - Energia Livre pilot with energy distributors
 * - Créditos Carbono pilot with verification bodies
 * 
 * Tracks: enrollment, signal accuracy, revenue
 */

import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export enum PilotMarket {
  PRECATORIOS = "PRECATORIOS",
  ENERGIA_LIVRE = "ENERGIA_LIVRE",
  CARBONO = "CARBONO",
}

export enum PilotStatus {
  ENROLLED = "enrolled",
  ACTIVE = "active",
  COMPLETED = "completed",
  CANCELLED = "cancelled",
}

export interface PilotProgram {
  pilot_id: string;
  market: PilotMarket;
  municipality_code: string;
  partner_name: string;
  status: PilotStatus;
  enrolled_date: string;
  start_date?: string;
  end_date?: string;
  signals_generated: number;
  signals_accurate: number;
  revenue_brl: number;
  notes?: string;
}

// ============================================================================
// Pilot Enrollment
// ============================================================================

export async function enrollPilot(
  market: PilotMarket,
  municipalityCode: string,
  partnerName: string
): Promise<PilotProgram> {
  console.log(`[C14] Enrolling pilot: ${market} in ${municipalityCode}...`);

  const pilotId = `${market}-${municipalityCode}-${Date.now()}`;

  const pilot: PilotProgram = {
    pilot_id: pilotId,
    market,
    municipality_code: municipalityCode,
    partner_name: partnerName,
    status: PilotStatus.ENROLLED,
    enrolled_date: new Date().toISOString(),
    signals_generated: 0,
    signals_accurate: 0,
    revenue_brl: 0,
  };

  const { error } = await supabase.from("pilot_programs").insert(pilot);

  if (error) throw error;
  console.log(`[C14] ✓ Enrolled pilot ${pilotId}`);
  return pilot;
}

// ============================================================================
// Pilot Tracking
// ============================================================================

export async function activatePilot(pilotId: string): Promise<void> {
  console.log(`[C14] Activating pilot ${pilotId}...`);

  const { error } = await supabase
    .from("pilot_programs")
    .update({ status: PilotStatus.ACTIVE, start_date: new Date().toISOString() })
    .eq("pilot_id", pilotId);

  if (error) throw error;
  console.log(`[C14] ✓ Activated pilot ${pilotId}`);
}

export async function recordSignal(
  pilotId: string,
  accurate: boolean
): Promise<void> {
  // Get current pilot
  const { data: pilot } = await supabase
    .from("pilot_programs")
    .select("signals_generated, signals_accurate")
    .eq("pilot_id", pilotId)
    .single();

  if (!pilot) throw new Error(`Pilot ${pilotId} not found`);

  // Update counts
  const newGenerated = (pilot.signals_generated || 0) + 1;
  const newAccurate = (pilot.signals_accurate || 0) + (accurate ? 1 : 0);

  const { error } = await supabase
    .from("pilot_programs")
    .update({
      signals_generated: newGenerated,
      signals_accurate: newAccurate,
    })
    .eq("pilot_id", pilotId);

  if (error) throw error;
}

export async function recordRevenue(
  pilotId: string,
  amountBRL: number
): Promise<void> {
  const { data: pilot } = await supabase
    .from("pilot_programs")
    .select("revenue_brl")
    .eq("pilot_id", pilotId)
    .single();

  if (!pilot) throw new Error(`Pilot ${pilotId} not found`);

  const newRevenue = (pilot.revenue_brl || 0) + amountBRL;

  const { error } = await supabase
    .from("pilot_programs")
    .update({ revenue_brl: newRevenue })
    .eq("pilot_id", pilotId);

  if (error) throw error;
}

// ============================================================================
// Pilot Analytics
// ============================================================================

export async function getPilotAccuracy(pilotId: string): Promise<number> {
  const { data: pilot } = await supabase
    .from("pilot_programs")
    .select("signals_generated, signals_accurate")
    .eq("pilot_id", pilotId)
    .single();

  if (!pilot || pilot.signals_generated === 0) return 0;
  return Math.round((pilot.signals_accurate / pilot.signals_generated) * 10000) / 100;
}

export async function getActivePilots(): Promise<PilotProgram[]> {
  const { data, error } = await supabase
    .from("pilot_programs")
    .select("*")
    .eq("status", PilotStatus.ACTIVE)
    .order("start_date", { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function getPilotsByMarket(market: PilotMarket): Promise<PilotProgram[]> {
  const { data, error } = await supabase
    .from("pilot_programs")
    .select("*")
    .eq("market", market)
    .order("enrolled_date", { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function completePilot(pilotId: string, notes?: string): Promise<void> {
  console.log(`[C14] Completing pilot ${pilotId}...`);

  const { error } = await supabase
    .from("pilot_programs")
    .update({
      status: PilotStatus.COMPLETED,
      end_date: new Date().toISOString(),
      notes,
    })
    .eq("pilot_id", pilotId);

  if (error) throw error;
  console.log(`[C14] ✓ Completed pilot ${pilotId}`);
}

export default {
  enrollPilot,
  activatePilot,
  recordSignal,
  recordRevenue,
  getPilotAccuracy,
  getActivePilots,
  getPilotsByMarket,
  completePilot,
};
