DROP POLICY IF EXISTS "kb public read" ON public.kb_articles;
CREATE POLICY "kb staff read" ON public.kb_articles FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
REVOKE SELECT ON public.kb_articles FROM anon;

CREATE OR REPLACE FUNCTION public.match_kb(_embedding extensions.vector(768), _count int DEFAULT 5)
RETURNS TABLE(id uuid, title text, category text, content text, similarity float)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, extensions AS $$
  SELECT k.id, k.title, k.category, k.content, 1 - (k.embedding <=> _embedding) AS similarity
  FROM public.kb_articles k WHERE k.embedding IS NOT NULL
  ORDER BY k.embedding <=> _embedding LIMIT least(greatest(_count,1),10);
$$;

CREATE OR REPLACE FUNCTION public.kb_fallback(_count int DEFAULT 30)
RETURNS TABLE(id uuid, title text, content text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT k.id, k.title, k.content FROM public.kb_articles k
  ORDER BY k.sort_order, k.created_at LIMIT least(greatest(_count,1),30);
$$;
REVOKE ALL ON FUNCTION public.kb_fallback(int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.kb_fallback(int) TO anon, authenticated;