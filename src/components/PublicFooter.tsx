import { HOSPITAL_NAME } from "@/lib/hospital";

export function PublicFooter() {
  return <footer className="border-t py-8 text-center text-sm text-muted-foreground">© {new Date().getFullYear()} {HOSPITAL_NAME}</footer>;
}

export function initials(name: string) {
  return name.split(" ").filter(Boolean).slice(0, 2).map((p) => p[0]).join("").toUpperCase();
}
