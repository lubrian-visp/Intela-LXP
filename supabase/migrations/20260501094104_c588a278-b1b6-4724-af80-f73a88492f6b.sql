
insert into storage.buckets (id, name, public, file_size_limit)
values ('content-block-media', 'content-block-media', true, 104857600)
on conflict (id) do update set public = true, file_size_limit = 104857600;

drop policy if exists "Content block media public read" on storage.objects;
create policy "Content block media public read"
  on storage.objects for select
  using (bucket_id = 'content-block-media');

drop policy if exists "Content block media staff upload" on storage.objects;
create policy "Content block media staff upload"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'content-block-media'
    and (
      public.has_role(auth.uid(), 'super_admin')
      or public.has_role(auth.uid(), 'programme_manager')
      or public.has_role(auth.uid(), 'facilitator')
      or public.has_role(auth.uid(), 'operations')
      or public.has_role(auth.uid(), 'systems_admin')
    )
  );

drop policy if exists "Content block media staff update" on storage.objects;
create policy "Content block media staff update"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'content-block-media'
    and (
      public.has_role(auth.uid(), 'super_admin')
      or public.has_role(auth.uid(), 'programme_manager')
      or public.has_role(auth.uid(), 'facilitator')
      or public.has_role(auth.uid(), 'operations')
      or public.has_role(auth.uid(), 'systems_admin')
    )
  );

drop policy if exists "Content block media staff delete" on storage.objects;
create policy "Content block media staff delete"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'content-block-media'
    and (
      public.has_role(auth.uid(), 'super_admin')
      or public.has_role(auth.uid(), 'programme_manager')
      or public.has_role(auth.uid(), 'facilitator')
      or public.has_role(auth.uid(), 'operations')
      or public.has_role(auth.uid(), 'systems_admin')
    )
  );
