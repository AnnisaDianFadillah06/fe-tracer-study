#!/usr/bin/env python3
"""Kamera virtual untuk video demo: zoom in/out halus dari daftar peristiwa zoom.

    python3 camera.py <rekaman.webm> <zoom.json> <keluaran.mp4>

zoom.json berisi {"trim": detik, "max_seconds": n, "events": [{start, end,
scale, cx, cy}, ...]} dengan waktu relatif terhadap awal rekaman. Dibanding
filter zoompan ffmpeg:
  - posisi kamera sub-piksel (transformasi afin float, resampling bikubik),
    sehingga gambar tidak bergetar saat kamera bergerak;
  - kurva smootherstep dan skala yang diinterpolasi secara logaritmik, jadi
    laju zoom terasa rata dari awal sampai akhir;
  - zoom yang berdekatan (jeda < GAP) disambung langsung dari sasaran satu
    ke sasaran berikutnya tanpa kembali ke tampilan penuh di antaranya.
"""

import json
import math
import subprocess
import sys
from multiprocessing import Pool

from PIL import Image

W, H, FPS = 1920, 1080, 30
RAMP = 1.0  # detik transisi masuk/keluar/pindah sasaran
GAP = 1.6  # jeda maksimum antar-zoom yang disambung langsung
REST = (1.0, W / 2, H / 2)


def smootherstep(t: float) -> float:
    t = min(1.0, max(0.0, t))
    return t * t * t * (t * (6 * t - 15) + 10)


def build_keyframes(events):
    """Daftar (waktu, (skala, cx, cy)) yang diinterpolasi berurutan."""
    keys = [(0.0, REST)]
    events = sorted(events, key=lambda e: e["start"])
    for i, e in enumerate(events):
        target = (e["scale"], e["cx"], e["cy"])
        current = keys[-1][1]
        start = max(e["start"], keys[-1][0])
        keys.append((start, current))  # tahan posisi sebelumnya sampai zoom dimulai
        keys.append((start + RAMP, target))
        end = max(e["end"], start + RAMP)
        keys.append((end, target))
        nxt = events[i + 1] if i + 1 < len(events) else None
        if nxt is None or nxt["start"] - end > GAP:
            keys.append((end + RAMP, REST))
    return keys


def camera_at(keys, t):
    if t <= keys[0][0]:
        return keys[0][1]
    for (t0, a), (t1, b) in zip(keys, keys[1:]):
        if t0 <= t <= t1:
            if t1 - t0 < 1e-6:
                return b
            k = smootherstep((t - t0) / (t1 - t0))
            # Skala log-linear: zoom 1→2,6 terasa sama cepat di awal dan akhir.
            s = math.exp(math.log(a[0]) + (math.log(b[0]) - math.log(a[0])) * k)
            return (s, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k)
    return keys[-1][1]


def affine_for(cam):
    """Koefisien afin PIL (keluaran → masukan) untuk kamera (skala, cx, cy)."""
    s, cx, cy = cam
    vw, vh = W / s, H / s
    # Jaga agar jendela kamera tidak keluar dari bingkai.
    x0 = min(max(cx - vw / 2, 0.0), W - vw)
    y0 = min(max(cy - vh / 2, 0.0), H - vh)
    return (1 / s, 0.0, x0, 0.0, 1 / s, y0)


def render(job):
    raw, cam = job
    if abs(cam[0] - 1.0) < 1e-4:
        return raw
    img = Image.frombytes("RGB", (W, H), raw)
    out = img.transform((W, H), Image.AFFINE, affine_for(cam), resample=Image.BICUBIC)
    return out.tobytes()


def main():
    src, events_path, dst = sys.argv[1:4]
    cfg = json.load(open(events_path))
    trim = float(cfg.get("trim", 0))
    max_seconds = float(cfg.get("max_seconds", 240))
    events = [
        {**e, "start": e["start"] - trim, "end": e["end"] - trim}
        for e in cfg["events"]
        if e["end"] - trim > 0
    ]
    keys = build_keyframes(events)

    frame_bytes = W * H * 3
    dec = subprocess.Popen(
        ["ffmpeg", "-v", "error", "-ss", f"{trim:.3f}", "-i", src, "-t", str(max_seconds),
         "-vf", f"fps={FPS},scale={W}:{H}", "-f", "rawvideo", "-pix_fmt", "rgb24", "-"],
        stdout=subprocess.PIPE,
    )
    enc = subprocess.Popen(
        ["ffmpeg", "-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "rgb24",
         "-s", f"{W}x{H}", "-r", str(FPS), "-i", "-",
         "-c:v", "libx264", "-preset", "slow", "-crf", "18", "-pix_fmt", "yuv420p",
         "-movflags", "+faststart", "-an", dst],
        stdin=subprocess.PIPE,
    )

    def frames():
        n = 0
        while True:
            raw = dec.stdout.read(frame_bytes)
            if len(raw) < frame_bytes:
                return
            yield raw, camera_at(keys, n / FPS)
            n += 1

    done = 0
    with Pool() as pool:
        for out in pool.imap(render, frames(), chunksize=4):
            enc.stdin.write(out)
            done += 1
            if done % (FPS * 10) == 0:
                print(f"  kamera: {done / FPS:.0f}s", flush=True)
    enc.stdin.close()
    dec.wait()
    if enc.wait() != 0:
        sys.exit("encoder ffmpeg gagal")
    print(f"  kamera: selesai, {done / FPS:.1f}s → {dst}")


if __name__ == "__main__":
    main()
