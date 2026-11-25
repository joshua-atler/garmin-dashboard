import { FormControl, InputLabel, MenuItem, Select } from "@mui/material";
import Chip from "@mui/material/Chip";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import type { Activity, ActivitySummary } from "./types";

export default function ActivityHeader({
  activity,
  activities,
  selectedId,
  setSelectedId,
}: {
  activity?: Activity;
  activities: ActivitySummary[];
  selectedId: string;
  setSelectedId: (id: string) => void;
}) {
  return (
    <Stack
      direction="row"
      sx={{ alignItems: "center", justifyContent: "space-between", mb: 2.5 }}
    >
      <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
        <Typography variant="h5" sx={{ fontWeight: 700 }}>
          {activity?.title}
        </Typography>
        <Chip
          label={activity?.trainingEffectLabel}
          color="primary"
          size="small"
          variant="outlined"
        />
        <Typography variant="body2" color="text.secondary">
          {activity?.date}
        </Typography>
      </Stack>
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
    </Stack>
  );
}
