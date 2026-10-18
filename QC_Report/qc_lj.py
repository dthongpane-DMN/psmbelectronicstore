"""QC statistics (Mean, SD, CV%, Bias vs Target) + Levey-Jennings charts + Westgard rules
for three QC files. Usage: python3 -I qc_lj.py <upload_dir> <out_dir>"""
import sys, os, csv, io, math
import numpy as np
import pandas as pd
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.backends.backend_pdf import PdfPages
from openpyxl import Workbook
from openpyxl.drawing.image import Image as XLImage
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter

UP, OUT = sys.argv[1], sys.argv[2]
os.makedirs(os.path.join(OUT, "charts"), exist_ok=True)

# ---------------------------------------------------------------- load data
def load_csv():
    path = os.path.join(UP, "a99519df-LJSampleInfo_16102025_161745.csv")
    rows = list(csv.reader(io.open(path, encoding="utf-8-sig")))
    hdr = rows[2]
    params = [h for h in hdr[4:] if h]
    target = dict(zip(params, map(float, rows[3][4:4 + len(params)])))
    limit = dict(zip(params, map(float, rows[4][4:4 + len(params)])))
    data = []
    for r in rows[5:]:
        if r and r[0].strip().isdigit():
            data.append([r[0], r[1].strip(), r[2]] + [float(v) for v in r[4:4 + len(params)]])
    df = pd.DataFrame(data, columns=["No", "Date", "Time"] + params)
    notes = {}
    # MCHC results are in g/dL (~32) while the target is in g/L (323) -> convert target
    if target["MCHC"] > 100 and df["MCHC"].mean() < 100:
        target["MCHC"] /= 10; limit["MCHC"] /= 10
        notes["MCHC"] = "Target 323 g/L converted to 32.3 g/dL (results are g/dL)"
    labels = [f"#{n} {t}" for n, t in zip(df.No, df.Time)]
    return dict(key="F1_Hema_VWB", title="File 1 - Hematology VWB-CBC+DIFF, QC High, Lot HC5D277H (Exp 05-08-2026)",
                src="LJSampleInfo_16102025_161745.csv", df=df, params=params, unit={p: "" for p in params},
                target=target, low={p: target[p] - limit[p] for p in params},
                high={p: target[p] + limit[p] for p in params}, labels=labels, notes=notes)

def load_xlsx():
    path = os.path.join(UP, "b38a20d9-qc_file_925000528_0716_01.xlsx")
    raw = pd.read_excel(path, header=None)
    hdr = list(raw.iloc[0])
    body = raw.iloc[1:][pd.to_numeric(raw.iloc[1:, 0], errors="coerce").notna()]
    cols = hdr[5:27]
    params, unit = [], {}
    for c in cols:
        name, _, u = str(c).partition(" ")
        params.append(name); unit[name] = u
    df = pd.DataFrame(body.iloc[:, 5:27].astype(float).values, columns=params)
    df.insert(0, "No", body.iloc[:, 0].astype(int).values)
    df.insert(1, "Time", [str(t) for t in body.iloc[:, 2]])
    labels = [f"#{n} {t[:5]}" for n, t in zip(df.No, df.Time)]
    nan = {p: None for p in params}
    return dict(key="F2_HumaCount", title="File 2 - HumaCount 5D/3-part, QC High, Lot HC256H (Exp 05-11-2026), 16-07-2026",
                src="qc_file_925000528_0716_01.xlsx", df=df, params=params, unit=unit,
                target=dict(nan), low=dict(nan), high=dict(nan), labels=labels,
                notes={"*": "No target value / range in this file - chart centred on lab mean only"})

