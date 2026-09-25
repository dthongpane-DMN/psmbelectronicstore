"""
Scan-cycle simulator for the Mitsubishi FX star/delta auto-reversing program.

Models the PLC the way an FX executes it: rungs are solved top to bottom once
per scan, 100 ms timers (T0-T199) accumulate while their coil is ON, their
contact closes as soon as the preset is reached, and they reset immediately
when the coil goes OFF.  Run with:  python3 simulate.py
"""

SCAN = 0.01          # 10 ms scan time
FX_K_MAX = 32767     # largest 16-bit constant an FX timer accepts


class Timer:
    def __init__(self, k):
        self.k, self.acc, self.done = k, 0.0, False

    def out(self, coil):
        if coil:
            self.acc += SCAN
            if self.acc >= self.k / 10 - 1e-9:
                self.done = True
        else:
            self.acc, self.done = 0.0, False


def original(s, t, x):
    """Program exactly as drawn in the PDF (rungs 0-15)."""
    s["M0"] = (x["X0"] or s["M0"]) and x["X1"] and x["X2"] and not t["T3"].done
    t["T3"].out(s["M0"])
    s["M1"] = s["M0"] and not s["M2"] and not t["T2"].done
    t["T1"].out(s["M1"])
    s["M2"] = (t["T1"].done and not s["M1"]) or (s["M2"] and not s["M1"] and not t["T2"].done)
    t["T2"].out(s["M2"])
    t["T4"].out(s["M1"])
    t["T5"].out(s["M2"])
    s["M3"] = (s["M1"] and t["T4"].done) or (s["M2"] and t["T5"].done)
    t["T0"].out(s["M3"])
    t["T6"].out(s["M3"] and t["T0"].done)
    s["Y0"] = s["M3"]
    s["Y1"] = s["M1"] and t["T4"].done and not s["Y2"]
    s["Y2"] = s["M2"] and t["T5"].done and not s["Y1"]
    s["Y3"] = s["M3"] and not t["T0"].done and not s["Y4"]
    s["Y4"] = s["M3"] and t["T0"].done and t["T6"].done and not s["Y3"]


def corrected(s, t, x):
    """Corrected program (see README.md for the ladder and instruction list)."""
    x0_rise = x["X0"] and not s["X0_prev"]                                  # LDP X0
    s["X0_prev"] = x["X0"]
    s["M0"] = (x0_rise or s["M0"]) and x["X1"] and x["X2"] and not t["T7"].done
    t["T3"].out(s["M0"])                                                    # 1800 s
    t["T7"].out(s["M0"] and t["T3"].done)                                   # +1800 s = 3600 s
    s["M1"] = s["M0"] and not s["M2"] and not t["T2"].done
    t["T1"].out(s["M1"])
    s["M2"] = s["M0"] and (t["T1"].done or s["M2"]) and not t["T2"].done
    t["T2"].out(s["M2"])
    t["T4"].out(s["M1"])
    t["T5"].out(s["M2"])
    s["M3"] = (s["M1"] and t["T4"].done) or (s["M2"] and t["T5"].done)
    t["T0"].out(s["M3"])
    t["T6"].out(s["M3"] and t["T0"].done)
    s["Y0"] = s["M3"]
    s["Y1"] = s["M1"] and t["T4"].done and not s["Y2"]
    s["Y2"] = s["M2"] and t["T5"].done and not s["Y1"]
    s["Y3"] = s["M3"] and not t["T0"].done and not s["Y4"]
    s["Y4"] = s["M3"] and t["T0"].done and t["T6"].done and not s["Y3"]


def run(program, timers, duration, events=()):
    """events: list of (time_s, input, value).  Returns (transitions, faults, state)."""
    t = {n: Timer(k) for n, k in timers.items()}
    s = {n: False for n in ("M0", "M1", "M2", "M3", "Y0", "Y1", "Y2", "Y3", "Y4", "X0_prev")}
    x = {"X0": False, "X1": True, "X2": True}       # Stop / OL wired NC -> ON when healthy
    events = sorted(events)
    prev, log, faults = None, [], set()
    for i in range(int(round(duration / SCAN)) + 1):
        now = round(i * SCAN, 2)
        while events and events[0][0] <= now:
            _, name, val = events.pop(0)
            x[name] = val
        program(s, t, x)
        ys = tuple(n for n in ("Y0", "Y1", "Y2", "Y3", "Y4") if s[n])
        if s["Y1"] and s["Y2"]:
            faults.add("Y1+Y2 ON together (phase-to-phase short)")
        if s["Y3"] and s["Y4"]:
            faults.add("Y3+Y4 ON together (star/delta short)")
        if ys != prev:
            log.append((now, ys))
            prev = ys
    return log, faults, s


