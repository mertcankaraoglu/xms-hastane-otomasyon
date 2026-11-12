import { describe, expect, it, vi } from "vitest";
import { runTool, TOOLS, type pubClient } from "./medi-ai.server";

vi.mock("@lovable.dev/ai-gateway", () => ({
  generateEmbeddings: vi.fn(), generateResponse: vi.fn(), streamResponse: vi.fn(), GatewayError: class extends Error {},
}));

function client(data: unknown) {
  const query = { select: vi.fn(), eq: vi.fn(), maybeSingle: vi.fn().mockResolvedValue({ data, error: null }) };
  query.select.mockReturnValue(query);
  query.eq.mockReturnValue(query);
  const sb = { from: vi.fn().mockReturnValue(query) };
  return { sb: sb as unknown as ReturnType<typeof pubClient>, query };
}

describe("Medi AI doctor profiles", () => {
  it("returns all published doctor information, not just the directory summary", async () => {
    const profile = {
      id: "doctor-1", slug: "ayse-celik", full_name: "Ayşe Çelik", title: "Uzm. Dr.",
      specialty: "Diyabet", bio: "Dahiliye uzmanı özgeçmişi", photo_url: "https://example.com/doctor.jpg",
      department_id: "department-1", departments: { name: "Dahiliye", slug: "dahiliye" },
      education: [{ year_from: "2000", year_to: "2006", institution: "Tıp Fakültesi", title: "Tıp" }],
      experience: [{ year_from: "2012", year_to: "", institution: "Hastane", title: "Uzman" }],
      interests: ["Diyabet"], languages: ["Türkçe", "İngilizce"], certifications: ["Üyelik"],
      working_hours: { "1": ["09:00", "17:00"] },
    };
    const { sb, query } = client(profile);
    expect(await runTool(sb, "get_doctor_profile", { doctor_id: profile.id })).toEqual({
      ...profile, profile_url: "/doktorlar/ayse-celik", timezone: "Europe/Istanbul",
    });
    const columns = query.select.mock.calls[0]?.[0].split(", ");
    for (const field of ["bio", "education", "experience", "interests", "languages", "certifications", "working_hours", "photo_url"])
      expect(columns).toContain(field);
    expect(columns).not.toContain("*");
    expect(query.eq).toHaveBeenCalledWith("id", "doctor-1");
    expect(query.eq).toHaveBeenCalledWith("active", true);
    expect(TOOLS.find((tool) => tool.name === "get_doctor_profile")).toBeDefined();
  });

  it("does not fabricate a profile when the published doctor is missing", async () => {
    const { sb } = client(null);
    expect(await runTool(sb, "get_doctor_profile", { doctor_id: "missing" })).toEqual({ error: "Yayınlanmış doktor profili bulunamadı." });
  });
});