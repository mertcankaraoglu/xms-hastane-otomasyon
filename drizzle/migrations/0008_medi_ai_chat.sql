CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

CREATE TABLE public.kb_articles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  category text NOT NULL DEFAULT 'Genel',
  content text NOT NULL,
  embedding extensions.vector(768),
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.kb_articles TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.kb_articles TO authenticated;
GRANT ALL ON public.kb_articles TO service_role;
ALTER TABLE public.kb_articles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "kb public read" ON public.kb_articles FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "kb staff insert" ON public.kb_articles FOR INSERT TO authenticated WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "kb staff update" ON public.kb_articles FOR UPDATE TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "kb staff delete" ON public.kb_articles FOR DELETE TO authenticated USING (public.is_staff(auth.uid()));

CREATE OR REPLACE FUNCTION public.match_kb(_embedding extensions.vector(768), _count int DEFAULT 5)
RETURNS TABLE(id uuid, title text, category text, content text, similarity float)
LANGUAGE sql STABLE SET search_path = public, extensions AS $$
  SELECT k.id, k.title, k.category, k.content, 1 - (k.embedding <=> _embedding) AS similarity
  FROM public.kb_articles k WHERE k.embedding IS NOT NULL
  ORDER BY k.embedding <=> _embedding LIMIT least(greatest(_count,1),10);
$$;
GRANT EXECUTE ON FUNCTION public.match_kb(extensions.vector, int) TO anon, authenticated;

CREATE TABLE public.chat_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token_hash text NOT NULL,
  message_count int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.chat_conversations(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('user','assistant')),
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX chat_messages_conv_idx ON public.chat_messages(conversation_id, created_at);
GRANT SELECT, DELETE ON public.chat_conversations TO authenticated;
GRANT SELECT ON public.chat_messages TO authenticated;
GRANT ALL ON public.chat_conversations TO service_role;
GRANT ALL ON public.chat_messages TO service_role;
ALTER TABLE public.chat_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff read conv" ON public.chat_conversations FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "staff delete conv" ON public.chat_conversations FOR DELETE TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "staff read msgs" ON public.chat_messages FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));

CREATE OR REPLACE FUNCTION public.chat_start()
RETURNS TABLE(id uuid, token text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions AS $$
DECLARE _t text := encode(gen_random_bytes(24), 'hex'); _id uuid;
BEGIN
  INSERT INTO chat_conversations(token_hash) VALUES (encode(digest(_t, 'sha256'), 'hex')) RETURNING chat_conversations.id INTO _id;
  RETURN QUERY SELECT _id, _t;
END $$;

CREATE OR REPLACE FUNCTION public.chat_check(_id uuid, _token text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, extensions AS $$
  SELECT EXISTS (SELECT 1 FROM chat_conversations WHERE id = _id AND token_hash = encode(digest(coalesce(_token,''), 'sha256'), 'hex'));
$$;

CREATE OR REPLACE FUNCTION public.chat_history(_id uuid, _token text)
RETURNS TABLE(role text, content text, created_at timestamptz)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.chat_check(_id, _token) THEN RAISE EXCEPTION 'invalid conversation'; END IF;
  RETURN QUERY SELECT m.role, m.content, m.created_at FROM chat_messages m WHERE m.conversation_id = _id ORDER BY m.created_at, m.id;
END $$;

CREATE OR REPLACE FUNCTION public.chat_append(_id uuid, _token text, _role text, _content text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _n int;
BEGIN
  IF NOT public.chat_check(_id, _token) THEN RAISE EXCEPTION 'invalid conversation'; END IF;
  IF _role NOT IN ('user','assistant') OR length(_content) > 8000 THEN RAISE EXCEPTION 'invalid message'; END IF;
  SELECT message_count INTO _n FROM chat_conversations WHERE id = _id FOR UPDATE;
  IF _n >= 80 THEN RAISE EXCEPTION 'conversation limit reached'; END IF;
  INSERT INTO chat_messages(conversation_id, role, content) VALUES (_id, _role, _content);
  UPDATE chat_conversations SET message_count = message_count + 1, updated_at = now() WHERE id = _id;
END $$;

REVOKE ALL ON FUNCTION public.chat_start() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.chat_check(uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.chat_history(uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.chat_append(uuid, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.chat_start() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.chat_check(uuid, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.chat_history(uuid, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.chat_append(uuid, text, text, text) TO anon, authenticated;