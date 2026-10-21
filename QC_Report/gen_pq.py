"""Generate one Performance Qualification (PQ) report per instrument (Word .docx; PDF via LibreOffice)
from the QC statistics computed in qc_lj.py.  Usage: python3 gen_pq.py <upload_dir> <QC_Report_dir>"""
import sys, os, subprocess
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import qc_lj
from docx import Document
from docx.enum.section import WD_ORIENT, WD_SECTION
from docx.enum.table import WD_TABLE_ALIGNMENT, WD_CELL_VERTICAL_ALIGNMENT
from docx.enum.text import WD_ALIGN_PARAGRAPH, WD_BREAK, WD_TAB_ALIGNMENT
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.shared import Pt, Cm, RGBColor

OUT = os.path.join(sys.argv[2], "PQ")
os.makedirs(OUT, exist_ok=True)
FONT = "Phetsarath OT"
NAVY = RGBColor(0x1F, 0x3A, 0x5F)
CO_LA, CO_EN = "ບໍລິສັດ ຊິບີເອຟ ຟາຣມ ຈຳກັດ", "CBF PHARMA CO., LTD."
DEPT_LA, DEPT_EN = "ພະແນກວິສະວະກຳ ແລະ ພະແນກປະກັນຄຸນນະພາບ", "Engineering Department & Quality Assurance Department"
REPORT_DATE = "21/10/2026"
BLANK = "...................................."

EQUIP = {
    "F1_Hema_VWB": dict(
        doc="PQ-ENG-001", short="Hematology Analyzer (5-part)",
        name_la="ເຄື່ອງວິເຄາະເລືອດອັດຕະໂນມັດ ແບບ 5-Part Differential", name_en="Automated Hematology Analyzer (5-Part Diff)",
        maker=BLANK, model=BLANK, mode="VWB-CBC+DIFF", control="Hematology Control - Level High",
        lot="HC5D277H", exp="05-08-2026", date="18-10-2026", runs_note="R1 = File No.15 ... R15 = File No.1 (ລຽງຕາມເວລາ 10:14 → 00:14)"),
    "F2_HumaCount": dict(
        doc="PQ-ENG-002", short="HumaCount (3-part)",
        name_la="ເຄື່ອງວິເຄາະເລືອດອັດຕະໂນມັດ HumaCount ແບບ 3-Part", name_en="HumaCount 3-Part Hematology Analyzer",
        maker="HUMAN Diagnostics (Germany)", model="HumaCount " + BLANK[:12], mode="CBC 3-Part (LYM/MID/GRA)",
        control="HumaCount Control - Level High", lot="HC256H", exp="05-11-2026", date="16-07-2026", runs_note=""),
    "F3_HS200_Chem": dict(
        doc="PQ-ENG-003", short="HumaStar 200 (HS200)",
        name_la="ເຄື່ອງວິເຄາະຊີວະເຄມີອັດຕະໂນມັດ HumaStar 200", name_en="HumaStar 200 (HS200) Clinical Chemistry Analyzer",
        maker="HUMAN GmbH, Wiesbaden (Germany)", model="HumaStar 200 (HS200)", mode="Clinical chemistry (Serum)",
        control="SERODOS PLUS (ID 00000010)", lot=BLANK[:16], exp=BLANK[:16], date="18-10-2026", runs_note=""),
}

# ------------------------------------------------------------------ docx helpers
def set_font(run, size=None, bold=None, color=None, italic=None):
    rpr = run._element.get_or_add_rPr()
    rf = rpr.find(qn("w:rFonts"))
    if rf is None:
        rf = OxmlElement("w:rFonts"); rpr.insert(0, rf)
    for a in ("w:ascii", "w:hAnsi", "w:cs", "w:eastAsia"):
        rf.set(qn(a), FONT)
    if size:
        run.font.size = Pt(size)
        szcs = OxmlElement("w:szCs"); szcs.set(qn("w:val"), str(int(size * 2))); rpr.append(szcs)
    if bold:
        run.font.bold = True; rpr.append(OxmlElement("w:bCs"))
    if italic:
        run.font.italic = True
    if color is not None:
        run.font.color.rgb = color

def para(cont, text="", size=10.5, bold=False, align=None, color=None, space_after=4, italic=False, style=None):
    p = cont.add_paragraph(style=style) if style else cont.add_paragraph()
    if text:
        set_font(p.add_run(text), size, bold, color, italic)
    if align: p.alignment = align
    p.paragraph_format.space_after = Pt(space_after)
    return p

def heading(doc, text, level=1):
    size = {1: 13, 2: 11.5}[level]
    p = para(doc, text, size, True, color=NAVY, space_after=4)
    p.paragraph_format.space_before = Pt(10 if level == 1 else 6)
    p.paragraph_format.keep_with_next = True
    if level == 1:
        pPr = p._p.get_or_add_pPr(); bdr = OxmlElement("w:pBdr"); b = OxmlElement("w:bottom")
        for k, v in {"w:val": "single", "w:sz": "6", "w:space": "1", "w:color": "1F3A5F"}.items(): b.set(qn(k), v)
        bdr.append(b); pPr.append(bdr)
    return p

def bullet(doc, text, size=10.5):
    p = para(doc, "", size, space_after=2)
    p.paragraph_format.left_indent = Cm(0.6); p.paragraph_format.first_line_indent = Cm(-0.4)
    set_font(p.add_run("•  " + text), size)
    return p

