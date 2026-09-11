import { PortfolioData } from "./portfolio";

function esc(s: string) {
  return (s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function initials(name: string) {
  return name.split(/\s+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase() || "•";
}

/** Deterministic hue per string — generative project covers. */
function hueOf(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h % 360;
}

/** Rough years-of-experience derived from durations actually on the resume. */
function yearsExp(d: PortfolioData): number | null {
  const all = [
    ...d.experience.map((e) => e.duration),
    ...d.education.map((e) => e.year),
  ].join(" ").match(/20\d\d/g);
  if (!all) return null;
  const y = new Date().getFullYear() - Math.min(...all.map((v) => parseInt(v, 10)));
  return y >= 1 ? y : 1;
}

interface Link { label: string; href: string }

function socials(d: PortfolioData): Link[] {
  const out: Link[] = [];
  if (d.linkedin) out.push({ label: "LinkedIn", href: d.linkedin });
  if (d.github) out.push({ label: "GitHub", href: d.github });
  if (d.website) out.push({ label: "Website", href: d.website });
  for (const l of d.links || []) {
    if (l.url && !out.some((o) => o.href === l.url)) out.push({ label: l.label || "Link", href: l.url });
  }
  if (d.email) out.push({ label: "Email", href: "mailto:" + d.email });
  return out;
}

function navLinks(d: PortfolioData): Link[] {
  const out: Link[] = [{ label: "About", href: "#about" }];
  if (d.showSections.skills && d.skills.length) out.push({ label: "Skills", href: "#skills" });
  if (d.showSections.experience && d.experience.length) out.push({ label: "Work", href: "#work" });
  if (d.showSections.projects && d.projects.length) out.push({ label: "Projects", href: "#projects" });
  if (d.showSections.education && d.education.length) out.push({ label: "Education", href: "#education" });
  if (d.showSections.highlights && d.highlights.length) out.push({ label: "Awards", href: "#highlights" });
  if (d.showSections.contact) out.push({ label: "Contact", href: "#contact" });
  return out;
}

function head(d: PortfolioData, extraCss: string): string {
  return `<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>${esc(d.name)} — ${esc(d.title)}</title>
<meta name="description" content="${esc(d.summary.slice(0, 155))}"/>
<link rel="preconnect" href="https://fonts.googleapis.com"/>
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin/>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Sora:wght@600;700;800&family=Fraunces:ital,opsz,wght@0,9..144,500;0,9..144,600;0,9..144,700;1,9..144,500;1,9..144,600&family=JetBrains+Mono:wght@400;500;700&family=Space+Grotesk:wght@500;600;700&display=swap" rel="stylesheet"/>
<style>${extraCss}</style>`;
}

const REVEAL_JS = `
<script>
(function(){
  var els=document.querySelectorAll('.rv');
  if('IntersectionObserver' in window){
    var io=new IntersectionObserver(function(es){
      es.forEach(function(e){ if(e.isIntersecting){ e.target.classList.add('on'); io.unobserve(e.target); } });
    },{threshold:.12});
    els.forEach(function(el){ io.observe(el); });
  } else { els.forEach(function(el){ el.classList.add('on'); }); }
  var nav=document.querySelector('.nav');
  function onScroll(){ if(nav) nav.classList.toggle('scrolled', window.scrollY>24);
    var top=document.querySelector('.to-top'); if(top) top.classList.toggle('show', window.scrollY>600); }
  window.addEventListener('scroll', onScroll, {passive:true}); onScroll();
  document.querySelectorAll('a[href^="#"]').forEach(function(a){
    a.addEventListener('click', function(ev){
      var t=document.querySelector(a.getAttribute('href'));
      if(t){ ev.preventDefault(); t.scrollIntoView({behavior:'smooth', block:'start'}); }
    });
  });
  var rot=document.querySelector('[data-rotator]');
  if(rot){
    var words=rot.getAttribute('data-rotator').split('|').filter(Boolean);
    var i=0;
    if(words.length>1){ setInterval(function(){ i=(i+1)%words.length;
      rot.style.opacity='0';
      setTimeout(function(){ rot.textContent=words[i]; rot.style.opacity='1'; },220);
    },2400); }
  }
  document.querySelectorAll('[data-count]').forEach(function(el){
    var target=parseInt(el.getAttribute('data-count'),10)||0;
    var done=false;
    var cio=new IntersectionObserver(function(es){
      if(es[0].isIntersecting && !done){ done=true;
        var t0=null;
        function tick(t){ if(!t0)t0=t; var p=Math.min(1,(t-t0)/1100);
          el.textContent=Math.round(target*(1-Math.pow(1-p,3)));
          if(p<1) requestAnimationFrame(tick); }
        requestAnimationFrame(tick); cio.disconnect(); }
    },{threshold:.5});
    cio.observe(el);
  });
  var menu=document.querySelector('.menu-btn'), mnav=document.querySelector('.mnav');
  if(menu&&mnav){ menu.addEventListener('click',function(){ mnav.classList.toggle('open'); });
    mnav.querySelectorAll('a').forEach(function(a){ a.addEventListener('click',function(){ mnav.classList.remove('open'); }); }); }
})();
</script>`;

const TYPE_JS = `
<script>
(function(){
  var lines=document.querySelectorAll('[data-type]');
  var li=0;
  function typeLine(){
    if(li>=lines.length) return;
    var el=lines[li], full=el.getAttribute('data-type'), ci=0;
    el.classList.add('caret');
    var iv=setInterval(function(){
      el.textContent=full.slice(0,++ci);
      if(ci>=full.length){ clearInterval(iv); el.classList.remove('caret'); li++; setTimeout(typeLine, el.getAttribute('data-pause')?350:120); }
    }, el.getAttribute('data-fast')?8:26);
  }
  if(!('IntersectionObserver' in window)){ lines.forEach(function(el){ el.textContent=el.getAttribute('data-type'); }); return; }
  var io=new IntersectionObserver(function(es){ if(es[0].isIntersecting){ io.disconnect(); typeLine(); } },{threshold:.2});
  if(lines.length) io.observe(lines[0]);
})();
</script>`;

/* ==================== AURORA — signature dark exec ==================== */

function auroraTemplate(d: PortfolioData): string {
  const dark = d.darkMode;
  const yrs = yearsExp(d);
  const links = navLinks(d);
  const soc = socials(d);
  const rotWords = [d.title, ...d.skills.slice(0, 5)].map((w) => esc(w)).join("|");

  const css = `
*{box-sizing:border-box}html{scroll-behavior:smooth;scroll-padding-top:84px}
body{margin:0;font-family:${d.font === "Mono" ? "'JetBrains Mono',monospace" : d.font === "Serif" ? "Georgia,serif" : "Inter,system-ui,sans-serif"};background:${dark ? "#060a15" : "#f5f6fb"};color:${dark ? "#e9edf7" : "#0f172a"};line-height:1.65;overflow-x:hidden}
::selection{background:${d.accent};color:#fff}
.wrap{max-width:1120px;margin:0 auto;padding:0 24px}
h1,h2,h3{font-family:Sora,Inter,sans-serif;letter-spacing:-.02em;line-height:1.12}
.nav{position:fixed;inset:0 0 auto 0;z-index:50;transition:.25s;border-bottom:1px solid transparent}
.nav.scrolled{background:${dark ? "rgba(6,10,21,.78)" : "rgba(255,255,255,.78)"};backdrop-filter:blur(14px);border-color:${dark ? "#ffffff14" : "#e7eaf3"}}
.nav-in{max-width:1120px;margin:0 auto;padding:14px 24px;display:flex;align-items:center;gap:20px}
.brand{display:flex;align-items:center;gap:10px;font-weight:800;text-decoration:none;color:inherit}
.brand-mark{width:34px;height:34px;border-radius:11px;display:grid;place-items:center;color:#fff;font-size:13px;font-weight:800;background:linear-gradient(135deg,${d.accent},#a855f7);box-shadow:0 6px 18px -6px ${d.accent}99}
.nav-links{display:flex;gap:4px;margin-left:auto}
.nav-links a{font-size:13px;font-weight:600;color:${dark ? "#aab3cc" : "#475569"};text-decoration:none;padding:8px 12px;border-radius:999px;transition:.15s}
.nav-links a:hover{color:inherit;background:${dark ? "#ffffff10" : "#0f172a0d"}}
.hire{margin-left:8px;background:linear-gradient(135deg,${d.accent},#a855f7);color:#fff!important;font-weight:700}
.menu-btn{display:none;margin-left:auto;background:none;border:1px solid ${dark ? "#ffffff22" : "#e2e8f0"};border-radius:10px;padding:7px 11px;font-size:16px;color:inherit;cursor:pointer}
.mnav{display:none;flex-direction:column;gap:2px;padding:8px 18px 16px;background:${dark ? "#0a0f1f" : "#fff"};border-bottom:1px solid ${dark ? "#ffffff14" : "#e7eaf3"}}
.mnav.open{display:flex}
.mnav a{padding:10px 6px;text-decoration:none;color:inherit;font-weight:600;border-bottom:1px solid ${dark ? "#ffffff0d" : "#f1f5f9"}}
@media(max-width:820px){.nav-links,.hire{display:none}.menu-btn{display:block}}
.hero{position:relative;padding:150px 0 70px;overflow:hidden}
.orb{position:absolute;border-radius:50%;filter:blur(90px);opacity:.5;pointer-events:none;animation:drift 14s ease-in-out infinite alternate}
.orb1{width:480px;height:480px;background:${d.accent}55;top:-160px;left:-120px}
.orb2{width:380px;height:380px;background:#a855f755;top:40px;right:-120px;animation-delay:-6s}
.orb3{width:300px;height:300px;background:#22d3ee44;bottom:-140px;left:38%;animation-delay:-3s}
@keyframes drift{from{transform:translate(0,0) scale(1)}to{transform:translate(50px,30px) scale(1.12)}}
.grid-bg{position:absolute;inset:0;background-image:linear-gradient(${dark ? "#ffffff08" : "#0f172a08"} 1px,transparent 1px),linear-gradient(90deg,${dark ? "#ffffff08" : "#0f172a08"} 1px,transparent 1px);background-size:44px 44px;mask-image:radial-gradient(ellipse 90% 70% at 50% 20%,#000 30%,transparent 75%);pointer-events:none}
.pill{display:inline-flex;align-items:center;gap:8px;font-size:12.5px;font-weight:700;padding:7px 15px;border-radius:999px;background:${dark ? "#ffffff0d" : "#fff"};border:1px solid ${dark ? "#ffffff1c" : "#e2e8f0"};box-shadow:0 4px 14px -6px rgba(0,0,0,.15)}
.pulse{width:8px;height:8px;border-radius:50%;background:#22c55e;box-shadow:0 0 0 0 #22c55e88;animation:pulse 2s infinite}
@keyframes pulse{70%{box-shadow:0 0 0 9px transparent}100%{box-shadow:0 0 0 0 transparent}}
.hero h1{font-size:clamp(42px,7vw,76px);margin:20px 0 6px;font-weight:800}
.grad{background:linear-gradient(92deg,${d.accent},#a855f7 55%,#ec4899);-webkit-background-clip:text;background-clip:text;color:transparent}
.rot-line{font-size:clamp(18px,3vw,26px);font-weight:700;color:${d.accent};min-height:1.5em}
.rot-line span{transition:opacity .22s}
.lede{max-width:640px;color:${dark ? "#a7b0c9" : "#475569"};font-size:16.5px;margin:14px 0 0}
.cta-row{display:flex;gap:12px;flex-wrap:wrap;margin-top:26px}
.btn{display:inline-flex;align-items:center;gap:8px;padding:13px 26px;border-radius:999px;font-weight:700;font-size:14.5px;text-decoration:none;transition:.18s;border:0;cursor:pointer}
.btn-p{background:linear-gradient(135deg,${d.accent},#a855f7);color:#fff;box-shadow:0 10px 26px -10px ${d.accent}aa}
.btn-p:hover{transform:translateY(-2px);box-shadow:0 16px 32px -10px ${d.accent}cc}
.btn-g{border:1.5px solid ${dark ? "#ffffff2a" : "#cbd5e1"};color:inherit;background:transparent}
.btn-g:hover{border-color:${d.accent};transform:translateY(-2px)}
.facts{display:flex;gap:10px;flex-wrap:wrap;margin-top:22px}
.facts span{font-size:12.5px;font-weight:600;color:${dark ? "#a7b0c9" : "#475569"};background:${dark ? "#ffffff08" : "#fff"};border:1px solid ${dark ? "#ffffff12" : "#e7eaf3"};padding:7px 14px;border-radius:999px}
.facts a{color:${d.accent};text-decoration:none}
.stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:14px;margin-top:32px}
.stat{background:${dark ? "#ffffff08" : "#fff"};border:1px solid ${dark ? "#ffffff12" : "#e7eaf3"};border-radius:18px;padding:18px;text-align:center;box-shadow:${dark ? "none" : "0 8px 24px -14px rgba(15,23,42,.25)"}}
.stat b{display:block;font-size:30px;font-family:Sora,sans-serif}
.stat span{font-size:11.5px;text-transform:uppercase;letter-spacing:.08em;font-weight:700;color:${dark ? "#8f99b8" : "#64748b"}}
.marquee{margin:56px 0 0;border-top:1px solid ${dark ? "#ffffff12" : "#e7eaf3"};border-bottom:1px solid ${dark ? "#ffffff12" : "#e7eaf3"};overflow:hidden;padding:15px 0;background:${dark ? "#ffffff04" : "#fff"}}
.mq-track{display:flex;gap:44px;width:max-content;animation:mq 26s linear infinite;font-weight:700;font-size:14px;letter-spacing:.14em;color:${dark ? "#7f89a8" : "#94a3b8"}}
.mq-track i{color:${d.accent};font-style:normal}
@keyframes mq{to{transform:translateX(-50%)}}
section{padding:72px 0 8px}
.kicker{font-size:12px;font-weight:800;letter-spacing:.22em;color:${d.accent}}
.sec-t{font-size:clamp(26px,4vw,38px);margin:8px 0 8px}
.sec-s{color:${dark ? "#8f99b8" : "#64748b"};max-width:600px;margin:0 0 30px}
.pills{display:flex;flex-wrap:wrap;gap:10px}
.pills span{background:${dark ? "#ffffff08" : "#fff"};border:1px solid ${dark ? "#ffffff16" : "#e2e8f0"};padding:9px 17px;border-radius:999px;font-size:13.5px;font-weight:600;transition:.15s;cursor:default}
.pills span:hover{border-color:${d.accent};color:${d.accent};transform:translateY(-2px);box-shadow:0 8px 18px -10px ${d.accent}88}
.tl{position:relative;padding-left:30px;margin-top:6px}
.tl::before{content:'';position:absolute;left:8px;top:8px;bottom:8px;width:2px;border-radius:2px;background:linear-gradient(${d.accent},#a855f7,#ec4899)}
.tl-item{position:relative;background:${dark ? "#ffffff06" : "#fff"};border:1px solid ${dark ? "#ffffff10" : "#e7eaf3"};border-radius:20px;padding:22px 24px;margin-bottom:16px;transition:.2s;box-shadow:${dark ? "none" : "0 10px 30px -18px rgba(15,23,42,.25)"}}
.tl-item:hover{transform:translateX(4px);border-color:${d.accent}66}
.tl-item::before{content:'';position:absolute;left:-27px;top:28px;width:12px;height:12px;border-radius:50%;background:${d.accent};border:3px solid ${dark ? "#060a15" : "#f5f6fb"};box-shadow:0 0 0 2px ${d.accent}55}
.tl-head{display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap;align-items:baseline}
.tl-head strong{font-size:17px;font-family:Sora,sans-serif}
.when{font-size:12px;font-weight:700;background:${d.accent}1a;color:${d.accent};padding:4px 12px;border-radius:999px;white-space:nowrap}
.co{color:${d.accent};font-weight:700;font-size:13.5px;margin:2px 0 8px}
.tl ul{margin:6px 0 0;padding-left:19px;color:${dark ? "#a7b0c9" : "#475569"};font-size:14.5px}
.tl li{margin-bottom:5px}
.proj-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:18px}
.proj{position:relative;border-radius:22px;overflow:hidden;background:${dark ? "#ffffff06" : "#fff"};border:1px solid ${dark ? "#ffffff10" : "#e7eaf3"};transition:.22s;display:flex;flex-direction:column;box-shadow:${dark ? "none" : "0 12px 32px -20px rgba(15,23,42,.3)"}}
.proj:hover{transform:translateY(-6px);border-color:${d.accent}77;box-shadow:0 24px 48px -20px ${d.accent}66}
.proj-top{height:118px;position:relative;overflow:hidden}
.proj-top::after{content:'';position:absolute;inset:0;background:radial-gradient(circle at 80% 20%,#ffffff44,transparent 55%),radial-gradient(circle at 15% 90%,#00000033,transparent 50%)}
.proj-top b{position:absolute;inset:auto auto 10px 20px;z-index:1;color:#fff;font-size:40px;font-family:Sora,sans-serif}
.proj-body{padding:20px 22px 22px;display:flex;flex-direction:column;gap:10px;flex:1}
.proj-body strong{font-size:17px;font-family:Sora,sans-serif}
.proj-body p{margin:0;font-size:14px;color:${dark ? "#a7b0c9" : "#475569"}}
.tags{display:flex;gap:7px;flex-wrap:wrap}
.tags code{font-size:11.5px;background:${d.accent}14;color:${d.accent};padding:3px 10px;border-radius:7px;font-weight:700}
.proj-link{margin-top:auto;font-size:13.5px;font-weight:700;color:${d.accent};text-decoration:none}
.proj-link:hover{text-decoration:underline}
.edu{display:flex;gap:16px;align-items:flex-start;padding:18px 0;border-bottom:1px solid ${dark ? "#ffffff0e" : "#eef1f6"}}
.edu-ic{width:46px;height:46px;flex-shrink:0;border-radius:14px;display:grid;place-items:center;font-size:21px;background:${d.accent}14}
.awards{display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:14px}
.award{background:linear-gradient(135deg,${d.accent}1c,transparent);border:1px solid ${d.accent}44;border-radius:18px;padding:18px;font-size:14px}
.award b{display:block;font-size:20px;margin-bottom:4px}
.contact-card{margin-top:26px;text-align:center;border-radius:28px;padding:64px 30px;background:linear-gradient(135deg,${d.accent},#a855f7 60%,#ec4899);color:#fff;position:relative;overflow:hidden}
.contact-card::before{content:'';position:absolute;width:340px;height:340px;border-radius:50%;background:#ffffff22;top:-140px;right:-100px}
.contact-card::after{content:'';position:absolute;width:220px;height:220px;border-radius:50%;background:#00000022;bottom:-110px;left:-70px}
.contact-card h2{font-size:clamp(28px,5vw,44px);margin:0 0 10px;position:relative}
.contact-card p{opacity:.92;position:relative}
.btn-w{background:#fff;color:#111827}
.btn-w:hover{transform:translateY(-2px)}
.soc-row{display:flex;gap:10px;justify-content:center;flex-wrap:wrap;margin-top:22px;position:relative}
.soc-row a{color:#fff;text-decoration:none;font-size:13.5px;font-weight:700;border:1.5px solid #ffffff55;padding:9px 18px;border-radius:999px;transition:.15s}
.soc-row a:hover{background:#ffffff22}
footer{padding:44px 0 60px;text-align:center;font-size:13px;color:${dark ? "#697394" : "#94a3b8"}}
.to-top{position:fixed;right:22px;bottom:22px;width:44px;height:44px;border-radius:50%;border:0;background:${d.accent};color:#fff;font-size:18px;cursor:pointer;opacity:0;pointer-events:none;transition:.25s;box-shadow:0 10px 24px -8px ${d.accent}}
.to-top.show{opacity:1;pointer-events:auto}
.rv{opacity:0;transform:translateY(26px);transition:opacity .7s ease,transform .7s cubic-bezier(.16,1,.3,1);transition-delay:var(--rd,0s)}
.rv.on{opacity:1;transform:none}
@media(prefers-reduced-motion:reduce){.rv{opacity:1;transform:none}.orb,.mq-track{animation:none}}
`;

  const skills = d.showSections.skills && d.skills.length
    ? `<section id="skills"><div class="wrap"><div class="kicker rv">01 · SKILLS</div><h2 class="sec-t rv">What I work with</h2><p class="sec-s rv">The tools and technologies I reach for to ship real products.</p><div class="pills">${d.skills.map((s, i) => `<span class="rv" style="--rd:${Math.min(i * 0.04, 0.5)}s">${esc(s)}</span>`).join("")}</div></div></section>` : "";
  const exp = d.showSections.experience && d.experience.length
    ? `<section id="work"><div class="wrap"><div class="kicker rv">02 · EXPERIENCE</div><h2 class="sec-t rv">Where I've worked</h2><p class="sec-s rv">Roles, impact, and everything in between.</p><div class="tl">${d.experience.map((e, i) => `<div class="tl-item rv" style="--rd:${i * 0.06}s"><div class="tl-head"><strong>${esc(e.role) || "Role"}</strong><span class="when">${esc(e.duration) || "—"}</span></div><div class="co">${esc(e.company)}</div>${e.bullets.length ? `<ul>${e.bullets.map((b) => `<li>${esc(b)}</li>`).join("")}</ul>` : ""}</div>`).join("")}</div></div></section>` : "";
  const proj = d.showSections.projects && d.projects.length
    ? `<section id="projects"><div class="wrap"><div class="kicker rv">03 · PROJECTS</div><h2 class="sec-t rv">Things I've built</h2><p class="sec-s rv">A selection of projects that show how I think and ship.</p><div class="proj-grid">${d.projects.map((p, i) => {
      const h = hueOf(p.name);
      return `<div class="proj rv" style="--rd:${i * 0.06}s"><div class="proj-top" style="background:linear-gradient(135deg,hsl(${h},70%,55%),hsl(${(h + 60) % 360},75%,45%))"><b>${esc(initials(p.name))}</b></div><div class="proj-body"><strong>${esc(p.name)}</strong><p>${esc(p.description) || "Built with care — details on request."}</p><div class="tags">${p.tech.map((t) => `<code>${esc(t)}</code>`).join("")}</div>${p.link ? `<a class="proj-link" href="${esc(p.link)}" target="_blank" rel="noopener">View project ↗</a>` : ""}</div></div>`;
    }).join("")}</div></div></section>` : "";
  const edu = d.showSections.education && d.education.length
    ? `<section id="education"><div class="wrap"><div class="kicker rv">04 · EDUCATION</div><h2 class="sec-t rv">Background</h2><div>${d.education.map((e) => `<div class="edu rv"><div class="edu-ic">🎓</div><div><strong>${esc(e.degree)}</strong><div style="color:${dark ? "#8f99b8" : "#64748b"};font-size:14px">${esc(e.school)}${e.year ? ` · ${esc(e.year)}` : ""}</div></div></div>`).join("")}</div></div></section>` : "";
  const hl = d.showSections.highlights && d.highlights.length
    ? `<section id="highlights"><div class="wrap"><div class="kicker rv">05 · RECOGNITION</div><h2 class="sec-t rv">Worth mentioning</h2><div class="awards">${d.highlights.map((h) => `<div class="award rv"><b>✦</b>${esc(h)}</div>`).join("")}</div></div></section>` : "";
  const contact = d.showSections.contact
    ? `<section id="contact"><div class="wrap"><div class="contact-card rv"><h2>Let's build something great</h2><p>${esc(d.email)}${d.phone ? ` · ${esc(d.phone)}` : ""}${d.location ? ` · ${esc(d.location)}` : ""}</p><div class="cta-row" style="justify-content:center"><a class="btn btn-w" href="mailto:${esc(d.email)}">Get in touch →</a></div><div class="soc-row">${soc.filter((s) => s.label !== "Email").map((s) => `<a href="${esc(s.href)}" target="_blank" rel="noopener">${esc(s.label)} ↗</a>`).join("")}</div></div></div></section>` : "";

  return `<!doctype html><html lang="en"><head>${head(d, css)}</head><body id="top">
<nav class="nav"><div class="nav-in"><a class="brand" href="#top"><span class="brand-mark">${esc(initials(d.name))}</span>${esc(d.name.split(" ")[0] || d.name)}</a><div class="nav-links">${links.map((l) => `<a href="${l.href}">${esc(l.label)}</a>`).join("")}<a class="hire" href="#contact">Hire me</a></div><button class="menu-btn" aria-label="Menu">☰</button></div><div class="mnav">${links.map((l) => `<a href="${l.href}">${esc(l.label)}</a>`).join("")}</div></nav>
<header class="hero"><div class="grid-bg"></div><div class="orb orb1"></div><div class="orb orb2"></div><div class="orb orb3"></div><div class="wrap" style="position:relative">
<div class="pill rv on"><span class="pulse"></span>Open to opportunities${d.location ? ` · ${esc(d.location)}` : ""}</div>
<h1 class="rv on">Hi, I'm <span class="grad">${esc(d.name)}</span></h1>
<div class="rot-line"><span data-rotator="${rotWords}">▸ ${esc(d.title)}</span></div>
<p class="lede">${esc(d.summary)}</p>
<div class="cta-row"><a class="btn btn-p" href="#contact">Contact me →</a>${d.projects.length ? `<a class="btn btn-g" href="#projects">View my work</a>` : ""}${d.github ? `<a class="btn btn-g" href="${esc(d.github)}" target="_blank" rel="noopener">GitHub ↗</a>` : ""}</div>
<div class="facts">${d.email ? `<span>✉ <a href="mailto:${esc(d.email)}">${esc(d.email)}</a></span>` : ""}${d.phone ? `<span>☏ ${esc(d.phone)}</span>` : ""}${d.location ? `<span>◉ ${esc(d.location)}</span>` : ""}</div>
<div class="stats">
${yrs !== null ? `<div class="stat rv"><b><span data-count="${yrs}">0</span>+</b><span>Years exp.</span></div>` : ""}
<div class="stat rv" style="--rd:.08s"><b><span data-count="${d.projects.length}">0</span></b><span>Projects</span></div>
<div class="stat rv" style="--rd:.16s"><b><span data-count="${d.skills.length}">0</span></b><span>Skills</span></div>
<div class="stat rv" style="--rd:.24s"><b><span data-count="${d.experience.length}">0</span></b><span>Roles</span></div>
</div></div></header>
${d.skills.length ? `<div class="marquee"><div class="mq-track">${[...d.skills, ...d.skills].map((s) => `<span>${esc(s.toUpperCase())} <i>✦</i></span>`).join("")}</div></div>` : ""}
<section id="about"><div class="wrap"><div class="kicker rv">ABOUT</div><h2 class="sec-t rv">${esc(d.title)}</h2><p class="sec-s rv" style="max-width:700px;font-size:16px">${esc(d.summary)}</p></div></section>
${skills}${exp}${proj}${edu}${hl}${contact}
<footer>© ${new Date().getFullYear()} ${esc(d.name)} · Crafted with care · Built with ResumeCoded</footer>
<button class="to-top" onclick="window.scrollTo({top:0,behavior:'smooth'})" aria-label="Back to top">↑</button>
${REVEAL_JS}</body></html>`;
}

/* ==================== EDITORIAL — print-magazine serif ==================== */

function editorialTemplate(d: PortfolioData): string {
  const dark = d.darkMode;
  const soc = socials(d);
  let n = 0;
  const num = () => String(++n).padStart(2, "0");
  const first = d.name.split(" ")[0] || d.name;
  const rest = d.name.split(" ").slice(1).join(" ");

  const css = `
*{box-sizing:border-box}html{scroll-behavior:smooth;scroll-padding-top:80px}
body{margin:0;font-family:Inter,system-ui,sans-serif;background:${dark ? "#101014" : "#faf8f4"};color:${dark ? "#ece8df" : "#1c1917"};line-height:1.8}
.wrap{max-width:760px;margin:0 auto;padding:0 26px}
.masthead{border-bottom:3px double ${dark ? "#3a372f" : "#d6cfc2"};padding:20px 0 14px;display:flex;justify-content:space-between;align-items:baseline;font-size:12px;letter-spacing:.24em;font-weight:700;color:${dark ? "#8f887a" : "#78716c"}}
.masthead b{color:${d.accent}}
.hero{padding:70px 0 10px}
.eyebrow{font-size:12px;letter-spacing:.32em;font-weight:700;color:${d.accent}}
.hero h1{font-family:Fraunces,Georgia,serif;font-size:clamp(52px,10vw,96px);line-height:1;margin:16px 0 4px;font-weight:600;letter-spacing:-.02em}
.hero h1 em{font-style:italic;color:${d.accent}}
.role-line{font-size:19px;color:${dark ? "#a39e93" : "#57534e"};margin:12px 0 0;font-style:italic;font-family:Fraunces,Georgia,serif}
.rule{height:3px;width:64px;background:${d.accent};margin:26px 0;border-radius:2px}
.lede{font-size:17px;max-width:620px;color:${dark ? "#c9c4b9" : "#44403c"}}
.byline{display:flex;gap:18px;flex-wrap:wrap;margin-top:22px;font-size:13.5px;font-weight:600}
.byline a{color:${d.accent};text-decoration:none;border-bottom:1px solid ${d.accent}66}
.byline a:hover{border-color:${d.accent}}
.toc{margin:40px 0 0;border-top:1px solid ${dark ? "#ffffff1c" : "#e5e0d8"};border-bottom:1px solid ${dark ? "#ffffff1c" : "#e5e0d8"};padding:6px 0}
.toc a{display:flex;gap:14px;text-decoration:none;color:inherit;font-size:14px;padding:9px 0;border-bottom:1px dotted ${dark ? "#ffffff22" : "#d6cfc2"}}
.toc a:last-child{border:0}
.toc a:hover{color:${d.accent}}
.toc .no{font-size:12px;font-weight:800;color:${d.accent};padding-top:3px}
.toc .pg{margin-left:auto;color:${dark ? "#6f6a5f" : "#a8a29e"};font-size:12px}
section{padding:54px 0 4px}
.sec-head{display:flex;align-items:baseline;gap:14px;border-bottom:1px solid ${dark ? "#ffffff1c" : "#e5e0d8"};padding-bottom:12px;margin-bottom:6px}
.sec-head .no{font-size:13px;font-weight:800;color:${d.accent};letter-spacing:.1em}
.sec-head h2{font-family:Fraunces,Georgia,serif;font-size:32px;margin:0;font-weight:600}
.dropcap::first-letter{font-family:Fraunces,Georgia,serif;font-size:3.4em;float:left;line-height:.9;padding-right:10px;color:${d.accent};font-weight:700}
.pull{font-family:Fraunces,Georgia,serif;font-style:italic;font-size:22px;border-left:3px solid ${d.accent};padding-left:18px;margin:26px 0;color:${dark ? "#d6d0c2" : "#44403c"}}
.skill-line{font-size:16px;padding:14px 0;border-bottom:1px dashed ${dark ? "#ffffff1c" : "#e5e0d8"}}
.job{display:grid;grid-template-columns:150px 1fr;gap:18px;padding:22px 0;border-bottom:1px solid ${dark ? "#ffffff14" : "#e5e0d8"}}
.job .when{font-size:12px;font-weight:700;color:${dark ? "#8d877b" : "#a8a29e"};text-transform:uppercase;letter-spacing:.06em;padding-top:4px}
.job strong{font-size:18px}
.job .co{color:${d.accent};font-weight:600}
.job ul{margin:8px 0 0;padding-left:19px;color:${dark ? "#c9c4b9" : "#57534e"};font-size:15px}
@media(max-width:600px){.job{grid-template-columns:1fr}.job .when{padding:0}}
.prow{display:flex;gap:14px;align-items:baseline;padding:20px 4px;border-bottom:1px solid ${dark ? "#ffffff14" : "#e5e0d8"};text-decoration:none;color:inherit;transition:.15s}
.prow:hover{padding-left:12px;background:${d.accent}0d}
.prow .arr{margin-left:auto;color:${d.accent};font-weight:800;flex-shrink:0}
.prow strong{font-family:Fraunces,Georgia,serif;font-size:21px;font-weight:600}
.prow p{margin:2px 0 0;font-size:14px;color:${dark ? "#a39e93" : "#78716c"}}
.margin-note{display:flex;gap:12px;padding:13px 0;border-bottom:1px dotted ${dark ? "#ffffff22" : "#d6cfc2"};font-size:15px}
.margin-note .mk{color:${d.accent};font-weight:800;flex-shrink:0}
.contact-big{font-family:Fraunces,Georgia,serif;font-size:clamp(30px,6vw,52px);line-height:1.15;margin:10px 0}
.contact-big a{color:${d.accent};text-decoration:underline;text-decoration-thickness:2px;text-underline-offset:6px}
.colophon{margin-top:44px;padding:22px 0 60px;border-top:3px double ${dark ? "#3a372f" : "#d6cfc2"};font-size:12.5px;color:${dark ? "#6f6a5f" : "#a8a29e"};display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap}
.rv{opacity:0;transform:translateY(18px);transition:opacity .6s ease,transform .6s ease}
.rv.on{opacity:1;transform:none}
`;

  const tocSecs: { no: string; label: string; href: string }[] = [{ no: num(), label: "About the author", href: "#about" }];
  const skills = d.showSections.skills && d.skills.length
    ? (() => { const no = num(); tocSecs.push({ no, label: "Skills & tools", href: "#skills" }); return `<section id="skills"><div class="wrap"><div class="sec-head rv"><span class="no">${no}</span><h2>Skills & tools</h2></div><div class="skill-line rv">${d.skills.map((s) => esc(s)).join(" &nbsp;·&nbsp; ")}</div></div></section>`; })() : "";
  const exp = d.showSections.experience && d.experience.length
    ? (() => { const no = num(); tocSecs.push({ no, label: "Career history", href: "#work" }); return `<section id="work"><div class="wrap"><div class="sec-head rv"><span class="no">${no}</span><h2>Career history</h2></div>${d.experience.map((e) => `<div class="job rv"><div class="when">${esc(e.duration) || "—"}</div><div><strong>${esc(e.role)}</strong> <span class="co">— ${esc(e.company)}</span>${e.bullets.length ? `<ul>${e.bullets.map((b) => `<li>${esc(b)}</li>`).join("")}</ul>` : ""}</div></div>`).join("")}</div></section>`; })() : "";
  const proj = d.showSections.projects && d.projects.length
    ? (() => { const no = num(); tocSecs.push({ no, label: "Selected work", href: "#projects" }); return `<section id="projects"><div class="wrap"><div class="sec-head rv"><span class="no">${no}</span><h2>Selected work</h2></div>${d.projects.map((p) => `<a class="prow rv" ${p.link ? `href="${esc(p.link)}" target="_blank" rel="noopener"` : `href="#projects"`}><div><strong>${esc(p.name)}</strong><p>${esc(p.description)}${p.tech.length ? ` — <i>${p.tech.map((t) => esc(t)).join(", ")}</i>` : ""}</p></div><span class="arr">↗</span></a>`).join("")}</div></section>`; })() : "";
  const edu = d.showSections.education && d.education.length
    ? (() => { const no = num(); tocSecs.push({ no, label: "Education", href: "#education" }); return `<section id="education"><div class="wrap"><div class="sec-head rv"><span class="no">${no}</span><h2>Education</h2></div>${d.education.map((e) => `<div class="job rv"><div class="when">${esc(e.year)}</div><div><strong>${esc(e.degree)}</strong><div style="color:${dark ? "#a39e93" : "#78716c"}">${esc(e.school)}</div></div></div>`).join("")}</div></section>`; })() : "";
  const hl = d.showSections.highlights && d.highlights.length
    ? (() => { const no = num(); tocSecs.push({ no, label: "Honours & marginalia", href: "#highlights" }); return `<section id="highlights"><div class="wrap"><div class="sec-head rv"><span class="no">${no}</span><h2>Honours & marginalia</h2></div>${d.highlights.map((h, i) => `<div class="margin-note rv"><span class="mk">†${i + 1}</span><span>${esc(h)}</span></div>`).join("")}</div></section>`; })() : "";
  const contactNo = num(); tocSecs.push({ no: contactNo, label: "Correspondence", href: "#contact" });
  const contact = d.showSections.contact
    ? `<section id="contact"><div class="wrap"><div class="sec-head rv"><span class="no">${contactNo}</span><h2>Correspondence</h2></div><p class="contact-big rv">Have an idea?<br/>Write to <a href="mailto:${esc(d.email)}">${esc(d.email) || "say hello"}</a></p><div class="byline rv">${soc.filter((s) => s.label !== "Email").map((s) => `<a href="${esc(s.href)}" target="_blank" rel="noopener">${esc(s.label)} ↗</a>`).join("")}${d.phone ? `<span>${esc(d.phone)}</span>` : ""}${d.location ? `<span>${esc(d.location)}</span>` : ""}</div></div></section>` : "";

  return `<!doctype html><html lang="en"><head>${head(d, css)}</head><body id="top">
<header><div class="wrap"><div class="masthead"><span><b>✦</b> ${esc(d.name.toUpperCase())}</span><span>PORTFOLIO · VOL. ${new Date().getFullYear()}</span></div></div></header>
<div class="wrap"><div class="hero"><div class="eyebrow">THE ${esc(d.title.toUpperCase())} ISSUE</div><h1>${esc(first)} <em>${esc(rest)}</em></h1><p class="role-line">${esc(d.title)}${d.location ? ` — ${esc(d.location)}` : ""}</p><div class="rule"></div><p class="lede">${esc(d.summary)}</p><div class="byline">${d.email ? `<a href="mailto:${esc(d.email)}">${esc(d.email)}</a>` : ""}${soc.filter((s) => s.label !== "Email").map((s) => `<a href="${esc(s.href)}" target="_blank" rel="noopener">${esc(s.label)} ↗</a>`).join("")}</div>
<div class="toc">${tocSecs.map((t) => `<a href="${t.href}"><span class="no">${t.no}</span><span>${esc(t.label)}</span><span class="pg">§</span></a>`).join("")}</div></div></div>
<section id="about"><div class="wrap"><div class="sec-head rv"><span class="no">${tocSecs[0].no}</span><h2>About the author</h2></div><p class="lede dropcap rv">${esc(d.summary)}</p>${d.summary.length > 220 ? `<p class="pull rv">"${esc(d.summary.split(". ")[0])}."</p>` : ""}</div></section>
${skills}${exp}${proj}${edu}${hl}${contact}
<div class="wrap"><div class="colophon"><span>Set in Fraunces & Inter · Printed on pixels</span><span>© ${new Date().getFullYear()} ${esc(d.name)}</span></div></div>
${REVEAL_JS}</body></html>`;
}

/* ==================== TERMINAL — hacker console ==================== */

function terminalTemplate(d: PortfolioData): string {
  const soc = socials(d);
  const user = (d.name.split(" ")[0] || "user").toLowerCase().replace(/[^a-z]/g, "") || "user";

  const css = `
*{box-sizing:border-box}html{scroll-behavior:smooth;scroll-padding-top:90px}
body{margin:0;font-family:'JetBrains Mono',Menlo,monospace;background:#050807;color:#d7e3dc;line-height:1.7;font-size:14.5px;overflow-x:hidden}
body::after{content:'';position:fixed;inset:0;pointer-events:none;z-index:99;background:repeating-linear-gradient(0deg,transparent 0 2px,#00000022 2px 4px)}
::selection{background:${d.accent};color:#000}
.wrap{max-width:880px;margin:0 auto;padding:0 22px}
a{color:${d.accent}}
.term{max-width:920px;margin:26px auto 70px;border:1px solid #ffffff22;border-radius:14px;overflow:hidden;background:#0a0f0d;box-shadow:0 30px 80px -30px #000,0 0 0 1px #000,0 0 60px -20px ${d.accent}55}
.chrome{display:flex;align-items:center;gap:8px;padding:12px 16px;background:#111613;border-bottom:1px solid #ffffff14;position:sticky;top:0;z-index:20}
.chrome i{width:12px;height:12px;border-radius:50%;display:block}
.chrome .ttl{margin-left:8px;font-size:12px;color:#7d8a83}
.chrome .ttl b{color:#e8f0eb}
.tbody{padding:30px 28px 50px}
@media(max-width:600px){.tbody{padding:22px 16px 40px}}
.line{margin:0 0 4px;word-break:break-word}
.dim{color:#67756e}.cm{color:#5b6660}.pr{color:${d.accent};font-weight:700}.ok{color:#4ade80}.warn{color:#fbbf24}
.big{font-size:clamp(26px,5.5vw,44px);font-weight:700;color:#f2f7f4;line-height:1.2;margin:14px 0}
.big .hl{color:${d.accent}}
.caret::after{content:'▊';animation:blink 1s steps(1) infinite;color:${d.accent}}
@keyframes blink{50%{opacity:0}}
.sec{margin-top:38px}
.cmd{color:#f2f7f4;font-weight:700;margin:0 0 12px}
.cmd::before{content:'➜ ';color:${d.accent}}
.out{border-left:2px solid ${d.accent}55;padding-left:16px;margin-bottom:6px}
.chips{display:flex;flex-wrap:wrap;gap:8px}
.chips span{border:1px solid #ffffff2a;padding:5px 12px;border-radius:6px;font-size:13px;background:#ffffff08}
.chips span:hover{border-color:${d.accent};color:${d.accent}}
.job{margin-bottom:18px}
.job .jh{color:#f2f7f4;font-weight:700}
.job .jd{color:${d.accent};font-size:12.5px}
.job ul{margin:6px 0 0;padding-left:20px;color:#b9c6bf}
.proj{border:1px solid #ffffff1e;border-radius:10px;padding:16px 18px;margin-bottom:12px;background:#ffffff05;transition:.15s}
.proj:hover{border-color:${d.accent}}
.proj .pn{font-weight:700;color:#f2f7f4;font-size:16px}
.proj p{margin:6px 0;color:#9fb0a8;font-size:13.5px}
.proj .meta{font-size:12px;color:#67756e}
.hirebox{margin-top:44px;border:1px dashed ${d.accent};border-radius:12px;padding:30px;text-align:center;background:${d.accent}0d}
.hirebox .btn{display:inline-block;margin-top:14px;background:${d.accent};color:#000;font-weight:700;text-decoration:none;padding:12px 30px;border-radius:8px}
.hirebox .btn:hover{filter:brightness(1.1)}
.socline{display:flex;gap:16px;flex-wrap:wrap;justify-content:center;margin-top:16px;font-size:13px}
footer{text-align:center;color:#4d5a53;font-size:12px;padding:26px 0 40px}
.rv{opacity:0;transform:translateY(14px);transition:opacity .5s ease,transform .5s ease}
.rv.on{opacity:1;transform:none}
`;

  const bootWho = `${user}@portfolio:~$ whoami`;
  const skills = d.showSections.skills && d.skills.length
    ? `<div class="sec rv" id="skills"><p class="cmd">ls ~/skills --all</p><div class="out"><div class="chips">${d.skills.map((s) => `<span>${esc(s)}</span>`).join("")}</div><p class="dim"># ${d.skills.length} packages installed, 0 vulnerabilities</p></div></div>` : "";
  const exp = d.showSections.experience && d.experience.length
    ? `<div class="sec rv" id="work"><p class="cmd">git log --experience --oneline</p><div class="out">${d.experience.map((e) => `<div class="job"><div class="jh">◉ ${esc(e.role)} <span class="dim">@</span> ${esc(e.company)}</div><div class="jd">[${esc(e.duration) || "—"}]</div>${e.bullets.length ? `<ul>${e.bullets.map((b) => `<li>${esc(b)}</li>`).join("")}</ul>` : ""}</div>`).join("")}</div></div>` : "";
  const proj = d.showSections.projects && d.projects.length
    ? `<div class="sec rv" id="projects"><p class="cmd">ls -la ~/projects/</p><div class="out">${d.projects.map((p) => `<div class="proj"><div class="pn">📁 ${esc(p.name)}/</div><p>${esc(p.description) || "No README yet — ask me about it."}</p><div class="meta">${p.tech.map((t) => esc(t)).join(" · ")}${p.link ? ` · <a href="${esc(p.link)}" target="_blank" rel="noopener">./run ↗</a>` : ""}</div></div>`).join("")}</div></div>` : "";
  const edu = d.showSections.education && d.education.length
    ? `<div class="sec rv" id="education"><p class="cmd">cat ~/education.md</p><div class="out">${d.education.map((e) => `<p class="line"><span class="ok">##</span> ${esc(e.degree)}<br/><span class="dim">${esc(e.school)}${e.year ? ` — ${esc(e.year)}` : ""}</span></p>`).join("")}</div></div>` : "";
  const hl = d.showSections.highlights && d.highlights.length
    ? `<div class="sec rv" id="highlights"><p class="cmd">cat ~/awards.txt</p><div class="out">${d.highlights.map((h) => `<p class="line"><span class="warn">★</span> ${esc(h)}</p>`).join("")}</div></div>` : "";
  const contact = d.showSections.contact
    ? `<div class="hirebox rv" id="contact"><p class="cmd" style="text-align:left">$ ./hire-me --now</p><p>> status: <span class="ok">open for work</span>${d.location ? ` · ${esc(d.location)}` : ""}<br/>> email: <a href="mailto:${esc(d.email)}">${esc(d.email)}</a>${d.phone ? `<br/>> phone: ${esc(d.phone)}` : ""}</p><a class="btn" href="mailto:${esc(d.email)}">INITIALIZE CONTACT_</a><div class="socline">${soc.filter((s) => s.label !== "Email").map((s) => `<a href="${esc(s.href)}" target="_blank" rel="noopener">[${esc(s.label)}]</a>`).join("")}</div></div>` : "";

  return `<!doctype html><html lang="en"><head>${head(d, css)}</head><body id="top">
<div class="wrap"><div class="term">
<div class="chrome"><i style="background:#f87171"></i><i style="background:#fbbf24"></i><i style="background:#34d399"></i><span class="ttl"><b>${esc(user)}@portfolio</b>: ~ — zsh</span></div>
<div class="tbody">
<p class="line cm"># portfolio v${new Date().getFullYear()} — built from a resume, runs anywhere</p>
<p class="line"><span class="pr">${esc(bootWho)}</span></p>
<p class="line" data-type="${esc(d.name)} — ${esc(d.title)}" data-fast="1"></p>
<div class="big rv on">Hello, world.<br/>I'm <span class="hl">${esc(d.name)}</span></div>
<p class="line rv on"><span class="pr">➜</span> <span data-type="${esc(d.title)}${d.location ? ` · ${esc(d.location)}` : ""}"></span></p>
<p class="line dim rv on" style="margin-top:10px">${esc(d.summary)}</p>
<p class="line rv on" style="margin-top:12px"><span class="pr">➜</span> quick-links: ${soc.slice(0, 4).map((s) => `<a href="${esc(s.href)}" target="_blank" rel="noopener">${esc(s.label)}</a>`).join(" · ")}</p>
<div class="sec rv on" id="about"><p class="cmd">cat ~/about.txt</p><div class="out"><p class="line">${esc(d.summary)}</p></div></div>
${skills}${exp}${proj}${edu}${hl}${contact}
<p class="line" style="margin-top:36px"><span class="pr">${esc(user)}@portfolio:~$</span> <span class="caret"></span></p>
</div></div>
<footer>session ended · © ${new Date().getFullYear()} ${esc(d.name)} · uptime: always</footer></div>
${REVEAL_JS}${TYPE_JS}</body></html>`;
}

/* ==================== POP — playful neo-brutalist bento ==================== */

function popTemplate(d: PortfolioData): string {
  const dark = d.darkMode;
  const bg = dark ? "#141021" : "#fff7ed";
  const ink = dark ? "#f5f0ff" : "#1c1917";
  const card = dark ? "#1e1830" : "#ffffff";
  const dot = dark ? "#ffffff14" : "#1c19171a";
  const yrs = yearsExp(d);
  const soc = socials(d);

  const css = `
*{box-sizing:border-box}html{scroll-behavior:smooth;scroll-padding-top:90px}
body{margin:0;font-family:'Space Grotesk',Inter,system-ui,sans-serif;background:${bg};background-image:radial-gradient(${dot} 1.5px,transparent 1.5px);background-size:22px 22px;color:${ink};line-height:1.6;overflow-x:hidden}
.wrap{max-width:1120px;margin:0 auto;padding:0 22px}
h1,h2,h3{letter-spacing:-.02em;line-height:1.05}
.nav{position:sticky;top:12px;z-index:50;margin:12px auto 0;max-width:1120px;padding:0 22px}
.nav-in{display:flex;align-items:center;gap:10px;background:${card};border:2px solid ${ink};border-radius:999px;padding:10px 12px 10px 20px;box-shadow:5px 5px 0 ${ink}}
.brand{font-weight:700;text-decoration:none;color:inherit;font-size:15px}
.brand-mark{display:inline-grid;place-items:center;width:30px;height:30px;border-radius:50%;background:${d.accent};color:#fff;font-size:12px;font-weight:700;margin-right:8px;border:2px solid ${ink}}
.nav-links{display:flex;gap:2px;margin-left:auto}
.nav-links a{font-size:13px;font-weight:600;color:inherit;text-decoration:none;padding:8px 12px;border-radius:999px}
.nav-links a:hover{background:${d.accent};color:#fff}
.hire{margin-left:6px;background:${ink};color:${bg}!important;font-weight:700}
.menu-btn{display:none;margin-left:auto;background:${d.accent};color:#fff;border:2px solid ${ink};border-radius:12px;padding:6px 12px;font-size:15px;cursor:pointer;font-weight:700}
.mnav{display:none;margin-top:8px;background:${card};border:2px solid ${ink};border-radius:18px;box-shadow:5px 5px 0 ${ink};overflow:hidden}
.mnav.open{display:block}
.mnav a{display:block;padding:11px 18px;color:inherit;text-decoration:none;font-weight:600;border-bottom:2px dashed ${dot}}
@media(max-width:820px){.nav-links,.hire{display:none}.menu-btn{display:block}}
.hero{padding:64px 0 10px;position:relative}
.badge-row{display:flex;gap:10px;flex-wrap:wrap;align-items:center}
.sticker{display:inline-block;font-size:12.5px;font-weight:700;padding:7px 15px;border-radius:999px;background:${card};border:2px solid ${ink};box-shadow:3px 3px 0 ${ink}}
.sticker.acc{background:${d.accent};color:#fff;transform:rotate(-2deg)}
.sticker.rot{transform:rotate(1.5deg)}
.hero h1{font-size:clamp(48px,9vw,104px);margin:22px 0 0;font-weight:700}
.hero h1 .mk{background:linear-gradient(transparent 62%,${d.accent}aa 62%,${d.accent}aa 96%,transparent 96%);padding:0 6px}
.hero .sub{font-size:clamp(18px,3.4vw,28px);font-weight:600;margin-top:12px}
.hero .sub b{color:${d.accent}}
.lede{max-width:620px;font-size:16.5px;margin:16px 0 0}
.cta-row{display:flex;gap:14px;flex-wrap:wrap;margin-top:28px}
.btn{display:inline-flex;align-items:center;gap:8px;padding:14px 28px;border-radius:16px;font-weight:700;font-size:15px;text-decoration:none;border:2px solid ${ink};box-shadow:5px 5px 0 ${ink};transition:.15s;cursor:pointer}
.btn:hover{transform:translate(-2px,-2px);box-shadow:7px 7px 0 ${ink}}
.btn-p{background:${d.accent};color:#fff}
.btn-w{background:${card};color:${ink}}
.spin{position:absolute;right:4%;top:70px;width:110px;height:110px;animation:spin 12s linear infinite}
@keyframes spin{to{transform:rotate(360deg)}}
@media(max-width:760px){.spin{display:none}}
.tape{margin:54px 0 0;background:${ink};color:${bg};transform:rotate(-1.2deg);overflow:hidden;padding:13px 0;border-top:2px solid ${ink};border-bottom:2px solid ${ink}}
.mq-track{display:flex;gap:38px;width:max-content;animation:mq 24s linear infinite;font-weight:700;font-size:15px;letter-spacing:.1em}
@keyframes mq{to{transform:translateX(-50%)}}
section{padding:60px 0 6px}
.sec-tag{display:inline-block;background:${ink};color:${bg};font-size:12px;font-weight:700;letter-spacing:.16em;padding:7px 16px;border-radius:999px;margin-bottom:14px}
.sec-t{font-size:clamp(30px,5vw,52px);margin:0 0 26px}
.bento{display:grid;grid-template-columns:repeat(6,1fr);gap:16px}
.cell{background:${card};border:2px solid ${ink};border-radius:22px;padding:24px;box-shadow:6px 6px 0 ${ink};transition:.15s}
.cell:hover{transform:translate(-2px,-2px) rotate(0deg)!important;box-shadow:8px 8px 0 ${ink}}
.c4{grid-column:span 4}.c3{grid-column:span 3}.c2{grid-column:span 2}.c6{grid-column:span 6}
@media(max-width:760px){.c4,.c3,.c2{grid-column:span 6}}
.cell h3{margin:0 0 12px;font-size:13px;letter-spacing:.2em}
.cell h3 i{font-style:normal;background:${d.accent};color:#fff;border-radius:8px;padding:2px 9px;margin-right:8px;border:2px solid ${ink}}
.big-n{font-size:46px;font-weight:700}
.big-n small{font-size:15px;opacity:.6}
.tilt-l{transform:rotate(-.6deg)}.tilt-r{transform:rotate(.6deg)}
.skill-wall{display:flex;flex-wrap:wrap;gap:9px;margin-top:10px}
.skill-wall span{font-size:13px;font-weight:700;background:${bg};border:2px solid ${ink};padding:6px 14px;border-radius:999px;box-shadow:2px 2px 0 ${ink}}
.skill-wall span:nth-child(3n){background:${d.accent};color:#fff;transform:rotate(-1.5deg)}
.skill-wall span:nth-child(3n+1){transform:rotate(1deg)}
.job{padding:14px 16px;border:2px solid ${ink};border-radius:16px;margin-bottom:12px;background:${bg}}
.job .when{display:inline-block;font-size:11.5px;font-weight:700;background:${ink};color:${bg};padding:3px 11px;border-radius:999px;margin-bottom:8px}
.job ul{margin:8px 0 0;padding-left:19px;font-size:14px}
.polaroid{border:2px solid ${ink};border-radius:16px;overflow:hidden;margin-bottom:14px;background:${bg};box-shadow:4px 4px 0 ${ink}}
.polaroid .ph{height:92px;position:relative}
.polaroid .ph b{position:absolute;left:16px;bottom:8px;color:#fff;font-size:34px;text-shadow:2px 2px 0 #00000055}
.polaroid .pb{padding:14px 16px}
.polaroid .pb strong{font-size:16px}
.polaroid .pb p{font-size:13.5px;opacity:.75;margin:6px 0}
.ticket{border:2px dashed ${ink};border-radius:16px;padding:14px 16px;margin-bottom:12px;background:${bg}}
.trophy{display:flex;gap:12px;align-items:flex-start;background:${bg};border:2px solid ${ink};border-radius:16px;padding:14px 16px;margin-bottom:12px;box-shadow:4px 4px 0 ${ink};font-size:14px}
.trophy .tp{font-size:24px;line-height:1}
.contact-big{margin-top:8px;background:${d.accent};border:2px solid ${ink};border-radius:28px;padding:clamp(40px,7vw,72px) 30px;text-align:center;color:#fff;box-shadow:8px 8px 0 ${ink};position:relative;overflow:hidden}
.contact-big h2{font-size:clamp(32px,6vw,60px);margin:0;color:#fff}
.contact-big p{opacity:.9}
.btn-k{background:#fff;color:${ink}}
footer{padding:44px 0 60px;text-align:center;font-size:13px;font-weight:600;opacity:.65}
.to-top{position:fixed;right:22px;bottom:22px;width:48px;height:48px;border-radius:14px;border:2px solid ${ink};background:${d.accent};color:#fff;font-size:19px;font-weight:800;cursor:pointer;opacity:0;pointer-events:none;transition:.25s;box-shadow:4px 4px 0 ${ink}}
.to-top.show{opacity:1;pointer-events:auto}
.rv{opacity:0;transform:translateY(24px) rotate(.4deg);transition:opacity .6s ease,transform .6s cubic-bezier(.16,1,.3,1)}
.rv.on{opacity:1;transform:none}
.cell.rv.on.tilt-l{transform:rotate(-.6deg)}.cell.rv.on.tilt-r{transform:rotate(.6deg)}
@media(prefers-reduced-motion:reduce){.rv{opacity:1;transform:none}.mq-track,.spin{animation:none}}
`;

  const skillCell = d.showSections.skills && d.skills.length
    ? `<div class="cell c3 tilt-l rv"><h3><i>★</i>STICKER WALL</h3><div class="big-n">${d.skills.length} <small>tools in the box</small></div><div class="skill-wall">${d.skills.map((s) => `<span>${esc(s)}</span>`).join("")}</div></div>` : "";
  const expCell = d.showSections.experience && d.experience.length
    ? `<div class="cell c3 tilt-r rv"><h3><i>◆</i>JOBS I'VE ROCKED</h3>${yrs !== null ? `<div class="big-n">${yrs}+ <small>yrs at it</small></div>` : ""}${d.experience.slice(0, 3).map((e) => `<div class="job"><span class="when">${esc(e.duration) || "—"}</span><br/><strong>${esc(e.role)}</strong> @ ${esc(e.company)}${e.bullets.length ? `<ul>${e.bullets.slice(0, 3).map((b) => `<li>${esc(b)}</li>`).join("")}</ul>` : ""}</div>`).join("")}</div>` : "";
  const projCell = d.showSections.projects && d.projects.length
    ? `<div class="cell c4 rv"><h3><i>●</i>FRESH FROM THE STUDIO</h3>${d.projects.slice(0, 4).map((p, i) => {
      const h = hueOf(p.name);
      return `<div class="polaroid" style="transform:rotate(${i % 2 ? ".5deg" : "-.5deg"})"><div class="ph" style="background:linear-gradient(120deg,hsl(${h},75%,60%),hsl(${(h + 50) % 360},80%,50%) 60%,hsl(${(h + 110) % 360},70%,45%))"><b>${esc(initials(p.name))}</b></div><div class="pb"><strong>${esc(p.name)}</strong><p>${esc(p.description) || "Ask me about this one — good story."}</p><p style="font-size:12px;font-weight:700">${p.tech.map((t) => esc(t)).join(" · ")}${p.link ? ` · <a href="${esc(p.link)}" target="_blank" rel="noopener" style="color:${d.accent}">Open ↗</a>` : ""}</p></div></div>`;
    }).join("")}</div>` : "";
  const sideCell = (d.showSections.education && d.education.length) || (d.showSections.highlights && d.highlights.length)
    ? `<div class="cell c2 tilt-r rv"><h3><i>▲</i>RECEIPTS</h3><span id="education"></span>${d.showSections.education ? d.education.map((e) => `<div class="ticket"><strong>${esc(e.degree)}</strong><div style="font-size:13px;opacity:.7">${esc(e.school)}${e.year ? ` · ${esc(e.year)}` : ""}</div></div>`).join("") : ""}<span id="highlights"></span>${d.showSections.highlights ? d.highlights.map((h) => `<div class="trophy"><span class="tp">🏆</span><span>${esc(h)}</span></div>`).join("") : ""}</div>` : "";
  const moreExp = d.showSections.experience && d.experience.length > 3
    ? `<div class="cell c6 rv" id="more-work"><h3><i>■</i>THE REST OF THE STORY</h3>${d.experience.slice(3).map((e) => `<div class="job"><span class="when">${esc(e.duration)}</span><br/><strong>${esc(e.role)}</strong> @ ${esc(e.company)}${e.bullets.length ? `<ul>${e.bullets.map((b) => `<li>${esc(b)}</li>`).join("")}</ul>` : ""}</div>`).join("")}</div>` : "";

  return `<!doctype html><html lang="en"><head>${head(d, css)}</head><body id="top">
<div class="nav"><div class="nav-in"><a class="brand" href="#top"><span class="brand-mark">${esc(initials(d.name))}</span>${esc(d.name)}</a><div class="nav-links">${navLinks(d).map((l) => `<a href="${l.href}">${esc(l.label)}</a>`).join("")}</div><a class="nav-links hire" style="text-decoration:none;padding:8px 16px;border-radius:999px" href="#contact">Say hi 👋</a><button class="menu-btn" aria-label="Menu">☰</button></div><div class="mnav">${navLinks(d).map((l) => `<a href="${l.href}">${esc(l.label)}</a>`).join("")}</div></div>
<header class="hero"><div class="wrap" style="position:relative">
<svg class="spin" viewBox="0 0 100 100"><circle cx="50" cy="50" r="46" fill="${d.accent}"/><text x="50" y="58" text-anchor="middle" font-size="34" font-weight="800" fill="#fff">✦</text></svg>
<div class="badge-row"><span class="sticker acc">✦ open for work</span>${d.location ? `<span class="sticker rot">📍 ${esc(d.location)}</span>` : ""}<span class="sticker">★ portfolio ${new Date().getFullYear()}</span></div>
<h1>Hey! I'm<br/><span class="mk">${esc(d.name)}</span></h1>
<p class="sub">a <b>${esc(d.title)}</b> who ships fun, useful stuff.</p>
<p class="lede">${esc(d.summary)}</p>
<div class="cta-row"><a class="btn btn-p" href="#contact">Hire me →</a>${d.projects.length ? `<a class="btn btn-w" href="#projects">See the goods</a>` : ""}</div>
</div></header>
${d.skills.length ? `<div class="tape"><div class="mq-track">${[...d.skills, ...d.skills].map((s) => `<span>✦ ${esc(s.toUpperCase())}</span>`).join("")}</div></div>` : ""}
<section id="about"><div class="wrap"><span class="sec-tag">THE HUMAN</span><h2 class="sec-t rv">Quick intro, no fluff.</h2><div class="cell tilt-l rv"><p style="font-size:17px;margin:0">${esc(d.summary)}</p><div class="badge-row" style="margin-top:16px">${d.email ? `<span class="sticker">✉ ${esc(d.email)}</span>` : ""}${d.phone ? `<span class="sticker rot">${esc(d.phone)}</span>` : ""}${soc.filter((s) => s.label !== "Email").slice(0, 3).map((s) => `<a class="sticker" style="text-decoration:none;color:inherit" href="${esc(s.href)}" target="_blank" rel="noopener">${esc(s.label)} ↗</a>`).join("")}</div></div></div></section>
${d.showSections.skills || d.showSections.experience ? `<section id="skills"><div class="wrap"><span class="sec-tag">THE GOODS</span><h2 class="sec-t rv">Skills meet proof.</h2><div class="bento">${skillCell}${expCell}</div></div></section>` : ""}
${d.showSections.projects || d.showSections.education || d.showSections.highlights ? `<section id="work"><div class="wrap"><span class="sec-tag">RECEIPTS</span><h2 class="sec-t rv">Don't take my word for it.</h2><div class="bento" id="projects">${projCell}${sideCell}${moreExp}</div></div></section>` : ""}
${d.showSections.contact ? `<section id="contact"><div class="wrap"><div class="contact-big rv"><h2>Let's make<br/>something cool.</h2><p>${esc(d.email)}${d.phone ? ` · ${esc(d.phone)}` : ""}</p><div class="cta-row" style="justify-content:center"><a class="btn btn-k" style="background:#fff" href="mailto:${esc(d.email)}">Start a project →</a></div><div class="badge-row" style="justify-content:center;margin-top:22px">${soc.filter((s) => s.label !== "Email").map((s) => `<a class="sticker" style="text-decoration:none;color:#1c1917" href="${esc(s.href)}" target="_blank" rel="noopener">${esc(s.label)} ↗</a>`).join("")}</div></div></div></section>` : ""}
<footer>© ${new Date().getFullYear()} ${esc(d.name)} · made with stickers & code · built with ResumeCoded</footer>
<button class="to-top" onclick="window.scrollTo({top:0,behavior:'smooth'})" aria-label="Back to top">↑</button>
${REVEAL_JS}</body></html>`;
}

/* ============================= DISPATCH ============================= */

export function generateStaticHTML(d: PortfolioData): string {
  const t = (d as { template: string }).template;
  if (t === "editorial") return editorialTemplate(d);
  if (t === "terminal") return terminalTemplate(d);
  if (t === "pop") return popTemplate(d);
  return auroraTemplate(d); // "aurora" + legacy "modern"/"minimal"/"bold"
}


