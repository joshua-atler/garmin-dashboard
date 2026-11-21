import json
from dataclasses import dataclass
from datetime import datetime
import matplotlib

matplotlib.use("Agg")

import matplotlib.pyplot as plt
import matplotlib.ticker as ticker
import numpy as np
import pandas as pd

from garmin_personal_api import (
    GarminPersonalApiClient,
    PersonalApiAuthenticator,
    resolve_api_key,
)


@dataclass(frozen=True)
class PlotMetadata:
    title: str
    pace_minutes: int
    pace_seconds: int
    run_date: str
    duration_minutes: int
    duration_seconds: int


@dataclass(frozen=True)
class PlotData:
    distance_mi: np.ndarray
    pace: np.ndarray
    heart_rate: np.ndarray
    elevation_ft: np.ndarray


def plot_activity(metadata: PlotMetadata, data: PlotData):
    distance_mi = data.distance_mi
    pace = data.pace
    heart_rate = data.heart_rate
    elevation_ft = data.elevation_ft
    fig, ax1 = plt.subplots(figsize=(10, 5))

    # 1. Primary Axis: Pace (min/mi)
    l1 = ax1.plot(
        distance_mi, pace, color="#1f77b4", linewidth=2, label="Pace (min/mi)"
    )
    ax1.set_xlabel("Distance (mi)")
    ax1.set_ylabel("Pace (min/mi)", color="#1f77b4")
    ax1.set_ylim(12.0, 5.5)  # Clamp outliers & keep faster paces at the top

    # Format decimal minutes (e.g., 7.5) as MM:SS (e.g., 7:30)
    ax1.yaxis.set_major_formatter(
        ticker.FuncFormatter(
            lambda val, pos: f"{int(val)}:{int(round((val % 1) * 60)):02d}"
        )
    )

    # 2. Secondary Axis: Heart Rate
    ax2 = ax1.twinx()
    l2 = ax2.plot(
        distance_mi,
        heart_rate,
        color="#d62728",
        linewidth=1.5,
        alpha=0.85,
        label="Heart Rate (bpm)",
    )
    ax2.set_ylabel("Heart Rate (bpm)", color="#d62728")

    # 3. Third Axis: Elevation (Shaded background profile)
    ax3 = ax1.twinx()
    ax3.spines["right"].set_position(("outward", 60))

    min_elev = np.nanmin(elevation_ft) - 10
    l3 = ax3.fill_between(
        distance_mi,
        min_elev,
        elevation_ft,
        color="#558b2f",
        alpha=0.2,
        label="Elevation (ft)",
    )
    ax3.plot(distance_mi, elevation_ft, color="#558b2f", linewidth=0.9, alpha=0.6)
    ax3.set_ylabel("Elevation (ft)", color="#558b2f")

    elev_range = np.nanmax(elevation_ft) - min_elev
    ax3.set_ylim(min_elev, min_elev + elev_range * 2.5)

    # Keep elevation behind pace and heart rate lines
    ax1.set_zorder(ax3.get_zorder() + 2)
    ax2.set_zorder(ax3.get_zorder() + 1)
    ax1.patch.set_visible(False)

    # Combine legends from all three axes into one clean box
    handles = l1 + l2 + [l3]
    labels = [h.get_label() for h in handles]
    ax1.legend(
        handles,
        labels,
        loc="upper left",
        frameon=True,
        facecolor="white",
        framealpha=0.9,
    )

    ax1.grid(True, linestyle="--", alpha=0.3)
    fig.suptitle(
        metadata.title,
        fontsize=14,
        fontweight="bold",
        # y=0.99,
    )
    subtitle = f"{metadata.duration_minutes}:{metadata.duration_seconds:02d} | {metadata.pace_minutes}:{metadata.pace_seconds:02d}/mi | {metadata.run_date} | {distance_mi[-1]:.2f} mi | {np.nanmean(heart_rate):.0f} bpm | {np.nanmax(elevation_ft) - np.nanmin(elevation_ft):.0f} ft"
    ax1.set_title(subtitle, fontsize=10, color="#444444", pad=0)
    fig.tight_layout()
    fig.savefig("garmin_run_with_elevation.png", dpi=150)
    plt.close(fig)


# 1. Discover key (~/.config/garmin/connect-personal-api-key or env var) and get cached token
api_key = resolve_api_key()
with PersonalApiAuthenticator() as auth:
    token = auth.obtain_token(api_key)

