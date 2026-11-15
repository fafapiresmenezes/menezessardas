// C10: Geomapeamento — Geo-visualization + Risk Mapping

import { createClient } from "jsr:@supabase/supabase-js@2";

const supabase = () =>
  createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

interface GeoMunicipality {
  code: string;
  name: string;
  state: string;
  area_km2?: number;
}

interface RiskHeatMap {
  municipality_code: string;
  deforestation_pct: number;
  mining_impact: number;
  agricultural_intensity: number;
  overall_risk: number;
  year: number;
  color: string;
}

function getRiskColor(riskScore: number): string {
  if (riskScore < 20) return "#22c55e";
  if (riskScore < 40) return "#eab308";
  if (riskScore < 60) return "#f97316";
  if (riskScore < 80) return "#dc2626";
  return "#7f1d1d";
}

async function getMunicipalityGeoData(
  municipalityCode: string
): Promise<GeoMunicipality | null> {
  console.log(`[C10] Fetching geo data for ${municipalityCode}...`);

  try {
    const client = supabase();
    const { data, error } = await client
      .from("municipality_geo")
      .select("*")
      .eq("code", municipalityCode)
      .single();

    if (error) return null;
    return data;
  } catch (err) {
    console.error(`[C10] Error fetching geo data:`, err);
    return null;
  }
}

async function getAllMunicipalitiesForState(
  stateCode: string
): Promise<GeoMunicipality[]> {
  console.log(`[C10] Fetching municipalities for ${stateCode}...`);

  try {
    const client = supabase();
    const { data, error } = await client
      .from("municipality_geo")
      .select("*")
      .eq("state", stateCode)
      .order("name");

    if (error) return [];
    return data || [];
  } catch (err) {
    console.error(`[C10] Error fetching municipalities:`, err);
    return [];
  }
}

async function getRiskHeatMap(year: number = 2026): Promise<RiskHeatMap[]> {
  console.log(`[C10] Computing risk heat map for ${year}...`);

  try {
    const client = supabase();
    const { data: municipalities } = await client
      .from("municipality_geo")
      .select("code");

    if (!municipalities) return [];

    const heatMaps: RiskHeatMap[] = [];

    for (const mun of municipalities) {
      const { data: defo } = await client
        .from("deforestation_index")
        .select("pct_of_municipality")
        .eq("municipality_code", mun.code)
        .eq("year", year)
        .single();

      const { data: mining } = await client
        .from("mining_cfem")
        .select("cfem_amount_brl")
        .eq("municipality_code", mun.code)
        .eq("year", year)
        .order("cfem_amount_brl", { ascending: false })
        .limit(1)
        .single();

      const { data: agro } = await client
        .from("agricultural_production")
        .select("production_tons, area_hectares")
        .eq("municipality_code", mun.code)
        .eq("year", year)
        .order("production_tons", { ascending: false })
        .limit(1)
        .single();

      const defoVal = defo?.pct_of_municipality || 0;
      const miningVal = Math.min(100, (mining?.cfem_amount_brl || 0) / 100);
      const agroVal = agro ? Math.min(100, (agro.production_tons || 0) / 50000) : 0;

      const overallRisk = (defoVal * 0.4 + miningVal * 0.3 + agroVal * 0.3) / 1;
      const color = getRiskColor(overallRisk);

      heatMaps.push({
        municipality_code: mun.code,
        deforestation_pct: defoVal,
        mining_impact: miningVal,
        agricultural_intensity: agroVal,
        overall_risk: Math.round(overallRisk * 100) / 100,
        year,
        color,
      });
    }

    console.log(`[C10] ✓ Generated heat maps for ${heatMaps.length} municipalities`);
    return heatMaps;
  } catch (err) {
    console.error("[C10] Error computing heat map:", err);
    return [];
  }
}

Deno.serve(async (req: Request) => {
  if (req.method !== "GET" && req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  try {
    const url = new URL(req.url);

    if (url.pathname === "/c10-geo/municipality" && req.method === "GET") {
      const code = url.searchParams.get("code");
      if (!code) return json({ error: "Missing code parameter" }, 400);
      const data = await getMunicipalityGeoData(code);
      return json({ status: "success", data });
    }

    if (url.pathname === "/c10-geo/state" && req.method === "GET") {
      const state = url.searchParams.get("state");
      if (!state) return json({ error: "Missing state parameter" }, 400);
      const data = await getAllMunicipalitiesForState(state);
      return json({ status: "success", data });
    }

    if (url.pathname === "/c10-geo/heatmap" && req.method === "GET") {
      const year = parseInt(url.searchParams.get("year") || "2026");
      const data = await getRiskHeatMap(year);
      return json({ status: "success", data });
    }

    return json({ error: "Not found" }, 404);
  } catch (error) {
    console.error("Error:", error);
    return json({ error: String(error) }, 500);
  }
});
