import { useState, useEffect, useRef } from "react";
import api from "./services/api";

/* ─── GLOBAL CSS ──────────────────────────────────────────────────────────── */
const GS = () => (
  <style>{`
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:-apple-system,BlinkMacSystemFont,'Inter',sans-serif;background:#f8fafc;color:#0f172a}
    .app{display:flex;min-height:100vh}
    .sidebar{width:230px;min-height:100vh;background:#fff;border-right:1px solid #e2e8f0;display:flex;flex-direction:column;position:sticky;top:0;flex-shrink:0}
    .main{flex:1;overflow-y:auto;min-width:0;background:#f8fafc}
    .page{padding:2rem;max-width:1100px}
    .nav-btn{width:100%;display:flex;align-items:center;gap:9px;padding:9px 14px;border-radius:8px;border:none;cursor:pointer;background:transparent;color:#475569;font-size:13px;font-weight:400;margin-bottom:3px;transition:all .15s;text-align:left;font-family:inherit}
    .nav-btn:hover{background:#f1f5f9;color:#0f172a}
    .nav-btn.active{background:#eff6ff;color:#2563eb;font-weight:600}
    .card{background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:1.25rem}
    .g2{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:1rem}
    .g3{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:1rem}
    .g4{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:.75rem}
    .btn{display:inline-flex;align-items:center;gap:6px;padding:9px 18px;border-radius:8px;border:1px solid #e2e8f0;background:#fff;color:#0f172a;cursor:pointer;font-size:13px;font-weight:500;transition:all .15s;font-family:inherit;white-space:nowrap}
    .btn:hover{background:#f8fafc}
    .btn:disabled{opacity:.5;cursor:not-allowed;pointer-events:none}
    .btn-primary{background:#2563eb;color:#fff;border-color:#2563eb}
    .btn-primary:hover{background:#1d4ed8}
    .btn-sm{padding:6px 13px;font-size:12px}
    input,textarea,select{width:100%;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:10px 13px;color:#0f172a;font-size:14px;font-family:inherit;outline:none;resize:vertical;transition:border-color .15s}
    input:focus,textarea:focus,select:focus{border-color:#2563eb;background:#fff}
    label.lbl{display:block;font-size:13px;font-weight:500;color:#374151;margin-bottom:5px}
    .badge{display:inline-flex;align-items:center;padding:2px 9px;border-radius:20px;font-size:11px;font-weight:600}
    .b-ok{background:#dcfce7;color:#16a34a}
    .b-warn{background:#fef9c3;color:#ca8a04}
    .b-bad{background:#fee2e2;color:#dc2626}
    .b-blue{background:#dbeafe;color:#2563eb}
    .b-gray{background:#f1f5f9;color:#64748b}
    .err-box{padding:10px 14px;background:#fef2f2;border:1px solid #fecaca;border-radius:8px;font-size:13px;color:#dc2626}
    .info-box{padding:12px 16px;background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;font-size:13px;color:#1d4ed8}
    @keyframes spin{to{transform:rotate(360deg)}}
    @keyframes fadeUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
    @keyframes scan{0%{top:0}100%{top:110%}}
    .fade-up{animation:fadeUp .3s ease both}
    .spinner-el{width:14px;height:14px;border:2px solid currentColor;border-top-color:transparent;border-radius:50%;animation:spin .7s linear infinite;opacity:.7;display:inline-block;flex-shrink:0}
    .score-bar-fill{height:100%;border-radius:3px;transition:width .9s cubic-bezier(.34,1.4,.64,1)}
    ::-webkit-scrollbar{width:5px}
    ::-webkit-scrollbar-track{background:transparent}
    ::-webkit-scrollbar-thumb{background:#e2e8f0;border-radius:3px}
    table{width:100%;border-collapse:collapse;font-size:13px}
    th{text-align:left;padding:8px 12px;font-size:11px;font-weight:600;color:#64748b;text-transform:uppercase;letter-spacing:.05em;border-bottom:1px solid #e2e8f0}
    td{padding:10px 12px;border-bottom:1px solid #f1f5f9;color:#0f172a}
    tr:last-child td{border-bottom:none}
    tr:hover td{background:#f8fafc}
    @media print{.no-print{display:none!important}}
  `}</style>
);

/* ─── HELPERS ─────────────────────────────────────────────────────────────── */
const sColor = (s) => s >= 75 ? "#16a34a" : s >= 50 ? "#ca8a04" : "#dc2626";
const sBadge = (s) => s >= 75 ? "b-ok" : s >= 50 ? "b-warn" : "b-bad";
const sBg    = (s) => s >= 75 ? "#dcfce7" : s >= 50 ? "#fef9c3" : "#fee2e2";
const grade  = (s) => s>=90?"A+":s>=80?"A":s>=70?"B+":s>=60?"B":s>=50?"C":"D";

const getToken = () => localStorage.getItem("iq_access_token");

/* ─── BASE COMPONENTS ─────────────────────────────────────────────────────── */
const Spin = () => <span className="spinner-el" />;

function Field({ label, type = "text", value, onChange, placeholder, rows }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
      {label && <label className="lbl">{label}</label>}
      {rows
        ? <textarea value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} rows={rows} />
        : <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} />
      }
    </div>
  );
}

