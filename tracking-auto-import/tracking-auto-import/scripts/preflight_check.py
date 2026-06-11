# -*- coding: utf-8 -*-
"""Environment preflight for tracking-auto-import. Run before first use or when debugging."""
from __future__ import annotations

import argparse
import json
import platform
import sys
from pathlib import Path

# Allow running as script from any cwd
sys.path.insert(0, str(Path(__file__).resolve().parent))
from tracking_utils import (  # noqa: E402
    ASSETS_DIR,
    AUTH_PATH,
    SHARED_BIN,
    SKILL_ROOT,
    TEMPLATE_COMMON,
    TEMPLATE_LOCATION,
    EXPECTED_SHEETS,
    get_push_exe,
    load_auth,
    validate_template,
)


def check_openpyxl() -> tuple[bool, str]:
    try:
        import openpyxl  # noqa: F401

        return True, f"openpyxl {openpyxl.__version__}"
    except ImportError:
        return False, "未安装 openpyxl（pip install openpyxl）"


def main() -> int:
    parser = argparse.ArgumentParser(description="tracking-auto-import 环境自检")
    parser.add_argument("--json", action="store_true", help="输出 JSON")
    args = parser.parse_args()

    checks: list[dict] = []

    def add(name: str, ok: bool, detail: str):
        checks.append({"name": name, "ok": ok, "detail": detail})

    add("skill_root", SKILL_ROOT.is_dir(), str(SKILL_ROOT))
    add("assets_dir", ASSETS_DIR.is_dir(), str(ASSETS_DIR))

    ok_py, py_detail = check_openpyxl()
    add("openpyxl", ok_py, py_detail)

    for label, path in [("template_common", TEMPLATE_COMMON), ("template_location", TEMPLATE_LOCATION)]:
        if not path.is_file():
            add(label, False, f"缺失: {path}")
            continue
        try:
            info = validate_template(path)
            add(
                label,
                True,
                f"{path.name} sheets={info['sheets']} cols={info['plan_cols']} rows={info['plan_max_row']}",
            )
        except Exception as e:
            add(label, False, str(e))

    exe_path = SHARED_BIN / f"tracking_project_create_{'windows' if platform.system() == 'Windows' else 'darwin' if platform.system() == 'Darwin' else 'linux'}.exe"
    try:
        exe = get_push_exe()
        add("push_exe", True, str(exe))
    except Exception as e:
        add("push_exe", False, str(e))

    if AUTH_PATH.is_file():
        try:
            auth = load_auth()
            add("auth", True, f"uid={auth['uid'][:4]}*** x-api-key=***")
        except Exception as e:
            add("auth", False, str(e))
    else:
        example = SHARED_BIN / "auth.json.example"
        hint = f"缺失 {AUTH_PATH}"
        if example.is_file():
            hint += f"；请复制 {example} 为 auth.json"
        add("auth", False, hint)

    all_ok = all(c["ok"] for c in checks)

    if args.json:
        print(json.dumps({"ok": all_ok, "checks": checks}, ensure_ascii=False, indent=2))
    else:
        print("tracking-auto-import 环境自检\n")
        for c in checks:
            mark = "OK" if c["ok"] else "FAIL"
            print(f"  [{mark}] {c['name']}: {c['detail']}")
        print()
        if all_ok:
            print("全部通过，可以生成并推送埋点方案。")
        else:
            print("存在失败项，请先修复。详见 SETUP.md")

    return 0 if all_ok else 1


if __name__ == "__main__":
    raise SystemExit(main())
