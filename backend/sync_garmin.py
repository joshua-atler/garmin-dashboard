import json
import time
from pathlib import Path

from garmin_personal_api import (
    GarminPersonalApiClient,
    PersonalApiAuthenticator,
    resolve_api_key,
)


def sync_recent_runs(
    max_activities: int | None = 100,
    page_size: int = 100,
    only_new: bool = True,
):
    DATA_DIR = Path(__file__).parent / "data"
    DATA_DIR.mkdir(exist_ok=True)

    api_key = resolve_api_key()

    with PersonalApiAuthenticator() as auth:
        token = auth.obtain_token(api_key)

    with GarminPersonalApiClient(token.access_token) as client:
        start = 0
        fetched = 0
        saved = 0

        while True:
            remaining = (
                None if max_activities is None else max_activities - fetched
            )
            if remaining is not None and remaining <= 0:
                break

            batch_limit = (
                page_size if remaining is None else min(page_size, remaining)
            )
            batch = client.get(
                "/activitylist-service/activities/search/activities",
                params={"start": start, "limit": batch_limit},
            )

            if not batch:
                break

            fetched += len(batch)

            for act in batch:
                if act.get("activityType", {}).get("typeKey") != "running":
                    continue

                act_id = act["activityId"]
                summary_path = DATA_DIR / f"{act_id}_summary.json"
                details_path = DATA_DIR / f"{act_id}_details.json"

                if summary_path.exists() and details_path.exists():
                    if only_new:
                        print(
                            f"Reached already-cached run {act_id}. Stopping early.")
                        print(
                            f"Sync complete. {saved} new run(s) cached in {DATA_DIR}.")
                        return saved
                    else:
                        continue

                if not summary_path.exists():
                    summary_path.write_text(json.dumps(act, indent=2))

                if not details_path.exists():
                    details = client.get(
                        f"/activity-service/activity/{act_id}/details"
                    )
                    details_path.write_text(json.dumps(details, indent=2))
                    saved += 1
                    print(
                        f"Downloaded telemetry for {act_id} ({act.get('activityName')})"
                    )
                    time.sleep(0.25)

            if len(batch) < batch_limit:
                break

            start += len(batch)
            time.sleep(0.5)

    print(f"Sync complete. {saved} new run(s) cached in {DATA_DIR}.")

    return saved


if __name__ == "__main__":
    # Backfill your full history once with max_activities=None, only_new=False
    # Then switch back to sync_recent_runs(max_activities=100, only_new=True)
    sync_recent_runs(max_activities=None, only_new=True)
