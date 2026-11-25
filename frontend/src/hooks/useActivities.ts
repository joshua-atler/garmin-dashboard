import { useCallback, useEffect, useState } from "react";
import type { ActivitySummary } from "./types";

const CACHE_KEY = "garmin_activities_cache";

export function useActivities() {
  const [activities, setActivities] = useState<ActivitySummary[]>(() => {
    const cached = sessionStorage.getItem(CACHE_KEY);
    return cached ? JSON.parse(cached) : [];
  });
  const [loading, setLoading] = useState<boolean>(activities.length === 0);
  const [error, setError] = useState<string | null>(null);

  const fetchActivities = useCallback(async (signal?: AbortSignal) => {
    try {
      const res = await fetch("/api/activities", { signal });
      if (!res.ok)
        throw new Error(`HTTP ${res.status}: Failed to load activities`);
      const data: ActivitySummary[] = await res.json();

      setActivities(data);
      sessionStorage.setItem(CACHE_KEY, JSON.stringify(data));
      setError(null);
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        setError((err as Error).message);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    fetchActivities(controller.signal);
    return () => controller.abort();
  }, [fetchActivities]);

  const refetch = useCallback(async () => {
    sessionStorage.removeItem(CACHE_KEY);
    await fetchActivities();
  }, [fetchActivities]);

  return { activities, loading, error, refetch };
}
