import {
  Alert,
  Box,
  Checkbox,
  CircularProgress,
  FormControlLabel,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { useMemo, useRef, useState } from "react";
import {
  Bar,
  Brush,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useSteps } from "./hooks/useSteps";

type Granularity = "daily" | "weekly" | "monthly";
type RangePreset = "30d" | "90d" | "all";

const GRANULARITY_CONFIG: Record<
  Granularity,
  {
    windowSize: number;
    unitLabel: string;
    avgLabel: string;
    barName: string;
    spans: Record<RangePreset, number>;
  }
> = {
  daily: {
    windowSize: 7,
    unitLabel: "days",
    avgLabel: "7-Day Moving Avg",
    barName: "Daily Steps",
    spans: { "30d": 30, "90d": 90, all: Infinity },
  },
  weekly: {
    windowSize: 4,
    unitLabel: "weeks",
    avgLabel: "4-Week Moving Avg",
    barName: "Avg Daily Steps",
    spans: { "30d": 5, "90d": 13, all: Infinity },
  },
  monthly: {
    windowSize: 3,
    unitLabel: "months",
    avgLabel: "3-Month Moving Avg",
    barName: "Avg Daily Steps",
    spans: { "30d": 24, "90d": 24, all: Infinity },
  },
};

function getWeekStartKey(dateStr: string): string {
  const [year, month, day] = dateStr.split("-").map(Number);
  const d = new Date(year, month - 1, day);
  // Monday = 0, Sunday = 6
  const dayOfWeek = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - dayOfWeek);

  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

export default function Steps() {
  const theme = useTheme();
  const { steps, loading: stepsLoading, error: stepsError } = useSteps();

  const [granularity, setGranularity] = useState<Granularity>("daily");
  const [showSmoothed, setShowSmoothed] = useState(true);
  const [rangePreset, setRangePreset] = useState<RangePreset | null>("30d");
  const [customRange, setCustomRange] = useState<{
    startIndex: number;
    endIndex: number;
  } | null>(null);
  const isUserDragging = useRef(false);

  const config = GRANULARITY_CONFIG[granularity];

  const aggregatedSteps = useMemo(() => {
    if (granularity === "daily") return steps;

    const buckets = new Map<
      string,
      { totalSteps: number; totalGoal: number; days: number }
    >();

    for (const day of steps) {
      const key =
        granularity === "monthly"
          ? day.date.slice(0, 7)
          : getWeekStartKey(day.date);

      const current = buckets.get(key) ?? {
        totalSteps: 0,
        totalGoal: 0,
        days: 0,
      };
      current.totalSteps += day.steps;
      current.totalGoal += day.goal;
      current.days += 1;
      buckets.set(key, current);
    }

    return Array.from(buckets.entries()).map(([bucketDate, agg]) => ({
      date: bucketDate,
      steps: Math.round(agg.totalSteps / agg.days),
      goal: Math.round(agg.totalGoal / agg.days),
      totalSteps: agg.totalSteps,
      days: agg.days,
    }));
  }, [granularity, steps]);

  const chartData = useMemo(() => {
    return aggregatedSteps.map((item, index) => {
      const start = Math.max(0, index - config.windowSize + 1);
      const slice = aggregatedSteps.slice(start, index + 1);
      const avg =
        slice.reduce((sum, entry) => sum + entry.steps, 0) / slice.length;

      return {
        ...item,
        rollingAvg: Math.round(avg),
      };
    });
  }, [aggregatedSteps, config.windowSize]);

  const lastIndex = Math.max(0, chartData.length - 1);
  const defaultPreset: RangePreset = granularity === "monthly" ? "all" : "30d";
  const defaultSpan = config.spans[defaultPreset];

  const activeRange = customRange ?? {
    startIndex: Math.max(0, chartData.length - defaultSpan),
    endIndex: lastIndex,
  };

  const safeStart = Math.min(activeRange.startIndex, lastIndex);
  const safeEnd = Math.min(activeRange.endIndex, lastIndex);
  const visibleCount = chartData.length > 0 ? safeEnd - safeStart + 1 : 0;

  const applyPreset = (preset: RangePreset) => {
    if (chartData.length === 0) return;
    const end = chartData.length - 1;
    const span = config.spans[preset];

    setCustomRange({
      startIndex: Math.max(0, chartData.length - span),
      endIndex: end,
    });
  };

  return (
    <Box
      sx={{
        height: 400,
        p: 2,
        bgcolor: "background.paper",
        borderRadius: 2,
        display: "flex",
        flexDirection: "column",
      }}
    >
      {stepsError ? (
        <Alert severity="error">{stepsError}</Alert>
      ) : stepsLoading ? (
        <Box sx={{ display: "flex", justifyContent: "center", pt: 8 }}>
          <CircularProgress />
        </Box>
      ) : steps.length === 0 ? (
        <Alert severity="info">No step data available.</Alert>
      ) : (
        <>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: 1,
              mb: 1,
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
              <ToggleButtonGroup
                size="small"
                exclusive
                value={granularity}
                onChange={(_, val: Granularity | null) => {
                  if (!val) return;
                  setGranularity(val);
                  setRangePreset(val === "daily" ? "30d" : null);
                  setCustomRange(null);
                }}
              >
                <ToggleButton value="daily">Daily</ToggleButton>
                <ToggleButton value="weekly">Weekly</ToggleButton>
                <ToggleButton value="monthly">Monthly</ToggleButton>
              </ToggleButtonGroup>

              <FormControlLabel
                control={
                  <Checkbox
                    size="small"
                    checked={showSmoothed}
                    onChange={(e) => setShowSmoothed(e.target.checked)}
                  />
                }
                label={config.avgLabel}
              />

              <Typography variant="caption" color="text.secondary">
                Showing {visibleCount} of {chartData.length} {config.unitLabel}{" "}
                ({chartData[safeStart]?.date} – {chartData[safeEnd]?.date})
              </Typography>
            </Box>

            {granularity !== "monthly" && (
              <ToggleButtonGroup
                size="small"
                exclusive
                value={rangePreset}
                onChange={(_, val: RangePreset | null) => {
                  if (!val) return;
                  setRangePreset(val);
                  applyPreset(val);
                }}
              >
                <ToggleButton value="30d">30D</ToggleButton>
                <ToggleButton value="90d">90D</ToggleButton>
                <ToggleButton value="all">
                  All ({chartData.length}
                  {config.unitLabel[0]})
                </ToggleButton>
              </ToggleButtonGroup>
            )}
          </Box>

          <Box
            sx={{ flexGrow: 1, minHeight: 0 }}
            onPointerDown={() => {
              isUserDragging.current = true;
            }}
            onPointerUp={() => {
              setTimeout(() => {
                isUserDragging.current = false;
              }, 0);
            }}
          >
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip
                  contentStyle={{
                    backgroundColor: theme.palette.background.paper,
                    border: `1px solid ${theme.palette.divider}`,
                    color: theme.palette.text.primary,
                  }}
                />
                <Bar
                  dataKey="steps"
                  name={config.barName}
                  fill="#1976d2"
                  fillOpacity={showSmoothed ? 0.35 : 1}
                />
                {showSmoothed && (
                  <Line
                    type="monotone"
                    dataKey="rollingAvg"
                    name={config.avgLabel}
                    stroke="#f59e0b"
                    strokeWidth={2}
                    dot={granularity === "monthly"}
                  />
                )}
                {chartData.length > 1 && (
                  <Brush
                    key={`${granularity}-${chartData.length}`}
                    dataKey="date"
                    height={32}
                    startIndex={safeStart}
                    endIndex={safeEnd}
                    onChange={(next) => {
                      if (!isUserDragging.current) return;
                      if (
                        typeof next.startIndex === "number" &&
                        typeof next.endIndex === "number"
                      ) {
                        setRangePreset(null);
                        setCustomRange({
                          startIndex: next.startIndex,
                          endIndex: next.endIndex,
                        });
                      }
                    }}
                    stroke={theme.palette.primary.main}
                    fill={theme.palette.action.hover}
                    travellerWidth={10}
                  />
                )}
              </ComposedChart>
            </ResponsiveContainer>
          </Box>
        </>
      )}
    </Box>
  );
}