# 2. Query your data using the bearer token
with GarminPersonalApiClient(token.access_token) as client:
    # Built-in wrapper examples (e.g., sleep, steps, activities)
    # sleep = client.get_daily_sleep("2026-11-20")
    # steps = client.get_daily_steps("2026-11-20", "2026-11-20")

    all_activites = client.get("/activitylist-service/activities/search/activities")
    # print(all_activites)
    with open("all_activites.json", "w", encoding="utf-8") as file:
        json.dump(all_activites, file, indent=2)

    # Generic .get() for any Personal API Swagger path (such as activity details/splits)
    # activity = 24980639362
    # activity = 25135408292
    # activity = 25078318178
    # activity = 24755507737
    activity = 25151353266
    activity_summary = client.get(f"/activity-service/activity/{activity}")
    activity_details = client.get(f"/activity-service/activity/{activity}/details")

    with open("activity_summary.json", "w", encoding="utf-8") as file:
        json.dump(activity_summary, file, indent=2)
    with open("activity_details.json", "w", encoding="utf-8") as file:
        json.dump(activity_details, file, indent=2)

    title = activity_summary["activityName"]
    average_pace_min_per_mi = 26.8224 / activity_summary["summaryDTO"]["averageSpeed"]
    pace_total_seconds = int(round(average_pace_min_per_mi * 60))
    pace_min, pace_sec = divmod(pace_total_seconds, 60)
    run_date = datetime.fromisoformat(
        activity_summary["summaryDTO"]["startTimeLocal"]
    ).strftime("%m/%d/%y")
    dur_min, dur_sec = divmod(
        int(round(activity_summary["summaryDTO"]["duration"])), 60
    )

    # print(activity_details)

    # print(list((md['key'], md['metricsIndex'])
    #   for md in activity_details['metricDescriptors']))

    metricIndexes = {
        md["key"]: md["metricsIndex"] for md in activity_details["metricDescriptors"]
    }
    print(metricIndexes)

    raw_speed = np.array(
        [
            amd["metrics"][metricIndexes["directSpeed"]]
            for amd in activity_details["activityDetailMetrics"]
        ]
    )

    raw_dist = np.array(
        [
            amd["metrics"][metricIndexes["sumDistance"]]
            for amd in activity_details["activityDetailMetrics"]
        ]
    )

    hr_bpm = np.array(
        [
            amd["metrics"][metricIndexes["directHeartRate"]]
            for amd in activity_details["activityDetailMetrics"]
        ]
    )

    elevation_ft = np.array(
        [
            amd["metrics"][metricIndexes["directElevation"]]
            for amd in activity_details["activityDetailMetrics"]
        ]
    )

    # 2. Convert SI units (meters and m/s) to miles and min/mile
    distance_mi = raw_dist / 1609.344

    # Guard against 0.0 speed at standstill to avoid division-by-zero warnings
    pace_min_per_mi = np.where(raw_speed > 0, 26.8224 / raw_speed, np.nan)

    mask = (distance_mi >= 0.05) & (raw_speed >= 1.5)

    fig, ax1 = plt.subplots(figsize=(10, 5))

    metadata = PlotMetadata(
        title=title,
        pace_minutes=pace_min,
        pace_seconds=pace_sec,
        run_date=run_date,
        duration_minutes=dur_min,
        duration_seconds=dur_sec,
    )
    data = PlotData(
        distance_mi=distance_mi,
        pace=pace_min_per_mi,
        heart_rate=hr_bpm,
        elevation_ft=elevation_ft,
    )
    plot_activity(metadata, data)

    # # Left Axis: Pace (inverted so faster = higher, matching Garmin Connect)
    # # ax1.plot(distance_mi, pd.Series(pace_min_per_mi).rolling(4, min_periods=1).mean(), color="#1f77b4",
    # ax1.plot(
    #     distance_mi[mask],
    #     pace_min_per_mi[mask],
    #     color="#1f77b4",
    #     linewidth=2,
    #     label="Pace (min/mi)",
    # )
    # ax1.set_xlabel("Distance (miles)")
    # ax1.set_ylabel("Pace (min/mi)", color="#1f77b4")
    # ax1.invert_yaxis()
    # ax1.grid(True, alpha=0.3)

    # print("@@@@@")

    # # Right Axis: Heart Rate
    # ax2 = ax1.twinx()
    # ax2.plot(
    #     distance_mi[mask],
    #     hr_bpm[mask],
    #     color="#d62728",
    #     linewidth=1.8,
    #     alpha=0.85,
    #     label="Heart Rate (bpm)",
    # )
    # ax2.set_ylabel("Heart Rate (bpm)", color="#d62728")

    # plt.title("W&OD 2-Mile Tempo: Pace vs. Heart Rate")
    # fig.tight_layout()
    # fig.savefig("speed.png")
    # plt.close()

    # print("Avg HR:", activity_summary["summaryDTO"]["averageHR"])
