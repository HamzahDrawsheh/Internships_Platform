-- Transactional email queue for DB-triggered notifications + unified platform notify helper.
-- marketing_notifications is never used for this path.

create table if not exists public.transactional_email_queue (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  recipient_email text not null,
  title text not null,
  message text not null,
  type text not null,
  link_path text,
  notification_id uuid references public.notifications(id) on delete set null,
  created_at timestamptz not null default now(),
  processed_at timestamptz,
  attempts int not null default 0,
  last_error text
);

create index if not exists idx_transactional_email_queue_pending
  on public.transactional_email_queue(created_at)
  where processed_at is null;

alter table public.transactional_email_queue enable row level security;

drop policy if exists "transactional_email_queue_deny_all" on public.transactional_email_queue;
create policy "transactional_email_queue_deny_all"
on public.transactional_email_queue
for all
using (false)
with check (false);

-- Creates in-app row when push_notifications; queues email when email_notifications.
create or replace function public.create_platform_notification(
  p_user_id uuid,
  p_title text,
  p_message text,
  p_type text,
  p_related_application_id uuid default null,
  p_related_rating_id uuid default null,
  p_related_conversation_id uuid default null,
  p_link_path text default '/notifications'
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_push boolean := true;
  v_email boolean := true;
  v_email_addr text;
  v_notification_id uuid;
begin
  select
    coalesce(p.push_notifications, true),
    coalesce(p.email_notifications, true),
    p.email
  into v_push, v_email, v_email_addr
  from public.profiles p
  where p.id = p_user_id;

  if not found then
    return null;
  end if;

  if v_push then
    insert into public.notifications (
      user_id,
      title,
      message,
      type,
      is_read,
      related_application_id,
      related_rating_id,
      related_conversation_id
    )
    values (
      p_user_id,
      p_title,
      p_message,
      p_type,
      false,
      p_related_application_id,
      p_related_rating_id,
      p_related_conversation_id
    )
    returning id into v_notification_id;
  end if;

  if v_email and v_email_addr is not null and trim(v_email_addr) <> '' then
    insert into public.transactional_email_queue (
      user_id,
      recipient_email,
      title,
      message,
      type,
      link_path,
      notification_id
    )
    values (
      p_user_id,
      trim(v_email_addr),
      p_title,
      p_message,
      p_type,
      coalesce(nullif(trim(p_link_path), ''), '/notifications'),
      v_notification_id
    );
  end if;

  return v_notification_id;
end;
$$;

revoke all on function public.create_platform_notification(uuid, text, text, text, uuid, uuid, uuid, text) from public;
grant execute on function public.create_platform_notification(uuid, text, text, text, uuid, uuid, uuid, text) to authenticated, service_role;

-- Direct messages: respect preferences via helper
create or replace function public.dm_notify_recipient_on_message()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  conv public.dm_conversations%rowtype;
  recipient uuid;
  preview text;
  body_trim text;
  link_path text;
begin
  select * into conv from public.dm_conversations where id = NEW.conversation_id;
  if not found then
    return NEW;
  end if;

  if NEW.sender_id = conv.student_user_id then
    recipient := conv.peer_user_id;
    if conv.kind = 'student_supervisor' then
      link_path := '/supervisor/messages';
    else
      link_path := '/company/messages';
    end if;
  else
    recipient := conv.student_user_id;
    link_path := '/dashboard/student/messages';
  end if;

  body_trim := trim(NEW.body);
  preview := left(trim(replace(replace(NEW.body, chr(10), ' '), chr(13), '')), 160);

  perform public.create_platform_notification(
    recipient,
    'New message',
    case when length(preview) < length(body_trim) then preview || '…' else preview end,
    'new_direct_message',
    null,
    null,
    conv.id,
    link_path || '?c=' || conv.id::text
  );

  return NEW;
end;
$$;

-- Training auto-complete: use helper
create or replace function public.auto_complete_expired_trainings()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  rec record;
  done integer := 0;
begin
  for rec in
    select
      a.id as app_id,
      s.user_id,
      ip.title as internship_title,
      c.company_name
    from public.applications a
    inner join public.students s on s.id = a.student_id
    inner join public.internship_positions ip on ip.id = a.position_id
    inner join public.companies c on c.id = ip.company_id
    where a.status = 'accepted'
      and a.training_end_date is not null
      and a.training_end_date <= ((now() at time zone 'utc'))::date
  loop
    update public.applications
    set status = 'completed'
    where id = rec.app_id
      and status = 'accepted';

    if found then
      perform public.create_platform_notification(
        rec.user_id,
        'Internship completed',
        format(
          '✅ Your internship for %s at %s has ended as scheduled.',
          rec.internship_title,
          rec.company_name
        ),
        'training_completed',
        rec.app_id,
        null,
        null,
        '/applications'
      );
      done := done + 1;
    end if;
  end loop;

  return done;
end;
$$;
