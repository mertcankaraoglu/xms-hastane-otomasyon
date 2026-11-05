ALTER TABLE public.chat_messages ADD COLUMN sources jsonb;
ALTER TABLE public.chat_conversations ADD COLUMN rating smallint CHECK (rating BETWEEN 1 AND 5);
ALTER TABLE public.chat_conversations ADD COLUMN feedback text;
ALTER TABLE public.chat_conversations ADD COLUMN rated_at timestamptz;
ALTER TABLE public.kb_articles ADD COLUMN source_name text;

CREATE OR REPLACE FUNCTION public.chat_append_assistant(_id uuid, _token text, _content text, _sources jsonb)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _n int;
BEGIN
  IF NOT public.chat_check(_id, _token) THEN RAISE EXCEPTION 'invalid conversation'; END IF;
  IF length(_content) > 8000 OR (_sources IS NOT NULL AND jsonb_typeof(_sources) <> 'array') OR length(coalesce(_sources::text,'')) > 4000 THEN RAISE EXCEPTION 'invalid message'; END IF;
  SELECT message_count INTO _n FROM chat_conversations WHERE id = _id FOR UPDATE;
  IF _n >= 82 THEN RAISE EXCEPTION 'conversation limit reached'; END IF;
  INSERT INTO chat_messages(conversation_id, role, content, sources) VALUES (_id, 'assistant', _content, _sources);
  UPDATE chat_conversations SET message_count = message_count + 1, updated_at = now() WHERE id = _id;
END $$;

CREATE OR REPLACE FUNCTION public.chat_rate(_id uuid, _token text, _rating int, _feedback text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.chat_check(_id, _token) THEN RAISE EXCEPTION 'invalid conversation'; END IF;
  IF _rating < 1 OR _rating > 5 OR length(coalesce(_feedback,'')) > 1000 THEN RAISE EXCEPTION 'invalid rating'; END IF;
  UPDATE chat_conversations SET rating = _rating, feedback = nullif(trim(_feedback),''), rated_at = now() WHERE id = _id;
END $$;

REVOKE ALL ON FUNCTION public.chat_append_assistant(uuid, text, text, jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.chat_rate(uuid, text, int, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.chat_append_assistant(uuid, text, text, jsonb) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.chat_rate(uuid, text, int, text) TO anon, authenticated;