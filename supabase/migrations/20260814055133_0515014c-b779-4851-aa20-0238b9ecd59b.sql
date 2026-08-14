UPDATE public.site_content
SET value = jsonb_set(
  value,
  '{home,downloadCaption}',
  '"Download the App! It''s being reworked right now, but you can still grab the current version."'::jsonb
)
WHERE key = 'main'
  AND value->'home'->>'downloadCaption' = 'Download the official app!';