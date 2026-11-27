export interface ActivitySummary {
  id: string;
  title: string;
  date: string;
  distanceMi: number;
  durationStr: string;
  avgPaceStr: string;
  avgHr: number;
  maxHr: number;
  elevationGainFt: number;
  trainingEffectLabel: string;
}

export interface Activity {
  title: string;
  trainingEffectLabel: string;
  date: string;
}

export interface StatCard {
  label: string;
  value: string;
}

export interface TelemetryPoint {
  lat: number;
  lon: number;
  distanceMi: number;
  paceMinPerMi: number | null;
  heartRate: number | null;
  elevationFt: number | null;
}

export interface ActivityTelemetry {
  id: string;
  points: TelemetryPoint[];
}

export interface Steps {
  calendarDate: string;
  totalSteps: number;
  totalDistance: number;
  stepGoal: number;
}
