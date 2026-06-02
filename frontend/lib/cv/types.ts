export const CV_SKILL_CATEGORY_KEYS = [
  "programmingLanguages",
  "dataAnalysis",
  "machineLearning",
  "deepLearning",
  "dataVisualization",
  "databases",
  "toolsPlatforms",
] as const;

export type CvSkillCategoryKey = (typeof CV_SKILL_CATEGORY_KEYS)[number];

export type CvSkillCategories = Record<CvSkillCategoryKey, string>;

export type CvProjectSlot = {
  name: string;
  technologies: string;
  description: string;
  achievements: string;
  link: string;
};

export const EMPTY_CV_PROJECT_SLOT: CvProjectSlot = {
  name: "",
  technologies: "",
  description: "",
  achievements: "",
  link: "",
};

export const EMPTY_CV_SKILL_CATEGORIES: CvSkillCategories = {
  programmingLanguages: "",
  dataAnalysis: "",
  machineLearning: "",
  deepLearning: "",
  dataVisualization: "",
  databases: "",
  toolsPlatforms: "",
};

export type CvPdfFields = {
  fullName: string;
  email: string;
  phone: string;
  city: string;
  summary: string;
  university: string;
  major: string;
  education: string;
  skills: string;
  experience: string;
  projects: string;
  linkedin: string;
  githubPortfolio: string;
  department?: string;
  gpa?: string;
  expectedGraduation?: string;
  optionalCoursework?: string;
  certifications?: string;
  skillCategories?: CvSkillCategories;
  projectSlots?: CvProjectSlot[];
};

export type AiCvSuggestion = {
  summary: string;
  skills: string;
  experience: string;
  projects: string;
};

export const CV_SKILL_CATEGORY_LABELS: Record<CvSkillCategoryKey, string> = {
  programmingLanguages: "Programming Languages",
  dataAnalysis: "Data Analysis",
  machineLearning: "Machine Learning",
  deepLearning: "Deep Learning",
  dataVisualization: "Data Visualization",
  databases: "Databases",
  toolsPlatforms: "Tools & Platforms",
};
