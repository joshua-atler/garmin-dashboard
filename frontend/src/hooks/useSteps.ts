import { useCallback, useEffect, useState } from "react";
import type { Steps } from "../types";

const CACHE_KEY = "garmin_steps_cache";

export function useSteps() {
  const [steps, setSteps] = useState<Steps[]>(() => {
    const cached = sessionStorage.getItem(CACHE_KEY);
    return cached ? JSON.parse(cached) : [];
  });
  const [loading, setLoading] = useState<boolean>(steps.length === 0);
  const [error, setError] = useState<string | null>(null);

  const fetchSteps = useCallback(async (signal?: AbortSignal) => {
    try {
      const res = await fetch("/api/steps", { signal });
      if (!res.ok)
        throw new Error(`HTTP ${res.status}: Failed to load activities`);
      const data: Steps[] = await res.json();

      setSteps(data);
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
    fetchSteps(controller.signal);
    return () => controller.abort();
  }, [fetchSteps]);

  const refetch = useCallback(async () => {
    sessionStorage.removeItem(CACHE_KEY);
    await fetchSteps();
  }, [fetchSteps]);

  return { steps: steps, loading, error, refetch };
}
