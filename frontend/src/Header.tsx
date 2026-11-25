import { Sync } from "@mui/icons-material";
import {
  CircularProgress,
  ToggleButton,
  ToggleButtonGroup,
} from "@mui/material";
import AppBar from "@mui/material/AppBar";
import Button from "@mui/material/Button";
import Toolbar from "@mui/material/Toolbar";
import Typography from "@mui/material/Typography";

interface HeaderProps {
  alignment: string | null;
  handleAlignment: (
    event: React.MouseEvent<HTMLElement>,
    newAlignment: string | null,
  ) => void;
  mode: "light" | "dark";
  setMode: (id: "light" | "dark") => void;
  onSync: () => void;
  syncing: boolean;
}

export default function Header({
  alignment,
  handleAlignment,
  mode,
  setMode,
  onSync,
  syncing,
}: HeaderProps) {
  console.log(alignment);

  return (
    <AppBar position="static" color="default" elevation={1}>
      <Toolbar sx={{ gap: 2 }}>
        <Typography variant="h6" sx={{ fontWeight: 700, flexGrow: 1 }}>
          Garmin Telemetry
        </Typography>

        {/* <FormControl size="small" sx={{ minWidth: 260 }}>
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
        </FormControl> */}
        <ToggleButtonGroup
          value={alignment}
          exclusive
          onChange={handleAlignment}
          aria-label="text alignment"
        >
          <ToggleButton value="running">Running</ToggleButton>
          <ToggleButton value="steps">Steps</ToggleButton>
          <ToggleButton value="sleep">Sleep</ToggleButton>
        </ToggleButtonGroup>
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
        <Button
          color="success"
          variant="contained"
          onClick={onSync}
          disabled={syncing}
          startIcon={
            syncing ? <CircularProgress size={16} color="inherit" /> : <Sync />
          }
        >
          {syncing ? "Syncing..." : "Sync Now"}
        </Button>
      </Toolbar>
    </AppBar>
  );
}
