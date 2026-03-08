"use client";

import { useState, useCallback, useEffect } from "react";
import { Copy, Trash2, Eye } from "lucide-react";
import { toast } from "sonner";
import { ResourceList } from "@/components/features/resources/ResourceList";
import type { Column, ContextMenuItemDef } from "@/components/features/resources/columns";
import { listCustomResources } from "@/lib/tauri/commands";
import type { CustomResourceInstance } from "@/lib/types/kubernetes";
import { formatAge } from "@/components/features/resources/lib/utils";
import { useResourceDetail } from "../../context";
import { useClusterStore } from "@/lib/stores/cluster-store";

export interface GenericResourceViewProps {
  group: string;
  version: string;
  kind: string;
  plural: string;
  scope: string;
}

export function GenericResourceView({
  group,
  version,
  kind,
  plural,
  scope,
}: GenericResourceViewProps) {
  const { currentNamespace } = useClusterStore();
  const { openResourceDetail, handleDeleteFromContext } = useResourceDetail();
  const [data, setData] = useState<CustomResourceInstance[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const apiVersion = group ? `${group}/${version}` : version;
  const isNamespaced = scope === "Namespaced";

  const fetch = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await listCustomResources(
        group,
        version,
        kind,
        plural,
        scope,
        isNamespaced ? (currentNamespace || undefined) : undefined
      );
      setData(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to fetch resources");
    } finally {
      setIsLoading(false);
    }
  }, [group, version, kind, plural, scope, isNamespaced, currentNamespace]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  const columns: Column<CustomResourceInstance>[] = [
    {
      key: "name",
      label: "Name",
      render: (item) => <span className="font-medium">{item.name}</span>,
    },
    ...(isNamespaced
      ? [
          {
            key: "namespace",
            label: "Namespace",
            render: (item: CustomResourceInstance) =>
              item.namespace ?? <span className="text-muted-foreground">—</span>,
          } satisfies Column<CustomResourceInstance>,
        ]
      : []),
    {
      key: "created_at",
      label: "Age",
      render: (item) =>
        item.created_at
          ? formatAge(item.created_at)
          : <span className="text-muted-foreground">—</span>,
    },
    {
      key: "labels",
      label: "Labels",
      render: (item) => {
        const count = Object.keys(item.labels).length;
        return count > 0 ? (
          `${count} label${count !== 1 ? "s" : ""}`
        ) : (
          <span className="text-muted-foreground">—</span>
        );
      },
    },
    {
      key: "annotations",
      label: "Annotations",
      render: (item) => {
        const count = Object.keys(item.annotations).length;
        return count > 0 ? (
          `${count} annotation${count !== 1 ? "s" : ""}`
        ) : (
          <span className="text-muted-foreground">—</span>
        );
      },
    },
    {
      key: "kind",
      label: "Kind",
      render: () => kind,
    },
    {
      key: "apiVersion",
      label: "API Version",
      render: () => apiVersion,
    },
  ];

  const getContextMenu = (item: CustomResourceInstance): ContextMenuItemDef[] => [
    {
      label: "View Details",
      icon: <Eye className="size-4" />,
      onClick: () =>
        openResourceDetail(kind, item.name, item.namespace ?? undefined),
    },
    { separator: true, label: "", onClick: () => {} },
    {
      label: "Copy Name",
      icon: <Copy className="size-4" />,
      onClick: () => {
        navigator.clipboard.writeText(item.name);
        toast.success("Copied to clipboard", { description: item.name });
      },
    },
    { separator: true, label: "", onClick: () => {} },
    {
      label: "Delete",
      icon: <Trash2 className="size-4" />,
      onClick: () =>
        handleDeleteFromContext(
          kind,
          item.name,
          isNamespaced ? (item.namespace ?? undefined) : undefined,
          fetch
        ),
      variant: "destructive",
    },
  ];

  return (
    <ResourceList
      title={kind}
      data={data}
      columns={columns}
      isLoading={isLoading}
      error={error}
      onRefresh={fetch}
      getRowKey={(item) => item.uid || item.name}
      getRowNamespace={isNamespaced ? (item) => item.namespace ?? "" : undefined}
      onRowClick={(item) =>
        openResourceDetail(kind, item.name, item.namespace ?? undefined)
      }
      contextMenuItems={getContextMenu}
    />
  );
}
