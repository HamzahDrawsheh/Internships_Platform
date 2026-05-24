import { genderLabel, type ProfileGender } from "@/lib/profile/gender";
import { useI18n } from "@/lib/i18n/context";

const FIGURE = "#bdbdbd";
const BG = "#ececec";

const SHOULDER_PATH = "M10 56 Q10 40 32 40 Q54 40 54 56 Z";

/** Classic placeholder: circle head + rounded shoulders with a small gap. */
function MaleSilhouette() {
  return (
    <svg viewBox="0 0 64 64" className="h-full w-full" aria-hidden="true">
      <rect width="64" height="64" fill={BG} />
      <circle cx="32" cy="22" r="10" fill={FIGURE} />
      <path d={SHOULDER_PATH} fill={FIGURE} />
    </svg>
  );
}

/** Same base shape with side hair bumps — single color for head and hair. */
function FemaleSilhouette() {
  return (
    <svg viewBox="0 0 64 64" className="h-full w-full" aria-hidden="true">
      <rect width="64" height="64" fill={BG} />
      <ellipse cx="32" cy="22" rx="11" ry="10.5" fill={FIGURE} />
      <ellipse cx="17.5" cy="26" rx="3" ry="5.5" fill={FIGURE} />
      <ellipse cx="46.5" cy="26" rx="3" ry="5.5" fill={FIGURE} />
      <path d={SHOULDER_PATH} fill={FIGURE} />
    </svg>
  );
}

/** Generic placeholder when gender is not set. */
function NeutralSilhouette({ initial }: { initial: string }) {
  return (
    <div className="relative h-full w-full">
      <svg viewBox="0 0 64 64" className="h-full w-full" aria-hidden="true">
        <rect width="64" height="64" fill={BG} />
        <circle cx="32" cy="22" r="10" fill={FIGURE} />
        <path d={SHOULDER_PATH} fill={FIGURE} />
      </svg>
      <span className="absolute inset-x-0 bottom-1.5 text-center text-[10px] font-bold text-neutral-500">
        {initial}
      </span>
    </div>
  );
}

export function StudentProfileAvatar({
  gender,
  name,
  className = "",
}: {
  gender: ProfileGender;
  name: string;
  className?: string;
}) {
  const { t } = useI18n();
  const initial = (name.trim() || "S").slice(0, 1).toUpperCase();
  const label = gender ? genderLabel(gender, t) : "";
  const ariaLabel = gender ? `${label} profile` : "Profile photo not set";

  return (
    <div
      className={`h-16 w-16 shrink-0 overflow-hidden rounded-2xl border-4 border-white/30 bg-[#ececec] shadow-lg ${className}`}
      role="img"
      aria-label={ariaLabel}
    >
      {gender === "male" ? (
        <MaleSilhouette />
      ) : gender === "female" ? (
        <FemaleSilhouette />
      ) : (
        <NeutralSilhouette initial={initial} />
      )}
    </div>
  );
}
