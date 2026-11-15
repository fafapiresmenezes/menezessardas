// C9: Boletim — Newsletter Generation from Market Signals
// Generates weekly newsletter from market signals, compliance changes, and GDELT events

import { createClient } from "jsr:@supabase/supabase-js@2";

const supabase = () =>
  createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

interface NewsletterSection {
  title: string;
  subtitle?: string;
  items: NewsletterItem[];
}

interface NewsletterItem {
  headline: string;
  description: string;
  metrics?: Record<string, number | string>;
  link?: string;
}

interface Newsletter {
  issue_number: number;
  week_start: string;
  week_end: string;
  generated_at: string;
  sections: NewsletterSection[];
  signal_summary: unknown[];
  compliance_alerts: Array<{
    municipality: string;
    alert_type: string;
    severity: "low" | "medium" | "high";
  }>;
  event_highlights: string[];
}

function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(d.setDate(diff));
}

async function generateBoletim(): Promise<Newsletter> {
  console.log("[C9] Generating weekly newsletter...");

  const client = supabase();

  try {
    // Get latest market signals
    const { data: signals } = await client
      .from("market_signals")
      .select("*")
      .order("generated_at", { ascending: false })
      .limit(3);

    // Get this week's compliance alerts
    const weekStart = getWeekStart(new Date());
    const { data: alerts } = await client
      .from("deforestation_index")
      .select("municipality_code, pct_of_municipality, year")
      .gte("year", weekStart.getFullYear())
      .order("pct_of_municipality", { ascending: false })
      .limit(10);

    // Get event highlights from GDELT
    const { data: events } = await client
      .from("gdelt_events")
      .select("summary, count")
      .gte("published_date", weekStart.toISOString())
      .order("count", { ascending: false })
      .limit(5);

    // Build newsletter sections
    const sections: NewsletterSection[] = [
      {
        title: "📊 Market Signals This Week",
        subtitle: "Investment opportunities from Precatórios, Energia Livre, and Carbon Credits",
        items: (signals || []).map((s: any) => ({
          headline: `${s.market_name}: ${s.signal_type.toUpperCase()}`,
          description: s.recommendation,
          metrics: {
            score: s.signal_score,
            confidence: `${s.confidence}%`,
            value: `$${s.opportunity_value}M`,
          },
          link: `/admin/signals/${s.market_code}`,
        })),
      },
      {
        title: "⚠️ Compliance Alerts",
        subtitle: "High-risk municipalities needing attention",
        items: (alerts || [])
          .filter((a: any) => a.pct_of_municipality > 10)
          .slice(0, 5)
          .map((a: any) => ({
            headline: a.municipality_code,
            description: `${a.pct_of_municipality.toFixed(1)}% deforestation rate (risk level: high)`,
            metrics: { year: a.year },
          })),
      },
      {
        title: "🌍 Global Events",
        subtitle: "Key GDELT events affecting Brazilian markets",
        items: (events || [])
          .slice(0, 3)
          .map((e: any) => ({
            headline: e.summary.split("\n")[0].substring(0, 60),
            description: e.summary.split("\n").slice(0, 2).join(" "),
            metrics: { mentions: e.count },
          })),
      },
    ];

    const issueNumber = Math.floor(
      (new Date().getTime() - new Date(2026, 10, 1).getTime()) / (7 * 24 * 60 * 60 * 1000)
    );

    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);

    const newsletter: Newsletter = {
      issue_number: issueNumber,
      week_start: weekStart.toISOString().split("T")[0],
      week_end: weekEnd.toISOString().split("T")[0],
      generated_at: new Date().toISOString(),
      sections,
      signal_summary: signals || [],
      compliance_alerts: alerts
        ? alerts
            .filter((a: any) => a.pct_of_municipality > 10)
            .map((a: any) => ({
              municipality: a.municipality_code,
              alert_type: "high_deforestation",
              severity: a.pct_of_municipality > 20 ? "high" : "medium",
            }))
        : [],
      event_highlights: events ? events.map((e: any) => e.summary.split("\n")[0]) : [],
    };

    // Save to database
    const { error } = await client.from("boletim_archive").insert({
      issue_number: newsletter.issue_number,
      week_start: newsletter.week_start,
      week_end: newsletter.week_end,
      content: newsletter,
      generated_at: newsletter.generated_at,
    });

    if (error) console.warn("[C9] Warning saving newsletter:", error);

    console.log(`[C9] ✓ Generated boletim #${issueNumber}`);
    return newsletter;
  } catch (err) {
    console.error("[C9] Error generating boletim:", err);
    throw err;
  }
}

async function getBoletimArchive(limit: number = 4): Promise<Newsletter[]> {
  console.log("[C9] Fetching boletim archive...");

  const client = supabase();
  const { data, error } = await client
    .from("boletim_archive")
    .select("content")
    .order("issue_number", { ascending: false })
    .limit(limit);

  if (error) throw error;

  return (data || []).map((row: any) => row.content);
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST" && req.method !== "GET") {
    return json({ error: "Method not allowed" }, 405);
  }

  try {
    const url = new URL(req.url);

    if (url.pathname === "/c9-boletim/generate" && req.method === "POST") {
      const newsletter = await generateBoletim();
      return json({ status: "success", data: newsletter });
    }

    if (url.pathname === "/c9-boletim/archive" && req.method === "GET") {
      const limit = parseInt(url.searchParams.get("limit") || "4");
      const archive = await getBoletimArchive(limit);
      return json({ status: "success", data: archive });
    }

    return json({ error: "Not found" }, 404);
  } catch (error) {
    console.error("Error:", error);
    return json({ error: String(error) }, 500);
  }
});
