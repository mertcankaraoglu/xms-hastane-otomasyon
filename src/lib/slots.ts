// Slot generation in Europe/Istanbul (fixed UTC+3, no DST).
export type WorkingHours = Record<string, [string, string]>;

/** ymd = "YYYY-MM-DD" in Istanbul local date. Returns ISO strings of slot starts. */
export function generateSlots(ymd: string, hours: WorkingHours, slotMinutes: number): string[] {
  const [y, m, d] = ymd.split("-").map(Number);
  const dow = new Date(Date.UTC(y, m - 1, d)).getUTCDay(); // 0=Sun
  const key = String(dow === 0 ? 7 : dow);
  const range = hours[key];
  if (!range || slotMinutes <= 0) return [];
  const toMin = (s: string) => {
    const [h, mm] = s.split(":").map(Number);
    return h * 60 + mm;
  };
  const out: string[] = [];
  for (let t = toMin(range[0]); t + slotMinutes <= toMin(range[1]); t += slotMinutes) {
    const hh = String(Math.floor(t / 60)).padStart(2, "0");
    const mi = String(t % 60).padStart(2, "0");
    out.push(new Date(`${ymd}T${hh}:${mi}:00+03:00`).toISOString());
  }
  return out;
}

export function istanbulYmd(date: Date): string {
  return new Date(date.getTime() + 3 * 3600_000).toISOString().slice(0, 10);
}

export function dayBoundsUtc(ymd: string): [string, string] {
  const start = new Date(`${ymd}T00:00:00+03:00`);
  return [start.toISOString(), new Date(start.getTime() + 86400_000).toISOString()];
}
