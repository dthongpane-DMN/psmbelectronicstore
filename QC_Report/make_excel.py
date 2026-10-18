"""Build one editable Excel workbook per QC file: raw data, live formulas (Mean, SD, CV%, Bias,
Westgard) and native Excel Levey-Jennings charts that update when the data or targets are edited.
Usage: python3 -I make_excel.py <upload_dir> <out_dir>   (reuses the loaders in qc_lj.py)"""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import qc_lj  # loads the three files and computes reference stats
from openpyxl import Workbook
from openpyxl.chart import LineChart, Reference
from openpyxl.chart.shapes import GraphicalProperties
from openpyxl.drawing.line import LineProperties
from openpyxl.formatting.rule import CellIsRule
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter as CL

OUT = sys.argv[2]
thin = Side(style="thin", color="BBBBBB"); B = Border(left=thin, right=thin, top=thin, bottom=thin)
HF = PatternFill("solid", fgColor="1F4E79"); HFont = Font(color="FFFFFF", bold=True)
INPUT = PatternFill("solid", fgColor="FFF2CC")
GREEN = PatternFill("solid", fgColor="D9F2E1"); RED = PatternFill("solid", fgColor="F8D7DA"); AMBER = PatternFill("solid", fgColor="FFE8B3")
CENTER = Alignment(horizontal="center", vertical="center", wrap_text=True)

def header(ws, row, cols, col0=1):
    for j, h in enumerate(cols, col0):
        c = ws.cell(row, j, h); c.fill = HF; c.font = HFont; c.border = B; c.alignment = CENTER

def info_sheet(wb, ds):
    ws = wb.active; ws.title = "Info"
    lines = [
        (ds["title"], Font(bold=True, size=13)),
        (f"Source file: {ds['src']}", None),
        ("", None),
        ("How to use / ວິທີໃຊ້", Font(bold=True, size=12)),
        ("1. Sheet 'Data': raw QC results. Edit or add values in the existing rows - all statistics and charts recalculate.", None),
        ("   ແກ້ໄຂຂໍ້ມູນໃນ sheet Data ໄດ້ - ສູດ ແລະ ກຣາຟຈະຄຳນວນໃໝ່ອັດຕະໂນມັດ.", None),
        ("2. Sheet 'Summary': yellow cells (Target, Min, Max, CV criterion) are inputs you may change.", None),
        ("   ຊ່ອງສີເຫຼືອງ (Target, Min, Max, ເກນ CV) ແມ່ນຄ່າທີ່ປ້ອນເອງໄດ້ ຕາມ Assay sheet / SOP.", None),
        ("3. Sheet 'LJ_Calc': helper table per parameter (Mean ±1/2/3SD lines, z-score, Westgard flags).", None),
        ("4. Sheet 'LJ_Charts': native Excel Levey-Jennings charts (right-click to edit style / axis).", None),
        ("", None),
        ("Formulas / ສູດ", Font(bold=True, size=12)),
        ("Mean = AVERAGE; SD = STDEV (sample, n-1); CV% = SD/Mean x 100", None),
        ("Bias = Mean - Target; Bias% = Bias/Target x 100; SDI = (Mean - Target)/SD", None),
        ("TEa% = (Max - Target)/Target x 100 (half-width of manufacturer range)", None),
        ("Sigma = (TEa% - |Bias%|) / CV%  (>=6 world class, 4-6 good, 3-4 marginal, <3 poor)", None),
        ("Precision PASS if CV% <= TEa% x factor (default factor 1/3 - assumed, change cell in Summary header to your SOP)", None),
        ("Accuracy PASS if Mean and every run lie inside Min-Max", None),
        ("Westgard rules on lab Mean/SD: 1-2s warning; 1-3s, 2-2s, R-4s, 4-1s, 10x = reject", None),
        ("L-J chart: blue = results, black = Mean, green ±1SD, orange ±2SD, red ±3SD, purple dashed = Target, grey dotted = Min/Max", None),
    ]
    for k, v in ds["notes"].items():
        lines.append((f"Note ({k}): {v}", Font(color="C00000")))
    for i, (t, f) in enumerate(lines, 1):
        c = ws.cell(i, 1, t)
        if f: c.font = f
    ws.column_dimensions["A"].width = 120