def load_xls():
    path = os.path.join(UP, "77c3f061-SampleReport.xls")
    raw = pd.read_excel(path, header=None)
    res = raw[pd.to_numeric(raw[6], errors="coerce").notna() & raw[0].notna()]
    params, unit, target, low, high, cols = [], {}, {}, {}, {}, {}
    for name, g in res.groupby(0, sort=False):
        params.append(name); unit[name] = g[11].iloc[0]
        target[name], low[name], high[name] = float(g[13].iloc[0]), float(g[14].iloc[0]), float(g[16].iloc[0])
        cols[name] = g[6].astype(float).values
    n = max(len(v) for v in cols.values())
    df = pd.DataFrame({p: cols[p] for p in params})
    df.insert(0, "No", range(1, n + 1))
    return dict(key="F3_HS200_Chem", title="File 3 - HUMAN HS200 Chemistry, SERODOS PLUS (ID 00000010), 18-10-2026",
                src="SampleReport.xls", df=df, params=params, unit=unit, target=target, low=low, high=high,
                labels=[f"Run {i}" for i in df.No], notes={})

# ---------------------------------------------------------------- statistics
def westgard(x, m, s):
    z = (np.asarray(x) - m) / s if s > 0 else np.zeros(len(x))
    viol = {}
    def add(rule, idx): viol.setdefault(rule, set()).update(idx)
    for i, v in enumerate(z):
        if abs(v) > 2: add("1-2s (warning)", [i])
        if abs(v) > 3: add("1-3s", [i])
        if i >= 1 and ((z[i] > 2 and z[i-1] > 2) or (z[i] < -2 and z[i-1] < -2)): add("2-2s", [i-1, i])
        if i >= 1 and ((z[i] > 2 and z[i-1] < -2) or (z[i] < -2 and z[i-1] > 2)): add("R-4s", [i-1, i])
        if i >= 3 and (all(z[i-3:i+1] > 1) or all(z[i-3:i+1] < -1)): add("4-1s", range(i-3, i+1))
        if i >= 9 and (all(z[i-9:i+1] > 0) or all(z[i-9:i+1] < 0)): add("10x", range(i-9, i+1))
    return z, viol

def stats(ds, p):
    x = ds["df"][p].dropna().values.astype(float)
    n = len(x); m = x.mean(); s = x.std(ddof=1); cv = s / m * 100 if m else float("nan")
    t, lo, hi = ds["target"][p], ds["low"][p], ds["high"][p]
    r = dict(Parameter=p, Unit=ds["unit"][p], n=n, Mean=m, SD=s, CV=cv, Min=x.min(), Max=x.max(),
             Target=t, Low=lo, High=hi)
    z, viol = westgard(x, m, s)
    r["viol"] = viol
    r["Westgard"] = ", ".join(k for k in ["1-3s", "2-2s", "R-4s", "4-1s", "10x", "1-2s (warning)"] if k in viol) or "None"
    if t is not None:
        r["Bias"] = m - t; r["Bias%"] = (m - t) / t * 100
        r["SDI"] = (m - t) / s if s else float("nan")
        r["Out"] = int(((x < lo) | (x > hi)).sum())
        r["TEa%"] = (hi - t) / t * 100
        r["Sigma"] = (r["TEa%"] - abs(r["Bias%"])) / cv if cv else float("nan")
        r["MeanOK"] = lo <= m <= hi
        r["CVOK"] = cv <= r["TEa%"] / 3          # assumed criterion: CV <= 1/3 of allowable range
        acc = "PASS" if r["MeanOK"] and r["Out"] == 0 else "FAIL"
        if acc == "PASS" and abs(r["Bias"]) > (hi - t) / 2: acc = "PASS (bias >50% of range)"
        r["Accuracy"] = acc
        r["Precision"] = "PASS" if r["CVOK"] else "FAIL"
    else:
        for k in ["Bias", "Bias%", "SDI", "TEa%", "Sigma"]: r[k] = None
        r["Out"] = None; r["Accuracy"] = "N/A (no target)"; r["Precision"] = "N/A (no limit)"
    return r

# ---------------------------------------------------------------- L-J chart
C = dict(data="#1f4e9c", mean="#222222", s1="#2e9d4f", s2="#e3a21a", s3="#d1342f",
         target="#8a2be2", band="#2e9d4f")

