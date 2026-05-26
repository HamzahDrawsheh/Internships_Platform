-- Ensure one row per user and minimal, correct RLS.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'student_additional_info_user_id_key'
      AND conrelid = 'public.student_additional_info'::regclass
  ) THEN
    ALTER TABLE public.student_additional_info
      ADD CONSTRAINT student_additional_info_user_id_key UNIQUE (user_id);
  END IF;
END
$$;

ALTER TABLE public.student_additional_info ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "student_additional_info_select_own" ON public.student_additional_info;
CREATE POLICY "student_additional_info_select_own"
ON public.student_additional_info
FOR SELECT
USING (user_id = auth.uid());

DROP POLICY IF EXISTS "student_additional_info_insert_own" ON public.student_additional_info;
CREATE POLICY "student_additional_info_insert_own"
ON public.student_additional_info
FOR INSERT
WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "student_additional_info_update_own" ON public.student_additional_info;
CREATE POLICY "student_additional_info_update_own"
ON public.student_additional_info
FOR UPDATE
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());
