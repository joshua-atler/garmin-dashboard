import {
  Alert,
  Box,
  CircularProgress,
  Container,
  CssBaseline,
  ThemeProvider,
  createTheme,
} from "@mui/material";
import { useRef, useState } from "react";
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
  const theme = createTheme({
    palette: {
      mode,
      background: {
        default: mode === "light" ? "#f8fafc" : "#141414",
      },
    },
  });

  const { activities, loading, error } = useActivities();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Automatically default to the newest activity once loaded
  const activeId = selectedId ?? activities[0]?.id ?? "";
  const activity = activities.find((a) => a.id === activeId);

  const {
    telemetry,
    loading: telemetryLoading,
    error: telemetryError,
  } = useActivityTelemetry(activeId);

  console.log(telemetry);

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", mt: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error || !activity) {
    return (
      <Container maxWidth="md" sx={{ mt: 4 }}>
        <Alert severity="error">{error ?? "No activities found."}</Alert>
      </Container>
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
            <RouteMapPanel />
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
    </ThemeProvider>
  );
}
