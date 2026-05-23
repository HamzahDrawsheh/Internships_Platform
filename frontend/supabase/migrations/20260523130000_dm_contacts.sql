-- Saved messaging contacts (e.g. student saves a company from browse before applying)

create table if not exists public.dm_contacts (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references public.profiles(id) on delete cascade,
  contact_user_id uuid not null references public.profiles(id) on delete cascade,
  kind text not null check (kind in ('student_supervisor', 'student_company')),
  display_name text,
  created_at timestamptz not null default now(),
  constraint dm_contacts_distinct check (owner_user_id <> contact_user_id),
  constraint dm_contacts_unique unique (owner_user_id, contact_user_id, kind)
);

create index if not exists idx_dm_contacts_owner on public.dm_contacts(owner_user_id);

alter table public.dm_contacts enable row level security;

drop policy if exists "dm_contacts_select_own" on public.dm_contacts;
create policy "dm_contacts_select_own"
on public.dm_contacts for select to authenticated
using (auth.uid() = owner_user_id);

drop policy if exists "dm_contacts_insert_own" on public.dm_contacts;
create policy "dm_contacts_insert_own"
on public.dm_contacts for insert to authenticated
with check (auth.uid() = owner_user_id);

drop policy if exists "dm_contacts_update_own" on public.dm_contacts;
create policy "dm_contacts_update_own"
on public.dm_contacts for update to authenticated
using (auth.uid() = owner_user_id);

drop policy if exists "dm_contacts_delete_own" on public.dm_contacts;
create policy "dm_contacts_delete_own"
on public.dm_contacts for delete to authenticated
using (auth.uid() = owner_user_id);

grant select, insert, update, delete on public.dm_contacts to authenticated;

-- Allow messaging when a saved contact exists (either direction)
create or replace function public.dm_has_contact_pair(p_user_a uuid, p_user_b uuid, p_kind text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.dm_contacts c
    where c.kind = p_kind
      and (
        (c.owner_user_id = p_user_a and c.contact_user_id = p_user_b)
        or (c.owner_user_id = p_user_b and c.contact_user_id = p_user_a)
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
  and (
    exists (
      select 1
      from public.applications app
      join public.students s on s.id = app.student_id
      join public.internship_positions pos on pos.id = app.position_id
      join public.companies c on c.id = pos.company_id
      where s.user_id = p_student_user
        and c.user_id = p_company_owner_user
    )
    or public.dm_has_contact_pair(p_student_user, p_company_owner_user, 'student_company')
  );
$$;

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
  and (
    exists (
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
    )
    or public.dm_has_contact_pair(p_student_user, p_supervisor_user, 'student_supervisor')
  );
$$;

grant execute on function public.dm_has_contact_pair(uuid, uuid, text) to authenticated;

-- Students may read company owner profiles they saved as contacts
drop policy if exists "profiles_select_company_for_contact_dm" on public.profiles;
create policy "profiles_select_company_for_contact_dm"
on public.profiles for select to authenticated
using (
  role = 'company'
  and exists (
    select 1 from public.dm_contacts c
    where c.owner_user_id = auth.uid()
      and c.contact_user_id = profiles.id
      and c.kind = 'student_company'
  )
);

-- Companies may read student profiles they saved as contacts
drop policy if exists "profiles_select_student_for_contact_dm" on public.profiles;
create policy "profiles_select_student_for_contact_dm"
on public.profiles for select to authenticated
using (
  role = 'student'
  and exists (
    select 1 from public.dm_contacts c
    where c.owner_user_id = auth.uid()
      and c.contact_user_id = profiles.id
      and c.kind in ('student_company', 'student_supervisor')
  )
);
