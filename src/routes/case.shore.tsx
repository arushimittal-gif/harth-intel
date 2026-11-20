import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/case/shore")({
  head: () => ({ meta: [{ title: "Jersey Shore Owners — Hearth Intelligence" }] }),
  component: Shore,
});

function Shore() {
  const { data: rows = [] } = useSuspenseQuery({
    queryKey: ["shore-pa-owners"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("properties")
        .select("id,address,city,zip,owner_name,street_address,street_city,street_state,street_zip,market_value,year_built")
        .eq("data_source", "Shore Data")
        .in("street_state", ["PA", "Pa.", "PHILADELPHIA PA.", "Pennsylvania"])
        .limit(500);
      if (error) throw error;
      return data ?? [];
    },
  });

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b px-6 py-4 flex justify-between items-center">
        <div>
          <Link to="/" className="text-xs text-muted-foreground hover:underline">← Back to map</Link>
          <h1 className="text-2xl font-bold mt-1">Jersey Shore owners with a PA mailing address</h1>
          <p className="text-sm text-muted-foreground">{rows.length} owners — target them where they live.</p>
        </div>
      </header>
      <div className="p-6 overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b text-left text-muted-foreground">
              <th className="py-2 pr-4">Owner</th>
              <th className="py-2 pr-4">Shore property</th>
              <th className="py-2 pr-4">Mailing (PA)</th>
              <th className="py-2 pr-4">Year built</th>
              <th className="py-2 pr-4">Market value</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-b hover:bg-accent">
                <td className="py-2 pr-4 font-medium">{r.owner_name}</td>
                <td className="py-2 pr-4">{r.address}</td>
                <td className="py-2 pr-4">{r.street_address}, {r.street_city} {r.street_zip}</td>
                <td className="py-2 pr-4">{r.year_built ?? "—"}</td>
                <td className="py-2 pr-4">{r.market_value ? `$${Math.round(r.market_value).toLocaleString()}` : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
