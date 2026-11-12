CREATE TABLE public.api_rate_limits (
  ip_hash text NOT NULL,
  bucket text NOT NULL,
  window_start timestamptz NOT NULL,
  hits integer NOT NULL DEFAULT 0,
  PRIMARY KEY (ip_hash, bucket, window_start)
);
GRANT ALL ON public.api_rate_limits TO service_role;
ALTER TABLE public.api_rate_limits ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.api_hit(_ip_hash text, _bucket text, _limit integer)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE w timestamptz := date_trunc('minute', now()); n integer;
BEGIN
  IF length(_ip_hash) <> 64 OR _bucket NOT IN ('read','write') OR _limit < 1 OR _limit > 1000 THEN
    RAISE EXCEPTION 'invalid';
  END IF;
  INSERT INTO api_rate_limits(ip_hash, bucket, window_start, hits) VALUES (_ip_hash, _bucket, w, 1)
  ON CONFLICT (ip_hash, bucket, window_start) DO UPDATE SET hits = api_rate_limits.hits + 1
  RETURNING hits INTO n;
  IF random() < 0.01 THEN DELETE FROM api_rate_limits WHERE window_start < now() - interval '10 minutes'; END IF;
  RETURN n <= _limit;
END $$;
REVOKE ALL ON FUNCTION public.api_hit(text, text, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.api_hit(text, text, integer) TO anon, authenticated;