def shade(cell, hex_):
    tcPr = cell._tc.get_or_add_tcPr(); sh = OxmlElement("w:shd")
    sh.set(qn("w:val"), "clear"); sh.set(qn("w:color"), "auto"); sh.set(qn("w:fill"), hex_); tcPr.append(sh)

def cell_text(cell, text, size=9, bold=False, align=WD_ALIGN_PARAGRAPH.LEFT, color=None):
    cell.text = ""
    p = cell.paragraphs[0]; p.alignment = align; p.paragraph_format.space_after = Pt(0)
    for k, line in enumerate(str(text).split("\n")):
        r = p.add_run(line); set_font(r, size, bold, color)
        if k < len(str(text).split("\n")) - 1: r.add_break()
    cell.vertical_alignment = WD_CELL_VERTICAL_ALIGNMENT.CENTER

def set_widths(t, widths):
    t.autofit = False
    lay = OxmlElement("w:tblLayout"); lay.set(qn("w:type"), "fixed"); t._tbl.tblPr.append(lay)
    for j, gc in enumerate(t._tbl.tblGrid.findall(qn("w:gridCol"))):
        gc.set(qn("w:w"), str(int(widths[j] / 635)))
    for row in t.rows:
        for j, w in enumerate(widths):
            row.cells[j].width = w

def repeat_header(row):
    trPr = row._tr.get_or_add_trPr(); h = OxmlElement("w:tblHeader"); h.set(qn("w:val"), "true"); trPr.append(h)

def table(doc, header, rows, widths, size=9, head_fill="1F3A5F", align_cols=(), status_col=None):
    t = doc.add_table(rows=1, cols=len(header)); t.style = "Table Grid"; t.alignment = WD_TABLE_ALIGNMENT.CENTER
    for j, h in enumerate(header):
        c = t.rows[0].cells[j]; cell_text(c, h, size, True, WD_ALIGN_PARAGRAPH.CENTER, RGBColor(255, 255, 255)); shade(c, head_fill)
    repeat_header(t.rows[0])
    for i, r in enumerate(rows):
        cells = t.add_row().cells
        for j, v in enumerate(r):
            cell_text(cells[j], v, size, False, WD_ALIGN_PARAGRAPH.CENTER if j in align_cols else WD_ALIGN_PARAGRAPH.LEFT)
            if i % 2: shade(cells[j], "F2F5F9")
        if status_col is not None:
            for j in ([status_col] if isinstance(status_col, int) else status_col):
                v = str(r[j])
                if v.startswith("PASS"): shade(cells[j], "D9F2E1")
                elif v.startswith("FAIL") or v.startswith("Reject"): shade(cells[j], "F8D7DA")
                elif v.startswith("N/A") or v.startswith("Warn"): shade(cells[j], "FFF3CD")
    set_widths(t, [Cm(w) for w in widths])
    doc.add_paragraph().paragraph_format.space_after = Pt(2)
    return t

def kv_table(doc, rows, w=(6, 11), size=10):
    t = doc.add_table(rows=0, cols=2); t.style = "Table Grid"; t.alignment = WD_TABLE_ALIGNMENT.CENTER
    for k, v in rows:
        c = t.add_row().cells; cell_text(c[0], k, size, True); shade(c[0], "E8EEF5"); cell_text(c[1], v, size)
    set_widths(t, [Cm(w[0]), Cm(w[1])])
    doc.add_paragraph().paragraph_format.space_after = Pt(2)
    return t

def add_field(run, instr):
    for kind, text in (("begin", None), (None, instr), ("separate", None), (None, "1"), ("end", None)):
        if kind:
            f = OxmlElement("w:fldChar"); f.set(qn("w:fldCharType"), kind); run._r.append(f)
        elif text == instr:
            it = OxmlElement("w:instrText"); it.set(qn("xml:space"), "preserve"); it.text = instr; run._r.append(it)
        else:
            t = OxmlElement("w:t"); t.text = text; run._r.append(t)

def header_footer(section, doc_no, title):
    hdr = section.header; hdr.paragraphs[0].text = ""
    w = section.page_width - section.left_margin - section.right_margin
    t = hdr.add_table(rows=1, cols=2, width=w)
    for j, (txt, al, b) in enumerate([(f"{CO_LA}  |  {CO_EN}", WD_ALIGN_PARAGRAPH.LEFT, True),
                                      (f"{doc_no}  Rev.01", WD_ALIGN_PARAGRAPH.RIGHT, False)]):
        cell_text(t.rows[0].cells[j], txt, 8.5, b, al, NAVY)
    set_widths(t, [int(w * 0.72), int(w * 0.28)])
    hp2 = hdr.paragraphs[0]; set_font(hp2.add_run(title), 8, False, RGBColor(0x55, 0x55, 0x55))
    hdr._element.remove(hp2._p); hdr._element.append(hp2._p)
    pPr = hp2._p.get_or_add_pPr(); bdr = OxmlElement("w:pBdr"); b = OxmlElement("w:bottom")
    for k, v in {"w:val": "single", "w:sz": "4", "w:space": "1", "w:color": "1F3A5F"}.items(): b.set(qn(k), v)
    bdr.append(b); pPr.append(bdr)
    fp = section.footer.paragraphs[0]; fp.text = ""; fp.alignment = WD_ALIGN_PARAGRAPH.CENTER
    set_font(fp.add_run("ໜ້າ / Page "), 8.5)
    r = fp.add_run(); set_font(r, 8.5); add_field(r, "PAGE")
    set_font(fp.add_run(" / "), 8.5)
    r = fp.add_run(); set_font(r, 8.5); add_field(r, "NUMPAGES")

