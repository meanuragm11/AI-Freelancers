-- Paginated, filtered, sorted support ticket list for the founder operations console.

CREATE OR REPLACE FUNCTION public.founder_list_support_tickets(
  p_status text DEFAULT NULL,
  p_priority text DEFAULT NULL,
  p_category text DEFAULT NULL,
  p_q text DEFAULT NULL,
  p_user_id uuid DEFAULT NULL,
  p_page integer DEFAULT 1,
  p_page_size integer DEFAULT 20
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_offset integer;
  v_total bigint;
  v_tickets jsonb;
BEGIN
  v_offset := GREATEST(COALESCE(p_page, 1) - 1, 0) * COALESCE(p_page_size, 20);

  SELECT COUNT(*)
  INTO v_total
  FROM public.support_tickets t
  WHERE (p_user_id IS NULL OR t.user_id = p_user_id)
    AND (p_status IS NULL OR t.status = p_status)
    AND (
      p_priority IS NULL
      OR t.priority = p_priority
      OR (p_priority = 'critical' AND t.priority IN ('critical', 'high'))
    )
    AND (
      p_category IS NULL
      OR t.category = ANY(
        CASE p_category
          WHEN 'Payment' THEN ARRAY['Payment', 'Withdrawal', 'Service Purchase', 'AI Solution']
          WHEN 'Refund' THEN ARRAY['Refund Request', 'Disputes']
          WHEN 'Escrow' THEN ARRAY['Escrow', 'Custom Project']
          WHEN 'Technical' THEN ARRAY['Bug Report', 'Feature Request', 'Technical Error', 'Messaging']
          WHEN 'Account' THEN ARRAY['Account & Login', 'Security Concern']
          WHEN 'Verification' THEN ARRAY['Profile Verification']
          WHEN 'Other' THEN ARRAY['Other']
          ELSE ARRAY[p_category]
        END
      )
    )
    AND (
      p_q IS NULL
      OR btrim(p_q) = ''
      OR t.ticket_number ILIKE '%' || p_q || '%'
      OR t.subject ILIKE '%' || p_q || '%'
      OR t.email ILIKE '%' || p_q || '%'
      OR t.name ILIKE '%' || p_q || '%'
    );

  SELECT COALESCE(jsonb_agg(row_to_json(x)::jsonb ORDER BY x.sort_rank, x.priority_rank, x.created_at DESC), '[]'::jsonb)
  INTO v_tickets
  FROM (
    SELECT
      t.id,
      t.ticket_number,
      t.user_id,
      t.name,
      t.email,
      t.category,
      t.subject,
      t.status,
      t.priority,
      t.created_at,
      t.updated_at,
      CASE
        WHEN t.status IN ('resolved', 'closed') THEN 1
        ELSE 0
      END AS sort_rank,
      CASE t.priority
        WHEN 'critical' THEN 0
        WHEN 'high' THEN 1
        WHEN 'medium' THEN 2
        ELSE 3
      END AS priority_rank
    FROM public.support_tickets t
    WHERE (p_user_id IS NULL OR t.user_id = p_user_id)
      AND (p_status IS NULL OR t.status = p_status)
      AND (
        p_priority IS NULL
        OR t.priority = p_priority
        OR (p_priority = 'critical' AND t.priority IN ('critical', 'high'))
      )
      AND (
        p_category IS NULL
        OR t.category = ANY(
          CASE p_category
            WHEN 'Payment' THEN ARRAY['Payment', 'Withdrawal', 'Service Purchase', 'AI Solution']
            WHEN 'Refund' THEN ARRAY['Refund Request', 'Disputes']
            WHEN 'Escrow' THEN ARRAY['Escrow', 'Custom Project']
            WHEN 'Technical' THEN ARRAY['Bug Report', 'Feature Request', 'Technical Error', 'Messaging']
            WHEN 'Account' THEN ARRAY['Account & Login', 'Security Concern']
            WHEN 'Verification' THEN ARRAY['Profile Verification']
            WHEN 'Other' THEN ARRAY['Other']
            ELSE ARRAY[p_category]
          END
        )
      )
      AND (
        p_q IS NULL
        OR btrim(p_q) = ''
        OR t.ticket_number ILIKE '%' || p_q || '%'
        OR t.subject ILIKE '%' || p_q || '%'
        OR t.email ILIKE '%' || p_q || '%'
        OR t.name ILIKE '%' || p_q || '%'
      )
    ORDER BY sort_rank ASC, priority_rank ASC, t.created_at DESC
    LIMIT COALESCE(p_page_size, 20)
    OFFSET v_offset
  ) x;

  RETURN jsonb_build_object(
    'tickets', v_tickets,
    'total', v_total,
    'page', COALESCE(p_page, 1),
    'pageSize', COALESCE(p_page_size, 20),
    'totalPages', GREATEST(CEIL(v_total::numeric / NULLIF(COALESCE(p_page_size, 20), 0)), 1)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.founder_list_support_tickets(text, text, text, text, uuid, integer, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.founder_list_support_tickets(text, text, text, text, uuid, integer, integer) TO service_role;
