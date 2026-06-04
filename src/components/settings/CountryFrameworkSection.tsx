import { useState } from "react";
import { Globe, Building2, GraduationCap, Plus, Trash2, Check, X, Loader2, ChevronRight, Layers } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  useAllCountries, useCreateCountry, useDeleteCountry,
  useRegulatoryBodies, useCreateRegulatoryBody, useDeleteRegulatoryBody,
  useQualificationFrameworks, useCreateQualificationFramework, useDeleteQualificationFramework,
  useQualificationLevels, useCreateQualificationLevel, useDeleteQualificationLevel,
} from "@/hooks/useCountryFramework";
import type { Country, RegulatoryBody, QualificationFramework } from "@/hooks/useCountryFramework";

type Tab = "countries" | "bodies" | "frameworks";

export default function CountryFrameworkSection() {
  const [tab, setTab] = useState<Tab>("countries");

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "countries", label: "Countries", icon: <Globe className="w-4 h-4" /> },
    { id: "bodies", label: "Regulatory Bodies", icon: <Building2 className="w-4 h-4" /> },
    { id: "frameworks", label: "Qualification Frameworks", icon: <GraduationCap className="w-4 h-4" /> },
  ];

  return (
    <div className="space-y-4">
      {/* Tabs */}
      <div className="flex gap-1 bg-secondary/50 p-1 rounded-xl">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all flex-1 justify-center",
              tab === t.id ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
            )}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>

      {tab === "countries" && <CountriesPanel />}
      {tab === "bodies" && <RegulatoryBodiesPanel />}
      {tab === "frameworks" && <QualificationFrameworksPanel />}
    </div>
  );
}