/* ─── ATS GAUGE ───────────────────────────────────────────────────────────── */
function ATSGauge({ score = 0, size = 190 }) {
  const [d, setD] = useState(0);
  useEffect(() => {
    setD(0);
    const t = setTimeout(() => {
      let v = 0;
      const go = () => { v = Math.min(v + Math.max(1, Math.ceil(score / 35)), score); setD(v); if (v < score) requestAnimationFrame(go); };
      requestAnimationFrame(go);
    }, 350);
    return () => clearTimeout(t);
  }, [score]);

  const R = size * 0.365, cx = size / 2, cy = size * 0.53;
  const xy = (deg) => { const r = (deg - 90) * Math.PI / 180; return [cx + R * Math.cos(r), cy + R * Math.sin(r)]; };
  const [sx, sy] = xy(225), [ex, ey] = xy(495);
  const fd = 270 * d / 100;
  const [fx, fy] = xy(225 + fd);
  const col = sColor(d);

  return (
    <svg width={size} height={size * 0.85} style={{ overflow: "visible", display: "block", margin: "0 auto" }}>
      <path d={`M${sx},${sy} A${R},${R} 0 1,1 ${ex},${ey}`} fill="none" stroke="#e2e8f0" strokeWidth={9} strokeLinecap="round" />
      {d > 0 && <path d={`M${sx},${sy} A${R},${R} 0 ${fd > 180 ? 1 : 0},1 ${fx},${fy}`} fill="none" stroke={col} strokeWidth={9} strokeLinecap="round" />}
      {d > 0 && <circle cx={fx} cy={fy} r={5} fill={col} />}
      <text x={cx} y={cy + 8} textAnchor="middle" fill={col} style={{ fontSize: size * 0.2, fontWeight: 700, fontFamily: "monospace" }}>{d}</text>
      <text x={cx} y={cy + 26} textAnchor="middle" fill="#94a3b8" style={{ fontSize: 11, letterSpacing: 2 }}>ATS SCORE</text>
      <text x={cx} y={cy - R + 4} textAnchor="middle" fill={col} style={{ fontSize: 14, fontWeight: 600 }}>Grade {grade(d)}</text>
    </svg>
  );
}

function ScoreBar({ label, value }) {
  const [w, setW] = useState(0);
  useEffect(() => { const t = setTimeout(() => setW(value), 250); return () => clearTimeout(t); }, [value]);
  const col = sColor(value);
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
        <span style={{ fontSize: 13, color: "#64748b" }}>{label}</span>
        <span style={{ fontSize: 13, fontWeight: 600, color: col }}>{value}%</span>
      </div>
      <div style={{ height: 5, background: "#f1f5f9", borderRadius: 3 }}>
        <div className="score-bar-fill" style={{ width: `${w}%`, background: col }} />
      </div>
    </div>
  );
}

/* ─── SIDEBAR ─────────────────────────────────────────────────────────────── */
const NAV = [
  { id: "dashboard", icon: "⊞", label: "Dashboard" },
  { id: "analyze",   icon: "◎", label: "Analyze Resume" },
  { id: "rewrite",   icon: "✦", label: "AI Rewrite" },
  { id: "interview", icon: "◈", label: "Interview Prep" },
  { id: "history",   icon: "◷", label: "History" },
  { id: "admin",     icon: "⬡", label: "Admin Panel", admin: true },
  { id: "settings",  icon: "⚙", label: "Settings" },
];

