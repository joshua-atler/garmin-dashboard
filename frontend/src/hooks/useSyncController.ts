import { useCallback, useRef, useState } from "react";

interface SyncStatus {
  syncing: boolean;
  saved: number;
  error?: string;
}

interface SyncNotice {
  severity: "success" | "error";
  message: string;
}

/** Provides all state and actions needed to trigger and monitor a sync. */
export function useSyncController(actRefetch: () => Promise<void>) {
  const [syncing, setSyncing] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [syncNotice, setSyncNotice] = useState<SyncNotice | null>(null);
  const isPolling = useRef(false);

  const pollSyncStatus = useCallback(async () => {
    if (isPolling.current) return;
    isPolling.current = true;
    setSyncing(true);

    try {
      while (true) {
        const res = await fetch("/api/sync/status");
        if (!res.ok)
          throw new Error(`Status check failed (HTTP ${res.status})`);
        const status = (await res.json()) as SyncStatus;

        if (!status.syncing) {
          if (status.error) throw new Error(status.error);
          await actRefetch();
          if (status.saved > 0) setSelectedId(null);
          setSyncNotice({
            severity: "success",
            message:
              status.saved > 0
                ? `Synced ${status.saved} new run${status.saved === 1 ? "" : "s"}.`
                : "Already up to date.",
          });
          break;
        }

        await new Promise((resolve) => setTimeout(resolve, 1500));
      }
    } catch (err) {
      setSyncNotice({
        severity: "error",
        message: err instanceof Error ? err.message : String(err),
      });
    } finally {
      isPolling.current = false;
      setSyncing(false);
    }
  }, [actRefetch]);

  const handleSyncNow = useCallback(async () => {
    if (syncing || isPolling.current) return;
    setSyncing(true);
    try {
      const res = await fetch("/api/sync", { method: "POST" });
      if (!res.ok && res.status !== 409) {
        const body = (await res.json()) as { detail?: string };
        throw new Error(body.detail || `Sync failed (HTTP ${res.status})`);
      }
      await pollSyncStatus();
    } catch (err) {
      setSyncNotice({
        severity: "error",
        message: err instanceof Error ? err.message : String(err),
      });
      setSyncing(false);
    }
  }, [syncing, pollSyncStatus]);

  return {
    syncing,
    syncNotice,
    setSyncNotice,
    handleSyncNow,
    pollSyncStatus,
  };
}
