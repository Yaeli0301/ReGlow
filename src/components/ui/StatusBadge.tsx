import type { ClientStatus } from "@/types";

const styles: Record<ClientStatus, string> = {
  active: "badge-active",
  atRisk: "badge-at-risk",
  lost: "badge-lost",
};

const labels: Record<ClientStatus, string> = {
  active: "Active",
  atRisk: "At Risk",
  lost: "Lost",
};

export function StatusBadge({ status }: { status: ClientStatus }) {
  return <span className={styles[status]}>{labels[status]}</span>;
}
