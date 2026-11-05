import {
  Baby, Bone, Brain, Ear, Eye, HeartPulse, ScanFace, Scissors, Smile, Stethoscope, type LucideIcon,
} from "lucide-react";

export const HOSPITAL_NAME = "Medicare Hastanesi";

export const deptIcons: Record<string, LucideIcon> = {
  "heart-pulse": HeartPulse, brain: Brain, bone: Bone, stethoscope: Stethoscope, baby: Baby,
  smile: Smile, eye: Eye, ear: Ear, "scan-face": ScanFace, scissors: Scissors,
};
export const iconFor = (k?: string | null) => deptIcons[k ?? ""] ?? Stethoscope;

export type Status = "pending" | "confirmed" | "arrived" | "completed" | "cancelled" | "no_show";
export const STATUS_LABEL: Record<Status, string> = {
  pending: "Bekliyor", confirmed: "Onaylandı", arrived: "Geldi",
  completed: "Tamamlandı", cancelled: "İptal", no_show: "Gelmedi",
};
export const STATUS_CLASS: Record<Status, string> = {
  pending: "bg-warning/15 text-warning border-warning/30",
  confirmed: "bg-info/15 text-info border-info/30",
  arrived: "bg-primary/15 text-primary border-primary/30",
  completed: "bg-success/15 text-success border-success/30",
  cancelled: "bg-muted text-muted-foreground border-border",
  no_show: "bg-destructive/10 text-destructive border-destructive/30",
};
export const STATUSES = Object.keys(STATUS_LABEL) as Status[];

export const fmtDateTime = (iso: string) =>
  new Date(iso).toLocaleString("tr-TR", { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/Istanbul" });
export const fmtTime = (iso: string) =>
  new Date(iso).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Istanbul" });
export const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString("tr-TR", { dateStyle: "medium", timeZone: "Europe/Istanbul" });
