from garmin_personal_api import (
    GarminPersonalApiClient,
    PersonalApiAuthenticator,
    resolve_api_key,
)
import json
import sys
from pathlib import Path


DATA_DIR = Path(__file__).parent / "data"
DATA_DIR.mkdir(exist_ok=True)


def sync_recent_runs(limit: int = 20):
    api_key = resolve_api_key()

    with PersonalApiAuthenticator() as auth:
        token = auth.obtain_token(api_key)

    with GarminPersonalApiClient(token.access_token) as client:
        all_activities = client.get(
            "/activitylist-service/activities/search/activities",
            params={"start": 0, "limit": limit},
        )

        saved = 0
        for act in all_activities:
            if act.get("activityType", {}).get("typeKey") != "running":
                continue

            act_id = act["activityId"]
            summary_path = DATA_DIR / f"{act_id}_summary.json"
            details_path = DATA_DIR / f"{act_id}_details.json"

            if not summary_path.exists():
                summary_path.write_text(json.dumps(act, indent=2))

            if not details_path.exists():
                details = client.get(
                    f"/activity-service/activity/{act_id}/details"
                )
                details_path.write_text(json.dumps(details, indent=2))
                saved += 1
                print(
                    f"Downloaded telemetry for {act_id} ({act.get('activityName')})")

    print(f"Sync complete. {saved} new run(s) cached in {DATA_DIR}.")


if __name__ == "__main__":
    sync_recent_runs(limit=20)
