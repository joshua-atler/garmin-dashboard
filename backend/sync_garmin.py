import json
import time
from pathlib import Path
from datetime import date, timedelta

from garmin_personal_api import (
    GarminPersonalApiClient,
    PersonalApiAuthenticator,
    resolve_api_key,
)

DATA_DIR = Path(__file__).parent / "data"
STEPS_PATH = DATA_DIR / "daily_steps.json"
STATS_PATH = DATA_DIR / "daily_stats.json"


def sync_all(
    max_activities: int | None = 100,
    page_size: int = 100,
    only_new: bool = True,
):
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

        today = date.today()
        # Refresh the last 28 days on routine syncs (or pass an earlier start_date for backfill)
        # sync_daily_steps(client, start_date=today -
        #  timedelta(days=27), end_date=today)
        sync_daily_stats(client, start_date=today -
                         timedelta(days=365), end_date=today)

    print(f"Sync complete. {saved} new run(s) cached in {DATA_DIR}.")

    return saved


def sync_daily_steps(
    client: GarminPersonalApiClient,
    start_date: date,
    end_date: date,
) -> int:
    """
    Fetch daily step stats in 28-day chunks and merge into data/daily_steps.json.
    Returns the number of days updated/added.
    """
    existing: dict[str, dict] = {}
    if STEPS_PATH.exists():
        for entry in json.loads(STEPS_PATH.read_text()):
            if "calendarDate" in entry:
                existing[entry["calendarDate"]] = entry

    updated = 0
    chunk_start = start_date

    # sleep = client.get(f"/sleep-service/sleep/dailySleep",
    #                    params={'date': '2026-11-20'})
    # print('sleep')
    # print(sleep)

    while chunk_start <= end_date:
        chunk_end = min(chunk_start + timedelta(days=1000), end_date)
        batch = client.get(
            f"/usersummary-service/stats/steps/daily/{chunk_start.isoformat()}/{chunk_end.isoformat()}"
        )

        for day in batch or []:
            cal_date = day.get("calendarDate")
            if cal_date:
                existing[cal_date] = day
                updated += 1

        chunk_start = chunk_end + timedelta(days=1)
        time.sleep(0.25)

    merged = sorted(existing.values(), key=lambda d: d["calendarDate"])
    STEPS_PATH.write_text(json.dumps(merged, indent=2))
    print(f"Synced {updated} day(s) of step data into {STEPS_PATH}.")
    return updated


def sync_daily_stats(
    client: GarminPersonalApiClient,
    start_date: date,
    end_date: date,
) -> int:
    """
    Fetch daily step stats in 28-day chunks and merge into data/daily_steps.json.
    Returns the number of days updated/added.
    """
    existing: dict[str, dict] = {}
    if STATS_PATH.exists():
        for entry in json.loads(STATS_PATH.read_text()):
            if "calendarDate" in entry:
                existing[entry["calendarDate"]] = entry

    updated = 0
    chunk_start = start_date

    while chunk_start <= end_date:
        chunk_end = min(chunk_start + timedelta(days=1000), end_date)
        batch = client.get(
            f"/usersummary-service/v2/dailysummaries", params={"startDate": chunk_start.isoformat(), "endDate": chunk_end.isoformat()})

        batch = batch.get("data")

        for day in batch or []:
            cal_date = day.get("calendarDate")
            if cal_date:
                existing[cal_date] = day
                updated += 1

        chunk_start = chunk_end + timedelta(days=1)
        time.sleep(0.25)

    merged = sorted(existing.values(), key=lambda d: d["calendarDate"])
    STATS_PATH.write_text(json.dumps(merged, indent=2))
    print(f"Synced {updated} day(s) of step data into {STATS_PATH}.")
    return updated


if __name__ == "__main__":
    # Backfill your full history once with max_activities=None, only_new=False
    # Then switch back to sync_recent_runs(max_activities=100, only_new=True)
    sync_all(max_activities=None, only_new=True)
