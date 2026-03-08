"use client";

import { useTabsStore } from "@/lib/stores/tabs-store";
import { GenericResourceView } from "./generic/GenericResourceView";

export function DefaultResourceView() {
  const { tabs, activeTabId } = useTabsStore();
  const activeTab = tabs.find((t) => t.id === activeTabId);
  const crdMeta = activeTab?.metadata?.customResource;

  if (!crdMeta) {
    return (
      <div className="flex h-full items-center justify-center text-muted-foreground">
        No view available for this resource
      </div>
    );
  }

  return <GenericResourceView {...crdMeta} />;
}
