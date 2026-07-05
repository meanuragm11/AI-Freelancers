-- Unify portfolio links: support multiple titled URLs per project
ALTER TABLE public.portfolio_projects
  ADD COLUMN IF NOT EXISTS links jsonb NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.portfolio_projects.links IS 'Titled project URLs: [{ "title": "Live Demo", "url": "https://..." }]';

-- Migrate legacy single URL columns into links array
UPDATE public.portfolio_projects
SET links = COALESCE(
  (
    SELECT jsonb_agg(link_obj ORDER BY sort_order)
    FROM (
      SELECT 1 AS sort_order, jsonb_build_object('title', 'Live Demo', 'url', live_demo_url) AS link_obj
      WHERE live_demo_url IS NOT NULL AND btrim(live_demo_url) <> ''
      UNION ALL
      SELECT 2, jsonb_build_object('title', 'GitHub', 'url', github_url)
      WHERE github_url IS NOT NULL AND btrim(github_url) <> ''
      UNION ALL
      SELECT 3, jsonb_build_object('title', 'Project', 'url', project_url)
      WHERE project_url IS NOT NULL AND btrim(project_url) <> ''
    ) legacy_links
  ),
  '[]'::jsonb
)
WHERE links = '[]'::jsonb;

-- Migrate profile external_projects JSON into portfolio_projects (one-time)
INSERT INTO public.portfolio_projects (builder_id, title, short_description, links, media_files)
SELECT
  p.id AS builder_id,
  COALESCE(NULLIF(btrim(ep.value->>'title'), ''), 'Portfolio Project') AS title,
  NULLIF(btrim(ep.value->>'description'), '') AS short_description,
  CASE
    WHEN ep.value->>'url' IS NOT NULL AND btrim(ep.value->>'url') <> '' THEN
      jsonb_build_array(jsonb_build_object('title', 'Project Link', 'url', ep.value->>'url'))
    ELSE '[]'::jsonb
  END AS links,
  CASE
    WHEN ep.value->>'file_name' IS NOT NULL AND btrim(ep.value->>'file_name') <> '' THEN
      jsonb_build_array(
        jsonb_build_object(
          'type', 'file',
          'url', ep.value->>'file_name',
          'name', COALESCE(NULLIF(btrim(ep.value->>'file_name'), ''), 'File')
        )
      )
    ELSE '[]'::jsonb
  END AS media_files
FROM public.profiles p
CROSS JOIN LATERAL jsonb_array_elements(
  CASE
    WHEN jsonb_typeof(p.external_projects::jsonb) = 'array' THEN p.external_projects::jsonb
    ELSE '[]'::jsonb
  END
) AS ep(value)
WHERE jsonb_array_length(
  CASE
    WHEN jsonb_typeof(p.external_projects::jsonb) = 'array' THEN p.external_projects::jsonb
    ELSE '[]'::jsonb
  END
) > 0
AND NOT EXISTS (
  SELECT 1
  FROM public.portfolio_projects pp
  WHERE pp.builder_id = p.id
    AND pp.title = COALESCE(NULLIF(btrim(ep.value->>'title'), ''), 'Portfolio Project')
    AND COALESCE(pp.short_description, '') = COALESCE(NULLIF(btrim(ep.value->>'description'), ''), '')
);