function Sidebar({ view, setView, user, onLogout }) {
  return (
    <div className="sidebar no-print">
      <div style={{ padding: "20px 16px 14px", borderBottom: "1px solid #e2e8f0" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 34, height: 34, borderRadius: 9, background: "#eff6ff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>◎</div>
          <div>
            <p style={{ fontWeight: 700, fontSize: 14 }}>ResumeIQ</p>
            <p style={{ fontSize: 10, color: "#94a3b8", letterSpacing: "0.08em" }}>ATS OPTIMIZER</p>
          </div>
        </div>
      </div>
      <nav style={{ flex: 1, padding: "10px 8px" }}>
        {NAV.filter(n => !n.admin || user?.role === "admin").map(n => (
          <button key={n.id} className={`nav-btn ${view === n.id ? "active" : ""}`} onClick={() => setView(n.id)}>
            <span style={{ fontSize: 16 }}>{n.icon}</span>{n.label}
          </button>
        ))}
      </nav>
      <div style={{ padding: "12px 8px", borderTop: "1px solid #e2e8f0" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 9, padding: "8px 12px", marginBottom: 8 }}>
          <div style={{ width: 30, height: 30, borderRadius: "50%", background: "#dbeafe", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, color: "#2563eb", flexShrink: 0 }}>
            {user?.name?.[0]?.toUpperCase()}
          </div>
          <div style={{ overflow: "hidden", flex: 1 }}>
            <p style={{ fontSize: 13, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{user?.name}</p>
            <span className={`badge ${user?.plan === "enterprise" ? "b-blue" : user?.plan === "pro" ? "b-ok" : "b-gray"}`} style={{ textTransform: "capitalize" }}>{user?.plan}</span>
          </div>
        </div>
        <button className="btn btn-sm" style={{ width: "100%", justifyContent: "center" }} onClick={onLogout}>↩ Sign out</button>
      </div>
    </div>
  );
}

/* ─── AUTH ────────────────────────────────────────────────────────────────── */
function AuthView({ onAuth }) {
  const [tab, setTab] = useState("login");
  const [name, setName] = useState(""), [email, setEmail] = useState(""), [pw, setPw] = useState("");
  const [err, setErr] = useState(""), [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!email || !pw) return setErr("Please fill all fields.");
    setLoading(true); setErr("");
    try {
      const endpoint = tab === "login" ? "/api/auth/login" : "/api/auth/register";
      const payload  = tab === "login" ? { email, password: pw } : { name, email, password: pw };
      const { data } = await api.post(endpoint, payload);
      localStorage.setItem("iq_access_token",  data.access_token);
      localStorage.setItem("iq_refresh_token", data.refresh_token);
      onAuth(data.user);
    } catch (e) {
      setErr(e.response?.data?.detail || "Something went wrong. Try again.");
    }
    setLoading(false);
  };

  return (
    <div style={{ minHeight: "100vh", background: "#f8fafc", display: "flex", alignItems: "center", justifyContent: "center", padding: "2rem" }}>
      <div style={{ width: "100%", maxWidth: 400 }}>
        <div style={{ textAlign: "center", marginBottom: "2.5rem" }}>
          <div style={{ width: 56, height: 56, borderRadius: 14, background: "#eff6ff", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 1rem", fontSize: 28 }}>◎</div>
          <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 6 }}>ResumeIQ</h1>
          <p style={{ color: "#64748b", fontSize: 14 }}>AI-powered ATS resume optimizer</p>
        </div>
        <div className="card">
          <div style={{ display: "flex", background: "#f8fafc", borderRadius: 8, padding: 3, marginBottom: "1.5rem" }}>
            {[["login","Sign in"],["register","Create account"]].map(([t,l]) => (
              <button key={t} onClick={() => { setTab(t); setErr(""); }}
                style={{ flex: 1, padding: "8px", border: "none", cursor: "pointer", background: tab === t ? "#fff" : "transparent", color: tab === t ? "#0f172a" : "#64748b", borderRadius: 7, fontSize: 13, fontWeight: tab === t ? 600 : 400, fontFamily: "inherit", boxShadow: tab === t ? "0 1px 3px rgba(0,0,0,.08)" : "none", transition: "all .15s" }}>{l}</button>
            ))}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {tab === "register" && <Field label="Full name" value={name} onChange={setName} placeholder="Anish Solanki" />}
            <Field label="Email" type="email" value={email} onChange={setEmail} placeholder="you@example.com" />
            <Field label="Password" type="password" value={pw} onChange={setPw} placeholder="Min. 8 characters" />
            {err && <div className="err-box">{err}</div>}
            <button className="btn btn-primary" style={{ justifyContent: "center", padding: "10px" }} onClick={submit} disabled={loading}>
              {loading ? <Spin /> : null}
              {tab === "login" ? "Sign in" : "Create account"}
            </button>
          </div>
          <p style={{ textAlign: "center", marginTop: "1rem", fontSize: 12, color: "#94a3b8" }}>First registered user gets admin access</p>
        </div>
      </div>
    </div>
  );
}

/* ─── DASHBOARD ───────────────────────────────────────────────────────────── */
function DashboardView({ resumes, setView, user }) {
  const done = resumes.filter(r => r.analysis);
  const avg  = done.length ? Math.round(done.reduce((a,r) => a + r.analysis.ats_score, 0) / done.length) : null;
  const best = done.length ? Math.max(...done.map(r => r.analysis.ats_score)) : null;

  return (
    <div className="page fade-up">
      <div style={{ marginBottom: "1.5rem" }}>
        <h2 style={{ fontSize: 20, fontWeight: 700 }}>Welcome back, {user?.name?.split(" ")[0]} 👋</h2>
        <p style={{ color: "#64748b", fontSize: 14, marginTop: 4 }}>Your resume optimization dashboard</p>
      </div>
      <div className="g4" style={{ marginBottom: "1.25rem" }}>
        {[
          { label: "Resumes Analyzed", value: resumes.length, icon: "◎" },
          { label: "Average ATS Score", value: avg !== null ? `${avg}%` : "—", icon: "◈" },
          { label: "Best Score", value: best !== null ? `${best}%` : "—", icon: "★" },
          { label: "Interview Sets", value: resumes.filter(r => r.interview_questions).length, icon: "◷" },
        ].map(s => (
          <div key={s.label} className="card" style={{ background: "#fff" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <p style={{ fontSize: 12, color: "#64748b", marginBottom: 8 }}>{s.label}</p>
                <p style={{ fontSize: 26, fontWeight: 700, fontFamily: "monospace" }}>{s.value}</p>
              </div>
              <span style={{ fontSize: 22, opacity: .4 }}>{s.icon}</span>
            </div>
          </div>
        ))}
      </div>
      <div className="g2">
        <div className="card">
          <p style={{ fontWeight: 600, marginBottom: "1rem", fontSize: 14 }}>Quick actions</p>
          {[
            { icon: "◎", label: "Analyze new resume", view: "analyze", primary: true },
            { icon: "✦", label: "AI rewrite resume",   view: "rewrite" },
            { icon: "◈", label: "Generate interview Qs", view: "interview" },
            { icon: "◷", label: "View history",         view: "history" },
          ].map(a => (
            <button key={a.view} className={`btn ${a.primary ? "btn-primary" : ""}`} style={{ display: "flex", width: "100%", marginBottom: 8, justifyContent: "flex-start" }} onClick={() => setView(a.view)}>
              <span>{a.icon}</span> {a.label}
            </button>
          ))}
        </div>
        <div className="card">
          <p style={{ fontWeight: 600, marginBottom: "1rem", fontSize: 14 }}>Recent analyses</p>
          {resumes.length === 0
            ? <p style={{ color: "#94a3b8", fontSize: 13, textAlign: "center", padding: "2rem 0" }}>No resumes yet — analyze your first one!</p>
            : [...resumes].sort((a,b) => new Date(b.created_at) - new Date(a.created_at)).slice(0,5).map(r => (
              <div key={r.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: "1px solid #f1f5f9" }}>
                <div>
                  <p style={{ fontSize: 13, fontWeight: 600 }}>{r.name}</p>
                  <p style={{ fontSize: 11, color: "#94a3b8" }}>{new Date(r.created_at).toLocaleDateString()}</p>
                </div>
                {r.ats_score && <span className={`badge ${sBadge(r.ats_score)}`}>{r.ats_score}%</span>}
                {r.status === "analyzing" && <Spin />}
              </div>
            ))
          }
        </div>
      </div>
      <div className="info-box" style={{ marginTop: "1rem" }}>
        💡 <strong>Tip:</strong> Resumes with ATS scores above 75 are 3× more likely to pass automated screening. Target 2–3% keyword density for your role.
      </div>
    </div>
  );
}

/* ─── ANALYZE ─────────────────────────────────────────────────────────────── */
function AnalyzeView({ resumes, setResumes, user }) {
  const [text, setText]   = useState("");
  const [jd, setJd]       = useState("");
  const [name, setName]   = useState("My Resume");
  const [step, setStep]   = useState("input"); // input | loading | results
  const [result, setResult] = useState(null);
  const [err, setErr]     = useState("");
  const [resumeId, setResumeId] = useState(null);
  const fileRef = useRef();
  const pollRef = useRef();

  const handleFile = (e) => {
    const f = e.target.files[0]; if (!f) return;
    setName(f.name.replace(/\.[^/.]+$/, ""));
    new FileReader().onload = ev => setText(ev.target.result);
    const rd = new FileReader();
    rd.onload = ev => setText(ev.target.result);
    rd.readAsText(f);
  };

  const poll = async (id) => {
    try {
      const { data } = await api.get(`/api/resumes/${id}`);
      if (data.status === "done") {
        clearInterval(pollRef.current);
        setResult(data.analysis);
        const updated = [data, ...resumes.filter(r => r.id !== id)];
        setResumes(updated);
        setStep("results");
      } else if (data.status === "error") {
        clearInterval(pollRef.current);
        setErr("Analysis failed. Please try again."); setStep("input");
      }
    } catch { clearInterval(pollRef.current); setErr("Connection error."); setStep("input"); }
  };

  const run = async () => {
    if (!text.trim()) return;
    setStep("loading"); setErr("");
    try {
      const { data } = await api.post("/api/resumes/", {
        name, original_text: text, job_description: jd || null,
      });
      setResumeId(data.id);
      // Trigger analyze
      await api.post(`/api/resumes/${data.id}/analyze`);
      pollRef.current = setInterval(() => poll(data.id), 3000);
    } catch (e) {
      setErr(e.response?.data?.detail || "Failed to start analysis."); setStep("input");
    }
  };

  useEffect(() => () => clearInterval(pollRef.current), []);

  const reset = () => { setStep("input"); setResult(null); setText(""); setJd(""); setName("My Resume"); };

  if (step === "loading") return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "70vh", gap: 24 }}>
      <div style={{ position: "relative", width: 200, height: 260, border: "1px solid #e2e8f0", borderRadius: 12, overflow: "hidden", background: "#fff" }}>
        <div style={{ position: "absolute", left: 0, right: 0, height: 3, background: "linear-gradient(90deg,transparent,#2563eb,transparent)", animation: "scan 1.5s linear infinite" }} />
        <div style={{ padding: 14, fontFamily: "monospace", fontSize: 10, color: "#94a3b8", lineHeight: 1.9 }}>
          {text.slice(0, 500).split("\n").map((l, i) => <div key={i} style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{l || "\u00a0"}</div>)}
        </div>
      </div>
      <div style={{ textAlign: "center" }}>
        <p style={{ fontSize: 16, fontWeight: 600, marginBottom: 6 }}>Gemini is analyzing your resume…</p>
        <p style={{ fontSize: 13, color: "#64748b" }}>Scanning keywords · Scoring sections · Detecting gaps</p>
      </div>
    </div>
  );

  if (step === "results" && result) return (
    <div className="page fade-up">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.5rem" }}>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 700 }}>{name}</h2>
          <p style={{ color: "#64748b", fontSize: 13, marginTop: 3 }}>{new Date().toLocaleDateString()} · {jd ? "Job-targeted" : "General ATS"} analysis</p>
        </div>
        <div style={{ display: "flex", gap: 8 }} className="no-print">
          <button className="btn btn-sm" onClick={() => window.print()}>⊟ Export PDF</button>
          <button className="btn btn-sm btn-primary" onClick={reset}>+ New Analysis</button>
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "200px 1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
        <div className="card" style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
          <ATSGauge score={result.ats_score} size={185} />
          {jd && <div style={{ width: "100%", padding: "8px 12px", background: "#f8fafc", borderRadius: 8, textAlign: "center", marginTop: 8 }}>
            <p style={{ fontSize: 11, color: "#64748b" }}>Job match</p>
            <p style={{ fontSize: 22, fontWeight: 700, color: sColor(result.match_score), fontFamily: "monospace" }}>{result.match_score}%</p>
          </div>}
        </div>
        <div className="card">
          <p style={{ fontWeight: 600, fontSize: 14, marginBottom: "1rem" }}>Section Scores</p>
          {Object.entries(result.sections || {}).map(([k, v]) => (
            <ScoreBar key={k} label={k.charAt(0).toUpperCase() + k.slice(1)} value={v} />
          ))}
        </div>
        <div className="card">
          <p style={{ fontWeight: 600, fontSize: 14, marginBottom: "0.75rem" }}>Summary</p>
          <p style={{ fontSize: 13, color: "#64748b", lineHeight: 1.7, marginBottom: "1rem" }}>{result.summary}</p>
          <p style={{ fontSize: 12, color: "#16a34a", fontWeight: 600, marginBottom: 8 }}>✓ Strengths</p>
          {(result.strengths||[]).map((s,i) => <div key={i} style={{ fontSize: 12, color: "#64748b", padding: "4px 0", borderBottom: "1px solid #f1f5f9" }}>• {s}</div>)}
          {(result.red_flags||[]).length > 0 && <>
            <p style={{ fontSize: 12, color: "#dc2626", fontWeight: 600, margin: "10px 0 6px" }}>⚠ Issues</p>
            {result.red_flags.map((r,i) => <div key={i} style={{ fontSize: 12, color: "#64748b", padding: "4px 0" }}>• {r}</div>)}
          </>}
        </div>
      </div>
      <div className="g2" style={{ marginBottom: "1rem" }}>
        <div className="card">
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.75rem" }}>
            <p style={{ fontWeight: 600, fontSize: 14 }}>Keywords Found</p>
            <span className="badge b-ok">{(result.keywords?.found||[]).length}</span>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {(result.keywords?.found||[]).map((k,i) => <span key={i} className="badge b-ok">{k}</span>)}
          </div>
        </div>
        <div className="card">
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.75rem" }}>
            <p style={{ fontWeight: 600, fontSize: 14 }}>Missing Keywords</p>
            <span className="badge b-bad">{(result.keywords?.missing||[]).length}</span>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {(result.keywords?.missing||[]).map((k,i) => <span key={i} className="badge b-bad">{k}</span>)}
          </div>
        </div>
      </div>
      <div className="g2">
        <div className="card">
          <p style={{ fontWeight: 600, fontSize: 14, marginBottom: "0.75rem" }}>Skills Analysis</p>
          {[["Technical", result.skills?.technical||[], "b-blue"], ["Soft Skills", result.skills?.soft||[], "b-gray"], ["Missing", result.skills?.missing||[], "b-warn"]].map(([lbl,items,cls]) => items.length > 0 && (
            <div key={lbl} style={{ marginBottom: "0.75rem" }}>
              <p style={{ fontSize: 12, fontWeight: 600, color: "#64748b", marginBottom: 6 }}>{lbl}</p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                {items.map((s,i) => <span key={i} className={`badge ${cls}`}>{s}</span>)}
              </div>
            </div>
          ))}
        </div>
        <div className="card">
          <p style={{ fontWeight: 600, fontSize: 14, marginBottom: "0.75rem" }}>AI Recommendations</p>
          {(result.suggestions||[]).map((s,i) => (
            <div key={i} style={{ display: "flex", gap: 10, padding: "9px 0", borderBottom: "1px solid #f1f5f9" }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: "#2563eb", flexShrink: 0, marginTop: 1 }}>{i+1}.</span>
              <p style={{ fontSize: 13, color: "#475569", lineHeight: 1.6 }}>{s}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <div className="page fade-up" style={{ maxWidth: 860 }}>
      <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 6 }}>Analyze Resume</h2>
      <p style={{ color: "#64748b", fontSize: 14, marginBottom: "1.5rem" }}>Powered by Google Gemini · Paste resume + optional job description for targeted scoring</p>
      <div className="g2" style={{ marginBottom: "1rem" }}>
        <Field label="Resume name" value={name} onChange={setName} placeholder="e.g. Software Engineer v2" />
        <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
          <label className="lbl">Upload .txt / .md (optional)</label>
          <label style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "10px", border: "1px dashed #e2e8f0", borderRadius: 8, cursor: "pointer", fontSize: 13, color: "#64748b" }}>
            ↑ {text ? "File loaded ✓" : "Click to upload"}
            <input ref={fileRef} type="file" accept=".txt,.md" onChange={handleFile} style={{ display: "none" }} />
          </label>
        </div>
      </div>
      <div className="g2" style={{ marginBottom: "1.25rem" }}>
        <Field label="Resume text" rows={14} value={text} onChange={setText} placeholder={"Paste your full resume here...\n\nJohn Smith\njohn@example.com\n\nEXPERIENCE\nSoftware Engineer...\n\nSKILLS\nPython, React, ML..."} />
        <Field label="Job description (optional — for targeted scoring)" rows={14} value={jd} onChange={setJd} placeholder="Paste job description here for keyword matching and targeted ATS score..." />
      </div>
      {err && <div className="err-box" style={{ marginBottom: "1rem" }}>{err}</div>}
      <div style={{ display: "flex", gap: 10 }}>
        <button className="btn btn-primary" onClick={run} disabled={!text.trim()} style={{ padding: "10px 28px" }}>
          ◎ Analyze with Gemini
        </button>
        <button className="btn" onClick={() => { setText("Anish Solanki\nanishsolanki572@gmail.com | LinkedIn | GitHub: TheAnishSolankii\n\nSUMMARY\nB.Tech student in AI & Data Science with strong C++ DSA background and hands-on ML/Python projects. Built production-grade AI tools including GitHub Code Review Bot (FastAPI + GPT-4).\n\nEDUCATION\nB.Tech AI & Data Science — Indraprastha University (2023–2027)\n\nEXPERIENCE\nGitHub AI Code Review Bot (Personal Project, 2024)\n• Built FastAPI-based bot with 6 static analyzers + GPT-4 integration\n• 125 passing tests, Redis caching, Prometheus monitoring, CI/CD pipeline\n• 95 files, ~5,297 lines of Python\n\nSKILLS\nPython, C++, FastAPI, React, Machine Learning, Deep Learning, NLP, PyTorch, SQL, Docker, Git"); setName("Anish Solanki — AI Intern"); }}>Try Demo Resume</button>
      </div>
    </div>
  );
}

