import { useEffect, useState } from "react";
import { Boxes, FileClock, Settings, ToggleLeft, ToggleRight } from "lucide-react";
import { RequireAuth } from "../../../cod-client-astro/src/features/auth/components/RequireAuth";
import { DashboardChrome } from "../../../cod-client-astro/src/components/layout/chrome";
import { PageHeader } from "../../../cod-client-astro/src/components/ui";
import { apiFetch } from "../../../cod-client-astro/src/lib/api";

type Extension = { id: string; name: string; version: string; description: string; dashboard: string; enabled: boolean; config: Record<string, any>; migrations: string[] };
type Log = { id: string; level: string; action: string; message: string; createdAt: string };

export function ExtensionListContent({ items, onToggle, onConfigure }: { items: Extension[]; onToggle: (item: Extension) => void; onConfigure: (item: Extension) => void }) {
  return <div className="grid gap-4">
    {items.map((item) => <section key={item.id} className="rounded-xl border bg-card p-5 shadow-sm">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex gap-3"><div className="grid size-11 shrink-0 place-items-center rounded-lg bg-brand/10 text-brand"><Boxes size={22} /></div>
          <div><div className="flex flex-wrap items-center gap-2"><h2 className="font-bold">{item.name}</h2><span className="rounded bg-muted px-2 py-0.5 text-xs">v{item.version}</span></div>
            <p className="mt-1 text-sm text-muted-foreground">{item.description}</p><p className="mt-2 text-xs text-muted-foreground">Migration : {item.migrations.join(", ")}</p></div></div>
        <button type="button" onClick={() => onToggle(item)} className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-4 text-sm font-semibold ${item.enabled ? "bg-green-600 text-white" : "bg-muted"}`} aria-pressed={item.enabled}>
          {item.enabled ? <ToggleRight size={20} /> : <ToggleLeft size={20} />}{item.enabled ? "Activée" : "Désactivée"}
        </button>
      </div>
      {item.enabled && <div className="mt-4 flex flex-wrap gap-2 border-t pt-4"><a className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-brand px-3 text-sm font-semibold text-white" href={item.dashboard}><Settings size={16} />Configurer</a><a className="inline-flex min-h-10 items-center gap-2 rounded-lg border px-3 text-sm" href="#extension-logs"><FileClock size={16} />Voir les logs</a></div>}
    </section>)}
  </div>;
}

function Gated() {
  const [items, setItems] = useState<Extension[]>([]); const [logs, setLogs] = useState<Log[]>([]); const [error, setError] = useState("");
  const load = async () => { try { const r = await apiFetch<{ data: Extension[] }>("/api/extensions"); setItems(r.data); const l = await apiFetch<{ data: Log[] }>("/api/extensions/stock-profitability/logs"); setLogs(l.data); } catch (e) { setError(e instanceof Error ? e.message : String(e)); } };
  useEffect(() => { void load(); }, []);
  const save = async (item: Extension, config = item.config) => { await apiFetch(`/api/extensions/${item.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ enabled: !item.enabled, config }) }); await load(); };
  return <DashboardChrome currentPath="/extensions"><PageHeader title="Extensions" />
    <p className="mb-5 text-sm text-muted-foreground">Chaque module est isolé, versionné et configurable par boutique. Une extension désactivée répond en 404 et ne reçoit plus les événements.</p>
    {error && <p role="alert" className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    <ExtensionListContent items={items} onToggle={(item) => void save(item)} onConfigure={(item) => { window.location.href = item.dashboard; }} />
    <section id="extension-logs" className="mt-8"><h2 className="mb-3 text-lg font-bold">Journaux récents</h2><div className="overflow-x-auto rounded-xl border bg-card"><table className="w-full text-sm"><thead><tr className="border-b text-start"><th className="p-3 text-start">Date</th><th className="p-3 text-start">Événement</th><th className="p-3 text-start">Message</th></tr></thead><tbody>{logs.map((l) => <tr key={l.id} className="border-b last:border-0"><td className="p-3 whitespace-nowrap">{new Date(l.createdAt).toLocaleString("fr-DZ")}</td><td className="p-3 font-mono text-xs">{l.action}</td><td className="p-3">{l.message}</td></tr>)}</tbody></table>{!logs.length && <p className="p-5 text-sm text-muted-foreground">Aucun log.</p>}</div></section>
  </DashboardChrome>;
}
export default function ExtensionsPageApp() { return <RequireAuth><Gated /></RequireAuth>; }
