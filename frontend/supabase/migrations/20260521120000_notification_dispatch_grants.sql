-- Allow authenticated users to call RLS helper functions from server-side authorize checks.
-- In-app notification inserts for other users are performed with service_role only.

grant execute on function public.student_can_notify_company_new_application(uuid, uuid) to authenticated;
grant execute on function public.student_can_notify_company_rating(uuid, uuid) to authenticated;
grant execute on function public.student_can_notify_company_training_evaluation(uuid, uuid) to authenticated;
grant execute on function public.company_can_notify_application_user(uuid, uuid) to authenticated;
