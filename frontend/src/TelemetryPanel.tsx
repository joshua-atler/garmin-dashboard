import DownloadIcon from "@mui/icons-material/Download";
import {
  Box,
  IconButton,
  Tooltip as MuiTooltip,
  Paper,
  Typography,
  useTheme,
} from "@mui/material";
import { toPng } from "html-to-image";
import { useRef } from "react";
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
  type LegendPayload,
} from "recharts";
import type { ActivityTelemetry, TelemetryPoint } from "./types";

const ITEM_ORDER: Record<string, number> = {
  paceMinPerMi: 1,
  heartRate: 2,
  elevationFt: 3,
};

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
        margin={{ top: 12, right: 36, bottom: 8, left: 16 }}
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
          width={40}
          domain={[6, 10]}
          ticks={[6, 7, 8, 9, 10]}
          allowDataOverflow
          tickFormatter={(val: number) => formatPace(val)}
          tick={{ fill: theme.palette.primary.main }}
          axisLine={{ stroke: theme.palette.primary.main }}
          tickLine={{ stroke: theme.palette.primary.main }}
        />

        <YAxis
          yAxisId="heart"
          orientation="right"
          width={80}
          domain={["dataMin - 5", "dataMax + 5"]}
          tickFormatter={(val: number) => `${Math.round(val)} bpm`}
          stroke="#ef4444"
        />

        <YAxis
          yAxisId="elevation"
          domain={["dataMin - 10", "dataMax + 20"]}
          width={0}
          hide
        />

        <Tooltip
          labelFormatter={(value) => `Distance: ${Number(value).toFixed(1)} mi`}
          itemSorter={(item) => ITEM_ORDER[String(item.dataKey ?? "")] ?? 99}
          contentStyle={{
            backgroundColor: theme.palette.background.paper,
            border: `1px solid ${theme.palette.divider}`,
            color: theme.palette.text.primary,
          }}
          labelStyle={{ color: theme.palette.text.primary }}
          itemStyle={{ color: theme.palette.text.primary }}
          formatter={(value, name) => {
            if (name === "Pace") return `${formatPace(Number(value))} `;
            if (name === "Heart Rate") return `${value} bpm`;
            if (name === "Elevation") return `${value} ft`;
            return value;
          }}
        />
        <Legend
          itemSorter={(item: LegendPayload) =>
            ITEM_ORDER[String(item.dataKey ?? "")] ?? 99
          }
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
          isAnimationActive={true}
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
          isAnimationActive={true}
        />

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
          isAnimationActive={true}
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
  const chartContainerRef = useRef<HTMLDivElement>(null);

  async function handleDownload() {
    if (!chartContainerRef.current) return;

    const dataUrl = await toPng(chartContainerRef.current, {
      backgroundColor: theme.palette.background.paper,
      pixelRatio: 2,
    });

    const link = document.createElement("a");
    link.download = "garmin-telemetry.png";
    link.href = dataUrl;
    link.click();
  }

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
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 1,
        }}
      >
        <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
          Details
        </Typography>
        <MuiTooltip title="Download chart as PNG">
          <IconButton
            size="small"
            onClick={handleDownload}
            aria-label="download chart"
          >
            <DownloadIcon fontSize="small" />
          </IconButton>
        </MuiTooltip>
      </Box>
      <Box
        ref={chartContainerRef}
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
