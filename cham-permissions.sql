-- Run once in your Supabase project's SQL Editor before uploading the site.
-- Existing and newly registered members start without calculator permission.
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS can_cham_auto boolean NOT NULL DEFAULT false;

-- This migration deliberately does not relax RLS or grant anonymous writes.
-- Existing users SELECT/PATCH policies must permit your current admin workflow.
-- This legacy app has no server-verified login session: see INSTALL-CHAM.md.
