import { PortfolioData, emptyPortfolio } from "./portfolio";

/* ------------------------------------------------------------------ */
/*  Robust resume parser: handles real PDF output (messy spacing,      */
/*  ALL-CAPS headers, inline headers, dates on separate lines, etc.)   */
/* ------------------------------------------------------------------ */

const MONTH = "(?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*";
const DATE_RE = new RegExp(
  `(?:${MONTH}\\.?\\s+)?20\\d\\d\\s*(?:–|—|-|to|till|through|/|\\|)?\\s*(?:(?:${MONTH}\\.?\\s+)?(?:20\\d\\d|present|current|now|date))?`,
  "i"
);
const YEAR_RE = /20\d\d/;
const BULLET_RE = /^[\s]*([•▪▸►◦○●■◆–—\-*·>#]+\s+|o\s+|\d+[.)]\s+)/;
const SECTION_WORDS = /summary|profile|objective|skills|experience|employment|project|education|certification|contact|about|award|achievement|language|interest|leadership|volunteer|publication/i;

const SECTION_MAP: { key: string; patterns: RegExp[] }[] = [
  { key: "summary", patterns: [/professional\s+summary/, /career\s+summary/, /career\s+objective/, /professional\s+profile/, /personal\s+profile/, /\bsummary\b/, /\bprofile\b/, /\bobjective\b/, /about\s+me/, /\bsynopsis\b/] },
  { key: "skills", patterns: [/technical\s+skills/, /core\s+skills/, /key\s+skills/, /areas\sof\sexpertise/, /technical\s+expertise/, /technical\s+proficien/, /key\s+competencies/, /core\s+competencies/, /tools?\s*(&|and|\+)?\s*technolog/, /languages?\s*(&|and|\+)?\s*tools?/, /\bskills\b/, /tech\s+stack/, /technologies/, /competencies/, /proficiencies/, /expertise/] },
  { key: "experience", patterns: [/work\s+experience/, /professional\s+experience/, /relevant\s+experience/, /project\s+experience/, /research\s+experience/, /professional\s+background/, /employment(\s+history)?/, /\bexperience\b/, /work\s+history/, /career\s+history/, /career\b/, /internships?/] },
  { key: "projects", patterns: [/personal\s+projects?/, /key\s+projects?/, /selected\s+projects?/, /notable\s+projects?/, /academic\s+projects?/, /key\s+initiatives?/, /\bprojects?\b/, /portfolio(\s+highlights?)?/, /open\s+source/, /freelance/] },
  { key: "education", patterns: [/\beducation\b/, /academic(\s+background)?/, /scholastic/, /qualification/, /university/, /college/, /training\b/] },
  { key: "certifications", patterns: [/certifications?/, /licen[sc]es?/, /credentials?/, /certificates?/, /courses?\s*(&|and)?\s*(completed|certified)?/, /\bbadges?\b/] },
  { key: "achievements", patterns: [/achievements?/, /accomplishments?/, /awards?(\s*(&|and)\s*honou?rs?)?/, /honou?rs?/, /recognition/, /publications?/, /leadership/, /volunteer/, /extra[- ]?curricular/, /activities/, /interests?/, /hobbies/] },
  { key: "languages", patterns: [/languages?\s+known/, /spoken\s+languages?/, /^languages?$/] },
  { key: "links", patterns: [/^links?$/, /online\s+profiles?/, /web\s+presence/, /find\s+me(\s+online)?/, /^contact(\s+(info|details))?$/, /^websites?$/, /socials?\b/] },
];

function normalize(raw: string): string {
  const cleaned = raw
    .replace(/\r/g, "\n")
    // De-obfuscate emails: "name [at] gmail [dot] com"
    .replace(/\s*\[at\]\s*/gi, "@")
    .replace(/\s*\(at\)\s*/gi, "@")
    .replace(/\s*\[dot\]\s*/gi, ".")
    .replace(/\s*\(dot\)\s*/gi, ".")
    // Ligatures + smart punctuation common in PDFs
    .replace(/ﬁ/g, "fi").replace(/ﬂ/g, "fl").replace(/ﬀ/g, "ff")
    .replace(/ﬃ/g, "ffi").replace(/ﬄ/g, "ffl")
    .replace(/[“”„]/g, '"').replace(/[‘’‚]/g, "'").replace(/…/g, "...")
    .replace(/[\u00ad\u200b-\u200f\u2028\u2029]/g, "")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .replace(/[\u2013\u2014\u2212]/g, "-")
    .replace(/[●■◆▪▸►◦○◘]/g, "•")
    // Rejoin words hyphenated across PDF line breaks: "develop-\nment"
    .replace(/(\w)-\n(\w)/g, "$1$2")
    // Two-digit years to four digits: "Jun'19" -> "Jun 2019", "2020-22" -> "2020 - 2022"
    .replace(/\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)[a-z]*\s*['’](\d{2})\b/gi, (_, m, yy) => m + " " + (+yy <= 39 ? "20" + yy : "19" + yy))
    .replace(/\b((?:19|20)\d{2})\s*[-–]\s*(\d{2})\b/g, (_, full, tail) => full + " - " + full.slice(0, 2) + tail)
    // Unspaced date ranges: "2020-2022", "2022-Present" -> spaced (year-ish tokens only)
    .replace(/\b((?:19|20)\d{2}|Present)\s*[-–]\s*((?:19|20)\d{2}|Present)\b/gi, "$1 - $2")
    .replace(/[ \t\u00a0]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  // Letter-spaced headers some PDFs emit ("S U M M A R Y") -> collapse to one word
  return cleaned.split("\n").map((l) =>
    /^([A-Za-z0-9]\s){2,}[A-Za-z0-9]\s*$/.test(l) ? l.replace(/\s+/g, "") : l
  ).join("\n").trim();
}

function isSectionHeader(line: string): string | null {
  // Strip numbering / decoration: "1. EXPERIENCE", "=== SKILLS ===", "SKILLS:", "★ EXPERIENCE"
  let clean = line
    .replace(/^[\s\d.\-#*=:|_★☆•]+\s*/, "")
    .replace(/[\s\d.\-#*=:|_★☆]+\s*$/, "")
    .trim();
  if (!clean || clean.length > 45) return null;
  // Inline header like "SKILLS: React, Node" -> treat as header only if label part matches
  const beforeColon = clean.split(":")[0].trim();
  const test = (s: string) => {
    const lower = s.toLowerCase();
    for (const sec of SECTION_MAP) {
      for (const re of sec.patterns) {
        if (re.test(lower) && lower.length < 40) return sec.key;
      }
    }
    return null;
  };
  return test(clean) ?? (clean.includes(":") ? test(beforeColon) : null);
}

function splitIntoSections(lines: string[]): Record<string, string[]> {
  const sections: Record<string, string[]> = { header: [] };
  let current = "header";
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;
    const sec = isSectionHeader(line);
    if (sec) {
      current = sec;
      if (!sections[current]) sections[current] = [];
      // Inline content after colon: "SKILLS: React, Node" -> keep remainder
      const colonIdx = line.indexOf(":");
      if (colonIdx > 0 && colonIdx < 30) {
        const rest = line.slice(colonIdx + 1).trim();
        if (rest && rest.length > 2) sections[current].push(rest);
      }
      continue;
    }
    sections[current].push(line);
  }

  // Fallback: if PDF collapsed everything into few giant lines, re-split by
  // inline ALL-CAPS headers inside the text (e.g. "...users SUMMARY Full-stack...")
  if (Object.keys(sections).length <= 2) {
    const blob = lines.join("\n");
    const headerRe = /\n?\b(PROFESSIONAL SUMMARY|SUMMARY|TECHNICAL SKILLS|CORE SKILLS|SKILLS|WORK EXPERIENCE|PROFESSIONAL EXPERIENCE|EXPERIENCE|EMPLOYMENT|PROJECTS|PERSONAL PROJECTS|EDUCATION|CERTIFICATIONS)\b\s*:?\n?/gi;
    if (headerRe.test(blob)) {
      const parts = blob.split(headerRe);
      // parts: [header, h1, content1, h2, content2, ...]
      const rebuilt: Record<string, string[]> = { header: [parts[0] || ""] };
      for (let i = 1; i < parts.length; i += 2) {
        const h = (parts[i] || "").toLowerCase().trim();
        const c = parts[i + 1] || "";
        const key = SECTION_MAP.find((s) => s.patterns.some((re) => re.test(h)))?.key ?? h;
        rebuilt[key] = c.split("\n").map((l) => l.trim()).filter(Boolean);
      }
      return rebuilt;
    }
  }
  return sections;
}

function extractContacts(text: string, headerLines: string[]) {
  const email = (text.match(/[\w.+-]+@[\w-]+\.[\w.]{2,}/) || [""])[0].trim();
  // Phone: tolerate international formats — but never match year ranges like "2020 - 2022"
  let phone = "";
  const phoneCandidates = text.match(/(\+\d{1,3}[\s.-]?)?(\(?\d{2,5}\)?[\s.-]?){2,4}\d{3,5}/g) || [];
  for (const cand of phoneCandidates) {
    const digits = cand.replace(/\D/g, "");
    if (digits.length < 7 || digits.length > 15) continue;
    const compact = cand.replace(/[\s().-]/g, "");
    if (/^(19|20)\d{2}[-–](19|20)\d{2}$/.test(compact)) continue; // year range
    if (/^(19|20)\d{2}$/.test(compact)) continue; // lone year
    phone = cand.trim().replace(/\s{2,}/g, " ").slice(0, 25);
    break;
  }
  const cleanUrl = (u: string) => "https://" + u.replace(/^https?:\/\//i, "").replace(/[,.)\]]+$/, "");
  const liM = text.match(/(?:https?:\/\/)?(?:www\.)?linkedin\.com\/[^\s|,;)\]]+/i);
  const linkedin = liM ? cleanUrl(liM[0]) : "";
  const ghM = text.match(/(?:https?:\/\/)?(?:www\.)?github\.com\/[A-Za-z0-9_.-]+(?:\/[A-Za-z0-9_.-]+)?/i);
  const github = ghM ? cleanUrl(ghM[0]) : "";

  // Extra public profiles (X, Medium, Behance, …)
  const PROFILE_RES: { label: string; re: RegExp }[] = [
    { label: "X", re: /(?:https?:\/\/)?(?:www\.)?(?:twitter|x)\.com\/[A-Za-z0-9_]+/i },
    { label: "Medium", re: /(?:https?:\/\/)?(?:www\.)?medium\.com\/@[A-Za-z0-9_.-]+|(?:https?:\/\/)?[A-Za-z0-9-]+\.medium\.com/i },
    { label: "Behance", re: /(?:https?:\/\/)?(?:www\.)?behance\.net\/[A-Za-z0-9_.-]+/i },
    { label: "Dribbble", re: /(?:https?:\/\/)?(?:www\.)?dribbble\.com\/[A-Za-z0-9_.-]+/i },
    { label: "GitLab", re: /(?:https?:\/\/)?(?:www\.)?gitlab\.com\/[A-Za-z0-9_.-]+/i },
    { label: "Stack Overflow", re: /(?:https?:\/\/)?(?:www\.)?stackoverflow\.com\/users\/\d+\/[A-Za-z0-9_.-]*/i },
    { label: "Kaggle", re: /(?:https?:\/\/)?(?:www\.)?kaggle\.com\/[A-Za-z0-9_.-]+/i },
    { label: "LeetCode", re: /(?:https?:\/\/)?(?:www\.)?leetcode\.com\/[A-Za-z0-9_.-]+/i },
  ];
  const links: { label: string; url: string }[] = [];
  for (const p of PROFILE_RES) {
    const m = text.match(p.re);
    if (m) {
      const url = cleanUrl(m[0]);
      if (!links.some((l) => l.url === url)) links.push({ label: p.label, url });
    }
  }

  // Personal website: first URL-looking token that is NOT part of an email
  // (lookbehind rejects "email.com" inside "name@email.com") and NOT a
  // free-mail domain. LinkedIn/GitHub/socials are handled separately.
  let website = "";
  const EMAIL_DOMAINS = ["gmail", "yahoo", "outlook", "hotmail", "icloud", "protonmail", "proton", "zoho", "gmx", "aol", "email", "mail", "example", "yandex", "rediffmail"];
  const urlRes = /(?<![\w@.])(?:https?:\/\/)?(?:www\.)?[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.(?:dev|me|io|com|app|tech|in|design|co|net|org|site|online|portfolio|studio|xyz)(?![A-Za-z])(?:\/[^\s|,;)\]]*)?/gi;
  const seen = new Set<string>();
  urlRes.lastIndex = 0;
  let um: RegExpExecArray | null;
  while ((um = urlRes.exec(text)) !== null) {
    const raw = um[0].replace(/[,.)\]]+$/, "");
    const lower = raw.toLowerCase();
    if (seen.has(lower)) continue;
    seen.add(lower);
    if (/linkedin|github|twitter|medium|behance|dribbble|gitlab|stackoverflow|kaggle|leetcode|x\.com/i.test(lower)) continue;
    const noScheme = lower.replace(/^(https?:\/\/)?(www\.)?/, "");
    const label = noScheme.split(/[/.]/)[0];
    const root = label;
    if (EMAIL_DOMAINS.includes(root)) continue;
    // Reject degree/tech fragments without a URL prefix: "B.Tech", "M.Tech"
    if (!/^(https?:\/\/|www\.)/i.test(raw) && label.length < 2) continue;
    if (email && lower.includes("@" + email.split("@")[1].toLowerCase())) {
      // Same domain as email provider already excluded above; personal domain shared
      // with email (you@you.dev) is fine — keep it.
    }
    website = raw.startsWith("http") ? raw : "https://" + raw;
    break;
  }
  if (website === linkedin || website === github) website = "";

  // Location: "City, Region" — first word MUST be a known city (rejects
  // "Google, Bangalore" company lines), plus single-city fallback.
  const KNOWN_CITIES = ["Bengaluru", "Bangalore", "Mumbai", "Delhi", "New Delhi", "Hyderabad", "Chennai", "Pune", "Kolkata", "Noida", "Gurgaon", "Gurugram", "Ahmedabad", "Jaipur", "Kochi", "Coimbatore", "Indore", "Bhopal", "Lucknow", "Chandigarh", "Nagpur", "Surat", "Remote", "San Francisco", "New York", "Seattle", "Austin", "Boston", "Chicago", "Los Angeles", "London", "Toronto", "Berlin", "Singapore", "Sydney", "Dubai", "Dublin"];
  const headerBlob = headerLines.slice(0, 8).join(" | ");
  let location = "";
  const cityState = headerBlob.match(/([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+)?)\s*,\s*([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+)?)/);
  if (cityState && !cityState[0].includes("@") && !SECTION_WORDS.test(cityState[0]) && cityState[0].length < 40) {
    const first = cityState[1].trim();
    if (KNOWN_CITIES.some((c) => c.toLowerCase() === first.toLowerCase())) {
      location = cityState[0].slice(0, 60);
    }
  }
  if (!location) {
    const found = KNOWN_CITIES.find((c) => new RegExp(`\\b${c}\\b`, "i").test(headerBlob));
    if (found) {
      const country = /india/i.test(headerBlob) ? ", India" : "";
      location = found + country;
    }
  }
  return { email, phone, linkedin, github, website, location, links };
}

function detectName(lines: string[]): string {
  const skip = /resume|curriculum|cv\b|@|http|\d{4}|summary|profile|objective|skill|experience|employment|project|education|certificat|award|achievement|language|interest|leadership|volunteer|publication|coursework/i;
  for (const line of lines.slice(0, 6)) {
    if (line.length > 70) continue; // collapsed blob line — handled below
    const clean = line.replace(/^[^A-Za-z]+/, "").replace(/[^A-Za-z .'-].*$/, "").trim();
    if (!clean || skip.test(line)) continue;
    const words = clean.split(/\s+/);
    if (words.length >= 2 && words.length <= 4 && clean.length >= 4 && clean.length <= 45) {
      if (words.every((w) => /^[A-Z][a-z'.-]*$/.test(w) || /^[A-Z]+$/.test(w))) {
        return words.map((w) => (w === w.toUpperCase() && w.length > 1 ? cap(w.toLowerCase()) : w)).join(" ");
      }
    }
  }
  // Collapsed single-line PDF: name is the first 2 capitalized words, provided a
  // role keyword follows shortly ("Priya Nair Product Designer Bengaluru...")
  const blob = lines.slice(0, 3).join(" ");
  const collapsed = blob.match(/^([A-Z][a-z]+ [A-Z][a-z]+)(?=\s+[A-Z][a-z]*)/);
  if (collapsed) {
    const after = blob.slice(collapsed[0].length, collapsed[0].length + 60);
    if (/developer|engineer|designer|manager|analyst|scientist|consultant|architect|lead|intern|founder|specialist|marketer|writer/i.test(after)) {
      return collapsed[1];
    }
  }
  // ALL CAPS single name line fallback
  const first = (lines[0] || "").trim();
  if (first && first.length < 45 && !first.includes("@")) return toTitleCase(first.split("|")[0].split(" at ")[0]);
  return "Your Name";
}

function detectTitle(lines: string[], summary: string): string {
  const blob = lines.slice(0, 6).join(" | ");
  // Abbreviations first (with levels: "SDE-2" -> "Software Development Engineer II")
  const sde = blob.match(/\bSDE\s*[-–]?\s*([123])\b/i);
  if (sde) return "Software Development Engineer " + (["", "I", "II", "III"][+sde[1]]);
  if (/\bSDE\b/i.test(blob)) return "Software Development Engineer";
  if (/\bSWE\b/i.test(blob)) return "Software Engineer";
  const roles = ["Full-Stack Developer", "Frontend Developer", "Backend Developer", "Frontend Engineer", "Backend Engineer", "Fullstack Developer", "Software Engineer", "Senior Software Engineer", "Full Stack Developer", "Data Scientist", "Data Analyst", "Data Engineer", "DevOps Engineer", "Site Reliability Engineer", "Security Engineer", "Mobile Developer", "iOS Developer", "Android Developer", "Game Developer", "UI/UX Designer", "Product Designer", "Product Manager", "Project Manager", "QA Engineer", "ML Engineer", "AI Engineer", "Solutions Architect", "Business Analyst", "Founder", "Intern", "Student"];
  for (const r of roles) {
    if (new RegExp(r.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i").test(blob)) return r;
  }
  const generic = blob.match(/([A-Za-z]+(?:\s+[A-Za-z]+){0,3}\s*(?:Developer|Engineer|Designer|Manager|Analyst|Scientist|Consultant|Architect|Lead|Intern|Student|Specialist|Marketer|Accountant))/);
  if (generic) return toTitleCase(generic[1].trim().slice(0, 60));
  const fromSummary = summary.match(/(?:am|as|a|an)\s+([a-z-]+\s+(?:developer|engineer|designer|manager|analyst|scientist))/i);
  if (fromSummary) return toTitleCase(fromSummary[1].slice(0, 60));
  return "Software Developer";
}

const KNOWN_SKILLS = [
  "React", "Next.js", "TypeScript", "JavaScript", "Node.js", "Express", "NestJS", "Remix", "Nuxt", "Gatsby", "Astro",
  "Python", "Django", "Flask", "FastAPI", "Pandas", "NumPy", "Scikit-learn", "Matplotlib", "TensorFlow", "PyTorch",
  "Java", "Spring", "Kotlin", "Swift", "Objective-C", "Dart", "Flutter", "React Native",
  "Go", "Rust", "C++", "C#", "PHP", "Ruby", "Rails", "Scala", "Perl", "Elixir", "Solidity", "MATLAB", "VBA",
  "HTML", "CSS", "Sass", "Tailwind CSS", "Bootstrap", "Material UI", "Chakra UI", "Ant Design", "Styled Components",
  "Redux", "Zustand", "Vue", "Angular", "Svelte", "jQuery", "Three.js", "D3.js", "GSAP", "Framer Motion",
  "PostgreSQL", "MySQL", "MongoDB", "Redis", "SQLite", "Firebase", "Supabase", "Prisma", "Sequelize", "Mongoose", "Snowflake", "BigQuery", "Elasticsearch",
  "AWS", "GCP", "Azure", "Docker", "Kubernetes", "Terraform", "CI/CD", "Jenkins", "CircleCI", "GitHub Actions", "Vercel", "Netlify", "Heroku", "Nginx",
  "Git", "Linux", "Bash", "PowerShell", "Vim",
  "Figma", "Sketch", "Photoshop", "Illustrator", "InDesign", "After Effects", "Premiere", "Blender", "Unity", "Unreal", "Canva",
  "OpenAI", "LangChain", "Hugging Face", "Spark", "Hadoop", "Airflow", "dbt", "Kafka", "RabbitMQ",
  "GraphQL", "tRPC", "REST", "gRPC", "WebSockets", "Socket.io", "Auth0", "Clerk", "Stripe", "Twilio", "Postman",
  "Jest", "Cypress", "Playwright", "Mocha", "JUnit", "RSpec", "Selenium",
  "Jira", "Confluence", "Notion", "Slack", "Agile", "Scrum", "Kanban",
  "Excel", "Tableau", "Power BI", "Looker", "Salesforce", "HubSpot", "WordPress", "Shopify",
  "VS Code", "Visual Studio Code", "IntelliJ", "Xcode", "Android Studio",
];

const SKILL_LEVEL_RE = /\s*[([](beginner|intermediate|advanced|expert|proficient|fluent|native|basic)[)\]]?\s*$/i;

function stripSkillLevel(s: string): string {
  return s
    .replace(/\s*\((beginner|intermediate|advanced|expert|proficient|fluent|native|basic|[^()]{1,15})\)\s*$/i, (m, inner) =>
      /beginner|intermediate|advanced|expert|proficient|fluent|native|basic/i.test(inner) ? "" : m)
    .replace(SKILL_LEVEL_RE, "")
    .replace(/\s+[-–:]\s*(beginner|intermediate|advanced|expert|proficient).*$/i, "")
    .trim();
}

function parseSkills(raw: string, fullText: string): string[] {
  const out: string[] = [];
  const push = (s: string) => {
    let c = stripSkillLevel(s.replace(/^[-–•*|\s]+/, "").replace(/[.]+$/, "").trim());
    if (!c || c.length > 28 || c.split(/\s+/).length > 4) return;
    if (/^(and|with|using|including|etc|plus)$/i.test(c)) return;
    if (/\d\s*(yrs?|years?)\b/i.test(c)) return; // "Python 3 years" fragments
    // Unbalanced parens = truncated fragment ("1. LedgerDB (Java"), not a skill
    const opens = (c.match(/\(/g) || []).length, closes = (c.match(/\)/g) || []).length;
    if (opens !== closes) return;
    if (!out.some((o) => o.toLowerCase() === c.toLowerCase())) out.push(c);
  };
  const pushKnownFrom = (p: string): boolean => {
    let found = false;
    for (const k of KNOWN_SKILLS) {
      if (new RegExp(`\\b${k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i").test(p)) { push(k); found = true; }
    }
    return found;
  };
  if (raw) {
    // Handle "Category: a, b, c" lines — take content after colon
    for (const line of raw.split("\n")) {
      const content = line.includes(":") && line.split(":")[0].length < 30 ? line.split(":").slice(1).join(":") : line;
      for (const part of content.split(/[,;|•·▪/\\]+/)) {
        const p = part.trim();
        if (!p) continue;
        if (p.length > 60) { pushKnownFrom(p); continue; }
        if (!/[,;|•·]/.test(content) && p.includes(" ")) {
          // No delimiters in this line ("Python Java Django" or a stray sentence):
          // keep recognised tech, or short 1–2 word phrases — never whole sentences.
          if (pushKnownFrom(p)) continue;
          if (p.split(/\s+/).length > 2) continue;
        }
        push(p);
      }
    }
  }
  // Top-up from known skills mentioned anywhere (catches missing SKILLS section)
  if (out.length < 6) {
    for (const k of KNOWN_SKILLS) {
      if (out.length >= 18) break;
      // Skip if already covered by a longer skill ("Spring" vs "Spring Boot")
      if (out.some((o) => o.toLowerCase().includes(k.toLowerCase()))) continue;
      if (new RegExp(`\\b${k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i").test(fullText)) push(k);
    }
  }
  return out.slice(0, 20);
}

interface Exp { role: string; company: string; duration: string; bullets: string[] }

const ROLE_WORDS = /engineer|developer|designer|manager|analyst|scientist|consultant|architect|intern|lead|specialist|founder|associate|\bsde\b|\bswe\b|\bqa\b|devops|accountant|marketer/i;

/** Split "Role - Company", "Role @ Company", "Role | Company", "Role, Company", "Role at Company" */
function splitRoleCompany(noDate: string): { role: string; company: string } {
  const clean = noDate.replace(/\s{2,}/g, " ").replace(/\(\s*\)/g, "").replace(/^[|\-–—,;:\s]+/, "").replace(/[|\-–—,;:\s]+$/, "").trim();
  if (!clean) return { role: "", company: "" };
  const patterns = [
    /^(.*?)\s+[@|]\s+(.+)$/,                       // @ or |
    /^(.*?)\s+[—–-]\s+(.+)$/,                       // dash with spaces (post-normalize hyphen)
    /^(.*?)\s+\bat\b\s+(.+)$/i,                     // " at "
    /^(.*?),\s*(.+)$/,                              // comma
  ];
  for (const re of patterns) {
    const m = clean.match(re);
    if (m && m[1].trim() && m[2].trim()) {
      let role = m[1].trim(), company = m[2].trim();
      if (ROLE_WORDS.test(company) && !ROLE_WORDS.test(role)) [role, company] = [company, role];
      return { role, company };
    }
  }
  return { role: clean, company: "" };
}

function parseExperience(raw: string, fallbackTitle: string): Exp[] {
  if (!raw.trim()) return [];
  const lines = raw.split("\n").map((l) => l.trim()).filter(Boolean);
  const entries: Exp[] = [];
  let cur: Exp | null = null;
  const flush = () => { if (cur && (cur.role || cur.company || cur.bullets.length)) entries.push(cur); cur = null; };

  const isBullet = (l: string) => BULLET_RE.test(l) || (cur !== null && l.length > 130);
  const hasDate = (l: string) => DATE_RE.test(l) && YEAR_RE.test(l);
  const isDateOnlyLine = (l: string) => {
    const m = l.match(DATE_RE);
    if (!m || !YEAR_RE.test(l)) return false;
    return l.replace(m[0], "").trim().length < 8;
  };

  for (const line of lines) {
    if (isBullet(line)) {
      if (!cur) cur = { role: fallbackTitle, company: "", duration: "", bullets: [] };
      cur.bullets.push(line.replace(BULLET_RE, "").trim().slice(0, 220));
      continue;
    }
    if (isDateOnlyLine(line)) {
      // Date on its own line belongs to the current (or next) entry
      const m = line.match(DATE_RE);
      const duration = m ? m[0].trim().slice(0, 40) : "";
      if (cur && !cur.duration) cur.duration = duration;
      else if (cur && cur.bullets.length === 0 && !cur.duration) cur.duration = duration;
      else {
        flush();
        cur = { role: fallbackTitle, company: "", duration, bullets: [] };
      }
      continue;
    }
    if (hasDate(line) || line.length < 110) {
      const dateM = line.match(DATE_RE);
      const hasYear = YEAR_RE.test(line);
      const looksLikeHeader = /[@|]/.test(line) || /\s+[—–-]\s+/.test(line) || /\bat\b/i.test(line) || hasYear || /^[A-Z]/.test(line);
      if (looksLikeHeader) {
        flush();
        const duration = dateM && hasYear ? dateM[0].trim().slice(0, 40) : "";
        const noDate = duration ? line.replace(duration, "") : line;
        const { role, company } = splitRoleCompany(noDate);
        cur = {
          role: role ? toTitleCase(role.slice(0, 70)) : fallbackTitle,
          company: company ? toTitleCase(company.replace(/,$/, "").slice(0, 70)) : "",
          duration,
          bullets: [],
        };
        continue;
      }
    }
    // Plain sentence without header context -> bullet of current
    if (cur) cur.bullets.push(line.replace(BULLET_RE, "").trim().slice(0, 220));
    else cur = { role: fallbackTitle, company: "", duration: "", bullets: [line.slice(0, 220)] };
  }
  flush();

  // Merge runs of bullet-less entries (role / company / date were on separate lines):
  // e.g. ["Software Engineer"] + ["Google, Bangalore"] + ["2020 - Present" + bullets]
  // or ["Senior Engineer @ Razorpay"] + ["Jan 2021 - Present" + bullets]
  const merged: Exp[] = [];
  for (const e of entries) {
    const prev = merged[merged.length - 1];
    if (prev && prev.bullets.length === 0) {
      const shortLeftover = !ROLE_WORDS.test(e.role) && e.role.split(/\s+/).filter(Boolean).length <= 3;
      const eIsDateish = !e.company && e.duration && (e.role === fallbackTitle || DATE_RE.test(e.role) || shortLeftover);
      if (eIsDateish) {
        // Date on its own line, or date + location fragment ("Jan 2021 - Present | Bengaluru"):
        // absorb duration + bullets into prev, keep the location fragment as company suffix.
        if (!prev.duration) prev.duration = e.duration;
        if (e.role && e.role !== fallbackTitle && !DATE_RE.test(e.role)) {
          prev.company = prev.company
            ? prev.company.replace(/[\s,;]+$/, "") + ", " + e.role
            : e.role;
        }
        prev.bullets = e.bullets;
        continue;
      }
      if (!prev.company && !prev.duration && e.bullets.length > 0 && e.role !== fallbackTitle && !ROLE_WORDS.test(e.role)) {
        // role on one line, "Company [, City]" + date + bullets on following lines:
        // e.g. ["Software Engineer"] + ["Google, Bangalore", "2020 - Present", bullets]
        prev.company = toTitleCase(([e.role, e.company].filter(Boolean).join(", ")).slice(0, 70));
        prev.duration = e.duration;
        prev.bullets = e.bullets;
        continue;
      }
      if (!e.bullets.length && !e.duration) {
        // company-only continuation line
        if (!prev.company && e.role && e.role !== fallbackTitle) {
          prev.company = toTitleCase(((e.company ? e.company + ", " : "") + e.role).slice(0, 70));
          continue;
        }
      }
      if (!prev.company && e.company && !e.bullets.length && !e.duration) {
        prev.company = e.company;
        if (!prev.duration && e.duration) prev.duration = e.duration;
        continue;
      }
    }
    merged.push(e);
  }
  return merged.slice(0, 6).map((e) => ({ ...e, bullets: e.bullets.slice(0, 6) }));
}

function parseProjects(raw: string, skills: string[]): PortfolioData["projects"] {
  if (!raw.trim()) return [];
  // Explicit bullet chars only — numbered "1. Name" lines are headers, not bullets.
  const isProjBullet = (l: string) => /^[•\-*·▪▸►◦○●■◆>#]/.test(l.trim());
  const stripNum = (l: string) => l.replace(/^\d+[.)]\s+/, "").trim();
  // Split into blocks: a short non-bullet line following bullets/desc starts a new project.
  const lines = raw.split("\n").map((l) => l.trim()).filter(Boolean);
  const blocks: string[][] = [];
  let cur: string[] = [];
  for (const line of lines) {
    const bullet = isProjBullet(line);
    const numberedHead = /^\d+[.)]\s+/.test(line.trim());
    if (!bullet && cur.length > 0 && (numberedHead || (line.length < 100 && cur.some((l) => isProjBullet(l) || stripNum(l).length > 80)))) {
      blocks.push(cur); cur = [line];
    } else cur.push(line);
  }
  if (cur.length) blocks.push(cur);

  return blocks.slice(0, 6).map((b) => {
    const linkM = b.join(" ").match(/https?:\/\/[^\s,;)]+|github\.com\/[^\s,;)]+/i);
    let link = linkM ? linkM[0].replace(/[,.)]+$/, "") : "";
    if (link && !link.startsWith("http")) link = "https://" + link;
    let name = stripNum(b[0].replace(BULLET_RE, "").trim());
    let tech: string[] = [];
    // "Name (Tech, Tech)" — parens anywhere, remainder becomes description
    let remainder = "";
    const paren = name.match(/^(.*?)\s*\(([^)]{2,60})\)\s*(.*)$/);
    if (paren) {
      name = paren[1].trim();
      tech = paren[2].split(/[,|]/).map((t) => t.trim()).filter(Boolean).slice(0, 6);
      remainder = paren[3].replace(/^[-–—|:,;\s]+/, "").trim();
    } else {
      // "Name — Tech, Tech" or "Name | Tech" (tech part must look like tech);
      // otherwise "Name - one-line description" (name short, no sentence break).
      const m = name.match(/^(.*?)\s*[—–\-|:]\s*([A-Za-z0-9.+#\/, |]{2,80})$/);
      if (m && /react|node|python|next|aws|docker|typescript|java|flutter|tailwind|mongo|sql|figma|vue|angular|go\b|rust|kotlin|kafka|redis|postgres|spring/i.test(m[2])) {
        name = m[1].trim();
        const cands = m[2].split(/[,|]/).map((t) => t.trim().replace(/[.]+$/, "")).filter(Boolean);
        // A real stack item is short ("Spring Boot") or a known tool ("Visual Studio Code");
        // sentence fragments ("Kafka lag monitor") go back to the description.
        for (const c of cands) {
          const known = KNOWN_SKILLS.some((k) => k.toLowerCase() === c.toLowerCase());
          if ((c.split(/\s+/).length <= 2 || known) && tech.length < 6) tech.push(c);
          else remainder = (remainder ? remainder + ", " : "") + c;
        }
      } else if (m && m[1].trim().length <= 45 && !m[1].includes(". ")) {
        name = m[1].trim(); remainder = (remainder ? remainder + " " : "") + m[2].trim();
      }
    }
    name = name.replace(/\s{2,}/g, " ").replace(/[.]+$/, "").slice(0, 70);
    const descLines = (remainder ? [remainder] : []).concat(b.slice(1).map((l) => stripNum(l.replace(BULLET_RE, "").trim())));
    // Also pick up "Tech: ..." lines inside description; strip links but keep the text
    const desc: string[] = [];
    for (const l of descLines) {
      const tm = l.match(/^(?:tech(?:nologies| stack)?|built with|stack)\s*:\s*(.+)$/i);
      if (tm && !tech.length) tech = tm[1].split(/[,|]/).map((t) => t.trim()).filter(Boolean).slice(0, 6);
      else {
        const noLink = l.replace(/https?:\/\/[^\s,;)]+|github\.com\/[^\s,;)]+/gi, "").replace(/\s{2,}/g, " ").trim();
        if (noLink) desc.push(noLink);
      }
    }
    const descText = desc.join(" ").replace(link, "").trim().slice(0, 320);
    if (!tech.length) {
      // Detect tech actually mentioned in the description ("Kafka lag monitor" -> Kafka)
      for (const k of KNOWN_SKILLS) {
        if (tech.length >= 4) break;
        if (new RegExp(`\\b${k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i").test(name + " " + descText)) tech.push(k);
      }
    }
    return {
      name,
      description: descText,
      tech: tech.length ? tech : skills.slice(0, 3),
      link,
    };
  }).filter((p) => p.name);
}

function parseEducation(raw: string): PortfolioData["education"] {
  if (!raw.trim()) return [];
  const out: PortfolioData["education"][number][] = [];
  for (const line of raw.split("\n").map((l) => l.trim()).filter(Boolean).slice(0, 8)) {
    const clean = line.replace(BULLET_RE, "").trim();
    if (!clean) continue;
    // Bare URL lines belong to contacts, not education
    if (/^(https?:\/\/)?(www\.)?[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)+([/?#][^\s]*)?$/.test(clean)) continue;
    const year = (clean.match(/20\d\d(\s*[-–]\s*20\d\d)?/) || [""])[0];
    const gpa = clean.match(/(?:CGPA|GPA)\s*:?\s*[\d.]+\s*\/?\s*[\d.]*/i)?.[0] ?? "";
    const pct = clean.match(/\b\d{2}(?:\.\d+)?\s*%/)?.[0] ?? "";
    // Year-only continuation line ("2016 - 2020, 85%") belongs to the previous entry
    if (!clean.replace(year, "").replace(gpa, "").replace(pct, "").replace(/[\s,;:\-|]+/g, "")) {
      const prev = out[out.length - 1];
      if (prev) {
        const add = [year, gpa, pct].filter(Boolean).join(" · ");
        if (add && !prev.year.includes(year || gpa || pct)) prev.year = (prev.year ? prev.year + " · " : "") + add;
      }
      continue;
    }
    // Split degree / school (strip year first so "2018 - 2022" isn't split apart)
    let degree = clean, school = "";
    const noYear = clean.replace(year, "").replace(gpa, "").replace(pct, "").replace(/\s{2,}/g, " ").trim();
    const parts = noYear.split(/\s*[—–|]\s*|\s+-\s+|,\s*(?=[A-Z0-9])/).map((p) => p.trim().replace(/[,;:\-|]+\s*$/, "")).filter(Boolean);
    if (parts.length >= 2) {
      // Part with degree keywords is degree
      const di = parts.findIndex((p) => /b\.?tech|b\.?e\b|bachelor|master|m\.?tech|mba|ph\.?d|bca|mca|b\.?sc|m\.?sc|associate|diploma|12th|10th|high school/i.test(p));
      if (di >= 0) {
        degree = parts[di];
        school = parts.filter((_, i) => i !== di).join(", ").replace(year, "").replace(gpa, "").trim().replace(/,$/, "");
      } else {
        degree = parts[0]; school = parts.slice(1).join(", ").replace(year, "").replace(gpa, "").trim().replace(/,$/, "");
      }
      // Secondary split: "B.Tech Computer Science - VTU" -> degree + school
      if (!school && /\s+-\s+/.test(degree)) {
        const sp = degree.split(/\s+-\s+/);
        if (sp.length >= 2 && /b\.?tech|bachelor|master|mba|ph\.?d|bca|mca|b\.?sc|diploma/i.test(sp[0])) {
          degree = sp[0].trim(); school = sp.slice(1).join(" - ").trim();
        }
      }
    } else {
      degree = clean.replace(year, "").replace(gpa, "").replace(pct, "").trim().replace(/,$/, "");
    }
    out.push({ degree: degree.slice(0, 80), school: school.slice(0, 80), year: [year, gpa, pct].filter(Boolean).join(" · ").slice(0, 48) });
  }
  return out.slice(0, 4);
}

// ------------------------------------------------------------------

/** Pull "Relevant Coursework: A, B, C" lines out of the education blob.
 *  Returns the blob without those lines + coursework tokens (routed to skills). */
function extractCoursework(eduRaw: string): { cleaned: string; tokens: string[] } {
  const kept: string[] = [];
  const tokens: string[] = [];
  for (const line of eduRaw.split("\n")) {
    const m = line.match(/^(?:relevant\s+)?coursework\s*[:\-]\s*(.+)$/i);
    if (m) {
      for (const t of m[1].split(/[,;|•·/]/)) {
        const c = t.trim().replace(/[.]+$/, "");
        if (c && c.length <= 32 && !tokens.some((o) => o.toLowerCase() === c.toLowerCase())) tokens.push(c);
      }
    } else kept.push(line);
  }
  return { cleaned: kept.join("\n"), tokens };
}

/** "LINKS / CONTACT / WEBSITES" sections -> labelled profile links. */
function guessLinkLabel(url: string): string {
  const l = url.toLowerCase();
  if (l.includes("linkedin")) return "LinkedIn";
  if (l.includes("github")) return "GitHub";
  if (l.includes("twitter") || l.includes("x.com")) return "X";
  if (l.includes("medium")) return "Medium";
  if (l.includes("behance")) return "Behance";
  if (l.includes("dribbble")) return "Dribbble";
  if (l.includes("gitlab")) return "GitLab";
  if (l.includes("stackoverflow")) return "Stack Overflow";
  if (l.includes("kaggle")) return "Kaggle";
  if (l.includes("leetcode")) return "LeetCode";
  const root = l.replace(/^(https?:\/\/)?(www\.)?/, "").split(/[/.]/)[0] || "Link";
  return root.charAt(0).toUpperCase() + root.slice(1);
}

function parseLinksSection(raw: string): { label: string; url: string }[] {
  const out: { label: string; url: string }[] = [];
  const urlRe = /((?:https?:\/\/)?(?:www\.)?(?:linkedin\.com|github\.com|twitter\.com|x\.com|medium\.com|behance\.net|dribbble\.com|gitlab\.com|stackoverflow\.com|kaggle\.com|leetcode\.com)[^\s|,;)\]]*|(?<![\w@.])(?:https?:\/\/|www\.)[^\s|,;)\]]+)/gi;
  for (const line of raw.split("\n").map((l) => l.trim()).filter(Boolean).slice(0, 10)) {
    const clean = line.replace(BULLET_RE, "").trim();
    if (!clean || clean.includes("@")) continue;
    // "Label: url" form
    let labelHint = "";
    const cm = clean.match(/^([A-Za-z][A-Za-z .&]{1,24})\s*:\s*(.+)$/);
    const target = cm ? cm[2] : clean;
    if (cm) labelHint = cm[1].trim();
    urlRe.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = urlRe.exec(target)) !== null) {
      let url = m[0].replace(/[,.)\]]+$/, "");
      if (!url) continue;
      if (!url.startsWith("http")) url = "https://" + url;
      if (out.some((o) => o.url === url)) continue;
      out.push({ label: labelHint || guessLinkLabel(url), url });
    }
  }
  return out.slice(0, 6);
}

/** Awards / achievements / spoken languages / interests — data that used to be dropped. */
function parseHighlights(raw: string): string[] {  const out: string[] = [];
  for (const line of raw.split("\n").map((l) => l.trim()).filter(Boolean).slice(0, 12)) {
    // Skip category-label-only lines ("Languages:", "Awards:")
    if (/^(languages?|awards?|achievements?|interests?|hobbies)\s*:?\s*$/i.test(line)) continue;
    let clean = line.replace(BULLET_RE, "").replace(/^\d+[.)]\s+/, "").trim();
    // "Languages: English, Hindi" inline form — keep the content
    const inline = clean.match(/^(?:languages?|awards?|interests?|hobbies)\s*:\s*(.+)$/i);
    if (inline) clean = inline[1].trim();
    if (!clean || clean.length > 120) continue;
    if (!out.some((o) => o.toLowerCase() === clean.toLowerCase())) out.push(clean.slice(0, 120));
  }
  return out.slice(0, 8);
}

export function parseResumeText(raw: string): PortfolioData {
  const data = emptyPortfolio();
  const text = normalize(raw);
  if (!text) return data;
  const lines = text.split("\n").map((l) => l.trim()).filter((l) => l.length > 0);
  const sections = splitIntoSections(lines);
  const get = (...keys: string[]) => {
    for (const k of keys) {
      const hit = Object.keys(sections).find((s) => s === k || s.includes(k));
      if (hit) return sections[hit].join("\n");
    }
    return "";
  };

  data.name = detectName(lines);
  const { email, phone, linkedin, github, website, location, links } = extractContacts(text, sections.header.concat(lines.slice(0, 6)));
  data.email = email; data.phone = phone; data.linkedin = linkedin;
  data.github = github; data.website = website; data.location = location;
  data.links = links.slice(0, 6);

  const summaryRaw = get("summary");
  if (summaryRaw) {
    data.summary = summaryRaw.split("\n").join(" ").replace(/\s{2,}/g, " ").slice(0, 500);
  }
  // Never ship "references available on request" as the portfolio bio
  data.summary = data.summary
    .replace(/references(\s+\w+){0,3}\s+(available|furnished)(\s+\w+){0,3}\s+request\.?/i, "")
    .replace(/\s{2,}/g, " ").trim();

  data.title = detectTitle(lines, data.summary);

  // "Languages" section: tech-y lines (Python, SQL) join skills, spoken ones join highlights
  const langRaw = get("languages");
  let langSkills = "", langSpoken = "";
  if (langRaw) {
    const ls: string[] = [], lh: string[] = [];
    for (const line of langRaw.split("\n")) {
      const content = line.includes(":") && line.split(":")[0].length < 25 ? line.split(":").slice(1).join(":") : line;
      const techy = content.split(/[,;|•·/]/).some((p) =>
        KNOWN_SKILLS.some((k) => new RegExp(`\\b${k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i").test(p.trim())));
      (techy ? ls : lh).push(line);
    }
    langSkills = ls.join("\n"); langSpoken = lh.join("\n");
  }

  const skillsRaw = [get("skills") || get("certifications"), langSkills].filter(Boolean).join("\n");
  data.skills = parseSkills(skillsRaw, text);
  data.experience = parseExperience(get("experience"), data.title);
  data.projects = parseProjects(get("projects"), data.skills);

  // Coursework lives inside education on most resumes — route it to skills
  const { cleaned: eduCleaned, tokens: coursework } = extractCoursework(get("education"));
  data.education = parseEducation(eduCleaned);
  for (const t of coursework) {
    if (data.skills.length >= 20) break;
    if (!data.skills.some((s) => s.toLowerCase() === t.toLowerCase() || t.toLowerCase().includes(s.toLowerCase()))) {
      data.skills.push(t);
    }
  }

  data.highlights = parseHighlights([get("achievements"), langSpoken].filter(Boolean).join("\n"));

  // "LINKS / CONTACT" sections -> labelled profile links (deduped vs header finds)
  for (const l of parseLinksSection(get("links"))) {
    if (data.links.some((x) => x.url === l.url)) continue;
    if ([linkedin, github, website].includes(l.url)) continue;
    if (data.links.length < 6) data.links.push(l);
  }

  // No summary section? Synthesize an honest bio from parsed facts instead of
  // stitching random body lines together.
  if (!data.summary) {
    const bits: string[] = [];
    if (data.title && data.title !== "Software Developer") bits.push(data.title);
    const seenCos = new Set<string>();
    const cos: string[] = [];
    for (const e of data.experience) {
      if (e.company && !seenCos.has(e.company)) { seenCos.add(e.company); cos.push(e.company); }
    }
    const topCos = cos.slice(0, 3);
    if (topCos.length) bits.push(`with experience at ${topCos.join(", ")}.`);
    if (data.skills.length) bits.push(`Skilled in ${data.skills.slice(0, 5).join(", ")}.`);
    const yrs = (() => {
      const all = [...data.experience.map((e) => e.duration)].join(" ").match(/20\d\d/g);
      if (!all) return null;
      const y = new Date().getFullYear() - Math.min(...all.map((v) => parseInt(v, 10)));
      return y >= 1 ? y : null;
    })();
    data.summary = (bits.join(" ") + (yrs ? ` ${yrs}+ years of experience.` : "")).trim().slice(0, 320) ||
      "Welcome to my portfolio — explore my work, projects and background below.";
  }

  // Last resort: no experience/projects/education sections at all, but the
  // body has dates + bullets — parse those (skipping header/contact lines).
  const hasStructured = ["experience", "projects", "education"].some((k) =>
    Object.keys(sections).some((s) => s === k || s.includes(k)));
  if (!data.experience.length && !hasStructured) {
    const maybe = parseExperience(
      lines.slice(6).filter((l) => !l.includes("@") && (DATE_RE.test(l) || BULLET_RE.test(l))).join("\n"),
      data.title
    );
    if (maybe.length) data.experience = maybe;
  }
  // Certifications -> append notable ones to skills so nothing is lost
  const certRaw = get("certifications");
  if (certRaw) {
    for (const c of certRaw.split("\n").slice(0, 5)) {
      const clean = c.replace(BULLET_RE, "").trim().slice(0, 60);
      if (clean && !data.skills.some((s) => clean.toLowerCase().includes(s.toLowerCase()))) {
        if (data.skills.length < 20) data.skills.push(clean.length > 28 ? clean.slice(0, 28) : clean);
      }
    }
  }
  return data;
}

function cap(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function toTitleCase(s: string) {
  const titled = s.replace(/\w\S*/g, (w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());
  // Restore acronyms / numerals that title-casing mangles
  return titled
    .replace(/\bSde\b/g, "SDE").replace(/\bSwe\b/g, "SWE").replace(/\bQa\b/g, "QA")
    .replace(/\bUi\b/g, "UI").replace(/\bUx\b/g, "UX").replace(/\bApi\b/g, "API")
    .replace(/\bAws\b/g, "AWS").replace(/\bHr\b/g, "HR").replace(/\bIt\b(?!\.)/g, "IT")
    .replace(/\bCeo\b/g, "CEO").replace(/\bCto\b/g, "CTO").replace(/\bVp\b/g, "VP")
    .replace(/\bIi\b/g, "II").replace(/\bIii\b/g, "III").replace(/\bIv\b/g, "IV");
}

/* ------------------------------------------------------------------ */
/*  PDF text extraction that PRESERVES line breaks AND column order.    */
/*  Single-column rows read top-to-bottom; two-column resumes (main +   */
/*  sidebar) are de-interleaved so "Experience | React" style merged    */
/*  lines never happen. Hyphenated breaks are rejoined.                 */
/* ------------------------------------------------------------------ */

export interface PdfPart { x: number; endX: number; text: string; eol: boolean }
export interface PdfRow { y: number; h: number; parts: PdfPart[] }
export interface PdfRawItem { x: number; y: number; w: number; str: string; h: number; eol: boolean }

/** Pure: cluster raw pdf.js items into rows. Exported for tests. */
export function buildPdfRows(rawItems: PdfRawItem[]): PdfRow[] {
  const items = [...rawItems].sort((a, b) => b.y - a.y || a.x - b.x);
  const rows: PdfRow[] = [];
  for (const it of items) {
    const row = rows.find((r) => Math.abs(r.y - it.y) < Math.max(3, r.h * 0.4));
    if (row) {
      row.parts.push({ x: it.x, endX: it.x + it.w, text: it.str, eol: it.eol });
      if (it.h > row.h) row.h = it.h;
    } else {
      rows.push({ y: it.y, h: it.h, parts: [{ x: it.x, endX: it.x + it.w, text: it.str, eol: it.eol }] });
    }
  }
  for (const r of rows) r.parts.sort((a, b) => a.x - b.x);
  return rows;
}

function renderPdfParts(parts: PdfPart[], h: number): string {
  let line = "";
  let lastEnd = -Infinity;
  for (const p of parts) {
    const gap = p.x - lastEnd;
    if (line && gap > h * 0.25 && !line.endsWith(" ") && !line.endsWith("-")) line += " ";
    line += p.text;
    lastEnd = p.endX;
  }
  return line.replace(/[ \t]+/g, " ").trim();
}

/**
 * Pure: order rows for reading.
 *
 * Each y-row is first split into visual lines using the PDF's own signals:
 *  - hasEOL + cursor resetting left  => genuine line break (single column)
 *  - a wide gap mid-row              => two columns (with or without EOL flags)
 * Spurious mid-line EOL flags (kerned fragments continuing rightward) are ignored.
 *
 * Then a consistent vertical gutter (two-column layout) emits the top band
 * (name + contact headers) first, then the left column top-to-bottom, then
 * the right column. Exported for tests.
 */
export function orderPdfRows(rows: PdfRow[], pageTop: number, pageBottom: number): string[] {
  // 1. Segment every row into visual lines.
  const rowSegs = rows.map((r) => ({ y: r.y, h: r.h, segs: segmentRow(r.parts, r.h) }));

  // 2. Gutter detection from gaps between segments that shared a row.
  const gaps: number[] = [];
  for (const r of rowSegs) {
    for (let i = 1; i < r.segs.length; i++) {
      const prev = r.segs[i - 1], cur = r.segs[i];
      const gap = cur[0].x - prev[prev.length - 1].endX;
      if (gap > 40) gaps.push(prev[prev.length - 1].endX + gap / 2);
    }
  }
  let gutter: number | null = null;
  if (gaps.length) {
    const sorted = [...gaps].sort((a, b) => a - b);
    let best = { x: 0, n: 0 };
    for (const x of sorted) {
      const n = sorted.filter((v) => Math.abs(v - x) < 25).length;
      if (n > best.n) best = { x, n };
    }
    const multiSegRows = rowSegs.filter((r) => r.segs.length > 1).length;
    if (best.n >= 2 && best.n >= multiSegRows * 0.25) gutter = best.x;
  }
  if (gutter === null) {
    return rowSegs.flatMap((r) => r.segs.map((s) => renderPdfParts(s, r.h)));
  }

  const g = gutter;
  const top: string[] = [], left: string[] = [], right: string[] = [];
  const band = (pageTop - pageBottom) * 0.12;
  const centerOf = (s: PdfPart[]) => {
    let x0 = Infinity, x1 = -Infinity;
    for (const p of s) { if (p.x < x0) x0 = p.x; if (p.endX > x1) x1 = p.endX; }
    return (x0 + x1) / 2;
  };
  for (const r of rowSegs) {
    for (const s of r.segs) {
      const txt = renderPdfParts(s, r.h);
      if (!txt) continue;
      if (r.y > pageTop - band) { top.push(txt); continue; } // name/contact headers stay in place
      const startsLeft = s[0].x < g;
      const endsRight = s[s.length - 1].endX > g;
      if (startsLeft && endsRight) {
        // Unsplit row straddling the gutter: split only on real evidence
        // (a clear gap near the gutter), else keep the whole line on its majority side.
        let cut = -1;
        for (let i = 1; i < s.length; i++) {
          const gap = s[i].x - s[i - 1].endX;
          const mid = s[i - 1].endX + gap / 2;
          if (gap > 25 && Math.abs(mid - g) < 40) { cut = i; break; }
        }
        if (cut > 0) {
          const a = renderPdfParts(s.slice(0, cut), r.h);
          const b = renderPdfParts(s.slice(cut), r.h);
          if (a) left.push(a);
          if (b) right.push(b);
          continue;
        }
      }
      if (centerOf(s) < g) left.push(txt);
      else right.push(txt);
    }
  }
  return [...top, ...left, ...right];
}

/** Split one x-sorted y-row into visual lines. See orderPdfRows. */
function segmentRow(parts: PdfPart[], h: number): PdfPart[][] {
  if (parts.length <= 1) return parts.length ? [parts] : [];
  const segs: PdfPart[][] = [];
  let cur: PdfPart[] = [];
  let segStartX = parts[0].x;
  for (let i = 0; i < parts.length; i++) {
    const p = parts[i];
    const next = parts[i + 1];
    cur.push(p);
    if (!next) { segs.push(cur); break; }
    const gapToNext = next.x - p.endX;
    const bigGap = gapToNext > Math.max(60, h * 4);
    const xReset = next.x < segStartX - 2;
    if (bigGap || (p.eol && xReset)) {
      segs.push(cur);
      cur = [];
      segStartX = next.x;
    }
  }
  return segs.filter((s) => s.length);
}

const PAGE_NUM_RE = /^\s*(pages?\s+\d+(\s*(of|\/)\s*\d+)?|\d+\s*\/\s*\d+)\s*$/i;

export async function extractPdfText(file: File): Promise<string> {
  return extractPdfData(await file.arrayBuffer());
}

/** ArrayBuffer entry point — also usable from Node for testing. */
export async function extractPdfData(buf: ArrayBuffer): Promise<string> {
  const pdfjs: any = await import("pdfjs-dist");
  if (typeof window !== "undefined" && !pdfjs.GlobalWorkerOptions.workerSrc) {
    pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.mjs`;
  }
  const pdf = await pdfjs.getDocument({ data: new Uint8Array(buf) }).promise;
  const pages: string[] = [];
  const max = Math.min(pdf.numPages, 8);
  const seenEdge = new Set<string>();
  for (let i = 1; i <= max; i++) {
    pages.push(await extractPageLines(await pdf.getPage(i), seenEdge));
  }
  const text = pages.join("\n").replace(/\n{3,}/g, "\n\n").trim();
  if (text.replace(/\s/g, "").length < 50) throw new Error("No readable text found (scanned image PDF?). Try pasting the text.");
  return text;
}

async function extractPageLines(page: any, seenEdge: Set<string>): Promise<string> {
  const content = await page.getTextContent();
  const raw: PdfRawItem[] = [];
  for (const it of content.items as any[]) {
    const str = typeof it.str === "string"
      ? it.str.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
      : "";
    if (!str || !str.trim()) continue;
    // transform: [scaleX, skewY, skewX, scaleY, x, y]
    const t = it.transform || [0, 0, 0, 0, 0, 0];
    const h = Math.abs(t[3]) || 10;
    const w = typeof it.width === "number" && it.width > 0 ? it.width : str.length * h * 0.55;
    raw.push({ x: t[4], y: t[5], w, str, h, eol: it.hasEOL === true });
  }
  if (!raw.length) return "";
  const ys = raw.map((r) => r.y);
  const rows = buildPdfRows(raw);
  let lines = orderPdfRows(rows, Math.max(...ys), Math.min(...ys));
  lines = lines.map((l) => l.trim()).filter(Boolean);
  // Drop page-number footers ("Page 1", "1 / 3")
  lines = lines.filter((l) => !PAGE_NUM_RE.test(l));
  // Drop repeated running headers/footers (same edge line on every page)
  if (lines.length > 2) {
    const head = lines[0], tail = lines[lines.length - 1];
    if (seenEdge.has("h:" + head)) lines = lines.slice(1);
    else seenEdge.add("h:" + head);
    if (lines.length > 2) {
      const t2 = lines[lines.length - 1];
      if (seenEdge.has("f:" + t2)) lines = lines.slice(0, -1);
      else seenEdge.add("f:" + t2);
    }
  }
  return lines.join("\n");
}

/** Test helper: parse quality summary for UI badges */
export function parseStats(d: PortfolioData) {
  return {
    skills: d.skills.length,
    experience: d.experience.length,
    projects: d.projects.length,
    education: d.education.length,
    contacts: [d.email, d.phone, d.linkedin, d.github].filter(Boolean).length,
    highlights: d.highlights.length,
    links: d.links.length,
  };
}

/** What the parser actually saw — powers the "Parsing report" in step 2. */
export interface ParseMeta {
  sections: { key: string; lines: number }[];
  totalLines: number;
  chars: number;
}

export function getParseMeta(raw: string): ParseMeta {
  const text = normalize(raw);
  const lines = text.split("\n").map((l) => l.trim()).filter((l) => l.length > 0);
  const sections = splitIntoSections(lines);
  return {
    sections: Object.entries(sections)
      .filter(([k]) => k !== "header")
      .map(([key, v]) => ({ key, lines: v.length })),
    totalLines: lines.length,
    chars: text.length,
  };
}
