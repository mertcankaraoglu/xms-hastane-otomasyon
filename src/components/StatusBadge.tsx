import { STATUS_CLASS, STATUS_LABEL, type Status } from "@/lib/hospital";
import { cn } from "@/lib/utils";

export function StatusBadge({ status }: { status: Status }) {
  return <span className={cn("inline-flex rounded-full border px-2 py-0.5 text-xs font-medium", STATUS_CLASS[status])}>{STATUS_LABEL[status]}</span>;
}
