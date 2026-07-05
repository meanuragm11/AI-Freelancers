-- CRITICAL SECURITY FIX (Phase 1, item 1)
--
-- `chat-attachments` was a PUBLIC bucket with a blanket "Allow public read of
-- attachments" SELECT policy (qual: bucket_id = 'chat-attachments') and an
-- "Allow authenticated uploads" INSERT policy that let ANY authenticated user
-- upload into ANY collab's folder. Combined with the public bucket flag, this
-- meant every file ever shared in any escrow chat (contracts, deliverables,
-- screenshots, personal documents) was downloadable and listable by anyone on
-- the internet, without authentication, given a guessable/enumerable path.
--
-- Fix: make the bucket private, scope both INSERT and SELECT to the two
-- participants (buyer/builder) of the collab whose id is the first path
-- segment (`storage.foldername(name)[1]`), and drop the broad public
-- policies. Downloads continue to work unaffected via the existing
-- server-side signed-URL endpoint (app/api/collabs/[id]/files/sign), which
-- uses the service role and already verifies collab membership server-side
-- before minting a short-lived signed URL.
update storage.buckets
set public = false,
    file_size_limit = 104857600 -- 100MB, matches existing client-side validation
where id = 'chat-attachments';

drop policy if exists "Allow public read of attachments" on storage.objects;
drop policy if exists "Allow authenticated uploads" on storage.objects;
drop policy if exists "chat_attachments_participants_insert" on storage.objects;
drop policy if exists "chat_attachments_participants_select" on storage.objects;
drop policy if exists "chat_attachments_admins_select" on storage.objects;

create policy "chat_attachments_participants_insert"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'chat-attachments'
  and exists (
    select 1 from public.collabs c
    where c.id::text = (storage.foldername(name))[1]
      and (c.buyer_id = auth.uid() or c.builder_id = auth.uid())
  )
);

create policy "chat_attachments_participants_select"
on storage.objects for select to authenticated
using (
  bucket_id = 'chat-attachments'
  and exists (
    select 1 from public.collabs c
    where c.id::text = (storage.foldername(name))[1]
      and (c.buyer_id = auth.uid() or c.builder_id = auth.uid())
  )
);

-- Defense in depth: founder/admin tooling already uses the service role
-- (which bypasses RLS), but grant explicit read access too in case any
-- future admin UI queries storage directly via the anon/authenticated client.
create policy "chat_attachments_admins_select"
on storage.objects for select to authenticated
using (
  bucket_id = 'chat-attachments' and public.is_platform_admin()
);

-- `marketplace-uploads` is intentionally a public bucket (avatars, portfolio
-- images, service/component covers meant for public display). Public bucket
-- object URLs (/storage/v1/object/public/...) bypass RLS entirely, so this
-- policy was never needed for read access — it only granted the ability to
-- LIST/enumerate every file ever uploaded by every user via the Storage API.
-- Removing it does not affect any existing public image URL in the app.
drop policy if exists "marketplace_uploads_public_read" on storage.objects;
