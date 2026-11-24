import AppBar from "@mui/material/AppBar";
import Button from "@mui/material/Button";
import FormControl from "@mui/material/FormControl";
import InputLabel from "@mui/material/InputLabel";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import Toolbar from "@mui/material/Toolbar";
import Typography from "@mui/material/Typography";
import type { ActivitySummary } from "./types";

interface HeaderProps {
  activities: ActivitySummary[];
  selectedId: string;
  setSelectedId: (id: string) => void;
  mode: "light" | "dark";
  setMode: (id: "light" | "dark") => void;
}

export default function Header({
  activities,
  selectedId,
  setSelectedId,
  mode,
  setMode,
}: HeaderProps) {
  return (
    <AppBar position="static" color="default" elevation={1}>
      <Toolbar sx={{ gap: 2 }}>
        <Typography variant="h6" sx={{ fontWeight: 700, flexGrow: 1 }}>
          Garmin Telemetry
        </Typography>

        <FormControl size="small" sx={{ minWidth: 260 }}>
          <InputLabel id="activity-select-label">Activity</InputLabel>
          <Select
            labelId="activity-select-label"
            value={selectedId}
            label="Activity"
            onChange={(event) => setSelectedId(event.target.value)}
          >
            {activities.map((item) => (
              <MenuItem key={item.id} value={item.id}>
                {item.date} — {item.title} ({item.distanceMi.toFixed(2)} mi)
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <Button
          variant="contained"
          onClick={() => setMode(mode === "light" ? "dark" : "light")}
          sx={{
            bgcolor: "#334155",
            color: "#fff",
            "&:hover": { bgcolor: "#1e293b" },
          }}
        >
          Theme
        </Button>
      </Toolbar>
    </AppBar>
  );
}
