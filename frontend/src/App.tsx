import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Container,
  CssBaseline,
  Snackbar,
  ThemeProvider,
  createTheme,
} from "@mui/material";
import { useCallback, useEffect, useRef, useState } from "react";
import Header from "./Header";
import { useActivities } from "./hooks/useActivities";
import { useActivityTelemetry } from "./hooks/useActivityTelemetry";
import RouteMapPanel from "./RouteMapPanel";
import StatCards from "./StatCards";
import ActivityHeader from "./Summary";
import TelemetryPanel from "./TelemetryPanel";

export default function App() {
  const [mode, setMode] = useState<"light" | "dark">("dark");
  const [mapWidth, setMapWidth] = useState(5);
  const panelsRef = useRef<HTMLDivElement>(null);
  const didAutoSync = useRef(false);
  const isPolling = useRef(false);

  const theme = createTheme({
    palette: {
      mode,
      background: {
        default: mode === "light" ? "#f8fafc" : "#141414",
      },
    },
  });

  const { activities, loading, error, refetch } = useActivities();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [syncNotice, setSyncNotice] = useState<{
    severity: "success" | "error";
    message: string;
  } | null>(null);

  // Automatically default to the newest activity once loaded
  const activeId = selectedId ?? activities[0]?.id ?? "";
  const activity = activities.find((a) => a.id === activeId);

  const {
    telemetry,
    loading: telemetryLoading,
    error: telemetryError,
  } = useActivityTelemetry(activeId);

  const pollSyncStatus = useCallback(async () => {
    if (isPolling.current) return;
    isPolling.current = true;
    setSyncing(true);

    try {
      while (true) {
        const res = await fetch("/api/sync/status");
        if (!res.ok) {
          throw new Error(`Status check failed (HTTP ${res.status})`);
        }
        const status = await res.json();

        if (!status.syncing) {
          if (status.error) {
            throw new Error(status.error);
          }
          await refetch();
          if (status.saved > 0) {
            setSelectedId(null); // Snap to the newest synced run
          }
          setSyncNotice({
            severity: "success",
            message:
              status.saved > 0
                ? `Synced ${status.saved} new run${status.saved === 1 ? "" : "s"}.`
                : "Already up to date.",
          });
          break;
        }

        await new Promise((r) => setTimeout(r, 1500));
      }
    } catch (err) {
      setSyncNotice({
        severity: "error",
        message: (err as Error).message,
      });
    } finally {
      isPolling.current = false;
      setSyncing(false);
    }
  }, [refetch]);

  const handleSyncNow = useCallback(async () => {
    if (syncing || isPolling.current) return;
    setSyncing(true);
    try {
      const res = await fetch("/api/sync", { method: "POST" });
      if (!res.ok && res.status !== 409) {
        const body = await res.json();
        throw new Error(body.detail || `Sync failed (HTTP ${res.status})`);
      }
      await pollSyncStatus();
    } catch (err) {
      setSyncNotice({
        severity: "error",
        message: (err as Error).message,
      });
      setSyncing(false);
    }
  }, [syncing, pollSyncStatus]);

  // On mount / reload, re-attach to any active backend sync or auto-sync if empty
  useEffect(() => {
    let cancelled = false;

    async function checkInitialSync() {
      try {
        const res = await fetch("/api/sync/status");
        if (!res.ok || cancelled) return;
        const status = await res.json();

        if (status.syncing) {
          didAutoSync.current = true;
          pollSyncStatus();
        } else if (
          !loading &&
          !error &&
          activities.length === 0 &&
          !didAutoSync.current
        ) {
          didAutoSync.current = true;
          handleSyncNow();
        }
      } catch {
        // Ignore initial status check errors; normal fetch error handling applies
      }
    }

    checkInitialSync();
    return () => {
      cancelled = true;
    };
  }, [loading, error, activities.length, pollSyncStatus, handleSyncNow]);

  const syncToast = (
    <Snackbar
      open={syncNotice !== null}
      autoHideDuration={4000}
      onClose={() => setSyncNotice(null)}
      anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
    >
      {syncNotice ? (
        <Alert
          severity={syncNotice.severity}
          onClose={() => setSyncNotice(null)}
          variant="filled"
        >
          {syncNotice.message}
        </Alert>
      ) : undefined}
    </Snackbar>
  );

  if (loading) {
    return (
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Box sx={{ display: "flex", justifyContent: "center", mt: 8 }}>
          <CircularProgress />
        </Box>
      </ThemeProvider>
    );
  }

  if (error) {
    return (
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Container maxWidth="md" sx={{ mt: 4 }}>
          <Alert severity="error">{error}</Alert>
        </Container>
      </ThemeProvider>
    );
  }

  if (!activity) {
    return (
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Header
          activities={activities}
          selectedId={activeId}
          setSelectedId={setSelectedId}
          mode={mode}
          setMode={setMode}
          onSync={handleSyncNow}
          syncing={syncing}
        />
        <Container maxWidth="md" sx={{ mt: 4 }}>
          <Alert
            severity="info"
            action={
              <Button
                color="inherit"
                size="small"
                onClick={handleSyncNow}
                disabled={syncing}
              >
                {syncing ? "Syncing..." : "Sync Now"}
              </Button>
            }
          >
            {syncing
              ? "No cached runs found — syncing from Garmin..."
              : "No activities found."}
          </Alert>
        </Container>
        {syncToast}
      </ThemeProvider>
    );
  }

  const statCards = [
    { label: "Distance", value: `${activity.distanceMi.toFixed(2)} mi` },
    { label: "Duration", value: activity.durationStr },
    { label: "Avg Pace", value: activity.avgPaceStr },
    {
      label: "Avg / Max HR",
      value: `${activity.avgHr} / ${activity.maxHr} bpm`,
    },
    { label: "Elevation Gain", value: `${activity.elevationGainFt} ft` },
  ];

  const resizePanels = (event: React.PointerEvent<HTMLDivElement>) => {
    const bounds = panelsRef.current?.getBoundingClientRect();
    if (!bounds) return;

    const width = ((event.clientX - bounds.left) / bounds.width) * 12;
    setMapWidth(Math.max(3, Math.min(9, width)));
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />

      {/* Top Navigation & Activity Selector */}
      <Header
        activities={activities}
        selectedId={activeId}
        setSelectedId={setSelectedId}
        mode={mode}
        setMode={setMode}
        onSync={handleSyncNow}
        syncing={syncing}
      />

      {/* Main Content Container */}
      <Container maxWidth="xl" sx={{ py: 3 }}>
        {/* Run Header */}
        <ActivityHeader activity={activity} />

        {/* Summary Metrics Row */}
        <StatCards statCards={statCards} />

        {/* Split Route Map & Telemetry Chart Area */}
        <Box
          ref={panelsRef}
          sx={{
            display: "grid",
            gridTemplateColumns: {
              xs: "minmax(0, 1fr)",
              lg: `minmax(0, ${mapWidth}fr) 8px minmax(0, ${12 - mapWidth}fr)`,
            },
            gap: 1,
            alignItems: "start",
          }}
        >
          <Box sx={{ minWidth: 0 }}>
            <RouteMapPanel telemetry={telemetry} />
          </Box>

          <Box
            role="separator"
            aria-label="Resize map and telemetry panels"
            aria-orientation="vertical"
            tabIndex={0}
            onPointerDown={(event) => {
              event.currentTarget.setPointerCapture(event.pointerId);
              resizePanels(event);
            }}
            onPointerMove={(event) => {
              if (event.buttons === 1) resizePanels(event);
            }}
            onKeyDown={(event) => {
              if (event.key === "ArrowLeft")
                setMapWidth((width) => Math.max(3, width - 0.5));
              if (event.key === "ArrowRight")
                setMapWidth((width) => Math.min(9, width + 0.5));
            }}
            sx={{
              display: { xs: "none", lg: "block" },
              width: 6,
              height: "100%",
              minHeight: 240,
              cursor: "col-resize",
              touchAction: "none",
              borderRadius: 1,
              bgcolor: "divider",
              "&:hover, &:focus-visible": {
                bgcolor: "primary.main",
                outline: "none",
              },
            }}
          />

          {/* Right Panel: Pace / HR / Elevation Chart */}
          <Box sx={{ minWidth: 0 }}>
            <TelemetryPanel telemetry={telemetry} />
          </Box>
        </Box>
      </Container>

      {/* Sync Status Toast */}
      {syncToast}
    </ThemeProvider>
  );
}
