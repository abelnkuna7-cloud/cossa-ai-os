-- Keep the private Cossa Store digital-products bucket compatible with the
-- customer file types accepted by Product Manager / Digital Deliverables.
update storage.buckets
set allowed_mime_types = array[
  'application/zip',
  'application/x-zip-compressed',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/csv',
  'text/plain',
  'text/markdown',
  'image/png',
  'image/jpeg',
  'image/webp',
  'application/octet-stream'
]::text[]
where id = 'store-digital-products';
