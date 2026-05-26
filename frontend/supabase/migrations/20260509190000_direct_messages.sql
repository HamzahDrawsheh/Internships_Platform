-- =========================================================
-- Direct messaging (student ↔ supervisor, student ↔ company)
-- Persistent threads + DB notifications on new messages
-- =========================================================

-- --- Conversations & messages ----------------------------------------------------
create table if not exists public.dm_conversations (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('student_supervisor', 'student_company')),
  student_user_id uuid not null references public.profiles(id) on delete cascade,
  peer_user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint dm_conversations_distinct_participants check (student_user_id <> peer_user_id),
  constraint dm_conversations_unique_thread unique (kind, student_user_id, peer_user_id)
);

create index if not exists idx_dm_conversations_student on public.dm_conversations(student_user_id);
create index if not exists idx_dm_conversations_peer on public.dm_conversations(peer_user_id);
create index if not exists idx_dm_conversations_updated on public.dm_conversations(updated_at desc);

create table if not exists public.dm_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.dm_conversations(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (char_length(trim(body)) > 0 and char_length(body) <= 8000),
  created_at timestamptz not null default now()
);

create index if not exists idx_dm_messages_conversation_created on public.dm_messages(conversation_id, created_at asc);

-- --- Notifications: conversation link + message type ------------------------------
alter table public.notifications
  add column if not exists related_conversation_id uuid references public.dm_conversations(id) on delete set null;

create index if not exists idx_notifications_related_conversation_id
  on public.notifications(related_conversation_id);

alter table public.notifications
  drop constraint if exists notifications_type_check;

alter table public.notifications
  add constraint notifications_type_check
  check (
    type in (
      'accepted',
      'rejected',
      'application_accepted',
      'application_rejected',
      'info',
      'training_completed',
      'application_expired',
      'new_application',
      'new_feedback',
      'new_training_evaluation',
      'new_direct_message'
    )
  );

-- --- Eligibility helpers (SECURITY DEFINER; stable joins without RLS recursion issues)
create or replace function public.dm_student_supervisor_pair_allowed(p_student_user uuid, p_supervisor_user uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles ps
    join public.profiles pp on pp.id = p_supervisor_user
    where ps.id = p_student_user
      and ps.role = 'student'
      and pp.role = 'supervisor'
  )
  and exists (
    select 1
    from public.students s
    join public.supervisors sup on sup.user_id = p_supervisor_user
    where s.user_id = p_student_user
      and (
        s.supervisor_id = sup.id
        or (
          length(trim(coalesce(sup.department, ''))) > 0
          and length(trim(coalesce(s.department, ''))) > 0
          and lower(trim(s.department)) = lower(trim(sup.department))
        )
      )
  );
$$;

create or replace function public.dm_student_company_pair_allowed(p_student_user uuid, p_company_owner_user uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles pc where pc.id = p_company_owner_user and pc.role = 'company'
  )
  and exists (
    select 1 from public.profiles ps where ps.id = p_student_user and ps.role = 'student'
  )
  and exists (
    select 1
    from public.applications app
    join public.students s on s.id = app.student_id
    join public.internship_positions pos on pos.id = app.position_id
    join public.companies c on c.id = pos.company_id
    where s.user_id = p_student_user
      and c.user_id = p_company_owner_user
  );
$$;

