#!/usr/bin/env python3
"""
fetch_verify_in.py — cross-checks data.json's Indian 52-week high/low
against NSE's own "Adjusted 52 Week High/Low" report.

Why this exists: Yahoo Finance's historical price series doesn't always
correctly adjust for demergers/spinoffs, which can leave a stale,
economically-meaningless "52-week high" in place after a corporate action
(this is exactly what happened with Vedanta Ltd's demerger). NSE publishes
its own version of this figure, explicitly adjusted for bonus issues,
splits, consolidations, and rights issues -- the authoritative source for
Indian equities.

Honest caveat before you run this: NSE's website has changed its access
patterns multiple times (session-cookie requirements, discontinued static
endpoints). This script tries the direct archive CSV first, since that's
historically been the more stable path, and fails gracefully with a clear
message if NSE has changed things again -- it will NOT crash the rest of
your pipeline if this one script can't reach NSE on a given day.

Run:
    pip install requests
    python fetch_verify_in.py

Output: verify_in.json
"""

import json
import csv
import io
import time
from datetime import datetime, timedelta
import requests

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
                   "(KHTML, like Gecko) Chrome/124.0 Safari/537.36",
    "Accept": "text/csv,application/csv,*/*",
}


def load_data_json():
    try:
        return {s["t"]: s for s in json.load(open("data.json")) if s.get("mkt") == "IN"}
    except Exception:
        return {}


def try_fetch_nse_52wk(days_back_max=10):
    """
    NSE publishes this daily; try the last ~10 business days since the
    exact filename depends on the last trading day, and we don't know
    NSE's holiday calendar precisely here.
    """
    today = datetime.utcnow() + timedelta(hours=5, minutes=30)  # IST
    for days_back in range(days_back_max):
        d = today - timedelta(days=days_back)
        date_str = d.strftime("%d%m%Y")
        url = f"https://nsearchives.nseindia.com/content/CM_52_wk_High_low_{date_str}.csv"
        try:
            r = requests.get(url, headers=HEADERS, timeout=15)
            if r.status_code == 200 and "SYMBOL" in r.text[:2000]:
                print(f"  Found report for {d.strftime('%d-%b-%Y')}")
                return r.text
        except Exception:
            pass
        time.sleep(0.2)
    return None


def parse_nse_csv(text):
    """Returns {symbol: (adjustedHigh, adjustedLow)}."""
    out = {}
    reader = csv.reader(io.StringIO(text))
    header_seen = False
    for row in reader:
        if not row or len(row) < 5:
            continue
        if not header_seen:
            if "SYMBOL" in row[0].upper():
                header_seen = True
            continue
        try:
            symbol = row[0].strip().strip('"')
            high = float(row[2].strip().strip('"'))
            low = float(row[4].strip().strip('"'))
            out[symbol] = (high, low)
        except (ValueError, IndexError):
            continue
    return out


def pct_diff(a, b):
    if a is None or b is None or b == 0:
        return None
    return round((a - b) / abs(b) * 100, 2)


def main():
    stocks = load_data_json()
    if not stocks:
        print("data.json not found or has no Indian stocks — run fetch_data.py first.")
        return

    print("Attempting to fetch NSE's official adjusted 52-week high/low report...")
    csv_text = try_fetch_nse_52wk()

    if not csv_text:
        print("\nCould not reach NSE's archive in the expected format.")
        print("NSE periodically changes its endpoint structure (this happened in")
        print("mid-2024, for example). This is a known limitation, not a bug in")
        print("your pipeline -- the rest of your data refresh is unaffected.")
        print("If this persists, check https://www.nseindia.com/all-reports for")
        print("the current location of the 'Adjusted 52 Week High/Low' report.")
        json.dump([], open("verify_in.json", "w"))
        return

    nse_data = parse_nse_csv(csv_text)
    print(f"Parsed {len(nse_data)} symbols from NSE's report.\n")

    results = []
    matched = 0
    for ticker, s in stocks.items():
        if ticker not in nse_data:
            continue
        nse_high, nse_low = nse_data[ticker]
        yf_high, yf_low = s.get("high52"), s.get("low52")
        high_diff = pct_diff(yf_high, nse_high)
        low_diff = pct_diff(yf_low, nse_low)
        results.append({
            "ticker": ticker,
            "nseHigh52": nse_high, "nseLow52": nse_low,
            "high52DiffPct": high_diff if high_diff and abs(high_diff) > 5 else None,
            "low52DiffPct": low_diff if low_diff and abs(low_diff) > 5 else None,
        })
        matched += 1
        if results[-1]["high52DiffPct"] or results[-1]["low52DiffPct"]:
            print(f"  ⚑ {ticker}: Yahoo {yf_high}/{yf_low} vs NSE {nse_high}/{nse_low}")

    json.dump(results, open("verify_in.json", "w"), indent=2)
    print(f"\nWrote verify_in.json — matched {matched} of {len(stocks)} Indian stocks.")
    print("The dashboard's Data Integrity panel will pick this up automatically.")


if __name__ == "__main__":
    main()
