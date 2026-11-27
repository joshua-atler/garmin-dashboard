import {
  Alert,
  Container,
  CssBaseline,
  Snackbar,
  ThemeProvider,
  createTheme,
} from "@mui/material";
import { useRef, useState } from "react";
import Header from "./Header";
import { useActivities } from "./hooks/useActivities";
import { useSyncController } from "./hooks/useSyncController";
import Running from "./Running";
import Steps from "./Steps";

export default function App() {
  const [mode, setMode] = useState<"light" | "dark">("dark");
  const panelsRef = useRef<HTMLDivElement>(null);

  const theme = createTheme({
    palette: {
      mode,
      background: {
        default: mode === "light" ? "#f8fafc" : "#141414",
      },
    },
  });

  const {
    activities,
    loading: actLoading,
    error: actError,
    refetch: actRefetch,
  } = useActivities();

  const { syncing, syncNotice, setSyncNotice, handleSyncNow } =
    useSyncController(actRefetch);

  const [alignment, setAlignment] = useState<string | null>("running");

  const handleAlignment = (
    event: React.MouseEvent<HTMLElement>,
    newAlignment: string | null,
  ) => {
    if (newAlignment !== null) {
      setAlignment(newAlignment);
    }
  };

  const syncToast = (
    <Snackbar
      open={syncNotice !== null}
      autoHideDuration={4000}
      onClose={() => setSyncNotice(null)}
      anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
    >
      {syncNotice ? (
        <Alert
          severity={syncNotice.severity}
          onClose={() => setSyncNotice(null)}
          variant="filled"
        >
          {syncNotice.message}
        </Alert>
      ) : undefined}
    </Snackbar>
  );

  // if (actLoading) {
  //   return (
  //     <ThemeProvider theme={theme}>
  //       <CssBaseline />
  //       <Box sx={{ display: "flex", justifyContent: "center", mt: 8 }}>
  //         <CircularProgress />
  //       </Box>
  //     </ThemeProvider>
  //   );
  // }

  // if (actError) {
  //   return (
  //     <ThemeProvider theme={theme}>
  //       <CssBaseline />
  //       <Container maxWidth="md" sx={{ mt: 4 }}>
  //         <Alert severity="error">{actError}</Alert>
  //       </Container>
  //     </ThemeProvider>
  //   );
  // }

  // if (!activity) {
  //   return (
  //     <ThemeProvider theme={theme}>
  //       <CssBaseline />
  //       <Header
  //         alignment={alignment}
  //         handleAlignment={handleAlignment}
  //         mode={mode}
  //         setMode={setMode}
  //         onSync={handleSyncNow}
  //         syncing={syncing}
  //       />
  //       <Container maxWidth="md" sx={{ mt: 4 }}>
  //         <Alert
  //           severity="info"
  //           action={
  //             <Button
  //               color="inherit"
  //               size="small"
  //               onClick={handleSyncNow}
  //               disabled={syncing}
  //             >
  //               {syncing ? "Syncing..." : "Sync Now"}
  //             </Button>
  //           }
  //         >
  //           {syncing
  //             ? "No cached runs found — syncing from Garmin..."
  //             : "No activities found."}
  //         </Alert>
  //       </Container>
  //       {syncToast}
  //     </ThemeProvider>
  //   );
  // }

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />

      {/* Top Navigation & Activity Selector */}
      <Header
        alignment={alignment}
        handleAlignment={handleAlignment}
        mode={mode}
        setMode={setMode}
        onSync={handleSyncNow}
        syncing={syncing}
      />

      {/* Main Content Container */}

      {alignment === "running" && (
        <Container maxWidth="xl" sx={{ py: 3 }}>
          <Running activities={activities} />
        </Container>
      )}
      {alignment === "steps" && (
        <Container maxWidth="xl" sx={{ py: 3 }}>
          <Steps />
        </Container>
      )}

      {/* Sync Status Toast */}
      {syncToast}
    </ThemeProvider>
  );
}
