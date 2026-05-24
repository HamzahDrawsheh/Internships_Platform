import { academicDepartmentSelectOptions } from "@/lib/departments";

type TFn = (key: string) => string;

const CORE_COURSES = [
  "Introduction to Data Science",
  "Introduction to Artificial Intelligence",
  "Programming",
  "Object-Oriented Programming (OOP)",
  "Data Structures",
  "Algorithms",
  "Database Systems",
  "Discrete Mathematics",
] as const;

const MATH_COURSES = [
  "Calculus 1",
  "Calculus 2",
  "Linear Algebra",
  "Probability & Statistics",
  "Statistical Inference",
  "Numerical Methods",
] as const;

const AI_COURSES = [
  "Artificial Intelligence",
  "Machine Learning",
  "Deep Learning",
  "Natural Language Processing (NLP)",
  "Computer Vision",
  "Intelligent Systems",
] as const;

const DATA_COURSES = [
  "Data Mining",
  "Big Data Analytics",
  "Data Visualization",
  "Data Warehousing",
  "Business Intelligence",
  "Predictive Analytics",
] as const;

const TECH_COURSES = [
  "Operating Systems",
  "Computer Networks",
  "Cloud Computing",
  "Distributed Systems",
  "Software Engineering",
] as const;

export const ALL_PREDEFINED_COURSES: string[] = [
  ...CORE_COURSES,
  ...MATH_COURSES,
  ...AI_COURSES,
  ...DATA_COURSES,
  ...TECH_COURSES,
];

export function buildStudentCourseCategories(t: TFn) {
  return [
    { title: t("profile.student.catCore"), courses: [...CORE_COURSES] },
    { title: t("profile.student.catMath"), courses: [...MATH_COURSES] },
    { title: t("profile.student.catAi"), courses: [...AI_COURSES] },
    { title: t("profile.student.catData"), courses: [...DATA_COURSES] },
    { title: t("profile.student.catTech"), courses: [...TECH_COURSES] },
  ];
}

export function buildStudentDepartmentOptions(t: TFn) {
  return [{ value: "", label: t("profile.student.selectDepartment") }, ...academicDepartmentSelectOptions];
}

export function buildPreferredWorkTypeOptions(t: TFn) {
  return [
    { value: "", label: t("profile.student.noPreference") },
    { value: "remote", label: t("profile.student.remote") },
    { value: "onsite", label: t("profile.student.onsite") },
    { value: "hybrid", label: t("profile.student.hybrid") },
  ];
}

export function buildAvailabilityOptions(t: TFn) {
  return [
    { value: "", label: t("profile.student.notSpecified") },
    { value: "part-time", label: t("profile.student.partTime") },
    { value: "full-time", label: t("profile.student.fullTime") },
  ];
}

export function optionLabel(value: string, options: { value: string; label: string }[]): string {
  return options.find((o) => o.value === value)?.label ?? "—";
}
