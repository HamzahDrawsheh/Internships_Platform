"use client";

import {
  DashboardCyclicControls,
  DashboardCyclicSyncProvider,
} from "@/components/dashboard/DashboardCyclicSync";
import { TopFitInternshipsWidget } from "@/components/dashboard/student/TopFitInternshipsWidget";
import { TrainingProgressCyclicWidget } from "@/components/dashboard/student/TrainingProgressCyclicWidget";
import { SuggestedStepsWidget } from "@/components/dashboard/student/SuggestedStepsWidget";
import { WeeklyInsightsWidget } from "@/components/dashboard/student/WeeklyInsightsWidget";
import type { InternshipTrackSummary } from "@/lib/internship-reports/track-summary";

type Enrolled = {
  positionTitle: string;
  companyName: string;
  startDate: string;
  endDate: string;
  track: InternshipTrackSummary;
};

type Props = {
  enrolledInternship: Enrolled | null;
  reportsDueCount: number;
  suggestionProps: {
    hasDepartment: boolean;
    hasCv: boolean;
    hasApplied: boolean;
    technicalSkills: string[];
    softSkills: string[];
    takenCourses: string[];
    customCourses: string[];
    preferredField: string | null;
    major: string | null;
  };
};

export function StudentDashboardWidgetsSection({
  enrolledInternship,
  reportsDueCount,
  suggestionProps,
}: Props) {
  return (
    <DashboardCyclicSyncProvider>
      <section className="space-y-3">
        <div className="grid gap-4 lg:grid-cols-3">
          {enrolledInternship ? (
            <TrainingProgressCyclicWidget
              positionTitle={enrolledInternship.positionTitle}
              companyName={enrolledInternship.companyName}
              startDate={enrolledInternship.startDate}
              endDate={enrolledInternship.endDate}
              track={enrolledInternship.track}
              reportsDueCount={reportsDueCount}
            />
          ) : (
            <TopFitInternshipsWidget />
          )}
          <SuggestedStepsWidget {...suggestionProps} />
          <WeeklyInsightsWidget />
        </div>
        <DashboardCyclicControls slideCount={3} />
      </section>
    </DashboardCyclicSyncProvider>
  );
}
