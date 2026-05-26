import type { SelectOption } from "@/components/ui";

export type ProfileGender = "" | "male" | "female";

export function isProfileGender(value: unknown): value is "male" | "female" {
  return value === "male" || value === "female";
}

export function normalizeProfileGender(value: unknown): ProfileGender {
  return isProfileGender(value) ? value : "";
}

export function buildGenderOptions(t: (key: string) => string): SelectOption[] {
  return [
    { value: "", label: t("profile.student.genderNotSet") },
    { value: "male", label: t("profile.student.genderMale") },
    { value: "female", label: t("profile.student.genderFemale") },
  ];
}

export function genderLabel(gender: ProfileGender, t: (key: string) => string): string {
  if (gender === "male") return t("profile.student.genderMale");
  if (gender === "female") return t("profile.student.genderFemale");
  return t("profile.student.genderNotSet");
}