/* ─── AI REWRITE ──────────────────────────────────────────────────────────── */
function RewriteView({ resumes, setResumes }) {
  const [selId, setSelId]     = useState(resumes[0]?.id || "");
  const [jd, setJd]           = useState("");
  const [rewritten, setRewritten] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr]         = useState("");
  const resume = resumes.find(r => r.id === Number(selId)) || resumes[0];

  const run = async () => {
    if (!resume) return;
    setLoading(true); setErr(""); setRewritten("");
    try {
      const { data } = await api.post(`/api/resumes/${resume.id}/rewrite`, {
        resume_id: resume.id, job_description: jd || null,
      });
      setRewritten(data.rewritten_text || "");
      const updated = resumes.map(r => r.id === data.id ? data : r);
      setResumes(updated);
    } catch (e) { setErr(e.response?.data?.detail || "Rewrite failed."); }
    setLoading(false);
  };

  return (
    <div className="page fade-up">
      <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 6 }}>AI Resume Rewriter</h2>
      <p style={{ color: "#64748b", fontSize: 14, marginBottom: "1.5rem" }}>Gemini rewrites your resume to maximize ATS performance</p>
      {resumes.length === 0
        ? <div className="card" style={{ textAlign: "center", padding: "3rem", color: "#94a3b8" }}>Analyze a resume first, then come back to rewrite it.</div>
        : <>
          <div className="g2" style={{ marginBottom: "1.25rem" }}>
            <div><label className="lbl">Select resume</label>
              <select value={selId} onChange={e => { setSelId(e.target.value); setRewritten(""); }}>
                {resumes.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
            </div>
            <Field label="Target job / role (optional)" value={jd} onChange={setJd} placeholder="e.g. ML Engineer at Google DeepMind" />
          </div>
          <div style={{ display: "flex", gap: 10, marginBottom: "1.5rem", alignItems: "center" }}>
            <button className="btn btn-primary" onClick={run} disabled={loading || !resume}>
              {loading ? <Spin /> : "✦"} {loading ? "Rewriting…" : "Rewrite with Gemini"}
            </button>
            {rewritten && <button className="btn" onClick={() => navigator.clipboard.writeText(rewritten)}>⊟ Copy</button>}
            {resume?.ats_score && <span className={`badge ${sBadge(resume.ats_score)}`}>Current: {resume.ats_score}%</span>}
          </div>
          {err && <div className="err-box" style={{ marginBottom: "1rem" }}>{err}</div>}
          <div className="g2">
            <div className="card">
              <p style={{ fontWeight: 600, fontSize: 14, marginBottom: "0.75rem" }}>Original</p>
              <pre style={{ whiteSpace: "pre-wrap", fontSize: 12, color: "#475569", lineHeight: 1.75, maxHeight: 520, overflow: "auto", fontFamily: "monospace" }}>{resume?.original_text}</pre>
            </div>
            <div className="card">
              <p style={{ fontWeight: 600, fontSize: 14, marginBottom: "0.75rem" }}>AI-Optimized</p>
              {loading ? <div style={{ display: "flex", alignItems: "center", gap: 10, color: "#64748b", padding: "2rem 0" }}><Spin /> Gemini is rewriting…</div>
                : rewritten ? <pre style={{ whiteSpace: "pre-wrap", fontSize: 12, color: "#475569", lineHeight: 1.75, maxHeight: 520, overflow: "auto", fontFamily: "monospace" }}>{rewritten}</pre>
                : <p style={{ color: "#94a3b8", fontSize: 13, textAlign: "center", padding: "3rem 0" }}>Click "Rewrite with Gemini" to generate</p>
              }
            </div>
          </div>
        </>
      }
    </div>
  );
}

