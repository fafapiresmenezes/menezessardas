/**
 * Initial Pilot Program Setup - Seed Data
 * Auto-enroll 3 municipalities per market into pilot programs
 */

import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export const initialPilots = {
  PRECATORIOS: [
    {
      pilot_id: "PRECATORIOS-SP-001",
      municipality_code: "3550308", // São Paulo
      partner_name: "Prefeitura Municipal de São Paulo",
      market: "PRECATORIOS",
    },
    {
      pilot_id: "PRECATORIOS-MG-001",
      municipality_code: "3106200", // Belo Horizonte
      partner_name: "Prefeitura Municipal de Belo Horizonte",
      market: "PRECATORIOS",
    },
    {
      pilot_id: "PRECATORIOS-RJ-001",
      municipality_code: "3304557", // Rio de Janeiro
      partner_name: "Prefeitura Municipal do Rio de Janeiro",
      market: "PRECATORIOS",
    },
  ],
  ENERGIA_LIVRE: [
    {
      pilot_id: "ENERGIA-ENERGISA-001",
      municipality_code: "2100100", // Santarém, PA
      partner_name: "Energisa S.A.",
      market: "ENERGIA_LIVRE",
    },
    {
      pilot_id: "ENERGIA-CPFL-001",
      municipality_code: "3565903", // Piracicaba, SP
      partner_name: "CPFL Energia S.A.",
      market: "ENERGIA_LIVRE",
    },
    {
      pilot_id: "ENERGIA-ENEL-001",
      municipality_code: "4106902", // Curitiba, PR
      partner_name: "Enel Brasil S.A.",
      market: "ENERGIA_LIVRE",
    },
  ],
  CARBONO: [
    {
      pilot_id: "CARBONO-INPE-001",
      municipality_code: "1500402", // Altamira, PA
      partner_name: "Instituto Nacional de Pesquisas Espaciais (INPE)",
      market: "CARBONO",
    },
    {
      pilot_id: "CARBONO-VCS-001",
      municipality_code: "2103405", // Juruti, PA
      partner_name: "Verified Carbon Standard (VCS)",
      market: "CARBONO",
    },
    {
      pilot_id: "CARBONO-GOLD-001",
      municipality_code: "1100304", // Manaus, AM
      partner_name: "Gold Standard Foundation",
      market: "CARBONO",
    },
  ],
};

export async function seedPilotPrograms(): Promise<void> {
  console.log("[PILOT SEED] Starting pilot program enrollment...");

  const allPilots = [
    ...initialPilots.PRECATORIOS,
    ...initialPilots.ENERGIA_LIVRE,
    ...initialPilots.CARBONO,
  ];

  for (const pilot of allPilots) {
    const { error } = await supabase.from("pilot_programs").insert({
      pilot_id: pilot.pilot_id,
      market: pilot.market,
      municipality_code: pilot.municipality_code,
      partner_name: pilot.partner_name,
      status: "active",
      enrolled_date: new Date().toISOString(),
      start_date: new Date().toISOString(),
      signals_generated: 0,
      signals_accurate: 0,
      revenue_brl: 0,
    });

    if (error && error.code !== "23505") {
      // 23505 = unique constraint violation (already exists)
      console.error(`[PILOT SEED] Error enrolling ${pilot.pilot_id}:`, error);
    } else {
      console.log(`[PILOT SEED] ✓ Enrolled ${pilot.pilot_id}`);
    }
  }

  console.log("[PILOT SEED] ✓ Pilot enrollment complete");
}

export async function seedInitialMunicipalityGeoData(): Promise<void> {
  console.log("[GEO SEED] Loading municipality geographic data...");

  const municipalities = [
    {
      code: "3550308",
      name: "São Paulo",
      state: "SP",
      area_km2: 1521.11,
    },
    {
      code: "3106200",
      name: "Belo Horizonte",
      state: "MG",
      area_km2: 331.36,
    },
    {
      code: "3304557",
      name: "Rio de Janeiro",
      state: "RJ",
      area_km2: 1182.3,
    },
    {
      code: "2100100",
      name: "Santarém",
      state: "PA",
      area_km2: 17942.07,
    },
    {
      code: "3565903",
      name: "Piracicaba",
      state: "SP",
      area_km2: 1378.29,
    },
    {
      code: "4106902",
      name: "Curitiba",
      state: "PR",
      area_km2: 435.49,
    },
    {
      code: "1500402",
      name: "Altamira",
      state: "PA",
      area_km2: 17100.35,
    },
    {
      code: "2103405",
      name: "Juruti",
      state: "PA",
      area_km2: 6314.17,
    },
    {
      code: "1100304",
      name: "Manaus",
      state: "AM",
      area_km2: 11401.97,
    },
  ];

  for (const mun of municipalities) {
    const { error } = await supabase.from("municipality_geo").insert(mun);

    if (error && error.code !== "23505") {
      console.error(`[GEO SEED] Error inserting ${mun.code}:`, error);
    } else {
      console.log(`[GEO SEED] ✓ Loaded ${mun.name} (${mun.state})`);
    }
  }

  console.log("[GEO SEED] ✓ Geographic data loaded");
}

export default {
  initialPilots,
  seedPilotPrograms,
  seedInitialMunicipalityGeoData,
};
