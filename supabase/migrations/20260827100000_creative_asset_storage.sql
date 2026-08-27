-- Private storage for generated Creative Media assets.
-- Assets remain private until an authorised review/delivery flow exposes them.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'creative-assets',
  'creative-assets',
  false,
  12582912,
  array['image/png','image/jpeg','image/webp']
)
on conflict (id) do update
set public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;
