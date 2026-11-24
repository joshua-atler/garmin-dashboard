import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Grid from "@mui/material/Grid";
import Typography from "@mui/material/Typography";
import type { StatCard } from "./types";

const statCards = [
  { label: "Metric 1", value: "0" },
  { label: "Metric 2", value: "0" },
  { label: "Metric 3", value: "0" },
  { label: "Metric 4", value: "0" },
  { label: "Metric 5", value: "0" },
];

export default function StatCards({ statCards }: { statCards: StatCard[] }) {
  return (
    <Box sx={{ width: "100%", p: 2 }}>
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {statCards.map((stat) => (
          <Grid key={stat.label} size={{ xs: 6, sm: 4, md: 2.4 }}>
            <Card variant="outlined">
              <CardContent sx={{ py: 1.5, "&:last-child": { pb: 1.5 } }}>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ fontWeight: 700 }}
                >
                  {stat.label}
                </Typography>
                <Typography variant="h6" sx={{ fontWeight: 700 }}>
                  {stat.value}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}
