-- Ensure upsert on user_id is reliable for student_additional_info.
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'student_additional_info_user_id_key'
  ) then
    alter table public.student_additional_info
      add constraint student_additional_info_user_id_key unique (user_id);
  end if;
end
$$;
