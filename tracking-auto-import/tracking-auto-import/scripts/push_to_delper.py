# -*- coding: utf-8 -*-
"""Push one or more local tracking xlsx files to delper."""
from __future__ import annotations

import argparse
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from tracking_utils import push_ok, push_xlsx  # noqa: E402


def main() -> int:
    parser = argparse.ArgumentParser(description="推送埋点方案 xlsx 到 delper")
    parser.add_argument("xlsx", nargs="+", help="本地 .xlsx 路径（可多个）")
    args = parser.parse_args()

    failed = 0
    for p in args.xlsx:
        path = Path(p)
        print(f"\n=== {path.name} ===")
        try:
            r = push_xlsx(path)
            print(r.stdout or "")
            if r.stderr:
                print(r.stderr, file=sys.stderr)
            if push_ok(r):
                print("推送成功 (200 OK)")
            else:
                print(f"推送失败 exit={r.returncode}")
                failed += 1
        except Exception as e:
            print(f"错误: {e}")
            failed += 1

    return 1 if failed else 0


if __name__ == "__main__":
    raise SystemExit(main())
