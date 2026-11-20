import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/case/ex-clients")({
  head: () => ({ meta: [{ title: "Ex-Clients — Hearth Intelligence" }] }),
  component: ExClients,
});

function ExClients() {
  const { data } = useSuspenseQuery({
    queryKey: ["crm-clusters"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("crm_contacts")
        .select("city,state,zip,email,linkedin_url");
      if (error) throw error;
      const byZip = new Map<string, { city: string; state: string; zip: string; count: number; emails: number; linkedins: number }>();
      for (const r of data ?? []) {
        const key = `${r.zip ?? ""}|${r.city ?? ""}|${r.state ?? ""}`;
        if (!byZip.has(key)) byZip.set(key, { city: r.city ?? "", state: r.state ?? "", zip: r.zip ?? "", count: 0, emails: 0, linkedins: 0 });
        const v = byZip.get(key)!;
        v.count++;
        if (r.email) v.emails++;
        if (r.linkedin_url) v.linkedins++;
      }
      return Array.from(byZip.values()).sort((a, b) => b.count - a.count).slice(0, 100);
    },
  });

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b px-6 py-4">
        <Link to="/" className="text-xs text-muted-foreground hover:underline">← Back to map</Link>
        <h1 className="text-2xl font-bold mt-1">Ex-client clusters</h1>
        <p className="text-sm text-muted-foreground">Top ZIP codes by past-client density — a converted home becomes 6 neighbors seeing your sign.</p>
      </header>
      <div className="p-6 grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {data.map((c) => (
          <div key={c.zip + c.city} className="rounded-lg border p-4">
            <div className="flex justify-between">
              <div>
                <p className="font-semibold">{c.city || "—"}, {c.state}</p>
                <p className="text-xs text-muted-foreground">{c.zip || "no zip"}</p>
              </div>
              <p className="text-2xl font-bold">{c.count}</p>
            </div>
            <div className="mt-3 text-xs text-muted-foreground flex gap-4">
              <span>{c.emails} emails</span>
              <span>{c.linkedins} LinkedIn</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
