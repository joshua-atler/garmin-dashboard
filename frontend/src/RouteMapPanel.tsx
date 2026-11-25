import { Box, Paper, Typography } from "@mui/material";
import L from "leaflet";
import "leaflet-textpath";
import "leaflet/dist/leaflet.css";
import { useEffect, useMemo } from "react";
import {
  CircleMarker,
  LayersControl,
  MapContainer,
  Marker,
  TileLayer,
  Tooltip,
  useMap,
} from "react-leaflet";
import type { ActivityTelemetry } from "./types";

const PACE_COLORS = [
  "#dc2626", // Fast (red)
  "#f97316", // orange
  "#facc15", // yellow
  "#10b981", // green
  "#06b6d4", // cyan
  "#2563eb", // Slow (blue)
];

function formatPace(val: number): string {
  const totalSec = Math.round(val * 60);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function percentile(arr: number[], p: number): number {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const idx = (p / 100) * (sorted.length - 1);
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo);
}

function interpolateHexColor(colors: string[], t: number): string {
  const clamped = Math.max(0, Math.min(1, t));
  const scaled = clamped * (colors.length - 1);
  const idx = Math.floor(scaled);
  const frac = scaled - idx;
  const c1 = colors[idx];
  const c2 = colors[Math.min(idx + 1, colors.length - 1)];

  const r1 = parseInt(c1.slice(1, 3), 16);
  const g1 = parseInt(c1.slice(3, 5), 16);
  const b1 = parseInt(c1.slice(5, 7), 16);
  const r2 = parseInt(c2.slice(1, 3), 16);
  const g2 = parseInt(c2.slice(3, 5), 16);
  const b2 = parseInt(c2.slice(5, 7), 16);

  const r = Math.round(r1 + (r2 - r1) * frac);
  const g = Math.round(g1 + (g2 - g1) * frac);
  const b = Math.round(b1 + (b2 - b1) * frac);

  return `rgb(${r}, ${g}, ${b})`;
}

interface CleanPoint {
  coord: [number, number];
  pace: number;
  distanceMi: number;
}

/**
 * Renders the pace-colored route segments, directional chevrons (►),
 * and fits the map bounds whenever the route updates.
 */
function PaceGradientRoute({
  points,
  vmin,
  vmax,
}: {
  points: CleanPoint[];
  vmin: number;
  vmax: number;
}) {
  const map = useMap();

  useEffect(() => {
    if (points.length < 2) return;

    const layerGroup = L.layerGroup().addTo(map);
    const span = vmax - vmin || 1;

    // 1. Draw colored segments matching Folium ColorLine
    for (let i = 0; i < points.length - 1; i++) {
      const t = (points[i].pace - vmin) / span;
      const color = interpolateHexColor(PACE_COLORS, t);

      L.polyline([points[i].coord, points[i + 1].coord], {
        color,
        weight: 6,
        opacity: 0.95,
        lineCap: "round",
        lineJoin: "round",
      }).addTo(layerGroup);
    }

    // 2. Invisible polyline carrying repeated directional chevrons
    const arrowLine = L.polyline(
      points.map((p) => p.coord),
      { weight: 0, opacity: 0, interactive: false },
    ).addTo(layerGroup);

    (
      arrowLine as L.Polyline & {
        setText: (text: string | null, opts?: Record<string, unknown>) => void;
      }
    ).setText("        ►        ", {
      repeat: true,
      offset: 5,
      attributes: {
        fill: "#111827",
        "font-weight": "bold",
        "font-size": "13px",
      },
    });

    map.fitBounds(L.latLngBounds(points.map((p) => p.coord)), {
      padding: [24, 24],
    });

    return () => {
      layerGroup.remove();
    };
  }, [map, points, vmin, vmax]);

  return null;
}

