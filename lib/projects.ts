/** The applications and research projects, as the landing page names and describes them. */
export type Project = {
  name: string;
  role: string;
  /** The mark's file in public/assets/, with the query that refreshes caches when the drawing changes. */
  mark: string;
  description: string;
  /** The project's own site, for the applications that have one. */
  href?: string;
};

const all = {
  atlas: {
    name: "Atlas",
    role: "Central knowledge base",
    mark: "atlas-icon.svg?v=20261113",
    description: "The central knowledge base for the organization, exhaustively exploring a broad range of curated subjects and resources.",
  },
  alidade: {
    name: "Alidade",
    role: "Learning harness",
    mark: "alidade-icon.svg?v=20261113",
    description: "Learn any subject, at any depth. Lessons adapt to your understanding in real time.",
    href: "https://ahmedkhan-gh.github.io/alidade/",
  },
  astrolabe: {
    name: "Astrolabe",
    role: "AI augmented productivity framework",
    mark: "astrolabe-icon.svg?v=20261113",
    description: "One app for specialized work. Move between your tools, with agents where you choose.",
    href: "https://ahmedkhan-gh.github.io/astrolabe/",
  },
  compass: {
    name: "Compass",
    role: "Practice platform",
    mark: "compass-icon.svg?v=20261113",
    description: "Practice technical skills from the absolute basics. Understand first, then accelerate.",
    href: "https://ahmedkhan-gh.github.io/compass/",
  },
  caliper: {
    name: "Caliper",
    role: "Machine learning visualization framework",
    mark: "caliper-icon.svg?v=20261113",
    description: "A native app for interpretability. Observe models directly from the GPU in real time.",
    href: "https://ahmedkhan-gh.github.io/caliper/",
  },
  alioth: {
    name: "Alioth",
    role: "Artificial intelligence research",
    mark: "alioth-icon.svg?v=20261107",
    description: "Foundational work on how models learn, what they represent inside, how to align them, and how to run them efficiently.",
  },
  polaris: {
    name: "Polaris",
    role: "Business systems",
    mark: "polaris-icon.svg?v=20261107",
    description: "Ontology-driven business systems, and the security to protect their data at scale.",
  },
  nebula: {
    name: "Nebula",
    role: "Semiconductor design",
    mark: "nebula-icon.svg?v=20261107",
    description: "From first hardware programs to a full GPU for graphics and machine learning.",
  },
  orion: {
    name: "Orion",
    role: "Applied machine learning",
    mark: "orion-icon.svg?v=20261107",
    description: "Machine learning applied to robotics and biotechnology.",
  },
  quasar: {
    name: "Quasar",
    role: "Quantitative finance",
    mark: "quasar-icon.svg?v=20261107t",
    description: "The mathematics of physics applied to trading, from random walks to how orders move prices.",
  },
} satisfies Record<string, Project>;

export type ProjectKey = keyof typeof all;
export const projects: Record<ProjectKey, Project> = all;

/** The applications, in the order the site lists them. */
export const applications: ProjectKey[] = ["alidade", "astrolabe", "compass", "caliper"];
