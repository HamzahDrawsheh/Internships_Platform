export const STUDENT_ASSISTANT_OPEN_EVENT = "internconnect:open-student-assistant";

/** Opens the floating student AI assistant panel (student dashboard layout). */
export function openStudentAssistant() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(STUDENT_ASSISTANT_OPEN_EVENT));
}
