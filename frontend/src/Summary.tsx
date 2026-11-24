import Chip from "@mui/material/Chip";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import type { Activity } from "./types";

export default function ActivityHeader({ activity }: { activity?: Activity }) {
  return (
    <Stack direction="row" spacing={1.5} sx={{ alignItems: "center", mb: 2.5 }}>
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
  );
}
