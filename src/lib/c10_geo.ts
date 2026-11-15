/**
 * C10: Geomapeamento — Geo-visualization + Risk Mapping
 * 
 * Provides:
 * - Municipality boundary GeoJSON
 * - Risk heat maps (deforestation, mining, agricultural)
 * - Interactive map data for /geolocalizacao page
 * - Tile server integration (MapTiles)
 */

import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export interface GeoMunicipality {
  code: string;
  name: string;
  state: string;
  bounds: [number, number, number, number]; // [minLon, minLat, maxLon, maxLat]
  centroid: [number, number]; // [lon, lat]
  area_km2: number;
}

export interface RiskHeatMap {
  municipality_code: string;
  deforestation_pct: number;
  mining_impact: number;
  agricultural_intensity: number;
  overall_risk: number;
  year: number;
  color: string;
}

// ============================================================================
// Geo Data Fetchers
// ============================================================================

export async function getMunicipalityGeoData(
  municipalityCode: string
): Promise<GeoMunicipality | null> {
  console.log(`[C10] Fetching geo data for ${municipalityCode}...`);

  try {
    const { data, error } = await supabase
      .from("municipality_geo")
      .select("*")
      .eq("code", municipalityCode)
      .single();

    if (error) throw error;
    return data;
  } catch (err) {
    console.error(`[C10] Error fetching geo data:`, err);
    return null;
  }
}

export async function getAllMunicipalitiesForState(
  stateCode: string
): Promise<GeoMunicipality[]> {
  console.log(`[C10] Fetching municipalities for ${stateCode}...`);

  try {
    const { data, error } = await supabase
      .from("municipality_geo")
      .select("*")
      .eq("state", stateCode)
      .order("name");

    if (error) throw error;
    return data || [];
  } catch (err) {
    console.error(`[C10] Error fetching municipalities:`, err);
    return [];
  }
}

// ============================================================================
// Risk Heat Maps
// ============================================================================

export async function getRiskHeatMap(year: number = 2026): Promise<RiskHeatMap[]> {
  console.log(`[C10] Computing risk heat map for ${year}...`);

  try {
    // Fetch municipal risk profiles from the graph
    const { data: municipalities } = await supabase
      .from("municipality_geo")
      .select("code");

    if (!municipalities) return [];

    const heatMaps: RiskHeatMap[] = [];

    for (const mun of municipalities) {
      // Get deforestation
      const { data: defo } = await supabase
        .from("deforestation_index")
        .select("pct_of_municipality")
        .eq("municipality_code", mun.code)
        .eq("year", year)
        .single();

      // Get mining impact
      const { data: mining } = await supabase
        .from("mining_cfem")
        .select("cfem_amount_brl")
        .eq("municipality_code", mun.code)
        .eq("year", year)
        .order("cfem_amount_brl", { ascending: false })
        .limit(1)
        .single();

      // Get agricultural intensity
      const { data: agro } = await supabase
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
    throw err;
  }
}

// ============================================================================
// Tile Server Integration
// ============================================================================

export function getTileUrl(x: number, y: number, z: number): string {
  // OpenStreetMap tiles (production) or local tile server (development)
  const tileServer =
    process.env.NODE_ENV === "production"
      ? "https://tile.openstreetmap.org"
      : "http://localhost:8080";

  return `${tileServer}/${z}/${x}/${y}.png`;
}

export function getWMSLayerUrl(layer: string, bbox: string): string {
  // Web Map Service endpoint for geological/cadastral data
  const wmsServer = "https://wms.ibge.gov.br/geoserver/wms";
  return `${wmsServer}?service=WMS&version=1.1.0&request=GetMap&layers=${layer}&bbox=${bbox}&width=512&height=512&srs=EPSG:4326&format=image/png`;
}

// ============================================================================
// Helper Functions
// ============================================================================

function getRiskColor(riskScore: number): string {
  if (riskScore < 20) return "#22c55e"; // Green (low)
  if (riskScore < 40) return "#eab308"; // Yellow (moderate)
  if (riskScore < 60) return "#f97316"; // Orange (elevated)
  if (riskScore < 80) return "#dc2626"; // Red (high)
  return "#7f1d1d"; // Dark red (critical)
}

export default {
  getMunicipalityGeoData,
  getAllMunicipalitiesForState,
  getRiskHeatMap,
  getTileUrl,
  getWMSLayerUrl,
};