def lj_chart(ax, ds, p, r):
    x = ds["df"][p].values.astype(float); idx = np.arange(1, len(x) + 1)
    m, s, t, lo, hi = r["Mean"], r["SD"], r["Target"], r["Low"], r["High"]
    view = [m - 3.6 * s, m + 3.6 * s, x.min(), x.max()]
    if t is not None: view += [t]
    ylo, yhi = min(view), max(view); pad = (yhi - ylo) * 0.06 or 1
    ylo, yhi = ylo - pad, yhi + pad
    if t is not None:
        ax.axhspan(max(lo, ylo), min(hi, yhi), color=C["band"], alpha=0.07, zorder=0)
        for v, lab in [(lo, "Min"), (hi, "Max")]:
            if ylo <= v <= yhi:
                ax.axhline(v, color=C["band"], lw=1, ls=(0, (1, 2)))
                ax.text(len(x) + 0.55, v, f"{lab} {v:g}", va="center", fontsize=6.5, color=C["band"])
        ax.axhline(t, color=C["target"], lw=1.6, ls="--", zorder=2)
        ax.text(len(x) + 0.55, t, f"Target {t:g}", va="center", fontsize=6.5, color=C["target"], weight="bold")
    for k, col in [(1, C["s1"]), (2, C["s2"]), (3, C["s3"])]:
        for sg in (1, -1):
            ax.axhline(m + sg * k * s, color=col, lw=0.9, ls="-" if k == 3 else "--", alpha=0.9)
        ax.text(0.12, m + k * s, f"+{k}SD", va="bottom", ha="left", fontsize=6, color=col)
        ax.text(0.12, m - k * s, f"-{k}SD", va="bottom", ha="left", fontsize=6, color=col)
    ax.axhline(m, color=C["mean"], lw=1.4)
    ax.text(0.12, m, "Mean", va="bottom", ha="left", fontsize=6, color=C["mean"], weight="bold")
    ax.plot(idx, x, "-", color=C["data"], lw=1.2, zorder=3)
    rej = set().union(*[v for k, v in r["viol"].items() if not k.startswith("1-2s")]) if r["viol"] else set()
    warn = r["viol"].get("1-2s (warning)", set())
    colors = [C["s3"] if i in rej else C["s2"] if i in warn else C["data"] for i in range(len(x))]
    ax.scatter(idx, x, c=colors, s=22, zorder=4, edgecolor="white", linewidth=0.6)
    if t is not None and not (ylo <= lo and hi <= yhi):
        ax.text(0.99, 0.02, f"Mfr range {lo:g} - {hi:g}", transform=ax.transAxes, ha="right", fontsize=6.5, color=C["band"])
    ax.set_xlim(0.0, len(x) + 1.0); ax.set_ylim(ylo, yhi)
    ax.set_xticks(idx); ax.tick_params(labelsize=6.5)
    u = f" ({r['Unit']})" if r["Unit"] else ""
    head = f"{p}{u}   Mean {m:.4g}  SD {s:.3g}  CV {r['CV']:.2f}%"
    if t is not None: head += f"  |  Bias {r['Bias%']:+.2f}%"
    ax.set_title(head, fontsize=8, loc="left", weight="bold")
    ax.set_title(f"Westgard: {r['Westgard']}", fontsize=6.5, loc="right", color=C["s3"] if rej else "#555")
    ax.grid(axis="y", alpha=0.15)
    for sp in ("top", "right"): ax.spines[sp].set_visible(False)

# ---------------------------------------------------------------- run
datasets = [load_csv(), load_xlsx(), load_xls()]
for ds in datasets:
    ds["stats"] = [stats(ds, p) for p in ds["params"]]

