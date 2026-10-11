-- Fix owner knowledge saving and introduce instant visitor reviews.
-- No existing knowledge or site draft rows are modified by this migration.
CREATE OR REPLACE FUNCTION public.replace_witness_lema_knowledge(items jsonb)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE inserted integer;
BEGIN
  IF jsonb_typeof(items)<>'array' OR jsonb_array_length(items)>250 THEN
    RAISE EXCEPTION 'Invalid knowledge collection';
  END IF;
  IF EXISTS (
    SELECT 1 FROM jsonb_array_elements(items) AS elem
    WHERE jsonb_typeof(elem)<>'object'
  ) THEN RAISE EXCEPTION 'Invalid knowledge item'; END IF;
  -- ROWS FROM is required to combine a record definition with WITH ORDINALITY.
  -- The old statement failed on every Save Answers request.
  DELETE FROM public.witness_lema_knowledge;
  INSERT INTO public.witness_lema_knowledge
    (question,answer,keywords,href,published,sort_order)
  SELECT left(trim(x.question),300),left(trim(x.answer),3000),
    coalesce(x.keywords,'{}'::text[]),
    left(coalesce(x.href,''),300),coalesce(x.published,true),x.ordinality::integer-1
  FROM ROWS FROM (
    jsonb_to_recordset(items) AS
      (question text,answer text,keywords text[],href text,published boolean)
  ) WITH ORDINALITY AS x
  WHERE trim(coalesce(x.question,''))<>'' AND trim(coalesce(x.answer,''))<>'';
  GET DIAGNOSTICS inserted=ROW_COUNT;
  RETURN inserted;
END $$;
REVOKE ALL ON FUNCTION public.replace_witness_lema_knowledge(jsonb) FROM public,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.replace_witness_lema_knowledge(jsonb) TO service_role;

-- Existing rate limiter accidentally rejected every review-submit scope.
ALTER TABLE witness_lema_private.rate_limit_buckets DROP CONSTRAINT IF EXISTS rate_limit_buckets_scope_check;
ALTER TABLE witness_lema_private.rate_limit_buckets ADD CONSTRAINT rate_limit_buckets_scope_check
 CHECK (scope IN ('login','assistant','review-submit'));
CREATE OR REPLACE FUNCTION public.witness_lema_consume_rate_limit(
  p_scope text,p_subject_hash text,p_max_attempts integer,p_window_seconds integer
) RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path=''
AS $$
DECLARE v_attempts integer;v_started timestamptz;v_allowed boolean;v_wait integer;
BEGIN
 IF p_scope NOT IN ('login','assistant','review-submit')
    OR p_subject_hash !~ '^[0-9a-f]{64}$'
    OR p_max_attempts NOT BETWEEN 1 AND 100
    OR p_window_seconds NOT BETWEEN 30 AND 3600 THEN
   RAISE EXCEPTION 'Invalid rate-limit parameters';
 END IF;
 INSERT INTO witness_lema_private.rate_limit_buckets AS b(scope,subject_hash,started_at,attempts)
 VALUES (p_scope,p_subject_hash,now(),1)
 ON CONFLICT(scope,subject_hash) DO UPDATE
 SET attempts=CASE WHEN b.started_at <= now()-make_interval(secs=>p_window_seconds)
                   THEN 1 ELSE b.attempts+1 END,
 started_at=CASE WHEN b.started_at <= now()-make_interval(secs=>p_window_seconds)
                   THEN now() ELSE b.started_at END
 RETURNING attempts,started_at INTO v_attempts,v_started;
 v_allowed:=v_attempts<=p_max_attempts;
 v_wait:=CASE WHEN v_allowed THEN 0
 ELSE greatest(1,ceil(extract(epoch from (v_started+make_interval(secs=>p_window_seconds)-now())))::integer) END;
 RETURN jsonb_build_object('allowed',v_allowed,'retryAfterSeconds',v_wait);
END $$;
REVOKE ALL ON FUNCTION public.witness_lema_consume_rate_limit(text,text,integer,integer) FROM public,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.witness_lema_consume_rate_limit(text,text,integer,integer) TO service_role;

