import type { CRDInfo } from "@/lib/types/kubernetes";

export function getCRDProviderInitials(group: string): string {
  const firstLabel = group.split(".")[0];
  return firstLabel.replace(/-/g, "").slice(0, 2).toUpperCase();
}

export function groupCRDsByProvider(crds: CRDInfo[]): Map<string, CRDInfo[]> {
  const map = new Map<string, CRDInfo[]>();
  for (const crd of crds) {
    const existing = map.get(crd.group);
    if (existing) {
      existing.push(crd);
    } else {
      map.set(crd.group, [crd]);
    }
  }
  return new Map([...map.entries()].sort(([a], [b]) => a.localeCompare(b)));
}
