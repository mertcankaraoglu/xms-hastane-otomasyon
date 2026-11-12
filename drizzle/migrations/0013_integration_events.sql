CREATE TABLE public.integration_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  channel text NOT NULL CHECK (channel IN ('web_chat','mcp','rest')),
  conversation_id uuid,
  session_id text,
  client text,
  ip_hash text,
  tool text NOT NULL,
  method text,
  path text,
  params jsonb,
  result jsonb,
  status text NOT NULL DEFAULT 'ok' CHECK (status IN ('ok','error')),
  error text,
  http_status int,
  duration_ms int,
  step int
);
GRANT SELECT ON public.integration_events TO authenticated;
GRANT ALL ON public.integration_events TO service_role;
ALTER TABLE public.integration_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff read integration events" ON public.integration_events FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE INDEX integration_events_created_idx ON public.integration_events (created_at DESC);
CREATE INDEX integration_events_conv_idx ON public.integration_events (conversation_id);

CREATE OR REPLACE FUNCTION public.log_integration_event(
  _channel text, _tool text, _conversation_id uuid DEFAULT NULL, _session_id text DEFAULT NULL, _client text DEFAULT NULL,
  _ip_hash text DEFAULT NULL, _method text DEFAULT NULL, _path text DEFAULT NULL, _params jsonb DEFAULT NULL, _result jsonb DEFAULT NULL,
  _status text DEFAULT 'ok', _error text DEFAULT NULL, _http_status int DEFAULT NULL, _duration_ms int DEFAULT NULL, _step int DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF _channel NOT IN ('web_chat','mcp','rest') OR _status NOT IN ('ok','error') THEN RETURN; END IF;
  INSERT INTO public.integration_events(channel, tool, conversation_id, session_id, client, ip_hash, method, path, params, result, status, error, http_status, duration_ms, step)
  VALUES (_channel, left(_tool,100), _conversation_id, left(_session_id,200), left(_client,300), left(_ip_hash,100), left(_method,10), left(_path,300),
    CASE WHEN length(_params::text) > 8000 THEN jsonb_build_object('_truncated', left(_params::text, 8000)) ELSE _params END,
    CASE WHEN length(_result::text) > 12000 THEN jsonb_build_object('_truncated', left(_result::text, 12000)) ELSE _result END,
    _status, left(_error,1000), _http_status, _duration_ms, _step);
END $$;
REVOKE ALL ON FUNCTION public.log_integration_event FROM public;
GRANT EXECUTE ON FUNCTION public.log_integration_event TO anon, authenticated, service_role;