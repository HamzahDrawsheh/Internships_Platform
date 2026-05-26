-- Public bucket for company logos (browse pages, internship cards, profiles).
-- Stores objects at companies/<company_id>/logo.<ext> and saves public URL on companies.logo_url.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'company-logos',
  'company-logos',
  true,
  2097152,
  array['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/svg+xml']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "company_logos_select_public" on storage.objects;
drop policy if exists "company_logos_insert_own" on storage.objects;
drop policy if exists "company_logos_update_own" on storage.objects;
drop policy if exists "company_logos_delete_own" on storage.objects;

-- Public bucket: allow read so logos render for all roles (including anonymous if needed).
create policy "company_logos_select_public"
on storage.objects
for select
using (bucket_id = 'company-logos');

create policy "company_logos_insert_own"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'company-logos'
  and split_part(name, '/', 1) = 'companies'
  and exists (
    select 1
    from public.companies c
    where c.id::text = split_part(name, '/', 2)
      and c.user_id = auth.uid()
  )
);

create policy "company_logos_update_own"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'company-logos'
  and split_part(name, '/', 1) = 'companies'
  and exists (
    select 1
    from public.companies c
    where c.id::text = split_part(name, '/', 2)
      and c.user_id = auth.uid()
  )
)
with check (
  bucket_id = 'company-logos'
  and split_part(name, '/', 1) = 'companies'
  and exists (
    select 1
    from public.companies c
    where c.id::text = split_part(name, '/', 2)
      and c.user_id = auth.uid()
  )
);

create policy "company_logos_delete_own"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'company-logos'
  and split_part(name, '/', 1) = 'companies'
  and exists (
    select 1
    from public.companies c
    where c.id::text = split_part(name, '/', 2)
      and c.user_id = auth.uid()
  )
);
