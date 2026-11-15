// C14: Pilotos — Market Pilot Programs

import { createClient } from "jsr:@supabase/supabase-js@2";

const supabase = () =>
  createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

enum PilotMarket {
  PRECATORIOS = "PRECATORIOS",
  ENERGIA_LIVRE = "ENERGIA_LIVRE",
  CARBONO = "CARBONO",
}

enum PilotStatus {
  ENROLLED = "enrolled",
  ACTIVE = "active",
  COMPLETED = "completed",
  CANCELLED = "cancelled",
}

interface PilotProgram {
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
}

async function enrollPilot(
  market: string,
  municipalityCode: string,
  partnerName: string
): Promise<PilotProgram> {
  console.log(`[C14] Enrolling pilot: ${market} in ${municipalityCode}...`);

  const client = supabase();
  const pilotId = `${market}-${municipalityCode}-${Date.now()}`;

  const pilot: PilotProgram = {
    pilot_id: pilotId,
    market: market as PilotMarket,
    municipality_code: municipalityCode,
    partner_name: partnerName,
    status: PilotStatus.ENROLLED,
    enrolled_date: new Date().toISOString(),
    signals_generated: 0,
    signals_accurate: 0,
    revenue_brl: 0,
  };

  const { error } = await client.from("pilot_programs").insert(pilot);
  if (error) throw error;

  console.log(`[C14] ✓ Enrolled pilot ${pilotId}`);
  return pilot;
}

async function activatePilot(pilotId: string): Promise<void> {
  console.log(`[C14] Activating pilot ${pilotId}...`);

  const client = supabase();
  const { error } = await client
    .from("pilot_programs")
    .update({ status: PilotStatus.ACTIVE, start_date: new Date().toISOString() })
    .eq("pilot_id", pilotId);

  if (error) throw error;
  console.log(`[C14] ✓ Activated pilot ${pilotId}`);
}

async function getActivePilots(): Promise<PilotProgram[]> {
  const client = supabase();
  const { data, error } = await client
    .from("pilot_programs")
    .select("*")
    .eq("status", PilotStatus.ACTIVE)
    .order("start_date", { ascending: false });

  if (error) return [];
  return data || [];
}

async function getPilotsByMarket(market: string): Promise<PilotProgram[]> {
  const client = supabase();
  const { data, error } = await client
    .from("pilot_programs")
    .select("*")
    .eq("market", market)
    .order("enrolled_date", { ascending: false });

  if (error) return [];
  return data || [];
}

async function getPilotAccuracy(pilotId: string): Promise<number> {
  const client = supabase();
  const { data: pilot } = await client
    .from("pilot_programs")
    .select("signals_generated, signals_accurate")
    .eq("pilot_id", pilotId)
    .single();

  if (!pilot || pilot.signals_generated === 0) return 0;
  return Math.round((pilot.signals_accurate / pilot.signals_generated) * 10000) / 100;
}

Deno.serve(async (req: Request) => {
  if (req.method !== "GET" && req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  try {
    const url = new URL(req.url);

    if (url.pathname === "/c14-pilotos/enroll" && req.method === "POST") {
      const body = await req.json();
      const pilot = await enrollPilot(body.market, body.municipality_code, body.partner_name);
      return json({ status: "success", data: pilot });
    }

    if (url.pathname === "/c14-pilotos/activate" && req.method === "POST") {
      const body = await req.json();
      await activatePilot(body.pilot_id);
      return json({ status: "success", message: "Pilot activated" });
    }

    if (url.pathname === "/c14-pilotos/active" && req.method === "GET") {
      const pilots = await getActivePilots();
      return json({ status: "success", data: pilots });
    }

    if (url.pathname === "/c14-pilotos/by-market" && req.method === "GET") {
      const market = url.searchParams.get("market");
      if (!market) return json({ error: "Missing market parameter" }, 400);
      const pilots = await getPilotsByMarket(market);
      return json({ status: "success", data: pilots });
    }

    if (url.pathname === "/c14-pilotos/accuracy" && req.method === "GET") {
      const pilotId = url.searchParams.get("pilot_id");
      if (!pilotId) return json({ error: "Missing pilot_id parameter" }, 400);
      const accuracy = await getPilotAccuracy(pilotId);
      return json({ status: "success", data: { accuracy } });
    }

    return json({ error: "Not found" }, 404);
  } catch (error) {
    console.error("Error:", error);
    return json({ error: String(error) }, 500);
  }
});
