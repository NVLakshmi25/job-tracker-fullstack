import { useEffect, useMemo, useState } from "react";
import { Activity, BriefcaseBusiness, CalendarDays, ChartNoAxesCombined, CirclePlus, Search, Trash2, X } from "lucide-react";

const API_URL = (import.meta.env.VITE_API_URL || "http://localhost:8000").replace(/\/$/, "");
const STATUSES = ["Applied", "Interview", "Offer", "Rejected", "Wishlist"];
const emptyForm = { company: "", role: "", status: "Applied", location: "", job_type: "Full-time", salary_range: "", applied_date: new Date().toISOString().slice(0, 10), job_url: "", notes: "" };

function App() {
  const [applications, setApplications] = useState([]);
  const [stats, setStats] = useState({ total: 0, applied: 0, interviews: 0, offers: 0, rejected: 0 });
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All");
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadData() {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set("search", search.trim());
      if (filter !== "All") params.set("status", filter);
      const [jobsResponse, statsResponse] = await Promise.all([
        fetch(`${API_URL}/api/applications?${params}`),
        fetch(`${API_URL}/api/stats`)
      ]);
      if (!jobsResponse.ok || !statsResponse.ok) throw new Error("Could not load data from the API.");
      setApplications(await jobsResponse.json());
      setStats(await statsResponse.json());
    } catch (err) {
      setError(`${err.message} Make sure the FastAPI backend is running.`);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadData(); }, [search, filter]);

  function openNewForm() {
    setEditingId(null);
    setForm(emptyForm);
    setModalOpen(true);
  }

  function openEditForm(job) {
    setEditingId(job.id);
    setForm({ ...emptyForm, ...job, applied_date: job.applied_date });
    setModalOpen(true);
  }

  async function saveApplication(event) {
    event.preventDefault();
    setError("");
    try {
      const response = await fetch(editingId ? `${API_URL}/api/applications/${editingId}` : `${API_URL}/api/applications`, {
        method: editingId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.detail || "Unable to save application.");
      }
      setModalOpen(false);
      await loadData();
    } catch (err) { setError(err.message); }
  }

  async function removeApplication(id) {
    if (!window.confirm("Delete this application?")) return;
    try {
      const response = await fetch(`${API_URL}/api/applications/${id}`, { method: "DELETE" });
      if (!response.ok) throw new Error("Unable to delete application.");
      await loadData();
    } catch (err) { setError(err.message); }
  }

  const initials = (name) => name.split(" ").map((part) => part[0]).slice(0, 2).join("").toUpperCase();
  const visibleCount = useMemo(() => applications.length, [applications]);

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a className="brand" href="#"><span className="brand-mark">A</span><span>applytrack</span></a>
        <p className="nav-label">WORKSPACE</p>
        <a className="nav-link active" href="#"><ChartNoAxesCombined size={18} /> Overview</a>
        <a className="nav-link" href="#applications"><BriefcaseBusiness size={18} /> Applications</a>
        <div className="sidebar-bottom"><div className="avatar">L</div><div><strong>Lakshmi</strong><small>Personal workspace</small></div></div>
      </aside>

      <main className="main-content">
        <header className="topbar"><span className="breadcrumb">Workspace <b>/</b> Overview</span><span className="today"><CalendarDays size={16} /> Your career, organized</span></header>
        <section className="welcome-row">
          <div><p className="eyebrow">YOUR JOB SEARCH HQ</p><h1>Good morning, Lakshmi <span>✦</span></h1><p className="subheading">Keep your applications moving. Every step counts.</p></div>
          <button className="primary-btn" onClick={openNewForm}><CirclePlus size={18} /> Add application</button>
        </section>

        {error && <div className="error-banner">{error}</div>}

        <section className="stats-grid">
          <StatCard label="Total applications" value={stats.total} icon={<BriefcaseBusiness />} tone="blue" />
          <StatCard label="In progress" value={stats.applied + stats.interviews} icon={<Activity />} tone="purple" />
          <StatCard label="Interviews" value={stats.interviews} icon={<CalendarDays />} tone="orange" />
          <StatCard label="Offers received" value={stats.offers} icon={<ChartNoAxesCombined />} tone="green" />
        </section>

        <section className="applications-panel" id="applications">
          <div className="panel-heading"><div><h2>Recent applications</h2><p>Track every opportunity in one place.</p></div><span className="count-pill">{visibleCount} shown</span></div>
          <div className="toolbar">
            <label className="search-box"><Search size={17} /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search company or role..." /></label>
            <select value={filter} onChange={(e) => setFilter(e.target.value)} aria-label="Filter by status"><option>All</option>{STATUSES.map((s) => <option key={s}>{s}</option>)}</select>
          </div>
          <div className="table-wrap">
            <table><thead><tr><th>COMPANY / ROLE</th><th>DATE APPLIED</th><th>LOCATION</th><th>STATUS</th><th></th></tr></thead>
              <tbody>
                {loading ? <tr><td colSpan="5" className="empty-state">Loading applications...</td></tr> :
                 applications.length === 0 ? <tr><td colSpan="5" className="empty-state">No applications yet. Add your first opportunity to get started.</td></tr> :
                 applications.map((job) => <tr key={job.id}>
                   <td><div className="company-cell"><span className="company-logo">{initials(job.company)}</span><span><strong>{job.company}</strong><small>{job.role}</small></span></div></td>
                   <td>{job.applied_date}</td><td>{job.location || "—"}</td>
                   <td><span className={`status status-${job.status.toLowerCase()}`}>{job.status}</span></td>
                   <td><div className="row-actions"><button onClick={() => openEditForm(job)} className="text-action">Edit</button><button onClick={() => removeApplication(job.id)} className="icon-action" aria-label="Delete application"><Trash2 size={16} /></button></div></td>
                 </tr>)}
              </tbody>
            </table>
          </div>
        </section>
        <footer>Built to make your next opportunity easier to manage. <span>ApplyTrack · v1.0</span></footer>
      </main>

      {modalOpen && <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && setModalOpen(false)}>
        <form className="application-modal" onSubmit={saveApplication}>
          <div className="modal-heading"><div><p className="eyebrow">JOB DETAILS</p><h2>{editingId ? "Update application" : "Add an application"}</h2></div><button type="button" className="icon-action" onClick={() => setModalOpen(false)}><X /></button></div>
          <div className="form-grid">
            <Field label="Company name" required><input required maxLength="120" value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} placeholder="e.g. Google" /></Field>
            <Field label="Job title" required><input required maxLength="120" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} placeholder="e.g. Frontend Developer" /></Field>
            <Field label="Status"><select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>{STATUSES.map((s) => <option key={s}>{s}</option>)}</select></Field>
            <Field label="Date applied"><input type="date" value={form.applied_date} onChange={(e) => setForm({ ...form, applied_date: e.target.value })} /></Field>
            <Field label="Location"><input value={form.location || ""} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="e.g. Hyderabad / Remote" /></Field>
            <Field label="Employment type"><select value={form.job_type || "Full-time"} onChange={(e) => setForm({ ...form, job_type: e.target.value })}><option>Full-time</option><option>Internship</option><option>Contract</option><option>Part-time</option></select></Field>
            <Field label="Salary range"><input value={form.salary_range || ""} onChange={(e) => setForm({ ...form, salary_range: e.target.value })} placeholder="e.g. ₹4–6 LPA" /></Field>
            <Field label="Job link"><input type="url" value={form.job_url || ""} onChange={(e) => setForm({ ...form, job_url: e.target.value })} placeholder="https://..." /></Field>
            <Field label="Notes" wide><textarea rows="3" value={form.notes || ""} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Recruiter details, next steps, preparation notes..." /></Field>
          </div>
          <div className="modal-actions"><button type="button" className="secondary-btn" onClick={() => setModalOpen(false)}>Cancel</button><button className="primary-btn" type="submit">{editingId ? "Save changes" : "Save application"}</button></div>
        </form>
      </div>}
    </div>
  );
}

function StatCard({ label, value, icon, tone }) {
  return <article className="stat-card"><span className={`stat-icon ${tone}`}>{icon}</span><div><p>{label}</p><strong>{value}</strong></div><span className="stat-decoration">↗</span></article>;
}
function Field({ label, required, wide, children }) {
  return <label className={`field ${wide ? "wide" : ""}`}><span>{label}{required && " *"}</span>{children}</label>;
}

export default App;
