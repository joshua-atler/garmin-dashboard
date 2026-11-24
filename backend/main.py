from datetime import datetime
import json
from pathlib import Path
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="Garmin Telemetry API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)

DATA_DIR = Path(__file__).parent / "data"
METERS_PER_MILE = 1609.344
FEET_PER_METER = 3.28084


def format_mmss(total_seconds: float) -> str:
    mins, secs = divmod(int(round(total_seconds)), 60)
    return f"{mins}:{secs:02d}"


@app.get("/api/activities")
def list_activities():
    runs = []
    for summary_file in DATA_DIR.glob("*_summary.json"):
        raw = json.loads(summary_file.read_text())
        dist_m = raw.get("distance", 0)
        dur_s = raw.get("duration", 0)
        dist_mi = dist_m / METERS_PER_MILE if dist_m else 0
        pace_sec_per_mi = dur_s / dist_mi if dist_mi > 0 else 0

        start_local = raw.get("startTimeLocal", "")
        try:
            date_str = datetime.fromisoformat(start_local).strftime("%m/%d/%y")
        except ValueError:
            date_str = start_local[:10]

        runs.append({
            "id": str(raw["activityId"]),
            "title": raw.get("activityName", "Run"),
            "date": date_str,
            "startTimeLocal": start_local,
            "distanceMi": round(dist_mi, 2),
            "durationStr": format_mmss(dur_s),
            "avgPaceStr": f"{format_mmss(pace_sec_per_mi)} /mi" if dist_mi > 0 else "--",
            "avgHr": round(raw.get("averageHR", 0)),
            "maxHr": round(raw.get("maxHR", 0)),
            "elevationGainFt": round(raw.get("elevationGain", 0) * FEET_PER_METER),
            "trainingEffectLabel": raw.get("trainingEffectLabel", "RUN"),
        })

    runs.sort(key=lambda r: r["startTimeLocal"], reverse=True)
    return runs


@app.get("/api/activities/{activity_id}")
def get_activity_telemetry(activity_id: str):
    details_file = DATA_DIR / f"{activity_id}_details.json"
    if not details_file.exists():
        raise HTTPException(
            status_code=404, detail="Activity details not found")

    raw = json.loads(details_file.read_text())
    descriptors = raw.get("metricDescriptors", [])
    key_to_idx = {d["key"]: d["metricsIndex"] for d in descriptors}

    lat_idx = key_to_idx.get("directLatitude")
    lon_idx = key_to_idx.get("directLongitude")
    speed_idx = key_to_idx.get("directSpeed")
    hr_idx = key_to_idx.get("directHeartRate")
    elev_idx = key_to_idx.get("directElevation")
    dist_idx = key_to_idx.get("sumDistance")

    points = []
    for entry in raw.get("activityDetailMetrics", []):
        m = entry.get("metrics", [])
        lat = m[lat_idx] if lat_idx is not None else None
        lon = m[lon_idx] if lon_idx is not None else None
        speed_mps = m[speed_idx] if speed_idx is not None else None
        dist_m = m[dist_idx] if dist_idx is not None else None

        if lat is None or lon is None or dist_m is None:
            continue

        # Convert m/s to min/mi and clamp stops/GPS glitches to 4:00 - 15:00/mi
        if speed_mps and speed_mps > 0.5:
            pace_min_per_mi = min(
                max((METERS_PER_MILE / speed_mps) / 60.0, 4.0), 15.0)
        else:
            pace_min_per_mi = None

        points.append({
            "lat": lat,
            "lon": lon,
            "distanceMi": round(dist_m / METERS_PER_MILE, 3),
            "paceMinPerMi": round(pace_min_per_mi, 2) if pace_min_per_mi else None,
            "heartRate": m[hr_idx] if hr_idx is not None else None,
            "elevationFt": round(m[elev_idx] * FEET_PER_METER, 1) if (elev_idx is not None and m[elev_idx] is not None) else None,
        })

    return {
        "id": activity_id,
        "points": points,
    }