create or replace function public.dm_can_insert_conversation(p_kind text, p_student uuid, p_peer uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select auth.uid() is not null
    and (auth.uid() = p_student or auth.uid() = p_peer)
    and (
      (p_kind = 'student_supervisor' and public.dm_student_supervisor_pair_allowed(p_student, p_peer))
      or (p_kind = 'student_company' and public.dm_student_company_pair_allowed(p_student, p_peer))
    );
$$;

grant execute on function public.dm_student_supervisor_pair_allowed(uuid, uuid) to authenticated;
grant execute on function public.dm_student_company_pair_allowed(uuid, uuid) to authenticated;
grant execute on function public.dm_can_insert_conversation(text, uuid, uuid) to authenticated;

-- --- Supervisors visible to matching students (for supervisor directory UI)
drop policy if exists "supervisors_select_for_matching_students" on public.supervisors;
create policy "supervisors_select_for_matching_students"
on public.supervisors
for select
to authenticated
using (
  exists (
    select 1
    from public.students s
    where s.user_id = auth.uid()
      and (
        s.supervisor_id = supervisors.id
        or (
          length(trim(coalesce(supervisors.department, ''))) > 0
          and length(trim(coalesce(s.department, ''))) > 0
          and lower(trim(s.department)) = lower(trim(supervisors.department))
        )
      )
  )
);

-- --- Profiles: student reads supervisor / company peers they may message
drop policy if exists "profiles_select_supervisors_for_student_dm" on public.profiles;
create policy "profiles_select_supervisors_for_student_dm"
on public.profiles
for select
to authenticated
using (
  role = 'supervisor'
  and exists (
    select 1
    from public.students s
    join public.supervisors sup on sup.user_id = profiles.id
    where s.user_id = auth.uid()
      and (
        s.supervisor_id = sup.id
        or (
          length(trim(coalesce(sup.department, ''))) > 0
          and length(trim(coalesce(s.department, ''))) > 0
          and lower(trim(s.department)) = lower(trim(sup.department))
        )
      )
  )
);

drop policy if exists "profiles_select_company_for_applicant_dm" on public.profiles;
create policy "profiles_select_company_for_applicant_dm"
on public.profiles
for select
to authenticated
using (
  role = 'company'
  and exists (
    select 1
    from public.applications app
    join public.students s on s.id = app.student_id
    join public.internship_positions pos on pos.id = app.position_id
    join public.companies c on c.id = pos.company_id
    where s.user_id = auth.uid()
      and c.user_id = profiles.id
  )
);

-- --- RLS: conversations -----------------------------------------------------------
alter table public.dm_conversations enable row level security;

drop policy if exists "dm_conversations_select_participant" on public.dm_conversations;
create policy "dm_conversations_select_participant"
on public.dm_conversations
for select
to authenticated
using (auth.uid() = student_user_id or auth.uid() = peer_user_id);

drop policy if exists "dm_conversations_insert_eligible" on public.dm_conversations;
create policy "dm_conversations_insert_eligible"
on public.dm_conversations
for insert
to authenticated
with check (public.dm_can_insert_conversation(kind, student_user_id, peer_user_id));

drop policy if exists "dm_conversations_delete_participant" on public.dm_conversations;
create policy "dm_conversations_delete_participant"
on public.dm_conversations
for delete
to authenticated
using (auth.uid() = student_user_id or auth.uid() = peer_user_id);

-- --- RLS: messages --------------------------------------------------------------
alter table public.dm_messages enable row level security;

drop policy if exists "dm_messages_select_participant" on public.dm_messages;
create policy "dm_messages_select_participant"
on public.dm_messages
for select
to authenticated
using (
  exists (
    select 1
    from public.dm_conversations c
    where c.id = dm_messages.conversation_id
      and (auth.uid() = c.student_user_id or auth.uid() = c.peer_user_id)
  )
);

drop policy if exists "dm_messages_insert_participant" on public.dm_messages;
create policy "dm_messages_insert_participant"
on public.dm_messages
for insert
to authenticated
with check (
  sender_id = auth.uid()
  and exists (
    select 1
    from public.dm_conversations c
    where c.id = dm_messages.conversation_id
      and (auth.uid() = c.student_user_id or auth.uid() = c.peer_user_id)
  )
);

drop policy if exists "dm_messages_delete_own" on public.dm_messages;
create policy "dm_messages_delete_own"
on public.dm_messages
for delete
to authenticated
using (sender_id = auth.uid());

-- --- Bump conversation updated_at + notify recipient ------------------------------
create or replace function public.dm_touch_conversation_updated_at()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.dm_conversations
  set updated_at = now()
  where id = NEW.conversation_id;
  return NEW;
end;
$$;

drop trigger if exists trg_dm_messages_touch_conversation on public.dm_messages;
create trigger trg_dm_messages_touch_conversation
after insert on public.dm_messages
for each row execute function public.dm_touch_conversation_updated_at();

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
begin
  select * into conv from public.dm_conversations where id = NEW.conversation_id;
  if not found then
    return NEW;
  end if;

  if NEW.sender_id = conv.student_user_id then
    recipient := conv.peer_user_id;
  else
    recipient := conv.student_user_id;
  end if;

  body_trim := trim(NEW.body);
  preview := left(trim(replace(replace(NEW.body, chr(10), ' '), chr(13), '')), 160);

  insert into public.notifications (user_id, title, message, type, related_conversation_id)
  values (
    recipient,
    'New message',
    case when length(preview) < length(body_trim) then preview || '…' else preview end,
    'new_direct_message',
    conv.id
  );

  return NEW;
end;
$$;

drop trigger if exists trg_dm_messages_notify on public.dm_messages;
create trigger trg_dm_messages_notify
after insert on public.dm_messages
for each row execute function public.dm_notify_recipient_on_message();

grant select, insert, delete on public.dm_conversations to authenticated;
grant select, insert, delete on public.dm_messages to authenticated;