def new_section(doc, landscape):
    s = doc.add_section(WD_SECTION.NEW_PAGE)
    if landscape != (s.orientation == WD_ORIENT.LANDSCAPE):
        s.orientation = WD_ORIENT.LANDSCAPE if landscape else WD_ORIENT.PORTRAIT
        s.page_width, s.page_height = s.page_height, s.page_width
    s.different_first_page_header_footer = False
    return s

def fmt(v):
    if v is None: return "-"
    a = abs(v)
    return f"{v:.1f}" if a >= 100 else f"{v:.2f}" if a >= 10 else f"{v:.3f}" if a >= 1 else f"{v:.4f}"

# ------------------------------------------------------------------ findings per instrument
REJECT = ["1-3s", "2-2s", "R-4s", "4-1s", "10x"]

def westgard_runs(r):
    out = []
    for k in REJECT + ["1-2s (warning)"]:
        if k in r["viol"]:
            out.append(f"{k}: R" + ", R".join(str(i + 1) for i in sorted(r["viol"][k])))
    return "; ".join(out) or "-"

def findings(ds, e):
    S = ds["stats"]; has_t = S[0]["Target"] is not None
    obs, verdict = [], ""
    rej = [r for r in S if any(k in r["viol"] for k in REJECT)]
    warn = [r["Parameter"] for r in S if "1-2s (warning)" in r["viol"]]
    if has_t:
        out = [r for r in S if r["Out"] or not r["MeanOK"]]
        obs.append(f"ທຸກພາຣາມິເຕີ ({len(S)}) ມີຄ່າ Mean ແລະ ທຸກ run ຢູ່ໃນຊ່ວງ Min–Max ຂອງຜູ້ຜະລິດ (Accuracy: PASS)."
                   if not out else "ພາຣາມິເຕີທີ່ຕົກນອກຊ່ວງ: " + ", ".join(r["Parameter"] for r in out))
        pf = [r["Parameter"] for r in S if r["Precision"] == "FAIL"]
        obs.append("Precision (CV%) ຜ່ານເກນທຸກພາຣາມິເຕີ." if not pf else "Precision ບໍ່ຜ່ານ: " + ", ".join(pf))
        big = [f"{r['Parameter']} ({r['Bias%']:+.1f}%)" for r in S if abs(r["Bias%"]) > 10]
        if big:
            obs.append("ພາຣາມິເຕີທີ່ມີ Bias ສູງກວ່າ ±10% ທຽບກັບ Target (ຍັງຢູ່ໃນຊ່ວງ ແຕ່ຄວນຕິດຕາມ): " + ", ".join(big) + ".")
        low = [f"{r['Parameter']} (σ={r['Sigma']:.1f})" for r in S if r["Sigma"] < 3]
        if low:
            obs.append("ພາຣາມິເຕີທີ່ມີ Sigma < 3 (ຄຸນນະພາບຕ່ຳ, ຄວາມສ່ຽງຕໍ່ການຕົກນອກຊ່ວງສູງ): " + ", ".join(low) + ".")
    else:
        obs.append("ຂໍ້ມູນ QC ໃນ file ນີ້ ບໍ່ມີ Target Value ແລະ ຊ່ວງ Min–Max ຂອງຜູ້ຜະລິດ → ບໍ່ສາມາດປະເມີນ Accuracy (Bias) ແລະ ເກນ Precision ທີ່ອີງໃສ່ TEa ໄດ້.")
        hi = [f"{r['Parameter']} ({r['CV']:.2f}%)" for r in S if r["CV"] > 5]
        lo = [f"{r['Parameter']} ({r['CV']:.2f}%)" for r in S if r["CV"] <= 2]
        obs.append("CV% ດີ (≤ 2%): " + ", ".join(lo) + ".")
        if hi: obs.append("CV% ສູງກວ່າ 5% (ຄວນທຽບກັບ spec ຂອງຜູ້ຜະລິດ): " + ", ".join(hi) + ".")
    for r in rej:
        obs.append(f"{r['Parameter']}: ລະເມີດ Westgard rule ({westgard_runs(r)}) → ເປັນສັນຍານຄວາມຄາດເຄື່ອນແບບສຸ່ມ (random error), ໃຫ້ກວດສອບ run ດັ່ງກ່າວ.")
    if warn:
        obs.append("1-2s warning (ຄຳເຕືອນ, ບໍ່ແມ່ນເຫດຜົນປະຕິເສດ): " + ", ".join(warn) + ".")
    for k, v in ds["notes"].items():
        if k != "*": obs.append(f"{k}: {v}.")
    n = S[0]["n"]
    if n < 20:
        obs.append(f"ຈຳນວນ run = {n} ຊຶ່ງໜ້ອຍກວ່າ 20 runs ທີ່ CLSI C24 ແນະນຳສຳລັບການກຳນົດ Mean/SD ຂອງຫ້ອງວິເຄາະ → Mean/SD ໃນລາຍງານນີ້ເປັນຄ່າເບື້ອງຕົ້ນ.")

    key = ds["key"]
    if key == "F1_Hema_VWB":
        obs.insert(3, "Bas% ແລະ Bas#: ຄ່າທີ່ວັດໄດ້ຕ່ຳກວ່າ Target ປະມານ 79%, ແຕ່ຊ່ວງຍອມຮັບກວ້າງຫຼາຍ (Bas% 0–4) ຈຶ່ງຍັງ PASS. ແນະນຳກວດສອບ Target ໃນ Assay sheet ທຽບກັບການຕັ້ງຄ່າໃນເຄື່ອງ.")
        obs.append("Eos%, Eos#, Bas%, Bas# ມີ CV% 14–16% ເນື່ອງຈາກຈຳນວນເຊວໜ້ອຍ (low count) ຊຶ່ງເປັນລັກສະນະປົກກະຕິຂອງພາຣາມິເຕີເຫຼົ່ານີ້.")
        verdict = ("ຜ່ານ (PASS) ພ້ອມຂໍ້ສັງເກດ: ເຄື່ອງໃຫ້ຜົນຢູ່ໃນຊ່ວງຍອມຮັບຂອງຜູ້ຜະລິດທຸກພາຣາມິເຕີ ແລະ ມີຄວາມແມ່ນຍຳດີ. "
                   "ໃຫ້ຕິດຕາມ PDW (R-4s) ແລະ ພາຣາມິເຕີທີ່ມີ Bias ສູງ, ແລະ ສະສົມ QC ໃຫ້ຄົບ ≥ 20 runs ເພື່ອກຳນົດ Mean/SD ຂອງຫ້ອງວິເຄາະ.")
        status = 0
    elif key == "F2_HumaCount":
        verdict = ("ຍັງບໍ່ສາມາດສະຫຼຸບໄດ້ (PENDING): ຜົນ Precision ຢູ່ໃນລະດັບດີສຳລັບພາຣາມິເຕີຫຼັກ (WBC, RBC, HGB, HCT, PLT CV < 2%) ແລະ ບໍ່ມີການລະເມີດ Westgard rejection rule, "
                   "ແຕ່ຕ້ອງປ້ອນ Target Value ແລະ ຊ່ວງ Min–Max ຈາກ Assay sheet ຂອງ Lot HC256H ເພື່ອປະເມີນ Accuracy ກ່ອນອະນຸມັດ.")
        status = 3
    else:
        b = {r["Parameter"]: r for r in S}["Bilirubin total"]
        c = {r["Parameter"]: r for r in S}["Calcium"]
        obs.insert(2, f"ທັງ 3 ພາຣາມິເຕີມີ Bias ເປັນບວກ (ສູງກວ່າ Target) ຢ່າງເປັນລະບົບ → ສະແດງເຖິງຄວາມຄາດເຄື່ອນແບບເປັນລະບົບ (systematic error) ເຊັ່ນ calibration, reagent ຫຼື ອຸນຫະພູມ.")
        obs.insert(3, f"Bilirubin total: Mean {b['Mean']:.3f} ໃກ້ຂອບເທິງ {b['High']:g} mg/dl; Mean + 2SD = {b['Mean'] + 2 * b['SD']:.2f} ເກີນຂອບເທິງແລ້ວ → ຄວາມສ່ຽງສູງທີ່ run ຕໍ່ໄປຈະຕົກນອກຊ່ວງ.")
        obs.insert(4, "Calcium: ມີແນວໂນ້ມເພີ່ມຂຶ້ນຢ່າງຕໍ່ເນື່ອງ (trend) ຈາກ 12.2 (R3) ຫາ 13.3 mg/dl (R8–R9).")
        obs.insert(5, "Cholesterol: R1 = 294 mg/dl (ເທົ່າ Target) ຫຼັງຈາກນັ້ນເລື່ອນຂຶ້ນ (shift) ໄປຢູ່ 307–326 mg/dl.")
        verdict = ("ຜ່ານແບບມີເງື່ອນໄຂ (CONDITIONAL PASS): ທຸກ run ຢູ່ໃນຊ່ວງຂອງຜູ້ຜະລິດ ແລະ CV% ຜ່ານເກນ, ແຕ່ມີ Bias ເປັນບວກຢ່າງເປັນລະບົບ (+6.9% ຫາ +13.6%) ແລະ Sigma < 3. "
                   "ໃຫ້ເປີດ Deviation/CAPA, ເຮັດ Recalibration, ກວດ reagent ແລະ ອຸນຫະພູມ, ແລ້ວທົດສອບ PQ ຊ້ຳ (≥ 20 runs) ກ່ອນອະນຸມັດນຳໃຊ້ເຕັມຮູບແບບ.")
        status = 1
    return obs, verdict, status

