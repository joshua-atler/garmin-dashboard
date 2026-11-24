import { Box, Paper, Typography, useTheme } from "@mui/material";
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { ActivityTelemetry, TelemetryPoint } from "./types";

function TelemetryChart({
  telemetryPoints,
}: {
  telemetryPoints: TelemetryPoint[] | null;
}) {
  const theme = useTheme();

  function formatPace(decimalMinutes: number): string {
    const mins = Math.floor(decimalMinutes);
    const secs = Math.round((decimalMinutes - mins) * 60);
    if (secs === 60) return `${mins + 1}:00`;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <ComposedChart
        data={telemetryPoints ?? []}
        margin={{ top: 12, right: 12, bottom: 8, left: 4 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke={theme.palette.divider} />

        <XAxis
          type="number"
          dataKey="distanceMi"
          domain={[0, "dataMax"]}
          tickCount={6}
          tickFormatter={(val: number) => `${val.toFixed(1)} mi`}
          stroke={theme.palette.text.secondary}
        />

        <YAxis
          yAxisId="pace"
          type="number"
          orientation="left"
          reversed
          width={48}
          domain={[6, 10]}
          allowDataOverflow
          tickFormatter={(val: number) => formatPace(val)}
          stroke={theme.palette.primary.main}
        />

        <YAxis
          yAxisId="heart"
          orientation="right"
          width={62}
          domain={["dataMin - 5", "dataMax + 5"]}
          tickFormatter={(val: number) => `${Math.round(val)} bpm`}
          stroke="#ef4444"
        />

        <YAxis
          yAxisId="elevation"
          domain={["dataMin - 10", "dataMax + 20"]}
          hide
        />

        <Tooltip />
        <Legend />

        <Area
          yAxisId="elevation"
          type="monotone"
          dataKey="elevationFt"
          name="Elevation"
          stroke="#10b981"
          fill="#10b981"
          fillOpacity={0.15}
          strokeWidth={1.5}
          dot={false}
          isAnimationActive={false}
        />

        <Line
          yAxisId="pace"
          type="monotone"
          dataKey="paceMinPerMi"
          name="Pace"
          stroke={theme.palette.primary.main}
          strokeWidth={2}
          dot={false}
          connectNulls
          isAnimationActive={false}
        />

        <Line
          yAxisId="heart"
          type="monotone"
          dataKey="heartRate"
          name="Heart Rate"
          stroke="#ef4444"
          strokeWidth={2}
          dot={false}
          connectNulls
          isAnimationActive={false}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

export default function TelemetryPanel({
  telemetry,
}: {
  telemetry: ActivityTelemetry | null;
}) {
  const theme = useTheme();

  return (
    <Paper
      variant="outlined"
      sx={{
        p: 2,
        height: 460,
        display: "flex",
        flexDirection: "column",
      }}
    >
      <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
        Pace, Heart Rate &amp; Elevation
      </Typography>
      <Box
        sx={{
          flexGrow: 1,
          bgcolor: theme.palette.mode === "light" ? "#f1f5f9" : "#202020",
          borderRadius: 1,
          p: 1,
          color: "text.secondary",
        }}
      >
        <TelemetryChart telemetryPoints={telemetry?.points ?? []} />
      </Box>
    </Paper>
  );
}
