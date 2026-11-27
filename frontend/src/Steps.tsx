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
import { useEffect, useMemo, useState } from "react";
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

export default function Steps() {
  const theme = useTheme();

  const { steps, loading: stepsLoading, error: stepsError } = useSteps();

  const [granularity, setGranularity] = useState<"daily" | "monthly">("daily");
  const [showSmoothed, setShowSmoothed] = useState(true);
  const [rangePreset, setRangePreset] = useState<"30d" | "90d" | "all">("30d");
  const [brushRange, setBrushRange] = useState<{
    startIndex: number;
    endIndex: number;
  }>({ startIndex: 0, endIndex: 0 });

  // Group into YYYY-MM buckets using daily averages so partial months remain comparable
  const monthlySteps = useMemo(() => {
    const buckets = new Map<
      string,
      { totalSteps: number; totalGoal: number; days: number }
    >();

    for (const day of steps) {
      const monthKey = day.date.slice(0, 7); // "YYYY-MM"
      const current = buckets.get(monthKey) ?? {
        totalSteps: 0,
        totalGoal: 0,
        days: 0,
      };
      current.totalSteps += day.steps;
      current.totalGoal += day.goal;
      current.days += 1;
      buckets.set(monthKey, current);
    }

    return Array.from(buckets.entries()).map(([month, agg]) => ({
      date: month,
      steps: Math.round(agg.totalSteps / agg.days),
      goal: Math.round(agg.totalGoal / agg.days),
      totalSteps: agg.totalSteps,
      days: agg.days,
    }));
  }, [steps]);

  const chartData = useMemo(() => {
    const source = granularity === "monthly" ? monthlySteps : steps;
    const windowSize = granularity === "monthly" ? 3 : 7; // 3-month vs 7-day rolling avg

    return source.map((item, index) => {
      const start = Math.max(0, index - windowSize + 1);
      const slice = source.slice(start, index + 1);
      const avg =
        slice.reduce((sum, entry) => sum + entry.steps, 0) / slice.length;

      return {
        ...item,
        rollingAvg: Math.round(avg),
      };
    });
  }, [granularity, monthlySteps, steps]);

  // Reset brush window whenever granularity, data length, or preset changes
  useEffect(() => {
    if (chartData.length === 0) return;
    const end = chartData.length - 1;

    if (granularity === "monthly") {
      // Show all months by default (or up to 24 months)
      setBrushRange({
        startIndex: Math.max(0, chartData.length - 24),
        endIndex: end,
      });
      return;
    }

    const span =
      rangePreset === "30d"
        ? 30
        : rangePreset === "90d"
          ? 90
          : chartData.length;
    setBrushRange({
      startIndex: Math.max(0, chartData.length - span),
      endIndex: end,
    });
  }, [chartData.length, granularity, rangePreset]);

  const safeStart = Math.min(
    brushRange.startIndex,
    Math.max(0, chartData.length - 1),
  );
  const safeEnd = Math.min(
    brushRange.endIndex,
    Math.max(0, chartData.length - 1),
  );
  const visibleCount = chartData.length > 0 ? safeEnd - safeStart + 1 : 0;
  const unitLabel = granularity === "monthly" ? "months" : "days";

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
                onChange={(_, val) => {
                  if (val) setGranularity(val);
                }}
              >
                <ToggleButton value="daily">Daily</ToggleButton>
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
                label={
                  granularity === "monthly"
                    ? "3-Month Moving Avg"
                    : "7-Day Moving Avg"
                }
              />

              <Typography variant="caption" color="text.secondary">
                Showing {visibleCount} of {chartData.length} {unitLabel} (
                {chartData[safeStart]?.date} – {chartData[safeEnd]?.date})
              </Typography>
            </Box>

            {granularity === "daily" && (
              <ToggleButtonGroup
                size="small"
                exclusive
                value={rangePreset}
                onChange={(_, val) => {
                  if (val) setRangePreset(val);
                }}
              >
                <ToggleButton value="30d">30D</ToggleButton>
                <ToggleButton value="90d">90D</ToggleButton>
                <ToggleButton value="all">
                  All ({chartData.length}d)
                </ToggleButton>
              </ToggleButtonGroup>
            )}
          </Box>

          <Box sx={{ flexGrow: 1, minHeight: 0 }}>
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
                  name={
                    granularity === "monthly"
                      ? "Avg Daily Steps"
                      : "Daily Steps"
                  }
                  fill="#1976d2"
                  fillOpacity={showSmoothed ? 0.35 : 1}
                />
                {showSmoothed && (
                  <Line
                    type="monotone"
                    dataKey="rollingAvg"
                    name={
                      granularity === "monthly" ? "3-Month Avg" : "7-Day Avg"
                    }
                    stroke="#f59e0b"
                    strokeWidth={2}
                    dot={granularity === "monthly"}
                  />
                )}
                {chartData.length > 1 && (
                  <Brush
                    dataKey="date"
                    height={36}
                    startIndex={safeStart}
                    endIndex={safeEnd}
                    onChange={(next) => {
                      if (
                        typeof next.startIndex === "number" &&
                        typeof next.endIndex === "number"
                      ) {
                        setBrushRange({
                          startIndex: next.startIndex,
                          endIndex: next.endIndex,
                        });
                      }
                    }}
                    stroke={theme.palette.primary.main}
                    fill={theme.palette.action.hover}
                    travellerWidth={12}
                  >
                    <ComposedChart data={chartData}>
                      <Bar
                        dataKey="steps"
                        fill={theme.palette.text.disabled}
                        fillOpacity={0.45}
                        isAnimationActive={false}
                      />
                    </ComposedChart>
                  </Brush>
                )}
              </ComposedChart>
            </ResponsiveContainer>
          </Box>
        </>
      )}
    </Box>
  );
}
