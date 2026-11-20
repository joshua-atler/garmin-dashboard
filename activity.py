import json
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd

from garmin_personal_api import (
    GarminPersonalApiClient,
    PersonalApiAuthenticator,
    resolve_api_key,
)

# 1. Discover key (~/.config/garmin/connect-personal-api-key or env var) and get cached token
api_key = resolve_api_key()
with PersonalApiAuthenticator() as auth:
    token = auth.obtain_token(api_key)

# 2. Query your data using the bearer token
with GarminPersonalApiClient(token.access_token) as client:
    # Built-in wrapper examples (e.g., sleep, steps, activities)
    # sleep = client.get_daily_sleep("2026-11-20")
    # steps = client.get_daily_steps("2026-11-20", "2026-11-20")

    all_activites = client.get(
        "/activitylist-service/activities/search/activities")
    print(all_activites)
    with open("all_activites.json", "w", encoding="utf-8") as file:
        json.dump(all_activites, file, indent=2)

    # Generic .get() for any Personal API Swagger path (such as activity details/splits)
    # activity = 24980639362
    # activity = 25135408292
    # activity = 25078318178
    activity = 24755507737
    activity_summary = client.get(f"/activity-service/activity/{activity}")
    activity_details = client.get(
        f"/activity-service/activity/{activity}/details")

    with open("activity_details.json", "w", encoding="utf-8") as file:
        json.dump(activity_details, file, indent=2)

    # print(activity_details)

    # print(list((md['key'], md['metricsIndex'])
        #   for md in activity_details['metricDescriptors']))

    metricIndexes = {
        md['key']: md['metricsIndex'] for md in activity_details['metricDescriptors']
    }
    print('----')
    print(metricIndexes)

    raw_speed = np.array([
        amd['metrics'][metricIndexes['directSpeed']]
        for amd in activity_details['activityDetailMetrics']
    ])

    raw_dist = np.array([
        amd['metrics'][metricIndexes['sumDistance']]
        for amd in activity_details['activityDetailMetrics']
    ])

    hr_bpm = np.array([
        amd['metrics'][metricIndexes['directHeartRate']]
        for amd in activity_details['activityDetailMetrics']
    ])

    # 2. Convert SI units (meters and m/s) to miles and min/mile
    distance_mi = raw_dist / 1609.344

    # Guard against 0.0 speed at standstill to avoid division-by-zero warnings
    pace_min_per_mi = np.where(raw_speed > 0, 26.8224 / raw_speed, np.nan)

    mask = (distance_mi >= 0.05) & (raw_speed >= 1.5)

    fig, ax1 = plt.subplots(figsize=(10, 5))

    # Left Axis: Pace (inverted so faster = higher, matching Garmin Connect)
    # ax1.plot(distance_mi, pd.Series(pace_min_per_mi).rolling(4, min_periods=1).mean(), color="#1f77b4",
    ax1.plot(distance_mi[mask], pace_min_per_mi[mask], color="#1f77b4",
             linewidth=2, label="Pace (min/mi)")
    ax1.set_xlabel("Distance (miles)")
    ax1.set_ylabel("Pace (min/mi)", color="#1f77b4")
    ax1.invert_yaxis()
    ax1.grid(True, alpha=0.3)

    # Right Axis: Heart Rate
    ax2 = ax1.twinx()
    ax2.plot(distance_mi[mask], hr_bpm[mask], color="#d62728",
             linewidth=1.8, alpha=0.85, label="Heart Rate (bpm)")
    ax2.set_ylabel("Heart Rate (bpm)", color="#d62728")

    plt.title("W&OD 2-Mile Tempo: Pace vs. Heart Rate")
    fig.tight_layout()
    fig.savefig('speed.png')
    plt.close()

    print("Avg HR:", activity_summary["summaryDTO"]["averageHR"])