// ── Countries Panel ──
function CountriesPanel() {
  const { data: countries = [], isLoading } = useAllCountries();
  const createMut = useCreateCountry();
  const deleteMut = useDeleteCountry();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", iso_code: "", region: "Africa", sub_region: "", currency_code: "ZAR" });
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const handleCreate = async () => {
    if (!form.name || !form.iso_code || !form.region) return;
    await createMut.mutateAsync({ ...form, sub_region: form.sub_region || null });
    setForm({ name: "", iso_code: "", region: "Africa", sub_region: "", currency_code: "ZAR" });
    setShowForm(false);
    toast.success("Country added");
  };

  const handleDelete = async (id: string) => {
    await deleteMut.mutateAsync(id);
    setDeleteId(null);
    toast.success("Country removed");
  };

  if (isLoading) return <LoadingState />;

  return (
    <div className="bg-card rounded-xl shadow-card border border-border/50 overflow-hidden">
      <div className="px-6 py-4 border-b border-border flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Countries ({countries.length})</h3>
          <p className="text-[11px] text-muted-foreground mt-0.5">Manage jurisdictions for regulatory overlays.</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="p-2 rounded-lg bg-secondary hover:bg-accent/10 transition-colors">
          <Plus className="w-4 h-4 text-muted-foreground" />
        </button>
      </div>

      {showForm && (
        <div className="px-6 py-4 border-b border-border bg-secondary/30 animate-fade-in">
          <div className="grid grid-cols-2 gap-3">
            <input placeholder="Country name" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} className="input-field" />
            <input placeholder="ISO code (e.g. ZA)" value={form.iso_code} onChange={e => setForm(p => ({ ...p, iso_code: e.target.value.toUpperCase() }))} maxLength={3} className="input-field" />
            <select value={form.region} onChange={e => setForm(p => ({ ...p, region: e.target.value }))} className="input-field">
              <option>Africa</option><option>Europe</option><option>Asia</option><option>Americas</option><option>Oceania</option>
            </select>
            <input placeholder="Sub-region (optional)" value={form.sub_region} onChange={e => setForm(p => ({ ...p, sub_region: e.target.value }))} className="input-field" />
            <input placeholder="Currency (e.g. ZAR)" value={form.currency_code} onChange={e => setForm(p => ({ ...p, currency_code: e.target.value.toUpperCase() }))} maxLength={3} className="input-field" />
            <button onClick={handleCreate} disabled={createMut.isPending} className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-accent text-accent-foreground text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50">
              {createMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              Add Country
            </button>
          </div>
        </div>
      )}

      <div className="divide-y divide-border/50">
        {countries.map(c => (
          <div key={c.id} className="px-6 py-3 flex items-center justify-between group">
            <div className="flex items-center gap-3">
              <span className="text-xs font-mono bg-secondary px-2 py-0.5 rounded text-muted-foreground">{c.iso_code}</span>
              <div>
                <p className="text-sm font-medium text-foreground">{c.name}</p>
                <p className="text-[10px] text-muted-foreground">{c.region}{c.sub_region ? ` · ${c.sub_region}` : ""} · {c.currency_code}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className={cn("px-2 py-0.5 rounded text-[10px] font-medium", c.is_active ? "bg-success/10 text-success" : "bg-secondary text-muted-foreground")}>
                {c.is_active ? "Active" : "Inactive"}
              </span>
              {deleteId === c.id ? (
                <div className="flex items-center gap-1 animate-fade-in">
                  <button onClick={() => handleDelete(c.id)} className="p-1 rounded bg-destructive/10 text-destructive hover:bg-destructive/20"><Check className="w-3 h-3" /></button>
                  <button onClick={() => setDeleteId(null)} className="p-1 rounded bg-secondary text-muted-foreground"><X className="w-3 h-3" /></button>
                </div>
              ) : (
                <button onClick={() => setDeleteId(c.id)} className="p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        ))}
        {countries.length === 0 && <p className="px-6 py-8 text-center text-sm text-muted-foreground">No countries configured yet.</p>}
      </div>
    </div>
  );
}

// ── Regulatory Bodies Panel ──
function RegulatoryBodiesPanel() {
  const { data: countries = [] } = useAllCountries();
  const [filterCountry, setFilterCountry] = useState<string>("");
  const { data: bodies = [], isLoading } = useRegulatoryBodies(filterCountry || undefined);
  const createMut = useCreateRegulatoryBody();
  const deleteMut = useDeleteRegulatoryBody();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", acronym: "", body_type: "quality_assurance", country_id: "", description: "", website_url: "" });
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const handleCreate = async () => {
    if (!form.name || !form.acronym || !form.country_id) return;
    await createMut.mutateAsync({ ...form, description: form.description || null, website_url: form.website_url || null });
    setForm({ name: "", acronym: "", body_type: "quality_assurance", country_id: "", description: "", website_url: "" });
    setShowForm(false);
    toast.success("Regulatory body added");
  };

  if (isLoading) return <LoadingState />;

  return (
    <div className="bg-card rounded-xl shadow-card border border-border/50 overflow-hidden">
      <div className="px-6 py-4 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div>
            <h3 className="text-sm font-semibold text-foreground">Regulatory Bodies ({bodies.length})</h3>
            <p className="text-[11px] text-muted-foreground mt-0.5">Quality assurance and sector authorities.</p>
          </div>
          <select value={filterCountry} onChange={e => setFilterCountry(e.target.value)} className="input-field text-xs !py-1.5">
            <option value="">All countries</option>
            {countries.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="p-2 rounded-lg bg-secondary hover:bg-accent/10 transition-colors">
          <Plus className="w-4 h-4 text-muted-foreground" />
        </button>
      </div>

      {showForm && (
        <div className="px-6 py-4 border-b border-border bg-secondary/30 animate-fade-in">
          <div className="grid grid-cols-2 gap-3">
            <input placeholder="Body name" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} className="input-field" />
            <input placeholder="Acronym (e.g. QCTO)" value={form.acronym} onChange={e => setForm(p => ({ ...p, acronym: e.target.value.toUpperCase() }))} className="input-field" />
            <select value={form.country_id} onChange={e => setForm(p => ({ ...p, country_id: e.target.value }))} className="input-field">
              <option value="">Select country</option>
              {countries.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <select value={form.body_type} onChange={e => setForm(p => ({ ...p, body_type: e.target.value }))} className="input-field">
              <option value="quality_assurance">Quality Assurance</option>
              <option value="sector_authority">Sector Authority</option>
              <option value="government">Government</option>
              <option value="professional_body">Professional Body</option>
            </select>
            <input placeholder="Description (optional)" value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} className="input-field col-span-2" />
            <input placeholder="Website URL (optional)" value={form.website_url} onChange={e => setForm(p => ({ ...p, website_url: e.target.value }))} className="input-field" />
            <button onClick={handleCreate} disabled={createMut.isPending} className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-accent text-accent-foreground text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50">
              {createMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              Add Body
            </button>
          </div>
        </div>
      )}

      <div className="divide-y divide-border/50">
        {bodies.map((b: any) => (
          <div key={b.id} className="px-6 py-3 flex items-center justify-between group">
            <div className="flex items-center gap-3">
              <span className="text-xs font-mono bg-accent/10 text-accent px-2 py-0.5 rounded">{b.acronym}</span>
              <div>
                <p className="text-sm font-medium text-foreground">{b.name}</p>
                <p className="text-[10px] text-muted-foreground">{b.countries?.name} · {b.body_type.replace(/_/g, " ")}</p>
              </div>
            </div>
            {deleteId === b.id ? (
              <div className="flex items-center gap-1 animate-fade-in">
                <button onClick={async () => { await deleteMut.mutateAsync(b.id); setDeleteId(null); toast.success("Removed"); }} className="p-1 rounded bg-destructive/10 text-destructive hover:bg-destructive/20"><Check className="w-3 h-3" /></button>
                <button onClick={() => setDeleteId(null)} className="p-1 rounded bg-secondary text-muted-foreground"><X className="w-3 h-3" /></button>
              </div>
            ) : (
              <button onClick={() => setDeleteId(b.id)} className="p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        ))}
        {bodies.length === 0 && <p className="px-6 py-8 text-center text-sm text-muted-foreground">No regulatory bodies configured.</p>}
      </div>
    </div>
  );
}

// ── Qualification Frameworks Panel ──
function QualificationFrameworksPanel() {
  const { data: countries = [] } = useAllCountries();
  const [filterCountry, setFilterCountry] = useState<string>("");
  const { data: frameworks = [], isLoading } = useQualificationFrameworks(filterCountry || undefined);
  const createMut = useCreateQualificationFramework();
  const deleteMut = useDeleteQualificationFramework();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", acronym: "", country_id: "", total_levels: 10, description: "", regional_alignment: "" });
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const handleCreate = async () => {
    if (!form.name || !form.acronym || !form.country_id) return;
    await createMut.mutateAsync({
      ...form,
      description: form.description || null,
      regional_alignment: form.regional_alignment || null,
    });
    setForm({ name: "", acronym: "", country_id: "", total_levels: 10, description: "", regional_alignment: "" });
    setShowForm(false);
    toast.success("Framework added");
  };

  if (isLoading) return <LoadingState />;

  return (
    <div className="bg-card rounded-xl shadow-card border border-border/50 overflow-hidden">
      <div className="px-6 py-4 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div>
            <h3 className="text-sm font-semibold text-foreground">Qualification Frameworks ({frameworks.length})</h3>
            <p className="text-[11px] text-muted-foreground mt-0.5">NQF, KNQA, and equivalents.</p>
          </div>
          <select value={filterCountry} onChange={e => setFilterCountry(e.target.value)} className="input-field text-xs !py-1.5">
            <option value="">All countries</option>
            {countries.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="p-2 rounded-lg bg-secondary hover:bg-accent/10 transition-colors">
          <Plus className="w-4 h-4 text-muted-foreground" />
        </button>
      </div>

      {showForm && (
        <div className="px-6 py-4 border-b border-border bg-secondary/30 animate-fade-in">
          <div className="grid grid-cols-2 gap-3">
            <input placeholder="Framework name" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} className="input-field" />
            <input placeholder="Acronym (e.g. NQF)" value={form.acronym} onChange={e => setForm(p => ({ ...p, acronym: e.target.value.toUpperCase() }))} className="input-field" />
            <select value={form.country_id} onChange={e => setForm(p => ({ ...p, country_id: e.target.value }))} className="input-field">
              <option value="">Select country</option>
              {countries.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <input placeholder="Total levels" type="number" value={form.total_levels} onChange={e => setForm(p => ({ ...p, total_levels: parseInt(e.target.value) || 10 }))} className="input-field" />
            <input placeholder="Description (optional)" value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} className="input-field" />
            <input placeholder="Regional alignment (optional)" value={form.regional_alignment} onChange={e => setForm(p => ({ ...p, regional_alignment: e.target.value }))} className="input-field" />
            <button onClick={handleCreate} disabled={createMut.isPending} className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-accent text-accent-foreground text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50 col-span-2">
              {createMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              Add Framework
            </button>
          </div>
        </div>
      )}

      <div className="divide-y divide-border/50">
        {frameworks.map((f: any) => (
          <div key={f.id}>
            <div className="px-6 py-3 flex items-center justify-between group">
              <button onClick={() => setExpandedId(expandedId === f.id ? null : f.id)} className="flex items-center gap-3 text-left flex-1">
                <ChevronRight className={cn("w-4 h-4 text-muted-foreground transition-transform", expandedId === f.id && "rotate-90")} />
                <span className="text-xs font-mono bg-accent/10 text-accent px-2 py-0.5 rounded">{f.acronym}</span>
                <div>
                  <p className="text-sm font-medium text-foreground">{f.name}</p>
                  <p className="text-[10px] text-muted-foreground">{f.countries?.name} · {f.total_levels} levels</p>
                </div>
              </button>
              {deleteId === f.id ? (
                <div className="flex items-center gap-1 animate-fade-in">
                  <button onClick={async () => { await deleteMut.mutateAsync(f.id); setDeleteId(null); toast.success("Removed"); }} className="p-1 rounded bg-destructive/10 text-destructive hover:bg-destructive/20"><Check className="w-3 h-3" /></button>
                  <button onClick={() => setDeleteId(null)} className="p-1 rounded bg-secondary text-muted-foreground"><X className="w-3 h-3" /></button>
                </div>
              ) : (
                <button onClick={() => setDeleteId(f.id)} className="p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            {expandedId === f.id && <QualificationLevelsSubpanel frameworkId={f.id} />}
          </div>
        ))}
        {frameworks.length === 0 && <p className="px-6 py-8 text-center text-sm text-muted-foreground">No qualification frameworks configured.</p>}
      </div>
    </div>
  );
}

// ── Qualification Levels Subpanel ──
function QualificationLevelsSubpanel({ frameworkId }: { frameworkId: string }) {
  const { data: levels = [], isLoading } = useQualificationLevels(frameworkId);
  const createMut = useCreateQualificationLevel();
  const deleteMut = useDeleteQualificationLevel();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ level_number: 1, level_name: "", credit_range: "", descriptor: "" });

  const handleCreate = async () => {
    if (!form.level_name) return;
    await createMut.mutateAsync({
      framework_id: frameworkId,
      level_number: form.level_number,
      level_name: form.level_name,
      credit_range: form.credit_range || null,
      descriptor: form.descriptor || null,
    });
    setForm({ level_number: (levels.length + 2), level_name: "", credit_range: "", descriptor: "" });
    toast.success("Level added");
  };

  return (
    <div className="px-6 pb-4 pl-14 animate-fade-in">
      <div className="bg-secondary/30 rounded-lg border border-border/30 overflow-hidden">
        <div className="px-4 py-2 border-b border-border/30 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-[11px] font-semibold text-muted-foreground">Levels ({levels.length})</span>
          </div>
          <button onClick={() => setShowForm(!showForm)} className="p-1 rounded hover:bg-secondary transition-colors">
            <Plus className="w-3 h-3 text-muted-foreground" />
          </button>
        </div>
        {showForm && (
          <div className="px-4 py-3 border-b border-border/30 bg-secondary/20">
            <div className="grid grid-cols-4 gap-2">
              <input placeholder="Level #" type="number" value={form.level_number} onChange={e => setForm(p => ({ ...p, level_number: parseInt(e.target.value) || 1 }))} className="input-field text-xs" />
              <input placeholder="Level name" value={form.level_name} onChange={e => setForm(p => ({ ...p, level_name: e.target.value }))} className="input-field text-xs" />
              <input placeholder="Credits" value={form.credit_range} onChange={e => setForm(p => ({ ...p, credit_range: e.target.value }))} className="input-field text-xs" />
              <button onClick={handleCreate} disabled={createMut.isPending} className="px-3 py-1.5 rounded-lg bg-accent text-accent-foreground text-xs font-medium hover:opacity-90 disabled:opacity-50">
                {createMut.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : "Add"}
              </button>
            </div>
          </div>
        )}
        {isLoading ? (
          <div className="p-4 flex justify-center"><Loader2 className="w-4 h-4 animate-spin text-muted-foreground" /></div>
        ) : levels.length === 0 ? (
          <p className="px-4 py-3 text-[11px] text-muted-foreground text-center">No levels defined.</p>
        ) : (
          <div className="divide-y divide-border/20">
            {levels.map(l => (
              <div key={l.id} className="px-4 py-2 flex items-center justify-between group">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-mono text-accent w-6">{l.level_number}</span>
                  <span className="text-xs text-foreground">{l.level_name}</span>
                  {l.credit_range && <span className="text-[10px] text-muted-foreground">({l.credit_range})</span>}
                </div>
                <button onClick={async () => { await deleteMut.mutateAsync(l.id); toast.success("Level removed"); }} className="p-1 rounded opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all">
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="flex items-center justify-center h-32">
      <Loader2 className="w-5 h-5 animate-spin text-accent" />
    </div>
  );
}