def build(ds):
    wb = Workbook(); info_sheet(wb, ds)
    df, params = ds["df"], ds["params"]; n = len(df)
    ids = [c for c in df.columns if c not in params]

    # ---------------- Data
    wd = wb.create_sheet("Data")
    wd["A1"] = ds["title"]; wd["A1"].font = Font(bold=True, size=12)
    HR, R1 = 3, 4; RN = R1 + n - 1
    header(wd, HR, ids + [f"{p} ({ds['unit'][p]})" if ds["unit"][p] else p for p in params])
    for i, rec in enumerate(df[ids + params].itertuples(index=False), R1):
        for j, v in enumerate(rec, 1):
            c = wd.cell(i, j, v); c.border = B
    dcol = {p: CL(len(ids) + 1 + k) for k, p in enumerate(params)}
    for j in range(1, len(ids) + len(params) + 1):
        wd.column_dimensions[CL(j)].width = 12 if j <= len(ids) else 9
    wd.row_dimensions[HR].height = 30; wd.freeze_panes = wd.cell(R1, len(ids) + 1)

    # ---------------- Summary (formulas)
    sm = wb.create_sheet("Summary", 1)
    sm["A1"] = "QC Summary - Mean, SD, CV% vs Target"; sm["A1"].font = Font(bold=True, size=13)
    sm["A2"] = "Precision criterion: CV% <= TEa% x"; sm["E2"] = 1 / 3; sm["E2"].fill = INPUT; sm["E2"].number_format = "0.00"
    cols = ["Parameter", "Unit", "n", "Mean", "SD", "CV%", "Min result", "Max result", "Target", "Min (mfr)", "Max (mfr)",
            "Bias", "Bias%", "SDI", "Runs out of range", "TEa%", "Sigma", "Accuracy", "Precision", "Westgard reject runs", "1-2s warnings"]
    header(sm, 4, cols); sm.row_dimensions[4].height = 32
    srow = {}
    for k, p in enumerate(params):
        r = 5 + k; srow[p] = r; L = dcol[p]; rng = f"Data!${L}${R1}:${L}${RN}"
        f = {
            "A": p, "B": ds["unit"][p], "C": f"=COUNT({rng})", "D": f"=AVERAGE({rng})", "E": f"=STDEV({rng})",
            "F": f"=IFERROR(E{r}/D{r}*100,\"\")", "G": f"=MIN({rng})", "H": f"=MAX({rng})",
            "I": ds["target"][p], "J": ds["low"][p], "K": ds["high"][p],
            "L": f'=IF(I{r}="","",D{r}-I{r})', "M": f'=IF(I{r}="","",(D{r}-I{r})/I{r}*100)',
            "N": f'=IF(I{r}="","",(D{r}-I{r})/E{r})',
            "O": f'=IF(OR(J{r}="",K{r}=""),"",COUNTIF({rng},"<"&J{r})+COUNTIF({rng},">"&K{r}))',
            "P": f'=IF(OR(I{r}="",K{r}=""),"",(K{r}-I{r})/I{r}*100)',
            "Q": f'=IF(P{r}="","",IFERROR((P{r}-ABS(M{r}))/F{r},""))',
            "R": f'=IF(OR(J{r}="",K{r}=""),"N/A",IF(AND(D{r}>=J{r},D{r}<=K{r},O{r}=0),"PASS","FAIL"))',
            "S": f'=IF(P{r}="","N/A",IF(F{r}<=P{r}*$E$2,"PASS","FAIL"))',
        }
        for col, v in f.items():
            c = sm[f"{col}{r}"]; c.value = v; c.border = B
        for col in "IJK":
            sm[f"{col}{r}"].fill = INPUT
        for col, fmt in zip("DEFGHIJKLMNPQ", ["0.000", "0.000", "0.00", "0.00", "0.00", "0.00", "0.00", "0.00", "0.000", "0.00", "0.00", "0.00", "0.0"]):
            sm[f"{col}{r}"].number_format = fmt
    last = 4 + len(params)
    for col in "RS":
        rg = f"{col}5:{col}{last}"
        sm.conditional_formatting.add(rg, CellIsRule(operator="equal", formula=['"PASS"'], fill=GREEN))
        sm.conditional_formatting.add(rg, CellIsRule(operator="equal", formula=['"FAIL"'], fill=RED))
    sm.conditional_formatting.add(f"T5:T{last}", CellIsRule(operator="greaterThan", formula=["0"], fill=RED))
    sm.conditional_formatting.add(f"U5:U{last}", CellIsRule(operator="greaterThan", formula=["0"], fill=AMBER))
    sm.conditional_formatting.add(f"Q5:Q{last}", CellIsRule(operator="lessThan", formula=["3"], fill=AMBER))
    for j, w in enumerate([15, 9, 5, 10, 9, 8, 9, 9, 9, 9, 9, 9, 8, 8, 9, 8, 8, 10, 10, 10, 9], 1):
        sm.column_dimensions[CL(j)].width = w
    sm.freeze_panes = "B5"

    # ---------------- LJ_Calc (one vertical block per parameter)
    lc = wb.create_sheet("LJ_Calc")
    lc_cols = ["Run", "Result", "Mean", "+1SD", "-1SD", "+2SD", "-2SD", "+3SD", "-3SD", "Target", "Min", "Max",
               "z", "Westgard", "Reject", "Warn"]
    blocks = {}
    row = 1
    for p in params:
        r = srow[p]
        lc.cell(row, 1, p).font = Font(bold=True, size=11)
        header(lc, row + 1, lc_cols)
        f0, fN = row + 2, row + 1 + n
        for i in range(n):
            q = f0 + i; dr = R1 + i
            vals = [ds["labels"][i], f"=Data!{dcol[p]}{dr}", f"=Summary!$D${r}",
                    f"=C{q}+Summary!$E${r}", f"=C{q}-Summary!$E${r}", f"=C{q}+2*Summary!$E${r}", f"=C{q}-2*Summary!$E${r}",
                    f"=C{q}+3*Summary!$E${r}", f"=C{q}-3*Summary!$E${r}",
                    f'=IF(Summary!$I${r}="",NA(),Summary!$I${r})', f'=IF(Summary!$J${r}="",NA(),Summary!$J${r})',
                    f'=IF(Summary!$K${r}="",NA(),Summary!$K${r})',
                    f"=IFERROR((B{q}-C{q})/Summary!$E${r},0)"]
            z = f"M{q}"; zp = f"M{q-1}"
            parts = [f'IF(ABS({z})>3,"1-3s ","")']
            if i >= 1:
                parts += [f'IF(OR(AND({z}>2,{zp}>2),AND({z}<-2,{zp}<-2)),"2-2s ","")',
                          f'IF(OR(AND({z}>2,{zp}<-2),AND({z}<-2,{zp}>2)),"R-4s ","")']
            if i >= 3:
                rg = f"M{q-3}:M{q}"
                parts.append(f'IF(OR(COUNTIF({rg},">1")=4,COUNTIF({rg},"<-1")=4),"4-1s ","")')
            if i >= 9:
                rg = f"M{q-9}:M{q}"
                parts.append(f'IF(OR(COUNTIF({rg},">0")=10,COUNTIF({rg},"<0")=10),"10x ","")')
            vals += ["=TRIM(" + "&".join(parts) + ")", f'=IF(N{q}<>"",1,0)', f'=IF(AND(ABS({z})>2,N{q}=""),1,0)']
            for j, v in enumerate(vals, 1):
                c = lc.cell(q, j, v); c.border = B
                if 2 <= j <= 13: c.number_format = "0.000"
        lc.conditional_formatting.add(f"N{f0}:N{fN}", CellIsRule(operator="notEqual", formula=['""'], fill=RED))
        sm[f"T{r}"] = f"=SUM(LJ_Calc!O{f0}:O{fN})"; sm[f"U{r}"] = f"=SUM(LJ_Calc!P{f0}:P{fN})"
        for col in "TU": sm[f"{col}{r}"].border = B
        blocks[p] = (f0, fN, r)
        row = fN + 3
    for j, w in enumerate([14] + [9] * 12 + [7, 14, 7, 7], 1):
        lc.column_dimensions[CL(j)].width = w

    # ---------------- LJ_Charts (native, linked to LJ_Calc)
    ch = wb.create_sheet("LJ_Charts", 2)
    ch["A1"] = "Levey-Jennings charts - " + ds["title"]; ch["A1"].font = Font(bold=True, size=12)
    style = {  # col: (colour, dash, width EMU, marker)
        2: ("1F4E9C", None, 22000, True), 3: ("222222", None, 22000, False),
        4: ("2E9D4F", "dash", 12700, False), 5: ("2E9D4F", "dash", 12700, False),
        6: ("E3A21A", "dash", 12700, False), 7: ("E3A21A", "dash", 12700, False),
        8: ("D1342F", None, 12700, False), 9: ("D1342F", None, 12700, False),
        10: ("8A2BE2", "lgDash", 22000, False), 11: ("808080", "sysDot", 12700, False), 12: ("808080", "sysDot", 12700, False)}
    stats = {s["Parameter"]: s for s in ds["stats"]}
    for k, p in enumerate(params):
        f0, fN, r = blocks[p]; s = stats[p]
        c = LineChart(); c.height, c.width = 9.5, 17
        u = f" ({ds['unit'][p]})" if ds["unit"][p] else ""
        c.title = f"{p}{u} - L-J chart"; c.style = 2
        c.y_axis.title = p; c.x_axis.title = "Run"
        c.x_axis.delete = False; c.y_axis.delete = False
        c.y_axis.majorGridlines = None; c.legend.position = "b"
        for col, (rgb, dash, w, marker) in style.items():
            if col >= 10 and s["Target"] is None:
                continue
            ref = Reference(lc, min_col=col, min_row=f0 - 1, max_row=fN)
            c.add_data(ref, titles_from_data=True)
            se = c.series[-1]; se.smooth = False
            se.graphicalProperties = GraphicalProperties(ln=LineProperties(solidFill=rgb, w=w, prstDash=dash))
            if marker:
                se.marker.symbol = "circle"; se.marker.size = 6
                se.marker.graphicalProperties = GraphicalProperties(solidFill=rgb)
                se.marker.graphicalProperties.line.solidFill = "FFFFFF"
            else:
                se.marker.symbol = "none"
        c.set_categories(Reference(lc, min_col=1, min_row=f0, max_row=fN))
        lo = [s["Mean"] - 3.6 * s["SD"], s["Min"]]; hi = [s["Mean"] + 3.6 * s["SD"], s["Max"]]
        if s["Target"] is not None:
            lo.append(s["Target"]); hi.append(s["Target"])
        pad = (max(hi) - min(lo)) * 0.05
        c.y_axis.scaling.min = round(min(lo) - pad, 3); c.y_axis.scaling.max = round(max(hi) + pad, 3)
        c.y_axis.number_format = "0.00" if max(hi) < 10 else "0.0" if max(hi) < 100 else "0"
        ch.add_chart(c, f"{'A' if k % 2 == 0 else 'L'}{3 + (k // 2) * 20}")

    fn = os.path.join(OUT, f"{ds['key']}_QC_LJ_Report.xlsx"); wb.save(fn); return fn

for ds in qc_lj.datasets:
    print("Saved", build(ds))