/* ─── INTERVIEW PREP ──────────────────────────────────────────────────────── */
function InterviewView({ resumes, setResumes }) {
  const [selId, setSelId]   = useState(resumes[0]?.id || "");
  const [jd, setJd]         = useState("");
  const [qs, setQs]         = useState(null);
  const [loading, setLoading] = useState(false);
  const [open, setOpen]     = useState(null);
  const [err, setErr]       = useState("");
  const resume = resumes.find(r => r.id === Number(selId)) || resumes[0];

  const run = async () => {
    setLoading(true); setErr(""); setQs(null);
    try {
      const { data } = await api.post(`/api/resumes/${resume.id}/interview-questions`, {
        resume_id: resume.id, job_description: jd || null,
      });
      setQs(data.interview_questions);
      const updated = resumes.map(r => r.id === data.id ? data : r);
      setResumes(updated);
    } catch (e) { setErr(e.response?.data?.detail || "Generation failed."); }
    setLoading(false);
  };

  const CATS = [["behavioral","Behavioral","#2563eb"],["technical","Technical","#0891b2"],["situational","Situational","#7c3aed"],["culture_fit","Culture Fit","#059669"]];

  return (
    <div className="page fade-up">
      <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 6 }}>Interview Preparation</h2>
      <p style={{ color: "#64748b", fontSize: 14, marginBottom: "1.5rem" }}>AI-generated questions tailored to your resume and target role</p>
      {resumes.length === 0
        ? <div className="card" style={{ textAlign: "center", padding: "3rem", color: "#94a3b8" }}>Analyze a resume first to generate interview questions.</div>
        : <>
          <div className="g2" style={{ marginBottom: "1.25rem" }}>
            <div><label className="lbl">Select resume</label>
              <select value={selId} onChange={e => { setSelId(e.target.value); setQs(null); }}>
                {resumes.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
            </div>
            <Field label="Target role / job description (optional)" value={jd} onChange={setJd} placeholder="e.g. ML Research Intern at IIT Delhi" />
          </div>
          <button className="btn btn-primary" onClick={run} disabled={loading || !resume} style={{ marginBottom: "1.5rem" }}>
            {loading ? <Spin /> : "◈"} {loading ? "Generating…" : "Generate Interview Questions"}
          </button>
          {err && <div className="err-box" style={{ marginBottom: "1rem" }}>{err}</div>}
          {qs && CATS.map(([key,lbl,col]) => (
            <div key={key} style={{ marginBottom: "1.25rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: col }} />
                <p style={{ fontWeight: 600, fontSize: 14 }}>{lbl}</p>
                <span className="badge b-gray">{(qs[key]||[]).length}</span>
              </div>
              {(qs[key]||[]).map((item, i) => {
                const k = `${key}-${i}`;
                return (
                  <div key={i} className="card" style={{ marginBottom: 6, cursor: "pointer", padding: "12px 14px" }} onClick={() => setOpen(open === k ? null : k)}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                      <p style={{ fontSize: 13, lineHeight: 1.5, flex: 1 }}>
                        <span style={{ color: col, fontWeight: 700, marginRight: 8, fontFamily: "monospace" }}>Q{i+1}</span>{item.q}
                      </p>
                      <span style={{ color: "#94a3b8", flexShrink: 0 }}>{open === k ? "▲" : "▼"}</span>
                    </div>
                    {open === k && (
                      <div style={{ marginTop: 10, padding: "10px 12px", background: "#f8fafc", borderRadius: 8, borderLeft: `3px solid ${col}` }}>
                        <p style={{ fontSize: 11, fontWeight: 600, color: col, marginBottom: 4 }}>Answer tip</p>
                        <p style={{ fontSize: 13, color: "#64748b", lineHeight: 1.6 }}>{item.tip}</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </>
      }
    </div>
  );
}

/* ─── HISTORY ─────────────────────────────────────────────────────────────── */
function HistoryView({ resumes, setResumes }) {
  const remove = async (id) => {
    try { await api.delete(`/api/resumes/${id}`); setResumes(resumes.filter(r => r.id !== id)); }
    catch (e) { alert("Delete failed."); }
  };

  return (
    <div className="page fade-up">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.5rem" }}>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 700 }}>Resume History</h2>
          <p style={{ color: "#64748b", fontSize: 14, marginTop: 4 }}>{resumes.length} resume{resumes.length !== 1 ? "s" : ""} saved</p>
        </div>
      </div>
      {resumes.length === 0
        ? <div className="card" style={{ textAlign: "center", padding: "4rem", color: "#94a3b8" }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>◷</div>
            <p style={{ fontWeight: 600 }}>No history yet</p>
          </div>
        : [...resumes].sort((a,b) => new Date(b.created_at) - new Date(a.created_at)).map(r => (
          <div key={r.id} className="card" style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 10 }}>
            <div style={{ width: 52, height: 52, borderRadius: 10, background: r.ats_score ? sBg(r.ats_score) : "#f1f5f9", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700, color: r.ats_score ? sColor(r.ats_score) : "#94a3b8", fontFamily: "monospace", flexShrink: 0 }}>
              {r.status === "analyzing" ? <Spin /> : r.ats_score || "?"}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontWeight: 600, fontSize: 14 }}>{r.name}</p>
              <p style={{ fontSize: 12, color: "#94a3b8", marginTop: 2 }}>
                {new Date(r.created_at).toLocaleString()} · {r.job_description ? "Job-targeted" : "General ATS"}
                {r.interview_questions ? " · Interview Qs" : ""}
              </p>
              {r.analysis?.keywords?.found && (
                <div style={{ display: "flex", gap: 5, marginTop: 6, flexWrap: "wrap" }}>
                  {r.analysis.keywords.found.slice(0,5).map((k,i) => <span key={i} className="badge b-blue">{k}</span>)}
                  {r.analysis.keywords.found.length > 5 && <span className="badge b-gray">+{r.analysis.keywords.found.length-5}</span>}
                </div>
              )}
            </div>
            <div style={{ display: "flex", gap: 8, alignItems: "center", flexShrink: 0 }}>
              {r.grade && <div style={{ textAlign: "center" }}>
                <p style={{ fontSize: 11, color: "#94a3b8" }}>Grade</p>
                <p style={{ fontSize: 20, fontWeight: 700, color: r.ats_score ? sColor(r.ats_score) : "#94a3b8", fontFamily: "monospace" }}>{r.analysis?.grade}</p>
              </div>}
              <button className="btn btn-sm" style={{ color: "#dc2626", borderColor: "#fecaca" }} onClick={() => remove(r.id)}>✕</button>
            </div>
          </div>
        ))
      }
    </div>
  );
}

/* ─── ADMIN ───────────────────────────────────────────────────────────────── */
function AdminView() {
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  useEffect(() => {
    api.get("/api/admin/stats").then(r => setStats(r.data)).catch(() => {});
    api.get("/api/admin/users").then(r => setUsers(r.data.items || [])).catch(() => {});
  }, []);

  return (
    <div className="page fade-up">
      <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: "0.35rem" }}>Admin Panel</h2>
      <p style={{ color: "#64748b", fontSize: 14, marginBottom: "1.5rem" }}>Platform overview and user management</p>
      {stats && <div className="g4" style={{ marginBottom: "1.5rem" }}>
        {[
          { label: "Total Users", value: stats.total_users },
          { label: "Total Analyses", value: stats.total_analyses },
          { label: "Pro Users", value: stats.pro_users },
          { label: "Est. MRR", value: `$${stats.revenue_this_month}` },
        ].map(s => (
          <div key={s.label} className="card">
            <p style={{ fontSize: 12, color: "#64748b", marginBottom: 8 }}>{s.label}</p>
            <p style={{ fontSize: 26, fontWeight: 700, fontFamily: "monospace" }}>{s.value}</p>
          </div>
        ))}
      </div>}
      <div className="card">
        <p style={{ fontWeight: 600, fontSize: 14, marginBottom: "1rem" }}>Users</p>
        {users.length === 0
          ? <p style={{ color: "#94a3b8", fontSize: 13, textAlign: "center", padding: "2rem 0" }}>No users yet</p>
          : <table>
            <thead><tr>
              {["Name","Email","Role","Plan","Joined","Analyses"].map(h => <th key={h}>{h}</th>)}
            </tr></thead>
            <tbody>{users.map(u => (
              <tr key={u.id}>
                <td style={{ fontWeight: 600 }}>{u.name}</td>
                <td style={{ color: "#64748b" }}>{u.email}</td>
                <td><span className={`badge ${u.role === "admin" ? "b-bad" : "b-gray"}`}>{u.role}</span></td>
                <td><span className={`badge ${u.plan === "enterprise" ? "b-blue" : u.plan === "pro" ? "b-ok" : "b-gray"}`}>{u.plan}</span></td>
                <td style={{ color: "#94a3b8" }}>{new Date(u.created_at).toLocaleDateString()}</td>
                <td style={{ fontFamily: "monospace", color: "#2563eb" }}>{u.total_analyses}</td>
              </tr>
            ))}</tbody>
          </table>
        }
      </div>
    </div>
  );
}

/* ─── SETTINGS ────────────────────────────────────────────────────────────── */
function SettingsView({ user, setUser }) {
  const PLANS = [
    { name: "free",       label: "Free",       price: "$0",  period: "/mo", features: ["3 analyses/month","ATS score + keywords","Section scoring"] },
    { name: "pro",        label: "Pro",        price: "$19", period: "/mo", features: ["Unlimited analyses","AI resume rewriting","Interview prep","Job matching","PDF export"], popular: true },
    { name: "enterprise", label: "Enterprise", price: "$49", period: "/mo", features: ["Everything in Pro","Team seats (10)","API access","Priority support"] },
  ];
  return (
    <div className="page fade-up">
      <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: "0.35rem" }}>Settings</h2>
      <p style={{ color: "#64748b", fontSize: 14, marginBottom: "1.5rem" }}>Account and subscription</p>
      <div className="card" style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: "1.5rem" }}>
        <div style={{ width: 52, height: 52, borderRadius: "50%", background: "#dbeafe", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, fontWeight: 700, color: "#2563eb" }}>{user?.name?.[0]?.toUpperCase()}</div>
        <div>
          <p style={{ fontWeight: 700, fontSize: 15 }}>{user?.name}</p>
          <p style={{ color: "#64748b", fontSize: 13 }}>{user?.email}</p>
          <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
            <span className={`badge ${user?.plan === "enterprise" ? "b-blue" : user?.plan === "pro" ? "b-ok" : "b-gray"}`} style={{ textTransform: "capitalize" }}>{user?.plan}</span>
            <span className={`badge ${user?.role === "admin" ? "b-bad" : "b-gray"}`}>{user?.role}</span>
          </div>
        </div>
      </div>
      <p style={{ fontWeight: 600, fontSize: 15, marginBottom: "1rem" }}>Subscription</p>
      <div className="g3" style={{ marginBottom: "1.5rem" }}>
        {PLANS.map(p => (
          <div key={p.name} className="card" style={{ position: "relative", border: user?.plan === p.name ? "2px solid #2563eb" : p.popular ? "1px solid #bfdbfe" : "1px solid #e2e8f0" }}>
            {p.popular && <div style={{ position: "absolute", top: -11, left: "50%", transform: "translateX(-50%)", background: "#2563eb", color: "#fff", fontSize: 10, fontWeight: 600, padding: "3px 10px", borderRadius: 20, whiteSpace: "nowrap" }}>Most popular</div>}
            <p style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>{p.label}</p>
            <div style={{ display: "flex", alignItems: "baseline", gap: 2, marginBottom: "1rem" }}>
              <span style={{ fontSize: 26, fontWeight: 700, fontFamily: "monospace" }}>{p.price}</span>
              <span style={{ fontSize: 13, color: "#94a3b8" }}>{p.period}</span>
            </div>
            {p.features.map(f => <div key={f} style={{ display: "flex", gap: 7, padding: "5px 0", borderBottom: "1px solid #f1f5f9", fontSize: 13, color: "#64748b" }}>✓ {f}</div>)}
            <button className={`btn ${user?.plan === p.name ? "" : "btn-primary"}`} disabled={user?.plan === p.name} style={{ width: "100%", justifyContent: "center", marginTop: "1rem" }}>
              {user?.plan === p.name ? "Current plan" : `Upgrade to ${p.label}`}
            </button>
          </div>
        ))}
      </div>
      <div style={{ padding: "12px 16px", background: "#fefce8", border: "1px solid #fde68a", borderRadius: 8, fontSize: 13, color: "#92400e" }}>
        💳 <strong>Stripe integration ready.</strong> Add your Stripe keys to <code style={{ background: "rgba(0,0,0,.06)", padding: "1px 5px", borderRadius: 4 }}>.env</code> on Render to activate live payments.
      </div>
    </div>
  );
}

/* ─── APP ROOT ────────────────────────────────────────────────────────────── */
export default function App() {
  const [user, setUser]       = useState(null);
  const [view, setView]       = useState("dashboard");
  const [resumes, setResumes] = useState([]);
  const [loading, setLoading] = useState(true);

  // On mount — check if logged in
  useEffect(() => {
    const token = getToken();
    if (!token) { setLoading(false); return; }
    api.get("/api/auth/me")
      .then(r => {
        setUser(r.data);
        return api.get("/api/resumes/");
      })
      .then(r => setResumes(r.data))
      .catch(() => { localStorage.clear(); })
      .finally(() => setLoading(false));
  }, []);

  const onAuth = async (u) => {
    setUser(u);
    const { data } = await api.get("/api/resumes/");
    setResumes(data);
  };

  const onLogout = async () => {
    try { await api.post("/api/auth/logout"); } catch {}
    localStorage.clear();
    setUser(null); setResumes([]);
  };

  if (loading) return (
    <>
      <GS />
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", gap: 12, fontSize: 16, color: "#64748b" }}>
        <span className="spinner-el" style={{ width: 20, height: 20, borderWidth: 3 }} /> Loading ResumeIQ…
      </div>
    </>
  );

  if (!user) return <><GS /><AuthView onAuth={onAuth} /></>;

  const VIEWS = {
    dashboard: <DashboardView resumes={resumes} setView={setView} user={user} />,
    analyze:   <AnalyzeView   resumes={resumes} setResumes={setResumes} user={user} />,
    rewrite:   <RewriteView   resumes={resumes} setResumes={setResumes} />,
    interview: <InterviewView resumes={resumes} setResumes={setResumes} />,
    history:   <HistoryView   resumes={resumes} setResumes={setResumes} />,
    admin:     <AdminView />,
    settings:  <SettingsView  user={user} setUser={setUser} />,
  };

  return (
    <>
      <GS />
      <div className="app">
        <Sidebar view={view} setView={setView} user={user} onLogout={onLogout} />
        <main className="main">{VIEWS[view] || VIEWS.dashboard}</main>
      </div>
    </>
  );
}
