"use client";

import { useMemo, useState } from "react";
import { Puzzle, ChevronRight, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { useTabsStore } from "@/lib/stores/tabs-store";
import { groupCRDsByProvider, getCRDProviderInitials } from "@/lib/utils/crd-provider";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { CRDInfo } from "@/lib/types/kubernetes";

interface CustomResourcesSectionProps {
  activeResource: string;
  data: CRDInfo[];
  isLoading: boolean;
}

function CRDProviderIcon({ group }: { group: string }) {
  const initials = getCRDProviderInitials(group);

  let hash = 0;
  for (let i = 0; i < group.length; i++) {
    hash = group.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash) % 360;

  return (
    <span
      className="shrink-0 size-[14px] rounded text-[8px] font-bold flex items-center justify-center text-white"
      style={{ backgroundColor: `hsl(${hue}, 50%, 40%)` }}
    >
      {initials}
    </span>
  );
}

export function CustomResourcesSection({ activeResource, data, isLoading }: CustomResourcesSectionProps) {
  const t = useTranslations();
  const { tabs, activeTabId, navigateCurrentTab, openTab } = useTabsStore();
  const [providerOpen, setProviderOpen] = useState<Record<string, boolean>>({});

  const activeTab = tabs.find((tab) => tab.id === activeTabId);
  const activeCRDKey = activeTab?.metadata?.customResource
    ? `${activeTab.metadata.customResource.group}/${activeTab.metadata.customResource.kind}`
    : null;

  const grouped = useMemo(() => groupCRDsByProvider(data), [data]);

  if (!isLoading && data.length === 0) return null;

  const buildCRDMetadata = (crd: CRDInfo) => ({
    group: crd.group,
    version: crd.stored_versions[0] ?? crd.versions[0]?.name ?? "v1",
    kind: crd.kind,
    plural: crd.plural,
    scope: crd.scope,
  });

  const handleSelect = (crd: CRDInfo) => {
    const meta = buildCRDMetadata(crd);
    navigateCurrentTab("custom-resource", `${crd.group} - ${crd.kind}`, { customResource: meta });
  };

  const handleSelectNewTab = (crd: CRDInfo) => {
    if (tabs.length >= 10) {
      toast.warning(t("tabs.limitToast"));
      return;
    }
    const meta = buildCRDMetadata(crd);
    openTab("custom-resource", `${crd.group} - ${crd.kind}`, {
      newTab: true,
      metadata: { customResource: meta },
    });
  };

  return (
    <Collapsible defaultOpen={false} className="mb-1">
      <CollapsibleTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start gap-2 px-2 font-medium text-muted-foreground hover:text-foreground [&[data-state=open]>svg.chevron]:rotate-90"
        >
          <Puzzle className="size-4" />
          <span className="flex-1 text-left">Custom Resources</span>
          {isLoading ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <ChevronRight className="chevron size-3.5 transition-transform" />
          )}
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent className="ml-2 mt-0.5 space-y-0.5">
        {[...grouped.entries()].map(([group, crds]) => (
          <Collapsible
            key={group}
            open={providerOpen[group] ?? false}
            onOpenChange={(open) => setProviderOpen((prev) => ({ ...prev, [group]: open }))}
            className="mb-0.5"
          >
            <CollapsibleTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start gap-2 px-2 font-normal text-muted-foreground hover:text-foreground [&[data-state=open]>svg.chevron]:rotate-90"
              >
                <CRDProviderIcon group={group} />
                <span className="flex-1 text-left truncate text-xs">{group}</span>
                <ChevronRight className="chevron size-3 transition-transform shrink-0" />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="ml-4 mt-0.5 space-y-0.5">
              {crds.map((crd) => {
                const crdKey = `${crd.group}/${crd.kind}`;
                const isActive = activeResource === "custom-resource" && activeCRDKey === crdKey;
                return (
                  <Button
                    key={crdKey}
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      if (e.metaKey || e.ctrlKey) {
                        handleSelectNewTab(crd);
                      } else {
                        handleSelect(crd);
                      }
                    }}
                    className={cn(
                      "w-full justify-start px-2 font-normal text-xs",
                      isActive
                        ? "bg-primary/10 text-primary hover:bg-primary/20 hover:text-primary"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {crd.kind}
                  </Button>
                );
              })}
            </CollapsibleContent>
          </Collapsible>
        ))}
      </CollapsibleContent>
    </Collapsible>
  );
}