def phases(log):
    """Collapse the transition log into (start, end, outputs) segments."""
    out = []
    for (a, ys), nxt in zip(log, log[1:] + [(None, None)]):
        out.append((a, nxt[0], ys))
    return out


def report(title, log, faults, limit=12):
    print(f"\n=== {title} ===")
    for a, b, ys in phases(log)[:limit]:
        end = f"{b:8.2f}" if b is not None else "     end"
        print(f"  {a:8.2f} -> {end} s : {' '.join(ys) or '(all OFF)'}")
    if len(log) > limit:
        print(f"  ... {len(log) - limit} more transitions")
    print("  faults:", ", ".join(sorted(faults)) or "none")


if __name__ == "__main__":
    orig_timers = dict(T0=100, T1=1800, T2=1800, T3=36000, T4=50, T5=50, T6=10)
    fix_timers = dict(T0=100, T1=1800, T2=1800, T3=18000, T7=18000, T4=50, T5=50, T6=10)

    print("K range check (FX 16-bit timers accept K1..K32767):")
    for name, k in {**orig_timers, **{"T7": 18000}}.items():
        print(f"  {name} K{k}: {'OK' if k <= FX_K_MAX else 'INVALID - GX Works2 rejects it'}")

    start = [(1.0, "X0", True), (1.3, "X0", False)]

    log, f, _ = run(original, orig_timers, 1200, start)
    report("ORIGINAL program, 1200 s after Start", log, f)

    log, f, _ = run(corrected, fix_timers, 3700, start)
    report("CORRECTED program, full 3600 s run", log, f, limit=14)
    rev = [p for p in phases(log) if "Y2" in p[2] and "Y4" in p[2]]
    fwd = [p for p in phases(log) if "Y1" in p[2] and "Y4" in p[2]]
    print(f"  forward delta periods: {len(fwd)}, reverse delta periods: {len(rev)}")
    print(f"  last output OFF at t = {log[-1][0]:.2f} s (Start pressed at 1.00 s)")

    # Stop pressed in the middle of a reverse period (t = 1 + 180 + 100 s)
    stop = start + [(281.0, "X1", False), (281.3, "X1", True)]
    log, f, s = run(corrected, fix_timers, 400, stop)
    after = [p for p in phases(log) if p[0] >= 281.0]
    print("\n=== CORRECTED: Stop pressed at 281 s (during reverse) ===")
    for a, b, ys in after:
        print(f"  {a:8.2f} -> {b if b is None else f'{b:.2f}'} : {' '.join(ys) or '(all OFF)'}")

    # Same Stop test with the rung-4 deadlock repaired but WITHOUT M0 in
    # rung 4 - shows why M0 must be in series with M2.
    def no_m0(s, t, x):
        x0_rise = x["X0"] and not s["X0_prev"]; s["X0_prev"] = x["X0"]
        s["M0"] = (x0_rise or s["M0"]) and x["X1"] and x["X2"] and not t["T7"].done
        t["T3"].out(s["M0"]); t["T7"].out(s["M0"] and t["T3"].done)
        s["M1"] = s["M0"] and not s["M2"] and not t["T2"].done
        t["T1"].out(s["M1"])
        s["M2"] = (t["T1"].done or s["M2"]) and not t["T2"].done          # no M0!
        t["T2"].out(s["M2"]); t["T4"].out(s["M1"]); t["T5"].out(s["M2"])
        s["M3"] = (s["M1"] and t["T4"].done) or (s["M2"] and t["T5"].done)
        t["T0"].out(s["M3"]); t["T6"].out(s["M3"] and t["T0"].done)
        s["Y0"] = s["M3"]
        s["Y1"] = s["M1"] and t["T4"].done and not s["Y2"]
        s["Y2"] = s["M2"] and t["T5"].done and not s["Y1"]
        s["Y3"] = s["M3"] and not t["T0"].done and not s["Y4"]
        s["Y4"] = s["M3"] and t["T0"].done and t["T6"].done and not s["Y3"]
    log, f, s = run(no_m0, fix_timers, 400, stop)
    after = [p for p in phases(log) if p[0] >= 281.0]
    print("\n=== Rung 4 without M0: Stop pressed at 281 s ===")
    for a, b, ys in after:
        print(f"  {a:8.2f} -> {b if b is None else f'{b:.2f}'} : {' '.join(ys) or '(all OFF)'}")