export default function RouteMapPanel({
  telemetry,
}: {
  telemetry: ActivityTelemetry | null;
}) {
  const { cleanPoints, vmin, vmax, mileMarkers } = useMemo(() => {
    const pts: CleanPoint[] = [];

    for (const p of telemetry?.points ?? []) {
      if (
        typeof p.lat === "number" &&
        typeof p.lon === "number" &&
        typeof p.paceMinPerMi === "number" &&
        !Number.isNaN(p.paceMinPerMi)
      ) {
        pts.push({
          coord: [p.lat, p.lon],
          pace: p.paceMinPerMi,
          distanceMi: p.distanceMi ?? 0,
        });
      }
    }

    const paces = pts.map((p) => p.pace);
    const low = percentile(paces, 10);
    const high = percentile(paces, 90);

    // Compute numbered mile markers using closest distanceMi point
    const markers: { mile: number; coord: [number, number] }[] = [];
    const maxMile =
      pts.length > 0 ? Math.floor(pts[pts.length - 1].distanceMi) : 0;

    for (let mile = 1; mile <= maxMile; mile++) {
      let bestIdx = 0;
      let bestDiff = Infinity;
      for (let i = 0; i < pts.length; i++) {
        const diff = Math.abs(pts[i].distanceMi - mile);
        if (diff < bestDiff) {
          bestDiff = diff;
          bestIdx = i;
        }
      }
      markers.push({ mile, coord: pts[bestIdx].coord });
    }

    return { cleanPoints: pts, vmin: low, vmax: high, mileMarkers: markers };
  }, [telemetry]);

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
        Route Map
      </Typography>

      <Box
        sx={{
          flexGrow: 1,
          borderRadius: 1,
          overflow: "hidden",
          position: "relative",
          bgcolor: "#1a1a1a",
          // Invert only the Dark Mode tile layer
          "& .dark-map-tiles": {
            filter:
              "invert(100%) hue-rotate(180deg) brightness(92%) contrast(92%)",
          },
          "& .leaflet-control-zoom a, & .leaflet-control-layers": {
            bgcolor: "background.paper",
            color: "text.primary",
            borderColor: "divider",
          },
          "& .leaflet-control-zoom a:hover": {
            bgcolor: "action.hover",
          },
        }}
      >
        {cleanPoints.length > 1 ? (
          <>
            <MapContainer
              center={cleanPoints[0].coord}
              zoom={15}
              scrollWheelZoom
              style={{ height: "100%", width: "100%" }}
              attributionControl={false}
            >
              {/* LayerControl matching your Folium basemap options */}
              <LayersControl position="topright">
                <LayersControl.BaseLayer checked name="Dark Mode">
                  <TileLayer
                    url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}"
                    className="dark-map-tiles"
                  />
                </LayersControl.BaseLayer>
                <LayersControl.BaseLayer name="Light Mode">
                  <TileLayer url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}" />
                </LayersControl.BaseLayer>
                <LayersControl.BaseLayer name="Satellite">
                  <TileLayer url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}" />
                </LayersControl.BaseLayer>
                <LayersControl.BaseLayer name="OpenStreetMap">
                  <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                </LayersControl.BaseLayer>
              </LayersControl>

              <PaceGradientRoute points={cleanPoints} vmin={vmin} vmax={vmax} />

              {/* Start Marker */}
              <CircleMarker
                center={cleanPoints[0].coord}
                radius={7}
                pathOptions={{
                  color: "#ffffff",
                  weight: 2,
                  fillColor: "#2a9d8f",
                  fillOpacity: 1,
                }}
              >
                <Tooltip>Start</Tooltip>
              </CircleMarker>

              {/* Finish Marker */}
              <CircleMarker
                center={cleanPoints[cleanPoints.length - 1].coord}
                radius={7}
                pathOptions={{
                  color: "#ffffff",
                  weight: 2,
                  fillColor: "#e63946",
                  fillOpacity: 1,
                }}
              >
                <Tooltip>Finish</Tooltip>
              </CircleMarker>

              {/* Numbered Mile Markers */}
              {mileMarkers.map(({ mile, coord }) => (
                <Marker
                  key={mile}
                  position={coord}
                  icon={L.divIcon({
                    className: "",
                    iconSize: [20, 20],
                    iconAnchor: [10, 10],
                    html: `<div style="background:#1d3557;color:white;border-radius:50%;width:20px;height:20px;text-align:center;line-height:20px;font-size:11px;font-weight:bold;border:1.5px solid white;">${mile}</div>`,
                  })}
                >
                  <Tooltip>Mile {mile}</Tooltip>
                </Marker>
              ))}
            </MapContainer>

            {/* Pace Colorbar Legend matching cm.LinearColormap */}
            <Box
              sx={{
                position: "absolute",
                bottom: 12,
                right: 12,
                zIndex: 1000,
                bgcolor: "rgba(18, 22, 28, 0.88)",
                backdropFilter: "blur(4px)",
                border: "1px solid",
                borderColor: "divider",
                borderRadius: 1,
                px: 1.5,
                py: 0.75,
                pointerEvents: "none",
              }}
            >
              <Typography
                variant="caption"
                sx={{
                  display: "block",
                  color: "text.primary",
                  fontWeight: 500,
                  mb: 0.5,
                }}
              >
                Pace: {formatPace(vmin)} (Fast) → {formatPace(vmax)} /mi (Slow)
              </Typography>
              <Box
                sx={{
                  height: 8,
                  width: 210,
                  borderRadius: 0.5,
                  background: `linear-gradient(to right, ${PACE_COLORS.join(", ")})`,
                }}
              />
            </Box>
          </>
        ) : (
          <Box
            sx={{
              height: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "text.secondary",
            }}
          >
            <Typography variant="body2">
              No GPS data for this activity
            </Typography>
          </Box>
        )}
      </Box>
    </Paper>
  );
}
