import { useEffect, useState } from "react";
import type { ActivitySummary } from "../types";

export function useActivities() {
  const [activities, setActivities] = useState<ActivitySummary[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    async function load() {
      try {
        setLoading(true);
        const res = await fetch("/api/activities", {
          signal: controller.signal,
        });

        if (!res.ok) {
          throw new Error(`HTTP ${res.status}: Failed to load activities`);
        }

        const contentType = res.headers.get("content-type") ?? "";
        if (!contentType.includes("application/json")) {
          throw new Error(
            "API returned HTML instead of JSON. Check that the FastAPI backend is running and Vite's /api proxy is configured.",
          );
        }

        const data: ActivitySummary[] = await res.json();

        setActivities(data);
        setError(null);
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          setError((err as Error).message);
        }
      } finally {
        setLoading(false);
      }
    }

    load();
    return () => controller.abort();
  }, []);

  return { activities, loading, error };
}