# ------------------------------------------------------------------ build one report
def build(ds):
    e = EQUIP[ds["key"]]; S = ds["stats"]; has_t = S[0]["Target"] is not None
    title = f"ລາຍງານການຮັບຮອງສະມັດຕະພາບ (PQ) – {e['short']}"
    doc = Document()
    st = doc.styles["Normal"]; st.font.name = FONT; st.font.size = Pt(10.5)
    rpr = st.element.get_or_add_rPr(); rf = rpr.find(qn("w:rFonts"))
    for a in ("w:ascii", "w:hAnsi", "w:cs", "w:eastAsia"): rf.set(qn(a), FONT)
    szcs = OxmlElement("w:szCs"); szcs.set(qn("w:val"), "21"); rpr.append(szcs)
    sec = doc.sections[0]
    sec.page_width, sec.page_height = Cm(21), Cm(29.7)
    for s_ in [sec]:
        s_.left_margin = s_.right_margin = Cm(2); s_.top_margin = Cm(2); s_.bottom_margin = Cm(1.8)
    sec.different_first_page_header_footer = True
    header_footer(sec, e["doc"], title)

    # ---------- cover
    para(doc, "", space_after=30)
    para(doc, CO_LA, 22, True, WD_ALIGN_PARAGRAPH.CENTER, NAVY, 2)
    para(doc, CO_EN, 16, True, WD_ALIGN_PARAGRAPH.CENTER, NAVY, 10)
    para(doc, DEPT_LA, 13, True, WD_ALIGN_PARAGRAPH.CENTER, None, 2)
    para(doc, DEPT_EN, 11, False, WD_ALIGN_PARAGRAPH.CENTER, RGBColor(0x44, 0x44, 0x44), 40)
    box = doc.add_table(rows=1, cols=1); box.style = "Table Grid"; box.alignment = WD_TABLE_ALIGNMENT.CENTER
    c = box.rows[0].cells[0]; shade(c, "1F3A5F"); c.width = Cm(16)
    cell_text(c, "ລາຍງານການຮັບຮອງສະມັດຕະພາບ", 20, True, WD_ALIGN_PARAGRAPH.CENTER, RGBColor(255, 255, 255))
    for txt, sz, b in [("PERFORMANCE QUALIFICATION (PQ) REPORT", 15, True), ("", 6, False), (e["name_la"], 13, True), (e["name_en"], 12, False)]:
        p = c.add_paragraph(); p.alignment = WD_ALIGN_PARAGRAPH.CENTER; p.paragraph_format.space_after = Pt(2)
        set_font(p.add_run(txt), sz, b, RGBColor(255, 255, 255))
    para(doc, "", space_after=36)
    kv_table(doc, [("ເລກທີເອກະສານ / Document No.", e["doc"]), ("ສະບັບ / Revision", "01"),
                   ("ລະຫັດເຄື່ອງ / Equipment ID", BLANK), ("ສະຖານທີ່ຕິດຕັ້ງ / Location", BLANK),
                   ("ວັນທີທົດສອບ / Test Date", e["date"]), ("ວັນທີລາຍງານ / Report Date", REPORT_DATE)], (7, 9), 10.5)
    para(doc, "ເອກະສານຄວບຄຸມ – ຫ້າມສຳເນົາໂດຍບໍ່ໄດ້ຮັບອະນຸຍາດ  |  Controlled Document", 8.5, False, WD_ALIGN_PARAGRAPH.CENTER, RGBColor(0x77, 0x77, 0x77))
    doc.add_paragraph().add_run().add_break(WD_BREAK.PAGE)

    # ---------- approval
    heading(doc, "ໜ້າອະນຸມັດເອກະສານ (Document Approval)")
    para(doc, "ລາຍເຊັນຂ້າງລຸ່ມນີ້ຢືນຢັນວ່າ ລາຍງານ PQ ສະບັບນີ້ໄດ້ຮັບການກະກຽມ, ທົບທວນ ແລະ ອະນຸມັດຕາມລະບົບ GMP ຂອງບໍລິສັດ.", 10)
    table(doc, ["ໜ້າທີ່ / Role", "ຊື່ ແລະ ນາມສະກຸນ / Name", "ຕຳແໜ່ງ / ພະແນກ", "ລາຍເຊັນ / Signature", "ວັນທີ / Date"],
          [["ຜູ້ກະກຽມ\nPrepared by", "", "ພະແນກວິສະວະກຳ\nEngineering", "", ""],
           ["ຜູ້ກວດສອບ\nReviewed by", "", "ຫົວໜ້າພະແນກວິສະວະກຳ\nHead of Engineering", "", ""],
           ["ຜູ້ກວດສອບ\nReviewed by", "", "ພະແນກປະກັນຄຸນນະພາບ\nQA", "", ""],
           ["ຜູ້ອະນຸມັດ\nApproved by", "", "ຫົວໜ້າພະແນກປະກັນຄຸນນະພາບ\nHead of QA", "", ""]],
          [3, 4.2, 4, 3.3, 2.5], 9.5)
    for row in doc.tables[-1].rows[1:]: row.height = Cm(1.4)

    # ---------- 1-9
    heading(doc, "1. ຈຸດປະສົງ (Objective)")
    para(doc, f"ເພື່ອພິສູດ ແລະ ບັນທຶກເປັນເອກະສານວ່າ {e['name_la']} ({e['name_en']}) ສາມາດເຮັດວຽກໄດ້ຢ່າງສະໝ່ຳສະເໝີ ແລະ ໃຫ້ຜົນທີ່ຖືກຕ້ອງ (Accuracy) "
              "ແລະ ແມ່ນຍຳ (Precision) ຕາມເກນການຍອມຮັບທີ່ກຳນົດ ພາຍໃຕ້ສະພາບການນຳໃຊ້ຕົວຈິງ, ໂດຍການວິເຄາະສານຄວບຄຸມຄຸນນະພາບ (QC material) ຊ້ຳຫຼາຍຄັ້ງ, "
              "ຄຳນວນ Mean, SD, CV% ແລະ Bias ທຽບກັບ Target Value, ແລະ ປະເມີນຄວາມຄາດເຄື່ອນດ້ວຍ Levey-Jennings chart ແລະ Westgard rules.")
    heading(doc, "2. ຂອບເຂດ (Scope)")
    para(doc, f"ລາຍງານນີ້ກວມເອົາການຮັບຮອງສະມັດຕະພາບ (PQ) ຂອງ {e['name_en']} ສຳລັບ {len(S)} ພາຣາມິເຕີ, ໂດຍໃຊ້ສານຄວບຄຸມ {e['control']}, "
              f"Lot {e['lot'].strip('.') or '-'}, ຈຳນວນ {S[0]['n']} runs, ທົດສອບວັນທີ {e['date']}. ລາຍງານນີ້ເປັນສ່ວນໜຶ່ງຂອງວົງຈອນການຮັບຮອງ IQ → OQ → PQ ຕາມ PIC/S GMP Annex 15.")
    heading(doc, "3. ຄວາມຮັບຜິດຊອບ (Responsibilities)")
    table(doc, ["ພະແນກ / Department", "ຄວາມຮັບຜິດຊອບ / Responsibility"],
          [["ພະແນກວິສະວະກຳ\nEngineering", "ກະກຽມໂປຣໂຕຄອນ ແລະ ລາຍງານ; ຮັບປະກັນວ່າເຄື່ອງຜ່ານ IQ/OQ, ບຳລຸງຮັກສາ ແລະ Calibration ແລ້ວ; ດຳເນີນການທົດສອບ, ເກັບກຳ ແລະ ວິເຄາະຂໍ້ມູນ."],
           ["ພະແນກປະກັນຄຸນນະພາບ\nQuality Assurance", "ທົບທວນ ແລະ ອະນຸມັດໂປຣໂຕຄອນ/ລາຍງານ; ປະເມີນຂໍ້ບ່ຽງເບນ (Deviation) ແລະ ຕິດຕາມມາດຕະການແກ້ໄຂ-ປ້ອງກັນ (CAPA); ອະນຸມັດການປ່ອຍເຄື່ອງເຂົ້ານຳໃຊ້."],
           ["ຜູ້ໃຊ້ເຄື່ອງ\nUser / Operator", "ດຳເນີນການວິເຄາະ QC ຕາມ SOP ແລະ ຄູ່ມືຜູ້ຜະລິດ; ບັນທຶກຜົນ ແລະ ລາຍງານຄວາມຜິດປົກກະຕິ."]],
          [4.5, 12.5], 9.5)
    heading(doc, "4. ເອກະສານອ້າງອີງ (References)")
    for t in ["PIC/S PE 009 – Guide to Good Manufacturing Practice, Annex 15: Qualification and Validation",
              "EU GMP Guidelines, Annex 15: Qualification and Validation (2015)",
              "WHO TRS No. 1019, Annex 3 – Good manufacturing practices: guidelines on validation (2019)",
              "CLSI C24 – Statistical Quality Control for Quantitative Measurement Procedures",
              "Westgard JO et al. – Multirule Shewhart chart for quality control (Westgard Rules)",
              "ຄູ່ມືການນຳໃຊ້ເຄື່ອງ (Operator Manual) ແລະ Assay sheet ຂອງສານ QC ຈາກຜູ້ຜະລິດ",
              f"SOP ຂອງບໍລິສັດ ກ່ຽວກັບການຮັບຮອງເຄື່ອງມື ແລະ QC: {BLANK}"]:
        bullet(doc, t, 10)
    heading(doc, "5. ລາຍລະອຽດເຄື່ອງ ແລະ ວັດສະດຸ (Equipment & Materials)")
    kv_table(doc, [("ຊື່ເຄື່ອງ / Equipment", f"{e['name_la']}\n{e['name_en']}"), ("ຜູ້ຜະລິດ / Manufacturer", e["maker"]),
                   ("ລຸ້ນ / Model", e["model"]), ("ເລກເຄື່ອງ / Serial No.", BLANK), ("ລະຫັດເຄື່ອງ / Equipment ID", BLANK),
                   ("ໂໝດການວິເຄາະ / Mode", e["mode"]), ("ສານຄວບຄຸມ / QC Material", e["control"]),
                   ("Lot No. / Exp. Date", f"{e['lot']}  /  {e['exp']}"), ("ຈຳນວນ run / Replicates", str(S[0]["n"])),
                   ("ໄຟລ໌ຂໍ້ມູນດິບ / Raw data file", ds["src"]), ("ວັນທີທົດສອບ / Test date", e["date"])])
    heading(doc, "6. ເງື່ອນໄຂເບື້ອງຕົ້ນ (Pre-requisites)")
    table(doc, ["#", "ລາຍການກວດສອບ / Check item", "ຜົນ / Status", "ອ້າງອີງ / ໝາຍເຫດ"],
          [[str(i), t, "☐ Yes   ☐ No", ""] for i, t in enumerate([
              "IQ ສຳເລັດ ແລະ ໄດ້ຮັບການອະນຸມັດ (IQ completed & approved)",
              "OQ ສຳເລັດ ແລະ ໄດ້ຮັບການອະນຸມັດ (OQ completed & approved)",
              "Calibration ຂອງເຄື່ອງຍັງບໍ່ໝົດອາຍຸ (Calibration valid)",
              "ການບຳລຸງຮັກສາປະຈຳວັນ/ປະຈຳອາທິດ ສຳເລັດ (Maintenance done)",
              "ສານ QC ແລະ reagent ບໍ່ໝົດອາຍຸ, ເກັບຮັກສາຖືກຕ້ອງ (QC/reagent valid)",
              "ພະນັກງານໄດ້ຮັບການຝຶກອົບຮົມ (Operators trained)",
              "ອຸນຫະພູມ ແລະ ຄວາມຊຸ່ມຢູ່ໃນເກນ (Environment within limits)"], 1)],
          [0.8, 9.2, 3.2, 3.8], 9.5, align_cols=(0, 2))
    heading(doc, "7. ວິທີການທົດສອບ (Test Procedure)")
    for i, t in enumerate([
            "ກວດສອບສະພາບເຄື່ອງ, ເຮັດ startup / background check ຕາມຄູ່ມືຜູ້ຜະລິດ.",
            "ນຳສານ QC ອອກຈາກຕູ້ເຢັນ ປ່ອຍໃຫ້ຢູ່ອຸນຫະພູມຫ້ອງ ແລະ ປະສົມໃຫ້ເຂົ້າກັນຕາມ Assay sheet.",
            f"ວິເຄາະສານ QC ຊ້ຳ {S[0]['n']} ຄັ້ງ (runs) ໃນໂໝດ {e['mode']}.",
            "ສົ່ງອອກຂໍ້ມູນດິບຈາກເຄື່ອງ ແລະ ກວດສອບຄວາມຄົບຖ້ວນຂອງຂໍ້ມູນ (Data integrity – ALCOA+).",
            "ຄຳນວນສະຖິຕິ ແລະ ສ້າງ Levey-Jennings chart, ປະເມີນດ້ວຍ Westgard rules ແລະ ທຽບກັບເກນການຍອມຮັບ."], 1):
        bullet(doc, f"{i}. {t}", 10)
    para(doc, "ສູດຄຳນວນ (Formulas):", 10, True, space_after=2)
    for t in ["Mean = Σxᵢ / n      SD = √[Σ(xᵢ − Mean)² / (n − 1)]      CV% = SD / Mean × 100",
              "Bias% = (Mean − Target) / Target × 100      SDI = (Mean − Target) / SD",
              "TEa% = (Max − Target) / Target × 100      Sigma = (TEa% − |Bias%|) / CV%"]:
        para(doc, t, 9.5, space_after=1).paragraph_format.left_indent = Cm(0.6)
    heading(doc, "8. ເກນການຍອມຮັບ (Acceptance Criteria)")
    table(doc, ["ຫົວຂໍ້ / Item", "ເກນການຍອມຮັບ / Criterion"],
          [["Accuracy", "Mean ແລະ ທຸກ run ຕ້ອງຢູ່ໃນຊ່ວງ Min–Max ຂອງຜູ້ຜະລິດ (Assay sheet)"],
           ["Precision", "CV% ≤ TEa% / 3  (ເກນທີ່ສົມມຸດໃຊ້ – ໃຫ້ກວດສອບກັບ SOP ຂອງບໍລິສັດ)"],
           ["Westgard rules", "ບໍ່ມີການລະເມີດ rejection rules: 1-3s, 2-2s, R-4s, 4-1s, 10x  (1-2s = ຄຳເຕືອນເທົ່ານັ້ນ)"],
           ["Sigma metric", "≥ 3 ເປັນທີ່ຍອມຮັບ, ≥ 6 ດີເລີດ (ຂໍ້ມູນປະກອບ, ບໍ່ແມ່ນເກນຕັດສິນ)"]],
          [4, 13], 9.5)
    if not has_t:
        para(doc, "ໝາຍເຫດ: ເຄື່ອງນີ້ບໍ່ມີ Target/ຊ່ວງ ໃນຂໍ້ມູນ, ເກນ Accuracy ແລະ Precision ຈຶ່ງປະເມີນບໍ່ໄດ້ ຈົນກວ່າຈະໄດ້ Assay sheet.", 9.5, italic=True, color=RGBColor(0xA0, 0x30, 0x30))

    # ---------- 9. results (landscape)
    new_section(doc, True)
    heading(doc, "9. ຜົນການທົດສອບ (Results)")
    heading(doc, "9.1 ສະຫຼຸບສະຖິຕິ ທຽບກັບ Target (Statistical Summary vs Target)", 2)
    rows = []
    for r in S:
        rng = f"{fmt(r['Low'])} – {fmt(r['High'])}" if has_t else "-"
        wg = ("Reject: " if any(k in r["viol"] for k in REJECT) else "Warn: " if r["viol"] else "") + r["Westgard"].replace(" (warning)", "")
        rows.append([r["Parameter"], r["Unit"] or "-", r["n"], fmt(r["Mean"]), fmt(r["SD"]), f"{r['CV']:.2f}",
                     fmt(r["Target"]), rng, "-" if r["Bias%"] is None else f"{r['Bias%']:+.2f}",
                     "-" if r["Sigma"] is None else f"{r['Sigma']:.1f}", r["Accuracy"].replace(" (bias >50% of range)", "*"),
                     r["Precision"], wg])
    table(doc, ["Parameter", "Unit", "n", "Mean", "SD", "CV%", "Target", "Range (Min–Max)", "Bias%", "Sigma", "Accuracy", "Precision", "Westgard"],
          rows, [2.4, 1.6, 0.8, 1.7, 1.6, 1.3, 1.6, 3.0, 1.5, 1.3, 2.1, 1.9, 4.6], 8, align_cols=range(1, 12), status_col=(10, 11, 12))
    if any(r["Accuracy"].endswith("range)") for r in S):
        para(doc, "* PASS ແຕ່ |Bias| ໃຫຍ່ກວ່າ 50% ຂອງເຄິ່ງຊ່ວງຍອມຮັບ – ຄວນຕິດຕາມ.", 8.5, italic=True)
    heading(doc, "9.2 ຂໍ້ມູນດິບ (Raw Data)", 2)
    n = S[0]["n"]; df = ds["df"]
    if e["runs_note"]: para(doc, e["runs_note"], 8.5, italic=True)
    per = 15 if n > 10 else n
    raw = [[r["Parameter"]] + [fmt(v) for v in df[r["Parameter"]].values] for r in S]
    w0 = 2.4; wr = min(1.6, (25.5 - w0) / n)
    table(doc, ["Parameter"] + [f"R{i}" for i in range(1, n + 1)], raw, [w0] + [wr] * n, 7.5 if n > 10 else 8.5, align_cols=range(1, n + 1))

    # ---------- 10. L-J charts (portrait)
    new_section(doc, False)
    heading(doc, "9.3 Levey-Jennings Charts")
    para(doc, "ເສັ້ນດຳ = Mean ຂອງຫ້ອງວິເຄາະ; ເສັ້ນຂຽວ/ສົ້ມ/ແດງ = ±1/2/3 SD; ເສັ້ນປະສີມ່ວງ = Target; ແຖບສີຂຽວ = ຊ່ວງຂອງຜູ້ຜະລິດ; "
              "ຈຸດສີສົ້ມ = 1-2s warning; ຈຸດສີແດງ = ລະເມີດ Westgard rejection rule.", 9, italic=True)
    g = doc.add_table(rows=0, cols=2); g.alignment = WD_TABLE_ALIGNMENT.CENTER
    for k, r in enumerate(S):
        if k % 2 == 0: cells = g.add_row().cells
        p = cells[k % 2].paragraphs[0]; p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        p.add_run().add_picture(r["png"], width=Cm(8.4))
    doc.add_paragraph()

    obs, verdict, status = findings(ds, e)
    heading(doc, "10. ຂໍ້ສັງເກດ ແລະ ຂໍ້ບ່ຽງເບນ (Observations & Deviations)")
    for t in obs: bullet(doc, t, 10)
    para(doc, "ເລກທີ Deviation / CAPA (ຖ້າມີ): " + BLANK, 10, space_after=6)
    heading(doc, "11. ສະຫຼຸບ ແລະ ຂໍ້ສະເໜີ (Conclusion & Recommendation)")
    para(doc, "ຂໍ້ສະເໜີຈາກການວິເຄາະຂໍ້ມູນ: " + verdict, 10.5)
    para(doc, "ການຕັດສິນສຸດທ້າຍ (Final decision – ໃຫ້ QA ໝາຍ):", 10.5, True, space_after=2)
    opts = ["ຜ່ານ – ອະນຸມັດໃຫ້ນຳໃຊ້ (PASS – Released for use)", "ຜ່ານແບບມີເງື່ອນໄຂ – ນຳໃຊ້ໄດ້ພາຍໃຕ້ CAPA (CONDITIONAL PASS)",
            "ບໍ່ຜ່ານ – ຫ້າມນຳໃຊ້ ຈົນກວ່າຈະແກ້ໄຂ ແລະ ທົດສອບຊ້ຳ (FAIL)", "ລໍຖ້າຂໍ້ມູນເພີ່ມ (PENDING – additional data required)"]
    for i, t in enumerate(opts):
        para(doc, ("☐  ") + t + ("   ← ຂໍ້ສະເໜີ" if i == status else ""), 10.5, i == status, space_after=1).paragraph_format.left_indent = Cm(0.6)
    para(doc, "", space_after=4)
    table(doc, ["", "ຊື່ / Name", "ລາຍເຊັນ / Signature", "ວັນທີ / Date"],
          [["ສະຫຼຸບໂດຍ (Engineering)", "", "", ""], ["ອະນຸມັດໂດຍ (QA)", "", "", ""]], [4.5, 5, 4.5, 3], 9.5)
    for row in doc.tables[-1].rows[1:]: row.height = Cm(1.3)
    heading(doc, "12. ເອກະສານແນບ (Attachments)")
    for t in [f"ເອກະສານແນບ 1: ຂໍ້ມູນດິບຈາກເຄື່ອງ – {ds['src']}",
              f"ເອກະສານແນບ 2: Excel workbook ຄຳນວນສະຖິຕິ – {ds['key']}_QC_LJ_Report.xlsx",
              "ເອກະສານແນບ 3: Levey-Jennings charts – LJ_Charts_QC.pdf",
              "ເອກະສານແນບ 4: ໃບຢັ້ງຢືນ IQ/OQ ແລະ Calibration certificate (ໃຫ້ແນບເພີ່ມ)",
              "ເອກະສານແນບ 5: Assay sheet ຂອງສານ QC (ໃຫ້ແນບເພີ່ມ)"]:
        bullet(doc, t, 10)
    heading(doc, "13. ປະຫວັດການແກ້ໄຂ (Revision History)")
    table(doc, ["Rev.", "ວັນທີ / Date", "ລາຍລະອຽດການແກ້ໄຂ / Description", "ຜູ້ແກ້ໄຂ / By"],
          [["01", REPORT_DATE, "ອອກເອກະສານຄັ້ງທຳອິດ (New issue)", ""]], [1.5, 3, 9.5, 3], 9.5, align_cols=(0, 1))

    base = os.path.join(OUT, f"{e['doc']}_{ds['key']}_PQ_Report")
    doc.save(base + ".docx")
    return base + ".docx"

files = [build(ds) for ds in qc_lj.datasets]
for f in files:
    subprocess.run(["soffice", "--headless", "--convert-to", "pdf", "--outdir", OUT, f], check=True,
                   stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    print("Saved", f, "+ .pdf")