-- Reviews become readable publicly immediately after a valid submission.
-- Only the service role may write; owner delete is authenticated in Vercel.
CREATE TABLE IF NOT EXISTS public.witness_lema_public_reviews(
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 author text NOT NULL CHECK(char_length(author) BETWEEN 2 AND 90),
 review_text text NOT NULL CHECK(char_length(review_text) BETWEEN 20 AND 1400),
 language text NOT NULL CHECK(language IN ('en','hi')),
 consent boolean NOT NULL CHECK(consent IS TRUE),
 source text NOT NULL DEFAULT 'visitor' CHECK(source IN ('visitor','owner')),
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS witness_lema_public_reviews_recent_idx
 ON public.witness_lema_public_reviews(created_at DESC,id DESC);
ALTER TABLE public.witness_lema_public_reviews ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.witness_lema_public_reviews FROM public,anon,authenticated;
GRANT SELECT ON public.witness_lema_public_reviews TO anon,authenticated;
GRANT SELECT,INSERT,DELETE ON public.witness_lema_public_reviews TO service_role;
DROP POLICY IF EXISTS "Anyone can read published visitor reviews" ON public.witness_lema_public_reviews;
CREATE POLICY "Anyone can read published visitor reviews" ON public.witness_lema_public_reviews
 FOR SELECT TO anon,authenticated USING(true);

-- This RPC is reachable only using the service-role credential in the Edge function.
-- It also verifies the owner's internal secret hash. Visitors cannot delete reviews.
CREATE OR REPLACE FUNCTION public.witness_lema_review_inbox(
 p_secret_sha256 text,p_action text,p_payload jsonb DEFAULT '{}'::jsonb
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $$
DECLARE review_id bigint;display_name text;body_text text;lang text;source_name text;
BEGIN
 IF p_secret_sha256 IS NULL OR length(p_secret_sha256)<>64 OR
    NOT EXISTS(SELECT 1 FROM witness_lema_private.admin_credentials c
               WHERE c.id='main' AND c.secret_sha256=p_secret_sha256) THEN
   RAISE EXCEPTION 'Unauthorized' USING errcode='28000';
 END IF;
 IF p_action='submit' THEN
   display_name=trim(coalesce(p_payload->>'author',''));
   body_text=trim(coalesce(p_payload->>'text',''));
   lang=coalesce(p_payload->>'language','');
   source_name=coalesce(p_payload->>'source','visitor');
   IF length(display_name) NOT BETWEEN 2 AND 90
      OR length(body_text) NOT BETWEEN 20 AND 1400
      OR lang NOT IN('en','hi') OR p_payload->>'consent'<>'true'
      OR source_name NOT IN('visitor','owner') THEN
     RAISE EXCEPTION 'Invalid review';
   END IF;
   INSERT INTO public.witness_lema_public_reviews(author,review_text,language,consent,source)
   VALUES(display_name,body_text,lang,true,source_name) RETURNING id INTO review_id;
   RETURN jsonb_build_object('ok',true,'id',review_id);
 ELSIF p_action='list' THEN
   RETURN jsonb_build_object('items',coalesce((
     SELECT jsonb_agg(jsonb_build_object(
       'id',r.id,'author',r.author,'text',r.review_text,'language',r.language,
       'createdAt',r.created_at,'source',r.source
     ) ORDER BY r.created_at DESC,r.id DESC)
     FROM (SELECT id,author,review_text,language,created_at,source
           FROM public.witness_lema_public_reviews
           ORDER BY created_at DESC,id DESC LIMIT 100) r
   ),'[]'::jsonb));
 ELSIF p_action='delete' THEN
   IF coalesce(p_payload->>'id','') !~ '^[0-9]{1,15}$' THEN
     RAISE EXCEPTION 'Invalid review ID';
   END IF;
   review_id=(p_payload->>'id')::bigint;
   DELETE FROM public.witness_lema_public_reviews WHERE id=review_id;
   RETURN jsonb_build_object('ok',FOUND);
 END IF;
 RAISE EXCEPTION 'Unsupported review action';
END $$;
REVOKE ALL ON FUNCTION public.witness_lema_review_inbox(text,text,jsonb)
 FROM public,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.witness_lema_review_inbox(text,text,jsonb) TO service_role;
