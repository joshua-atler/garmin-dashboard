import { Box, Paper, Typography, useTheme } from "@mui/material";
import "leaflet/dist/leaflet.css";
import { useMemo } from "react";
import { MapContainer, Polyline, TileLayer } from "react-leaflet";

const DEFAULT_COORDS = [
  [37.7749, -122.4194],
  [37.7755, -122.4182],
  [37.7768, -122.4171],
];

export default function RouteMapPanel({
  coords = DEFAULT_COORDS,
  pace = "5:30 / mi",
}) {
  const theme = useTheme();
  const coordinateSummary = useMemo(
    () => `${coords.length} route points · ${pace}`,
    [coords, pace],
  );

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
        }}
      >
        <MapContainer
          center={coords[0] ?? DEFAULT_COORDS[0]}
          zoom={15}
          scrollWheelZoom
          style={{ height: "100%", width: "100%" }}
          attributionControl={false}
        >
          <TileLayer
            // attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {coords.length > 1 && (
            <Polyline
              positions={coords}
              pathOptions={{
                color: theme.palette.error.dark,
                weight: 4,
              }}
            />
          )}
        </MapContainer>
        <Typography
          variant="caption"
          sx={{
            position: "absolute",
            right: 8,
            bottom: 8,
            zIndex: 1000,
            px: 1,
            py: 0.25,
            borderRadius: 1,
            bgcolor: "background.paper",
            color: "text.secondary",
          }}
        >
          {/* {coordinateSummary} */}
        </Typography>
      </Box>
    </Paper>
  );
}
