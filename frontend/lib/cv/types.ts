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
};

export type AiCvSuggestion = {
  summary: string;
  skills: string;
  experience: string;
  projects: string;
};
