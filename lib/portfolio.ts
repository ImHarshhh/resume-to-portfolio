export type TemplateId = "aurora" | "editorial" | "terminal" | "pop";

export interface Experience {
  role: string;
  company: string;
  duration: string;
  bullets: string[];
}

export interface Project {
  name: string;
  description: string;
  tech: string[];
  link: string;
}

export interface Education {
  degree: string;
  school: string;
  year: string;
}

export interface ProfileLink {
  label: string;
  url: string;
}

export interface PortfolioData {
  name: string;
  title: string;
  email: string;
  phone: string;
  location: string;
  linkedin: string;
  github: string;
  website: string;
  summary: string;
  skills: string[];
  experience: Experience[];
  projects: Project[];
  education: Education[];
  highlights: string[];
  links: ProfileLink[];
  template: TemplateId;
  accent: string;
  darkMode: boolean;
  font: string;
  showSections: {
    skills: boolean;
    experience: boolean;
    projects: boolean;
    education: boolean;
    contact: boolean;
    highlights: boolean;
  };
}

export const ACCENTS = [
  { name: "Indigo", value: "#6366f1" },
  { name: "Emerald", value: "#10b981" },
  { name: "Orange", value: "#f97316" },
  { name: "Pink", value: "#ec4899" },
  { name: "Sky", value: "#0ea5e9" },
  { name: "Violet", value: "#8b5cf6" },
  { name: "Lime", value: "#84cc16" },
  { name: "Cyan", value: "#06b6d6" },
];

export const FONTS: Record<string, string> = {
  Inter: "Inter, system-ui, sans-serif",
  Serif: "Georgia, 'Times New Roman', serif",
  Mono: "'SF Mono', Menlo, monospace",
  Rounded: "'Segoe UI', system-ui, sans-serif",
};

export const emptyPortfolio = (): PortfolioData => ({
  name: "Your Name",
  title: "Full-Stack Developer",
  email: "",
  phone: "",
  location: "",
  linkedin: "",
  github: "",
  website: "",
  summary: "",
  skills: [],
  experience: [],
  projects: [],
  education: [],
  highlights: [],
  links: [],
  template: "aurora",
  accent: "#6366f1",
  darkMode: false,
  font: "Inter",
  showSections: {
    skills: true,
    experience: true,
    projects: true,
    education: true,
    contact: true,
    highlights: true,
  },
});

export const SAMPLE_RESUME = `Harsh Sharma
Full-Stack Developer | Bengaluru, India
harsh.sharma@email.com | +91 98765 43210 | linkedin.com/in/harshsharma | github.com/harshsharma

SUMMARY
Full-stack developer with 3 years of experience building scalable web apps with React, Next.js, Node.js and Python. Shipped products used by 50k+ users. Passionate about clean UI and fast APIs.

SKILLS
React, Next.js, TypeScript, Node.js, Python, PostgreSQL, Tailwind CSS, Docker, AWS, Git

EXPERIENCE
Senior Frontend Engineer — Flexipill | 2023 - Present
- Built dashboard used by 10k+ pharmacies, reduced load time by 40% with code-splitting
- Led migration from CRA to Next.js, improving SEO traffic 2.5x
- Mentored 3 junior developers

Full-Stack Developer — Oncall Agent | 2022 - 2023
- Developed AI calling agent with Twilio + Python, handling 5k calls/day
- Built real-time analytics with WebSockets and Redis
- Deployed on AWS with Docker and CI/CD

EDUCATION
B.Tech Computer Science — VTU | 2018 - 2022

PROJECTS
PlatinumRx Dashboard — React, Next.js, Tailwind
A pharmacy analytics dashboard with real-time inventory tracking. github.com/harshsharma/platinumrx
AI Portfolio Generator — Next.js, OpenAI, Vercel
Upload a resume, get a deployed portfolio site instantly. Used by 2k makers.
`;
