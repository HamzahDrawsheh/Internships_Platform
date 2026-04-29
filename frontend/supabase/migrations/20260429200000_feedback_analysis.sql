create table public.feedback_analysis (
  id uuid primary key default gen_random_uuid(),
  feedback_id uuid not null
    references public.student_training_evaluations(id)
    on delete cascade
    unique,
  sentiment text not null
    constraint feedback_analysis_sentiment_check
    check (sentiment in ('positive', 'neutral', 'negative')),
  overall_score numeric not null
    constraint feedback_analysis_overall_score_check
    check (overall_score >= 0 and overall_score <= 1),
  learning_value numeric not null
    constraint feedback_analysis_learning_value_check
    check (learning_value >= 0 and learning_value <= 1),
  mentorship_guidance numeric not null
    constraint feedback_analysis_mentorship_guidance_check
    check (mentorship_guidance >= 0 and mentorship_guidance <= 1),
  work_environment numeric not null
    constraint feedback_analysis_work_environment_check
    check (work_environment >= 0 and work_environment <= 1),
  task_relevance numeric not null
    constraint feedback_analysis_task_relevance_check
    check (task_relevance >= 0 and task_relevance <= 1),
  professionalism numeric not null
    constraint feedback_analysis_professionalism_check
    check (professionalism >= 0 and professionalism <= 1),
  workload_fairness numeric not null
    constraint feedback_analysis_workload_fairness_check
    check (workload_fairness >= 0 and workload_fairness <= 1),
  technical_exposure numeric not null
    constraint feedback_analysis_technical_exposure_check
    check (technical_exposure >= 0 and technical_exposure <= 1),
  safety_respect numeric not null
    constraint feedback_analysis_safety_respect_check
    check (safety_respect >= 0 and safety_respect <= 1),
  keywords text[],
  summary text,
  analyzed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