pdf = PdfPages(os.path.join(OUT, "LJ_Charts_QC.pdf"))
for ds in datasets:
    ps = ds["params"]; per = 6
    for start in range(0, len(ps), per):
        chunk = ps[start:start + per]
        fig, axes = plt.subplots(3, 2, figsize=(11.7, 8.3))
        for ax in axes.flat[len(chunk):]: ax.axis("off")
        for ax, p in zip(axes.flat, chunk):
            lj_chart(ax, ds, p, ds["stats"][ps.index(p)])
        fig.suptitle(f"Levey-Jennings Chart - {ds['title']}", fontsize=10, weight="bold")
        fig.text(0.5, 0.008, "Lines: Mean (black) ±1SD green, ±2SD orange, ±3SD red (lab SD); Target purple dashed; "
                 "green band = manufacturer range. Points: orange = 1-2s warning, red = Westgard rejection.",
                 ha="center", fontsize=7, color="#444")
        fig.tight_layout(rect=(0.02, 0.025, 0.98, 0.96)); pdf.savefig(fig); plt.close(fig)
    for p, r in zip(ps, ds["stats"]):   # single images for Excel
        fig, ax = plt.subplots(figsize=(7.2, 3.3))
        lj_chart(ax, ds, p, r); fig.tight_layout()
        fn = os.path.join(OUT, "charts", f"{ds['key']}_{p.replace('%', 'pct').replace('#', 'abs').replace('/', '_').replace(' ', '_')}.png")
        fig.savefig(fn, dpi=110); plt.close(fig); r["png"] = fn
pdf.close()

# ---------------------------------------------------------------- Excel
wb = Workbook()
thin = Side(style="thin", color="BBBBBB"); B = Border(left=thin, right=thin, top=thin, bottom=thin)
HF = PatternFill("solid", fgColor="1F4E79"); HFont = Font(color="FFFFFF", bold=True)
OK = PatternFill("solid", fgColor="D9F2E1"); BAD = PatternFill("solid", fgColor="F8D7DA"); WARN = PatternFill("solid", fgColor="FFF3CD")

def header(ws, row, cols):
    for j, h in enumerate(cols, 1):
        c = ws.cell(row, j, h); c.fill = HF; c.font = HFont; c.border = B
        c.alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)

ws = wb.active; ws.title = "Summary"
ws["A1"] = "QC Summary - Mean, SD, CV% vs Target Value (generated 18-10-2026)"; ws["A1"].font = Font(bold=True, size=13)
ws["A2"] = ("SD = sample SD (n-1). CV% = SD/Mean x100. Bias% = (Mean-Target)/Target x100. SDI = (Mean-Target)/SD. "
            "TEa% = allowable range half-width / Target. Sigma = (TEa% - |Bias%|)/CV%. "
            "Precision PASS if CV% <= TEa%/3 (assumed criterion - adjust to your SOP). "
            "Accuracy PASS if Mean and all runs are inside manufacturer range.")
ws["A2"].alignment = Alignment(wrap_text=True); ws.merge_cells("A2:T2"); ws.row_dimensions[2].height = 45
cols = ["File", "Parameter", "Unit", "n", "Mean", "SD", "CV%", "Min", "Max", "Target", "Low limit", "High limit",
        "Bias", "Bias%", "SDI", "Runs out of range", "TEa%", "Sigma", "Accuracy", "Precision (CV)", "Westgard (lab mean/SD)", "Note"]
header(ws, 4, cols); row = 5
for ds in datasets:
    for r in ds["stats"]:
        vals = [ds["key"], r["Parameter"], r["Unit"], r["n"], r["Mean"], r["SD"], r["CV"], r["Min"], r["Max"],
                r["Target"], r["Low"], r["High"], r["Bias"], r["Bias%"], r["SDI"], r["Out"], r["TEa%"], r["Sigma"],
                r["Accuracy"], r["Precision"], r["Westgard"], ds["notes"].get(r["Parameter"], ds["notes"].get("*", ""))]
        for j, v in enumerate(vals, 1):
            c = ws.cell(row, j, None if isinstance(v, float) and math.isnan(v) else v); c.border = B
            if isinstance(v, float): c.number_format = "0.00" if j in (7, 14, 15, 17, 18) else "0.0000"
        for j in (19, 20):
            v = ws.cell(row, j).value
            ws.cell(row, j).fill = OK if v == "PASS" else BAD if v == "FAIL" else WARN
        w = ws.cell(row, 21); w.fill = BAD if any(k in r["Westgard"] for k in ["1-3s", "2-2s", "R-4s", "4-1s", "10x"]) else OK
        row += 1
