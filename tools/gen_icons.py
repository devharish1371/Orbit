"""Generate repeatable Orbit PWA/Android icons and launch artwork locally."""

from __future__ import annotations

from pathlib import Path
from typing import Annotated

import typer
from PIL import Image, ImageDraw, ImageOps
from rich.console import Console

ROOT = Path(__file__).resolve().parents[1]
app = typer.Typer(add_completion=False)


def orbit_mark(size: int, *, transparent: bool = False) -> Image.Image:
    canvas = Image.new("RGBA", (size, size), (0, 0, 0, 0) if transparent else "#181526")
    ring = Image.new("RGBA", (size, size))
    draw = ImageDraw.Draw(ring)
    draw.ellipse((size * .19, size * .33, size * .81, size * .67), outline="#A76AE0", width=max(1, round(size * .04)))
    canvas.alpha_composite(ring.rotate(35, resample=Image.Resampling.BICUBIC))
    draw = ImageDraw.Draw(canvas)
    draw.ellipse((size * .41, size * .41, size * .59, size * .59), fill="#FF6B8A")
    draw.ellipse((size * .70, size * .25, size * .82, size * .37), fill="#3DE0C5")
    return canvas


@app.command()
def main(
    source: Annotated[Path | None, typer.Option(exists=True, help="Optional square source artwork; otherwise use Orbit's geometric mark.")] = None,
) -> None:
    """Write PWA icons, Android density icons, adaptive foreground and splash PNGs."""
    art = Image.open(source).convert("RGBA") if source else orbit_mark(1536)
    public = ROOT / "web/public/icons"
    public.mkdir(parents=True, exist_ok=True)
    for size in (192, 512):
        ImageOps.pad(art, (size, size), color="#181526").save(public / f"orbit-{size}.png")
    maskable = Image.new("RGBA", (512, 512), "#181526")
    mark = ImageOps.contain(art, (384, 384))
    maskable.alpha_composite(mark, ((512 - mark.width) // 2, (512 - mark.height) // 2))
    maskable.save(public / "orbit-maskable-512.png")
    resources = ROOT / "web/android/app/src/main/res"
    if resources.exists():
        for density, size in {"mdpi": 48, "hdpi": 72, "xhdpi": 96, "xxhdpi": 144, "xxxhdpi": 192}.items():
            folder = resources / f"mipmap-{density}"
            folder.mkdir(exist_ok=True)
            icon = ImageOps.pad(art, (size, size), color="#181526")
            icon.save(folder / "ic_launcher.png")
            icon.save(folder / "ic_launcher_round.png")
            foreground = Image.new("RGBA", (round(size * 2.25), round(size * 2.25)))
            mark = ImageOps.contain(art, (size, size)) if source else orbit_mark(size, transparent=True)
            foreground.alpha_composite(mark, ((foreground.width - size) // 2, (foreground.height - size) // 2))
            foreground.save(folder / "ic_launcher_foreground.png")
        for path in resources.glob("drawable*/splash.png"):
            with Image.open(path) as old:
                splash = Image.new("RGBA", old.size, "#0B0B12")
            mark_size = max(48, round(min(splash.size) * .22))
            mark = ImageOps.contain(art, (mark_size, mark_size))
            splash.alpha_composite(mark, ((splash.width - mark.width) // 2, (splash.height - mark.height) // 2))
            splash.save(path)
    Console().print("Orbit icons generated. Rerunning overwrites only generated icon/splash assets.")


if __name__ == "__main__":
    app()
