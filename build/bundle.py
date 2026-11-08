# -*- coding: utf-8 -*-
"""Bundle the naiwa skin: inline the PNG/JPEG assets as data URIs.

    build/client.template.js        -> lib/client.js   (self-registering classic script)
    build/inline-assets.template.js -> injected into lib/client.js at /* __ASSETS__ */

The host serves client plugins by concatenating them into one plain <script>
bundle, so lib/client.js must be a classic script that calls
window.__ModuleLoader__.load({ id, factory }) — never an ES module.
"""
import base64
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
BUILD = ROOT / "build"
LIB = ROOT / "lib"
ASSETS = ROOT / "assets"

MIME = {".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp", ".mp3": "audio/mpeg"}
MARK = "/* __ASSETS__ */"


def data_uri(path: Path) -> str:
    mime = MIME[path.suffix.lower()]
    payload = base64.b64encode(path.read_bytes()).decode("ascii")
    return f"data:{mime};base64,{payload}"


def main() -> int:
    LIB.mkdir(parents=True, exist_ok=True)

    assets_js = (BUILD / "inline-assets.template.js").read_text(encoding="utf-8")
    assets_js = assets_js.replace("__PET__", data_uri(ASSETS / "naiwa.png"))
    assets_js = assets_js.replace("__SHADOW__", data_uri(ASSETS / "naiwa-shadow.png"))
    assets_js = assets_js.replace("__FACE__", data_uri(ASSETS / "naiwa-face.jpg"))
    assets_js = assets_js.replace("__WALL__", data_uri(ASSETS / "naiwa-wall.jpg"))
    assets_js = assets_js.replace("__AVATAR__", data_uri(ASSETS / "naiwa-avatar.png"))
    assets_js = assets_js.replace("__IDLE__", data_uri(ASSETS / "naiwa-idle.png"))
    assets_js = assets_js.replace("__HEAD_BUTTON__", data_uri(ASSETS / "naiwa-head-button.webp"))
    assets_js = assets_js.replace("__SEND_SOUND__", data_uri(ASSETS / "naiwa-send.mp3"))

    client_js = (BUILD / "client.template.js").read_text(encoding="utf-8")
    if MARK not in client_js:
        print(f"error: marker {MARK!r} missing from client template")
        return 1
    client_js = client_js.replace(MARK, assets_js)

    if "export " in client_js.split("window.__ModuleLoader__")[0]:
        print("error: client template still contains ESM syntax before the loader call")
        return 1

    out = LIB / "client.js"
    out.write_text(client_js, encoding="utf-8", newline="\n")

    stale = LIB / "inline-assets.js"
    if stale.exists():
        stale.unlink()
        print("removed stale inline-assets.js")

    print(f"client.js: {out.stat().st_size/1024:.1f} KB")
    return 0


if __name__ == "__main__":
    sys.exit(main())
