import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const departmentsQuery = queryOptions({
  queryKey: ["departments"],
  queryFn: async () => {
    const { data, error } = await supabase.from("departments").select("*").order("sort_order");
    if (error) throw error;
    return data;
  },
});

export const doctorsQuery = queryOptions({
  queryKey: ["doctors"],
  queryFn: async () => {
    const { data, error } = await supabase.from("doctors").select("*, departments(name), assistants(*)").order("full_name");
    if (error) throw error;
    return data;
  },
});

export const APPT_SELECT = "*, patients(id, full_name, phone, tc_no), doctors(id, full_name, title, department_id, departments(name))";

export type ApptRow = {
  id: string; code: string; starts_at: string; ends_at: string; status: import("./hospital").Status;
  complaint: string | null; source: string; patient_id: string; doctor_id: string;
  patients: { id: string; full_name: string; phone: string; tc_no: string | null } | null;
  doctors: { id: string; full_name: string; title: string; department_id: string; departments: { name: string } | null } | null;
};

export function apptsInRange(from: string, to: string) {
  return queryOptions({
    queryKey: ["appointments", from, to],
    queryFn: async () => {
      const { data, error } = await supabase.from("appointments").select(APPT_SELECT)
        .gte("starts_at", from).lt("starts_at", to).order("starts_at");
      if (error) throw error;
      return data as unknown as ApptRow[];
    },
  });
}
