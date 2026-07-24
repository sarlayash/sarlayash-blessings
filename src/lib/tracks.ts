export interface TrackDef {
  slug: string;
  program: string;
  title: string;
  tagline: string;
  duration: string;
  eligibility: string[];
  skillsRequired: string[];
  learningOutcomes: string[];
  projects: string[];
  description: string;
}

export const TRACKS: TrackDef[] = [
  {
    slug: "full-stack",
    program: "SarlaYash Blessings Internship",
    title: "Full-Stack Web Development",
    tagline: "Ship production-grade React + Node applications end to end.",
    duration: "12 weeks",
    eligibility: [
      "Undergraduate or postgraduate students",
      "Basic programming knowledge (any language)",
      "Access to a personal computer and reliable internet",
    ],
    skillsRequired: ["HTML/CSS", "JavaScript basics", "Git basics"],
    learningOutcomes: [
      "Build responsive, accessible UIs with React and Tailwind",
      "Design REST APIs and relational schemas",
      "Deploy full-stack applications to production",
      "Write tests and CI pipelines",
    ],
    projects: [
      "Personal portfolio with CMS",
      "Full-stack SaaS starter",
      "Capstone: real client brief with mentor review",
    ],
    description:
      "A rigorous, mentor-guided full-stack track. You will build three production projects, complete weekly reviews, and ship your capstone to a live domain.",
  },
  {
    slug: "data-analytics",
    program: "SarlaYash Blessings Internship",
    title: "Data Analytics",
    tagline: "Turn raw data into decisions leaders trust.",
    duration: "10 weeks",
    eligibility: [
      "Undergraduate or postgraduate students",
      "Comfort with spreadsheets and basic statistics",
    ],
    skillsRequired: ["Excel/Google Sheets", "Basic statistics", "SQL fundamentals (helpful)"],
    learningOutcomes: [
      "Model business questions as analytical problems",
      "Write production SQL against real datasets",
      "Build dashboards in Power BI / Metabase",
      "Communicate findings to non-technical stakeholders",
    ],
    projects: [
      "Retail sales cohort analysis",
      "Marketing attribution dashboard",
      "Capstone: analytics report for a real dataset",
    ],
    description:
      "Learn the analyst workflow used at high-performing teams: framing, cleaning, modeling, visualising, and story-telling with data.",
  },
  {
    slug: "ai-ml",
    program: "SarlaYash Blessings Internship",
    title: "Applied AI & Machine Learning",
    tagline: "Build and ship real ML systems, not toy notebooks.",
    duration: "14 weeks",
    eligibility: [
      "Undergraduate or postgraduate students",
      "Comfort with Python and linear algebra basics",
    ],
    skillsRequired: ["Python", "NumPy / Pandas", "Basic statistics"],
    learningOutcomes: [
      "Train, evaluate, and deploy supervised models",
      "Design retrieval-augmented LLM applications",
      "Set up monitoring and evaluation for ML services",
      "Communicate model trade-offs to product teams",
    ],
    projects: [
      "Tabular ML pipeline with feature store",
      "RAG assistant on a custom knowledge base",
      "Capstone: ML micro-service in production",
    ],
    description:
      "A hands-on Applied AI track. You will train real models, ship an inference API, and build an LLM application with proper evaluation.",
  },
  {
    slug: "product-design",
    program: "SarlaYash Blessings Internship",
    title: "Product & UX Design",
    tagline: "Design experiences that ship and get loved.",
    duration: "10 weeks",
    eligibility: [
      "Undergraduate or postgraduate students",
      "Portfolio not required — curiosity is",
    ],
    skillsRequired: ["Basic visual literacy", "Figma (any level)"],
    learningOutcomes: [
      "Run user research and synthesis",
      "Design responsive interfaces with a component system",
      "Prototype and validate flows with users",
      "Handoff to engineering with production-grade specs",
    ],
    projects: [
      "Redesign of a public product",
      "Design system starter",
      "Capstone: end-to-end product from brief to prototype",
    ],
    description:
      "A modern product design track focused on shipping. You will design real interfaces, run tests with real users, and build a portfolio-quality case study.",
  },
];

export function getTrack(slug: string | null | undefined): TrackDef | undefined {
  if (!slug) return undefined;
  return TRACKS.find((t) => t.slug === slug);
}