for j, wdt in enumerate([15, 12, 9, 4, 10, 9, 7, 9, 9, 9, 9, 9, 9, 8, 8, 8, 7, 7, 22, 13, 30, 40], 1):
    ws.column_dimensions[get_column_letter(j)].width = wdt
ws.freeze_panes = "C5"

for ds in datasets:
    ws = wb.create_sheet(ds["key"])
    ws["A1"] = ds["title"]; ws["A1"].font = Font(bold=True, size=12)
    ws["A2"] = f"Source file: {ds['src']}"
    df = ds["df"]; ids = [c for c in df.columns if c not in ds["params"]]
    allc = ids + ds["params"]; header(ws, 4, allc)
    for i, rec in enumerate(df[allc].itertuples(index=False), 5):
        for j, v in enumerate(rec, 1): ws.cell(i, j, v).border = B
    last = 4 + len(df); r0 = last + 2
    labels = ["Mean (=AVERAGE)", "SD (=STDEV.S)", "CV% (=SD/Mean)", "Target", "Low limit", "High limit", "Bias% vs Target", "Within range?"]
    for k, lab in enumerate(labels):
        c = ws.cell(r0 + k, 1, lab); c.font = Font(bold=True)
    for j, p in enumerate(ds["params"], len(ids) + 1):
        L = get_column_letter(j); rng = f"{L}5:{L}{last}"
        ws.cell(r0, j, f"=AVERAGE({rng})").number_format = "0.000"
        ws.cell(r0 + 1, j, f"=STDEV({rng})").number_format = "0.000"
        ws.cell(r0 + 2, j, f"={L}{r0+1}/{L}{r0}").number_format = "0.00%"
        t = ds["target"][p]
        if t is not None:
            ws.cell(r0 + 3, j, t); ws.cell(r0 + 4, j, ds["low"][p]); ws.cell(r0 + 5, j, ds["high"][p])
            ws.cell(r0 + 6, j, f"=({L}{r0}-{L}{r0+3})/{L}{r0+3}").number_format = "0.00%"
            ws.cell(r0 + 7, j, f'=IF(AND({L}{r0}>={L}{r0+4},{L}{r0}<={L}{r0+5}),"PASS","FAIL")')
        else:
            for k in range(3, 8): ws.cell(r0 + k, j, "n/a")
        ws.column_dimensions[L].width = 10
    for j in range(1, len(ids) + 1): ws.column_dimensions[get_column_letter(j)].width = 14
    ws.column_dimensions["A"].width = 18
    # charts
    cs = wb.create_sheet(ds["key"][:22] + "_LJ")
    cs["A1"] = "Levey-Jennings charts - " + ds["title"]; cs["A1"].font = Font(bold=True, size=12)
    for k, r in enumerate(ds["stats"]):
        img = XLImage(r["png"]); img.width, img.height = 640, 293
        cs.add_image(img, f"{'A' if k % 2 == 0 else 'L'}{3 + (k // 2) * 16}")

xl = os.path.join(OUT, "QC_Statistics_LJ_Report.xlsx"); wb.save(xl)

# console summary
for ds in datasets:
    print("\n##", ds["title"])
    for r in ds["stats"]:
        t = "" if r["Target"] is None else f" T={r['Target']:g} Bias%={r['Bias%']:+.2f} out={r['Out']} Acc={r['Accuracy']} Sig={r['Sigma']:.1f}"
        print(f"{r['Parameter']:8s} n={r['n']} M={r['Mean']:.4g} SD={r['SD']:.4g} CV={r['CV']:.2f}%{t} Prec={r['Precision']} WG={r['Westgard']}")
print("\nSaved:", xl)
