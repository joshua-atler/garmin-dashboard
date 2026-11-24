import { useEffect, useState } from "react";
import type { ActivityTelemetry } from "../types";

export function useActivityTelemetry(activityId: string) {
  const [telemetry, setTelemetry] = useState<ActivityTelemetry | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!activityId) {
      setTelemetry(null);
      return;
    }

    const controller = new AbortController();

    async function load() {
      try {
        setLoading(true);
        const res = await fetch(`/api/activities/${activityId}`, {
          signal: controller.signal,
        });

        if (!res.ok) {
          throw new Error(`HTTP ${res.status}: Failed to load telemetry`);
        }

        const contentType = res.headers.get("content-type") ?? "";
        if (!contentType.includes("application/json")) {
          throw new Error(
            "Received HTML instead of JSON from telemetry endpoint.",
          );
        }

        const data: ActivityTelemetry = await res.json();
        setTelemetry(data);
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
  }, [activityId]);

  return { telemetry, loading, error };
}
