"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import "./globals.css";
import { ACCENTS, PortfolioData, SAMPLE_RESUME, TemplateId, emptyPortfolio } from "../lib/portfolio";
import { extractPdfText, getParseMeta, parseResumeText, parseStats } from "../lib/resumeParser";
import { generateStaticHTML } from "../lib/staticExport";
import PortfolioPreview from "../components/PortfolioPreview";

type Step = 1 | 2 | 3;

const FONTS = ["Inter", "Serif", "Mono", "Rounded"];

const TEMPLATES: { id: TemplateId; name: string; desc: string }[] = [
  { id: "aurora", name: "Aurora", desc: "Signature exec · orbs + glass timeline" },
  { id: "editorial", name: "Editorial", desc: "Magazine serif · index + pull quotes" },
  { id: "terminal", name: "Terminal", desc: "Hacker console · typed boot sequence" },
  { id: "pop", name: "Pop Studio", desc: "Playful bento · stickers + polaroids" },
];

function TemplateMini({ id, accent }: { id: TemplateId; accent: string }) {
  if (id === "aurora") return (
    <div className="tpl-mini" style={{ background: "#0a0f1f", position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", width: 44, height: 44, borderRadius: "50%", background: accent, opacity: .7, top: 6, left: 8, filter: "blur(6px)" }} />
      <div className="bar" style={{ width: "70%", background: "#fff", position: "relative" }} />
      <div className="bar" style={{ width: "90%", background: "#ffffff55", position: "relative" }} />
    </div>
  );
  if (id === "editorial") return (
    <div className="tpl-mini" style={{ background: "#faf8f4", borderBottom: "2px solid #d6cfc2" }}>
      <div style={{ fontFamily: "Georgia,serif", fontSize: 22, fontWeight: 700 }}>Ag</div>
      <div style={{ height: 2, background: accent, width: "40%", margin: "4px auto" }} />
      <div className="bar" style={{ width: "95%" }} />
      <div className="bar" style={{ width: "80%" }} />
    </div>
  );
  if (id === "terminal") return (
    <div className="tpl-mini" style={{ background: "#0a0f0d", textAlign: "left", fontFamily: "monospace", padding: 10 }}>
      <div style={{ color: "#4ade80", fontSize: 11, fontWeight: 700 }}>$ whoami_</div>
      <div style={{ color: accent, fontSize: 10 }}>$ ls ~/skills</div>
      <div style={{ color: "#5b6660", fontSize: 10 }}>▊</div>
    </div>
  );
  return (
    <div className="tpl-mini" style={{ background: "#fff7ed", borderBottom: "2px solid #1c1917" }}>
      <div style={{ display: "flex", gap: 5, justifyContent: "center", marginBottom: 6 }}>
        <div style={{ width: 20, height: 20, borderRadius: 6, background: accent, border: "2px solid #1c1917", transform: "rotate(-8deg)" }} />
        <div style={{ width: 20, height: 20, borderRadius: 10, background: "#fbbf24", border: "2px solid #1c1917", transform: "rotate(8deg)" }} />
        <div style={{ width: 20, height: 20, borderRadius: 6, background: "#22d3ee", border: "2px solid #1c1917" }} />
      </div>
      <div className="bar" style={{ width: "85%" }} />
    </div>
  );
}

export default function Home() {
  const [step, setStep] = useState<Step>(1);
  const [rawText, setRawText] = useState("");
  const [fileName, setFileName] = useState("");
  const [data, setData] = useState<PortfolioData>(() => emptyPortfolio());
  const [hasParsed, setHasParsed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [drag, setDrag] = useState(false);
  const [sideTab, setSideTab] = useState<"design" | "content" | "sections">("design");
  const [mobileView, setMobileView] = useState(false);
  const [skillInput, setSkillInput] = useState("");
  const [copied, setCopied] = useState(false);
  const [highlightInput, setHighlightInput] = useState("");
  const [linkLabel, setLinkLabel] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [deployTab, setDeployTab] = useState<"instant" | "netlify" | "vercel">("instant");
  const [token, setToken] = useState("");
  const [siteName, setSiteName] = useState("my-portfolio");
  const [deployedUrl, setDeployedUrl] = useState("");
  const [deployMsg, setDeployMsg] = useState("");
  const [deploying, setDeploying] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    if (typeof window === "undefined") return "light";
    return (localStorage.getItem("resumecoded-theme") as "light" | "dark") || "light";
  });
  const [inputTab, setInputTab] = useState<"upload" | "paste">("upload");
  const [fileError, setFileError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const uploadRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try { localStorage.setItem("resumecoded-theme", theme); } catch { /* private mode */ }
  }, [theme]);

  const html = useMemo(() => generateStaticHTML(data), [data]);
  const stats = useMemo(() => parseStats(data), [data]);
  const meta = useMemo(() => (rawText.trim() ? getParseMeta(rawText) : null), [rawText]);
  const set = (patch: Partial<PortfolioData>) => setData((d) => ({ ...d, ...patch }));
  const quality = stats.skills + stats.experience * 2 + stats.projects * 2 + stats.contacts;

  async function handleFile(f: File | undefined) {
    if (!f) return;
    setFileError("");
    if (!/\.(pdf|txt|md)$/i.test(f.name)) {
      setFileError(`"${f.name}" isn't supported — please use a PDF, TXT or MD file.`);
      return;
    }
    setFileName(f.name);
    setLoading(true);
    try {
      let text = "";
      if (f.type === "application/pdf" || f.name.toLowerCase().endsWith(".pdf")) {
        text = await extractPdfText(f);
      } else {
        text = await f.text();
      }
      if (!text.trim()) throw new Error("Empty file");
      applyParsed(text);
    } catch (e: any) {
      setFileError("Could not read that file: " + e.message);
    } finally {
      setLoading(false);
    }
  }

  function applyParsed(text: string) {
    setRawText(text);
    const parsed = parseResumeText(text);
    parsed.template = data.template;
    parsed.accent = data.accent;
    parsed.darkMode = data.darkMode;
    parsed.font = data.font;
    setData(parsed);
    setHasParsed(true);
    setStep(2);
  }

  function handleTextGenerate() {
    if (!rawText.trim()) return alert("Paste your resume text first — or try the sample resume.");
    applyParsed(rawText);
  }

  function loadSample() {
    setFileName("sample-resume.txt");
    applyParsed(SAMPLE_RESUME);
  }

  function previewTemplate(id: TemplateId) {
    const parsed = parseResumeText(SAMPLE_RESUME);
    parsed.template = id;
    parsed.accent = data.accent;
    if (id === "terminal") parsed.darkMode = true;
    setRawText(SAMPLE_RESUME);
    setFileName("sample-resume.txt");
    setData(parsed);
    setHasParsed(true);
    setStep(2);
  }

  async function downloadZip() {
    const { default: JSZip } = await import("jszip");
    const zip = new JSZip();
    zip.file("index.html", html);
    zip.file("README.md", `# ${data.name} — Portfolio\n\nBuilt with ResumeCoded.\n\nDeploy: drag index.html to https://app.netlify.com/drop\n`);
    const blob = await zip.generateAsync({ type: "blob" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${siteName || "portfolio"}.zip`;
    a.click();
  }
  function downloadHTML() {
    const blob = new Blob([html], { type: "text/html" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "index.html";
    a.click();
  }

  async function deployToNetlify() {
    if (!token.trim()) return alert("Paste a Netlify token first (User settings → Applications → New access token).");
    setDeploying(true); setDeployMsg("Deploying to Netlify…");
    try {
      const res = await fetch("/api/deploy/netlify", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ html, siteName, token, title: `${data.name} — Portfolio` }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || "Deploy failed");
      setDeployedUrl(j.url); setDeployMsg("Deployed successfully! 🎉");
    } catch (e: any) { setDeployMsg("Deploy failed: " + e.message); }
    finally { setDeploying(false); }
  }
  async function deployToVercel() {
    if (!token.trim()) return alert("Paste a Vercel token first (vercel.com/account/tokens).");
    setDeploying(true); setDeployMsg("Deploying to Vercel…");
    try {
      const res = await fetch("/api/deploy/vercel", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ html, siteName, token }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || "Deploy failed");
      setDeployedUrl(j.url); setDeployMsg("Deployed successfully! 🎉");
    } catch (e: any) { setDeployMsg("Deploy failed: " + e.message); }
    finally { setDeploying(false); }
  }

  return (
    <>
      <div className="nav">
        <div className="nav-inner">
          <div className="brand">
            <div className="brand-mark">&lt;/&gt;</div>
            <div>ResumeCoded<small>resume → portfolio</small></div>
          </div>
          <div className="nav-actions">
          <div className="stepper">
            <div className={`stp ${step === 1 ? "active" : "done"}`} onClick={() => setStep(1)}><span className="n">{hasParsed ? "✓" : "1"}</span><span className="lbl">Upload</span></div>
            <div className="stp-line" />
            <div className={`stp ${step === 2 ? "active" : step === 3 ? "done" : ""}`} onClick={() => hasParsed && setStep(2)}><span className="n">{step === 3 ? "✓" : "2"}</span><span className="lbl">Customize</span></div>
            <div className="stp-line" />
            <div className={`stp ${step === 3 ? "active" : ""}`} onClick={() => hasParsed && setStep(3)}><span className="n">3</span><span className="lbl">Deploy</span></div>
          </div>
          <button className="theme-btn" onClick={() => setTheme(theme === "light" ? "dark" : "light")} title={theme === "light" ? "Switch to dark theme" : "Switch to light theme"} aria-label="Toggle color theme">
            {theme === "light" ? "🌙" : "☀️"}
          </button>
          </div>
        </div>
      </div>

      <div className="container">
        {step === 1 && (
          <>
            <div className="landing-hero">
              <div className="l-orb l-orb1" />
              <div className="l-orb l-orb2" />
              <div className="announce"><span className="pulse-dot" /> 4 portfolio designs · exec, magazine, terminal & pop</div>
              <h1>Resume in.<br /><span className="grad">Portfolio out.</span></h1>
              <p className="lede">Drop your PDF and get a polished portfolio website — parsed, themed, and ready to deploy with a live URL. No sign-up, no API keys.</p>
              <div className="hero-cta">
                <button className="btn primary auto" onClick={() => uploadRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}>Upload your resume →</button>
                <button className="btn soft auto" onClick={loadSample}>See a live sample</button>
              </div>
              <div className="trust-row"><span>✓ No sign-up</span><span>✓ Private in-browser parsing</span><span>✓ Free deploy path</span></div>
            </div>

            <div className="steps-strip">
              <div className="step-item"><span className="step-n">1</span><div><b>Upload</b><p>PDF or pasted text</p></div></div>
              <div className="step-arrow">→</div>
              <div className="step-item"><span className="step-n">2</span><div><b>Customize</b><p>Pick a design, edit everything</p></div></div>
              <div className="step-arrow">→</div>
              <div className="step-item"><span className="step-n">3</span><div><b>Deploy</b><p>Get a live shareable URL</p></div></div>
            </div>

            <div className="grid2" ref={uploadRef} style={{ scrollMarginTop: 90 }}>
              <div className="card upload-card">
                <div className="card-head">
                  <div><h3>Get started — add your resume</h3><p className="card-sub">Pick whichever is easiest. Files parse instantly on drop.</p></div>
                  {fileName && <span className="badge green">✓ loaded</span>}
                </div>
                <div className="seg input-tabs">
                  <div className={inputTab === "upload" ? "active" : ""} onClick={() => setInputTab("upload")}>📄 Upload file</div>
                  <div className={inputTab === "paste" ? "active" : ""} onClick={() => setInputTab("paste")}>📋 Paste text</div>
                </div>

                {inputTab === "upload" ? (
                  <>
                    <div
                      className={`drop ${drag ? "drag" : ""}`}
                      style={{ marginTop: 12 }}
                      onClick={() => fileRef.current?.click()}
                      onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
                      onDragLeave={() => setDrag(false)}
                      onDrop={(e) => { e.preventDefault(); setDrag(false); handleFile(e.dataTransfer.files?.[0]); }}
                    >
                      <div className="drop-icon">{loading ? "⏳" : "📄"}</div>
                      <strong>{loading ? "Reading your PDF…" : drag ? "Drop it!" : "Drag & drop your resume here"}</strong>
                      <div className="hint">or click to browse · max ~8 pages</div>
                      <div className="fmt-row"><span>PDF</span><span>TXT</span><span>MD</span></div>
                    </div>
                    <input ref={fileRef} type="file" accept=".pdf,.txt,.md" hidden onChange={(e) => handleFile(e.target.files?.[0] ?? undefined)} />
                    {fileName && <div className="file-chip">📎 {fileName}<button className="mini" onClick={() => { setFileName(""); setRawText(""); }}>clear</button></div>}
                    {fileError && <div className="field-error">⚠ {fileError}</div>}
                    <div className="next-hint"><span className="ok-ic">→</span><span>Dropping a file parses it immediately and takes you to customization.</span></div>
                  </>
                ) : (
                  <>
                    <label className="lbl" style={{ marginTop: 12 }}>Paste resume text</label>
                    <textarea rows={9} value={rawText} onChange={(e) => { setRawText(e.target.value); setFileError(""); }} placeholder={"Paste here… e.g.\n\nAarav Mehta\nFrontend Developer | Mumbai\n...\nSKILLS\nReact, TypeScript…"} />
                    <div className="hint">{rawText.length ? `${rawText.length} characters · ${rawText.split("\n").length} lines` : "Tip: open your PDF, Select All → Copy → Paste here if upload fails."}</div>
                    {fileError && <div className="field-error">⚠ {fileError}</div>}
                    <button className="btn primary" onClick={handleTextGenerate} disabled={loading || !rawText.trim()}>
                      {loading ? "Parsing…" : "✨ Generate portfolio →"}
                    </button>
                  </>
                )}

                <div className="or-divider"><span>or</span></div>
                <button className="btn soft" onClick={loadSample}>✨ No resume handy? Try a sample</button>

                {rawText.length > 50 && (
                  <details className="raw">
                    <summary>🔍 View extracted text ({rawText.split("\n").length} lines) — check this first if anything misparses</summary>
                    <div style={{ display: "flex", gap: 8, margin: "10px 0" }}>
                      <button className="mini" style={{ background: "#1e293b", color: "#e2e8f0", borderColor: "#334155" }} onClick={(e) => { e.preventDefault(); navigator.clipboard.writeText(rawText); setCopied(true); setTimeout(() => setCopied(false), 2000); }}>{copied ? "✓ Copied!" : "⧉ Copy all text"}</button>
                      <span className="hint" style={{ color: "#7d8a9e", margin: 0 }}>If parsing looks wrong, send this text to the developer.</span>
                    </div>
                    <div className="raw-lines">
                      {rawText.slice(0, 6000).split("\n").map((l, i) => (
                        <div key={i} className="raw-line"><span className="raw-no">{i + 1}</span><span>{l || " "}</span></div>
                      ))}
                    </div>
                    {rawText.length > 6000 && <div className="hint" style={{ color: "#7d8a9e" }}>…(truncated)</div>}
                  </details>
                )}
              </div>

              <div>
                <div className="card showcase-card">
                  <div className="card-head"><div><h3>Pick a vibe — try it live</h3><p className="card-sub">Click any design to open it instantly with sample data.</p></div></div>
                  <div className="show-grid">
                    {TEMPLATES.map((t) => (
                      <div key={t.id} className="show-tile" onClick={() => previewTemplate(t.id)}>
                        <TemplateMini id={t.id} accent={data.accent} />
                        <div className="show-meta"><b>{t.name}</b><p>{t.desc}</p></div>
                        <span className="show-go">Try →</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="card tips-card">
                  <b>PDF tips for best results</b>
                  <div className="hint" style={{ color: "#a5b4fc" }}>
                    • Export as <b style={{ color: "#fff" }}>text PDF</b>, not scanned images<br />
                    • Use standard headers: Experience, Skills, Projects, Education<br />
                    • If parsing looks off, paste the text manually — then fix anything in the editor
                  </div>
                </div>
              </div>
            </div>

            <div className="feat-grid">
              <div className="feat-card"><div className="feat-ic">🔒</div><b>Private by design</b><p>Your resume never leaves the browser until you hit deploy. No accounts, no uploads, no tracking.</p></div>
              <div className="feat-card"><div className="feat-ic">🧠</div><b>Reads real resumes</b><p>Two-column layouts, ALL-CAPS headers, obfuscated emails, split role/date lines, coursework, awards — understood.</p></div>
              <div className="feat-card"><div className="feat-ic">🎨</div><b>4 distinct designs</b><p>Exec, magazine, terminal and pop — each with its own layout, type and mood. Every word editable.</p></div>
              <div className="feat-card"><div className="feat-ic">🚀</div><b>Live URL in minutes</b><p>Download a single fast HTML file, or deploy straight to Netlify / Vercel and share the link.</p></div>
            </div>
          </>
        )}

        {step === 2 && (
          <div className="grid2">
            <div className="card" style={{ maxHeight: "86vh", overflow: "auto" }}>
              <div className="card-head">
                <div><h3>Customize your site</h3><p className="card-sub">Everything updates live →</p></div>
                <span className={`badge ${quality > 8 ? "green" : "amber"}`}>{quality > 8 ? "✓ looks great" : "⚠ review fields"}</span>
              </div>
              <div className="stat-row">
                <div className="stat"><b>{stats.skills}</b><span>skills</span></div>
                <div className="stat"><b>{stats.experience}</b><span>jobs</span></div>
                <div className="stat"><b>{stats.projects}</b><span>projects</span></div>
                <div className="stat"><b>{stats.education}</b><span>edu</span></div>
                <div className="stat"><b>{stats.contacts}</b><span>contacts</span></div>
              </div>

              <div className="side-tabs" style={{ marginTop: 14 }}>
                {(["design", "content", "sections"] as const).map((t) => (
                  <div key={t} className={`side-tab ${sideTab === t ? "active" : ""}`} onClick={() => setSideTab(t)} style={{ textTransform: "capitalize" }}>{t === "design" ? "🎨 Design" : t === "content" ? "✏️ Content" : "🧩 Sections"}</div>
                ))}
              </div>

              {sideTab === "design" && (
                <>
                  <label className="lbl">Template — 4 wildly different designs</label>
                  <div className="tpl-grid">
                    {TEMPLATES.map((t) => (
                      <div key={t.id} className={`tpl-card ${data.template === t.id ? "active" : ""}`} onClick={() => set({ template: t.id })}>
                        <TemplateMini id={t.id} accent={data.accent} />
                        <div className="tpl-name">{t.name}{data.template === t.id ? " ✓" : ""}</div>
                        <div style={{ fontSize: 11, color: "var(--muted)", textAlign: "center", padding: "0 6px 8px" }}>{t.desc}</div>
                      </div>
                    ))}
                  </div>
                  <label className="lbl">Accent color</label>
                  <div className="swatches">
                    {ACCENTS.map((a) => (
                      <div key={a.value} title={a.name} className={`sw ${data.accent === a.value ? "active" : ""}`} style={{ background: a.value }} onClick={() => set({ accent: a.value })} />
                    ))}
                    <input type="color" value={data.accent} onChange={(e) => set({ accent: e.target.value })} style={{ width: 34, height: 34, border: "none", background: "none", cursor: "pointer" }} />
                  </div>
                  <div className="row2" style={{ marginTop: 12 }}>
                    <div><label className="lbl">Theme</label>
                      <div className="seg">
                        <div className={!data.darkMode ? "active" : ""} onClick={() => set({ darkMode: false })}>☀️ Light</div>
                        <div className={data.darkMode ? "active" : ""} onClick={() => set({ darkMode: true })}>🌙 Dark</div>
                      </div>
                    </div>
                    <div><label className="lbl">Font</label>
                      <select value={data.font} onChange={(e) => set({ font: e.target.value })}>
                        {FONTS.map((f) => <option key={f}>{f}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="hint">Aurora adapts to light/dark. Terminal is always a dark console. Editorial & Pop bring their own paper.</div>
                </>
              )}

              {sideTab === "sections" && (
                <>
                  <label className="lbl">Visible sections</label>
                  {(Object.keys(data.showSections) as (keyof typeof data.showSections)[]).map((k) => (
                    <div key={k} className="toggle">
                      <span style={{ textTransform: "capitalize" }}>{k === "contact" ? "📬 Contact" : k === "skills" ? "⚡ Skills" : k === "experience" ? "💼 Experience" : k === "projects" ? "🚀 Projects" : k === "highlights" ? "🏆 Awards & extras" : "🎓 Education"}</span>
                      <div className={`switch ${data.showSections[k] ? "on" : ""}`} onClick={() => set({ showSections: { ...data.showSections, [k]: !data.showSections[k] } })} />
                    </div>
                  ))}
                  <div className="hint">Hidden sections are kept (not deleted) — toggle back anytime.</div>
                </>
              )}

              {sideTab === "content" && (
                <>
                  {meta && (
                    <div style={{ background: "#f8fafc", border: "1px solid var(--border)", borderRadius: 13, padding: "12px 14px", marginBottom: 4 }}>
                      <div style={{ fontSize: 12, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".06em", color: "var(--muted)", marginBottom: 6 }}>🔍 Parsing report — {meta.totalLines} lines read</div>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                        {meta.sections.length === 0 && <span className="hint">No section headers found — check the fields below.</span>}
                        {meta.sections.map((s) => (
                          <span key={s.key} className="badge" style={{ textTransform: "capitalize" }}>{s.key} · {s.lines}</span>
                        ))}
                      </div>
                    </div>
                  )}
                  <label className="lbl">Basics</label>
                  <input type="text" value={data.name} onChange={(e) => set({ name: e.target.value })} placeholder="Full name" style={{ marginBottom: 8 }} />
                  <input type="text" value={data.title} onChange={(e) => set({ title: e.target.value })} placeholder="Headline — e.g. Frontend Developer" style={{ marginBottom: 8 }} />
                  <div className="row2">
                    <input type="text" value={data.email} onChange={(e) => set({ email: e.target.value })} placeholder="Email" />
                    <input type="text" value={data.phone} onChange={(e) => set({ phone: e.target.value })} placeholder="Phone" />
                  </div>
                  <div className="row2" style={{ marginTop: 8 }}>
                    <input type="text" value={data.location} onChange={(e) => set({ location: e.target.value })} placeholder="Location" />
                    <input type="text" value={data.website} onChange={(e) => set({ website: e.target.value })} placeholder="Website" />
                  </div>
                  <div className="row2" style={{ marginTop: 8 }}>
                    <input type="text" value={data.linkedin} onChange={(e) => set({ linkedin: e.target.value })} placeholder="LinkedIn URL" />
                    <input type="text" value={data.github} onChange={(e) => set({ github: e.target.value })} placeholder="GitHub URL" />
                  </div>
                  <label className="lbl">Summary</label>
                  <textarea rows={4} value={data.summary} onChange={(e) => set({ summary: e.target.value })} placeholder="2-3 lines about you…" />

                  <label className="lbl">Skills ({data.skills.length})</label>
                  <div className="chips">
                    {data.skills.map((s, i) => (
                      <span key={i} className="chip">{s}<button onClick={() => set({ skills: data.skills.filter((_, j) => j !== i) })}>✕</button></span>
                    ))}
                    {data.skills.length === 0 && <span className="hint">No skills detected — add some below.</span>}
                  </div>
                  <div className="chip-add">
                    <input type="text" value={skillInput} onChange={(e) => setSkillInput(e.target.value)} placeholder="Add a skill + Enter" onKeyDown={(e) => { if (e.key === "Enter" && skillInput.trim()) { set({ skills: [...data.skills, skillInput.trim()] }); setSkillInput(""); } }} />
                    <button className="mini" onClick={() => { if (skillInput.trim()) { set({ skills: [...data.skills, skillInput.trim()] }); setSkillInput(""); } }}>Add</button>
                  </div>

                  <label className="lbl">Experience ({data.experience.length})</label>
                  {data.experience.length === 0 && <div className="hint">Nothing detected. Add your roles manually.</div>}
                  {data.experience.map((ex, i) => (
                    <div key={i} className="item-card">
                      <div className="item-card-head"><strong>#{i + 1} {ex.role || "New role"}</strong><button className="mini danger" onClick={() => set({ experience: data.experience.filter((_, j) => j !== i) })}>Remove</button></div>
                      <div className="row2">
                        <input type="text" value={ex.role} onChange={(e) => { const c = [...data.experience]; c[i] = { ...c[i], role: e.target.value }; set({ experience: c }); }} placeholder="Role" />
                        <input type="text" value={ex.company} onChange={(e) => { const c = [...data.experience]; c[i] = { ...c[i], company: e.target.value }; set({ experience: c }); }} placeholder="Company" />
                      </div>
                      <input type="text" value={ex.duration} onChange={(e) => { const c = [...data.experience]; c[i] = { ...c[i], duration: e.target.value }; set({ experience: c }); }} placeholder="Duration — e.g. Jan 2022 – Present" style={{ marginTop: 8 }} />
                      <textarea rows={3} value={ex.bullets.join("\n")} onChange={(e) => { const c = [...data.experience]; c[i] = { ...c[i], bullets: e.target.value.split("\n") }; set({ experience: c }); }} placeholder="One achievement per line" style={{ marginTop: 8 }} />
                    </div>
                  ))}
                  <button className="mini" onClick={() => set({ experience: [...data.experience, { role: "", company: "", duration: "", bullets: [] }] })}>+ Add experience</button>

                  <label className="lbl">Projects ({data.projects.length})</label>
                  {data.projects.map((p, i) => (
                    <div key={i} className="item-card">
                      <div className="item-card-head"><strong>#{i + 1} {p.name || "New project"}</strong><button className="mini danger" onClick={() => set({ projects: data.projects.filter((_, j) => j !== i) })}>Remove</button></div>
                      <input type="text" value={p.name} onChange={(e) => { const c = [...data.projects]; c[i] = { ...c[i], name: e.target.value }; set({ projects: c }); }} placeholder="Project name" />
                      <textarea rows={2} value={p.description} onChange={(e) => { const c = [...data.projects]; c[i] = { ...c[i], description: e.target.value }; set({ projects: c }); }} placeholder="What does it do?" style={{ marginTop: 8 }} />
                      <div className="row2" style={{ marginTop: 8 }}>
                        <input type="text" value={p.tech.join(", ")} onChange={(e) => { const c = [...data.projects]; c[i] = { ...c[i], tech: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) }; set({ projects: c }); }} placeholder="Tech (comma separated)" />
                        <input type="text" value={p.link} onChange={(e) => { const c = [...data.projects]; c[i] = { ...c[i], link: e.target.value }; set({ projects: c }); }} placeholder="Link" />
                      </div>
                    </div>
                  ))}
                  <button className="mini" onClick={() => set({ projects: [...data.projects, { name: "", description: "", tech: [], link: "" }] })}>+ Add project</button>

                  <label className="lbl">Education ({data.education.length})</label>
                  {data.education.map((e, i) => (
                    <div key={i} className="item-card">
                      <div className="item-card-head"><strong>#{i + 1}</strong><button className="mini danger" onClick={() => set({ education: data.education.filter((_, j) => j !== i) })}>Remove</button></div>
                      <input type="text" value={e.degree} onChange={(ev) => { const c = [...data.education]; c[i] = { ...c[i], degree: ev.target.value }; set({ education: c }); }} placeholder="Degree" />
                      <div className="row2" style={{ marginTop: 8 }}>
                        <input type="text" value={e.school} onChange={(ev) => { const c = [...data.education]; c[i] = { ...c[i], school: ev.target.value }; set({ education: c }); }} placeholder="School" />
                        <input type="text" value={e.year} onChange={(ev) => { const c = [...data.education]; c[i] = { ...c[i], year: ev.target.value }; set({ education: c }); }} placeholder="Year" />
                      </div>
                    </div>
                  ))}
                  <button className="mini" onClick={() => set({ education: [...data.education, { degree: "", school: "", year: "" }] })}>+ Add education</button>

                  <label className="lbl">Awards & extras ({data.highlights.length})</label>
                  <div className="chips">
                    {data.highlights.map((h, i) => (
                      <span key={i} className="chip">🏆 {h.length > 40 ? h.slice(0, 40) + "…" : h}<button onClick={() => set({ highlights: data.highlights.filter((_, j) => j !== i) })}>✕</button></span>
                    ))}
                    {data.highlights.length === 0 && <span className="hint">Awards, languages, interests land here when detected.</span>}
                  </div>
                  <div className="chip-add">
                    <input type="text" value={highlightInput} onChange={(e) => setHighlightInput(e.target.value)} placeholder="Add award / language / interest + Enter" onKeyDown={(e) => { if (e.key === "Enter" && highlightInput.trim()) { set({ highlights: [...data.highlights, highlightInput.trim()] }); setHighlightInput(""); } }} />
                    <button className="mini" onClick={() => { if (highlightInput.trim()) { set({ highlights: [...data.highlights, highlightInput.trim()] }); setHighlightInput(""); } }}>Add</button>
                  </div>

                  <label className="lbl">Extra profile links ({data.links.length})</label>
                  {data.links.map((l, i) => (
                    <div key={i} className="row2" style={{ marginBottom: 8 }}>
                      <input type="text" value={l.label} onChange={(e) => { const c = [...data.links]; c[i] = { ...c[i], label: e.target.value }; set({ links: c }); }} placeholder="Label — e.g. Medium" />
                      <div style={{ display: "flex", gap: 6 }}>
                        <input type="text" value={l.url} onChange={(e) => { const c = [...data.links]; c[i] = { ...c[i], url: e.target.value }; set({ links: c }); }} placeholder="https://…" style={{ flex: 1 }} />
                        <button className="mini danger" onClick={() => set({ links: data.links.filter((_, j) => j !== i) })}>✕</button>
                      </div>
                    </div>
                  ))}
                  <div className="row2">
                    <input type="text" value={linkLabel} onChange={(e) => setLinkLabel(e.target.value)} placeholder="Label" />
                    <div style={{ display: "flex", gap: 6 }}>
                      <input type="text" value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} placeholder="https://…" style={{ flex: 1 }} />
                      <button className="mini" onClick={() => { if (linkUrl.trim()) { set({ links: [...data.links, { label: linkLabel.trim() || "Link", url: linkUrl.trim() }] }); setLinkLabel(""); setLinkUrl(""); } }}>Add</button>
                    </div>
                  </div>
                </>
              )}

              <div className="sticky-actions">
                <button className="btn ghost" onClick={() => setStep(1)}>← Upload</button>
                <button className="btn primary" onClick={() => setStep(3)}>Deploy →</button>
              </div>
            </div>

            <div>
              <div className="preview-shell">
                <div className="preview-bar">
                  <div className="dots"><i style={{ background: "#f87171" }} /><i style={{ background: "#fbbf24" }} /><i style={{ background: "#34d399" }} /></div>
                  <div className="url-pill">🔒 {siteName || "my-portfolio"}.netlify.app</div>
                  <div className="seg" style={{ width: 170 }}>
                    <div className={!mobileView ? "active" : ""} onClick={() => setMobileView(false)}>🖥️</div>
                    <div className={mobileView ? "active" : ""} onClick={() => setMobileView(true)}>📱</div>
                  </div>
                </div>
                <div className={`preview-body ${mobileView ? "mobile" : ""}`}><PortfolioPreview data={data} /></div>
              </div>
              <div className="hint" style={{ textAlign: "center" }}>Exact preview — pixel-identical to what gets deployed · {data.template} · toggle 🖥️/📱 for responsive</div>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="grid2">
            <div className="card">
              <div className="card-head"><div><h3>Get your live URL 🚀</h3><p className="card-sub">Pick the fastest path for you. Your site is a single fast HTML file.</p></div></div>
              <label className="lbl">Site name</label>
              <input type="text" value={siteName} onChange={(e) => setSiteName(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"))} placeholder="my-portfolio" />
              <div className="deploy-grid">
                <div className={`deploy-opt ${deployTab === "instant" ? "active" : ""}`} onClick={() => setDeployTab("instant")}><b>⚡ Instant</b><span>Download · no token</span></div>
                <div className={`deploy-opt ${deployTab === "netlify" ? "active" : ""}`} onClick={() => setDeployTab("netlify")}><b>🟢 Netlify</b><span>One-click URL</span></div>
                <div className={`deploy-opt ${deployTab === "vercel" ? "active" : ""}`} onClick={() => setDeployTab("vercel")}><b>▲ Vercel</b><span>One-click URL</span></div>
              </div>

              {deployTab === "instant" && (
                <>
                  <button className="btn primary" onClick={downloadHTML}>⬇ Download index.html</button>
                  <div className="btn-row">
                    <button className="btn soft" onClick={downloadZip}>Download .zip</button>
                    <button className="btn soft" onClick={() => { navigator.clipboard.writeText(html); setDeployMsg("HTML copied!"); }}>Copy HTML</button>
                  </div>
                  <div className="deploy-dark">
                    <b>Free live URL in ~10s (no token):</b><br />
                    1. Download <code>index.html</code> ↑<br />
                    2. Go to <code>app.netlify.com/drop</code><br />
                    3. Drag the file → <code>https://your-site.netlify.app</code> 🎉
                  </div>
                </>
              )}
              {deployTab === "netlify" && (
                <>
                  <label className="lbl">Netlify token <span style={{ fontWeight: 400, textTransform: "none" }}>(User settings → Applications)</span></label>
                  <input type="text" value={token} onChange={(e) => setToken(e.target.value)} placeholder="nfp_xxxxxxxx" />
                  <button className="btn primary" onClick={deployToNetlify} disabled={deploying}>{deploying ? "Deploying…" : "🟢 Deploy to Netlify →"}</button>
                </>
              )}
              {deployTab === "vercel" && (
                <>
                  <label className="lbl">Vercel token <span style={{ fontWeight: 400, textTransform: "none" }}>(vercel.com/account/tokens)</span></label>
                  <input type="text" value={token} onChange={(e) => setToken(e.target.value)} placeholder="vercel_xxx" />
                  <button className="btn primary" onClick={deployToVercel} disabled={deploying}>{deploying ? "Deploying…" : "▲ Deploy to Vercel →"}</button>
                </>
              )}

              {deployMsg && <div className="hint" style={{ marginTop: 10 }}>{deployMsg}</div>}
              {deployedUrl && <div className="url-box">🎉 Live at: <a href={deployedUrl} target="_blank" rel="noreferrer"><strong>{deployedUrl}</strong></a></div>}
              <button className="btn ghost" onClick={() => setStep(2)}>← Back to customize</button>
            </div>
            <div>
              <div className="preview-shell">
                <div className="preview-bar">
                  <div className="dots"><i style={{ background: "#f87171" }} /><i style={{ background: "#fbbf24" }} /><i style={{ background: "#34d399" }} /></div>
                  <div className="url-pill">🔒 {deployedUrl || `${siteName || "my-portfolio"}.netlify.app`}</div>
                </div>
                <div className="preview-body"><PortfolioPreview data={data} /></div>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
