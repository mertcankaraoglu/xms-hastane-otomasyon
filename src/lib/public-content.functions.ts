import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

function pub() {
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
  return createClient<Database>(process.env["SUPABASE_URL"]!, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) => {
        const h = new Headers(init?.headers);
        if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) h.delete("Authorization");
        h.set("apikey", key);
        return fetch(input, { ...init, headers: h });
      },
    },
  });
}

export type TimelineItem = { year_from: string; year_to: string; institution: string; title: string };

const DOC_COLS = "id, slug, full_name, title, specialty, bio, photo_url, department_id, working_hours, education, experience, interests, languages, certifications";

export const listDepartmentsPublic = createServerFn({ method: "GET" }).handler(async () => {
  const sb = pub();
  const [d, doc] = await Promise.all([
    sb.from("departments").select("id, slug, name, icon, short_description, description").order("sort_order"),
    sb.from("doctors").select("department_id").eq("active", true),
  ]);
  if (d.error) throw new Error(d.error.message);
  return (d.data ?? []).map((x) => ({ ...x, count: (doc.data ?? []).filter((y) => y.department_id === x.id).length }));
});

export const getDepartmentBySlug = createServerFn({ method: "GET" })
  .inputValidator((slug: string) => slug)
  .handler(async ({ data: slug }) => {
    const sb = pub();
    const { data: dept } = await sb.from("departments")
      .select("id, slug, name, icon, short_description, description, long_description, services, cover_url").eq("slug", slug).maybeSingle();
    if (!dept) return null;
    const [faqs, docs] = await Promise.all([
      sb.from("department_faqs").select("id, question, answer").eq("department_id", dept.id).order("sort_order"),
      sb.from("doctors").select("id, slug, full_name, title, specialty, photo_url").eq("department_id", dept.id).eq("active", true).order("full_name"),
    ]);
    return { dept, faqs: faqs.data ?? [], doctors: docs.data ?? [] };
  });

export const listDoctorsPublic = createServerFn({ method: "GET" }).handler(async () => {
  const sb = pub();
  const { data, error } = await sb.from("doctors")
    .select("id, slug, full_name, title, specialty, photo_url, department_id, departments(name, slug)").eq("active", true).order("full_name");
  if (error) throw new Error(error.message);
  return data ?? [];
});

export const getDoctorBySlug = createServerFn({ method: "GET" })
  .inputValidator((slug: string) => slug)
  .handler(async ({ data: slug }) => {
    const sb = pub();
    const { data } = await sb.from("doctors").select(`${DOC_COLS}, departments(name, slug, icon)`).eq("slug", slug).eq("active", true).maybeSingle();
    if (!data) return null;
    return {
      ...data,
      working_hours: data.working_hours as Record<string, [string, string]>,
      education: (data.education ?? []) as unknown as TimelineItem[],
      experience: (data.experience ?? []) as unknown as TimelineItem[],
    };
  });
