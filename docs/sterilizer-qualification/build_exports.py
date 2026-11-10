"""Build editable Word (.docx) and PDF exports of index.html.

Usage (from the repository root):
    python3 docs/sterilizer-qualification/build_exports.py

Requires: pandoc, python-docx, beautifulsoup4, and Node + Playwright (for the PDF).
"""
import copy
import pathlib
import subprocess
import sys
import tempfile

from bs4 import BeautifulSoup
from docx import Document
from docx.enum.section import WD_ORIENT  # noqa: F401  (kept for easy landscape switch)
from docx.enum.text import WD_BREAK
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.shared import Cm, Pt, RGBColor

HERE = pathlib.Path(__file__).resolve().parent
SRC = HERE / "index.html"
OUT_DOCX = HERE / "Steam-Sterilizer-PM-SOP-OQ-PQ.docx"
OUT_PDF = HERE / "Steam-Sterilizer-PM-SOP-OQ-PQ.pdf"

LAO_FONT = "Phetsarath OT"   # standard Lao font; Word substitutes if not installed
LATIN_FONT = "Arial"
BRAND = "0E6B57"
BRAND_SOFT = "DFEDE8"


def simplify_html(html: str) -> str:
    """Turn layout-only HTML (flow boxes, checkboxes, nav) into pandoc-friendly markup."""
    soup = BeautifulSoup(html, "html.parser")
    for el in soup.select("nav.toc, p.badge, style, link, script"):
        el.decompose()
    for box in soup.select("span.box"):
        box.replace_with("☐ ")
    # Flow diagrams -> a 3-column table (No. / Step / Description)
    for flow in soup.select("div.flow"):
        table = soup.new_tag("table")
        head = soup.new_tag("tr")
        for h in ("ລຳດັບ / No.", "ຂັ້ນຕອນ / Step", "ລາຍລະອຽດ / Description"):
            th = soup.new_tag("th")
            th.string = h
            head.append(th)
        table.append(head)
        for item in flow.find_all("div", recursive=False):
            n = item.find(class_="n")
            b = item.find("b")
            num = n.get_text(strip=True) if n else "◆"
            title = b.get_text(" ", strip=True) if b else ""
            if n:
                n.extract()
            if b:
                b.extract()
            desc = item.get_text(" ", strip=True)
            tr = soup.new_tag("tr")
            for i, val in enumerate((num, title, desc)):
                td = soup.new_tag("td")
                if i == 1:
                    strong = soup.new_tag("strong")
                    strong.string = val
                    td.append(strong)
                else:
                    td.string = val
                tr.append(td)
            table.append(tr)
        flow.replace_with(table)
    # Collapse wrapper divs so pandoc sees plain tables
    for div in soup.select("div.tbl, div.card"):
        div.unwrap()
    # Give each blank form cell a visible fill line in Word
    for td in soup.find_all("td"):
        if not td.get_text(strip=True) and not td.find(True):
            td.string = " "
    return str(soup)


def set_cell_shading(cell, fill):
    tcPr = cell._tc.get_or_add_tcPr()
    shd = OxmlElement("w:shd")
    shd.set(qn("w:val"), "clear")
    shd.set(qn("w:color"), "auto")
    shd.set(qn("w:fill"), fill)
    tcPr.append(shd)


def set_table_borders(table):
    tblPr = table._tbl.tblPr
    borders = OxmlElement("w:tblBorders")
    for edge in ("top", "left", "bottom", "right", "insideH", "insideV"):
        el = OxmlElement(f"w:{edge}")
        el.set(qn("w:val"), "single")
        el.set(qn("w:sz"), "4")
        el.set(qn("w:space"), "0")
        el.set(qn("w:color"), "8C8C8C")
        borders.append(el)
    for old in tblPr.findall(qn("w:tblBorders")):
        tblPr.remove(old)
    tblPr.append(borders)
    # full width
    tblW = tblPr.find(qn("w:tblW"))
    if tblW is None:
        tblW = OxmlElement("w:tblW")
        tblPr.append(tblW)
    tblW.set(qn("w:type"), "pct")
    tblW.set(qn("w:w"), "5000")


def set_run_fonts(run, size=None, bold=None, color=None):
    rPr = run._r.get_or_add_rPr()
    rFonts = rPr.find(qn("w:rFonts"))
    if rFonts is None:
        rFonts = OxmlElement("w:rFonts")
        rPr.insert(0, rFonts)
    rFonts.set(qn("w:ascii"), LATIN_FONT)
    rFonts.set(qn("w:hAnsi"), LATIN_FONT)
    rFonts.set(qn("w:cs"), LAO_FONT)
    rFonts.set(qn("w:eastAsia"), LAO_FONT)
    # Lao glyphs are rendered via the complex-script slot in Word; also hint by
    # giving the default ascii font for the Lao Unicode block.
    if size:
        run.font.size = Pt(size)
        szCs = OxmlElement("w:szCs")
        szCs.set(qn("w:val"), str(int(size * 2)))
        rPr.append(szCs)
    if bold is not None:
        run.font.bold = bold
        if bold:
            rPr.append(OxmlElement("w:bCs"))
    if color:
        run.font.color.rgb = RGBColor.from_string(color)


def style_fonts(doc):
    for style in doc.styles:
        try:
            rPr = style.element.get_or_add_rPr()
        except AttributeError:
            continue
        rFonts = rPr.find(qn("w:rFonts"))
        if rFonts is None:
            rFonts = OxmlElement("w:rFonts")
            rPr.insert(0, rFonts)
        for attr in ("ascii", "hAnsi"):
            rFonts.set(qn(f"w:{attr}"), LATIN_FONT)
        for attr in ("cs", "eastAsia"):
            rFonts.set(qn(f"w:{attr}"), LAO_FONT)
        for theme_attr in ("asciiTheme", "hAnsiTheme", "cstheme", "eastAsiaTheme"):
            rFonts.attrib.pop(qn(f"w:{theme_attr}"), None)
    sizes = {"Normal": 10, "Body Text": 10, "First Paragraph": 10, "Compact": 9.5,
             "Title": 18, "Heading 1": 16, "Heading 2": 14, "Heading 3": 12, "Heading 4": 11}
    by_name = {s.name.lower(): s for s in doc.styles if s.name}
    for name, size in sizes.items():
        st = by_name.get(name.lower())
        if st is not None:
            st.font.size = Pt(size)
            st.element.get_or_add_rPr()
            szCs = OxmlElement("w:szCs")
            szCs.set(qn("w:val"), str(int(size * 2)))
            st.element.rPr.append(szCs)
            if name.startswith("Heading") or name == "Title":
                st.font.color.rgb = RGBColor.from_string(BRAND)
                st.font.bold = True
                st.paragraph_format.keep_with_next = True
                st.paragraph_format.space_before = Pt(12)
                st.paragraph_format.space_after = Pt(6)
            else:
                st.paragraph_format.space_after = Pt(3)


def build_docx():
    html = simplify_html(SRC.read_text(encoding="utf-8"))
    with tempfile.TemporaryDirectory() as tmp:
        tmp_html = pathlib.Path(tmp) / "src.html"
        tmp_html.write_text(html, encoding="utf-8")
        raw = pathlib.Path(tmp) / "raw.docx"
        subprocess.run(["pandoc", str(tmp_html), "-f", "html", "-t", "docx",
                        "-o", str(raw)], check=True)
        doc = Document(str(raw))

    # Page setup: A4, 2 cm margins, footer with doc number
    for section in doc.sections:
        section.page_width, section.page_height = Cm(21), Cm(29.7)
        for side in ("left_margin", "right_margin"):
            setattr(section, side, Cm(1.8))
        section.top_margin = section.bottom_margin = Cm(1.8)
        fp = section.footer.paragraphs[0]
        fp.text = "VMP-ENG-STE-001 · Rev. 00 · Steam Sterilizer PM / SOP / OQ / PQ"
        for r in fp.runs:
            set_run_fonts(r, size=8, color="666666")

    style_fonts(doc)

    # Tables: borders, header shading, small font
    for table in doc.tables:
        set_table_borders(table)
        for row in table.rows:
            trPr = row._tr.trPr
            is_header_row = trPr is not None and trPr.find(qn("w:tblHeader")) is not None
            for cell in row.cells:
                if is_header_row:
                    set_cell_shading(cell, BRAND_SOFT)
                for p in cell.paragraphs:
                    p.paragraph_format.space_after = Pt(1)
                    for run in p.runs:
                        set_run_fonts(run, size=9)

    # Page break before every section heading after the first one (mirrors print layout)
    headings = [p for p in doc.paragraphs if p.style.name.lower() == "heading 2"]
    for p in headings[1:]:
        p.paragraph_format.page_break_before = True

    doc.core_properties.title = "Steam Sterilizer PM & Qualification"
    doc.core_properties.subject = "PM programme, SOP, roadmap, process overview, OQ/PQ forms"
    doc.save(str(OUT_DOCX))
    print("wrote", OUT_DOCX)


PDF_JS = r"""
const {chromium} = require('playwright');
(async () => {
  const [src, out] = process.argv.slice(2);
  const b = await chromium.launch();
  const p = await b.newPage();
  await p.emulateMedia({media: 'print', colorScheme: 'light'});
  await p.goto('file://' + src, {waitUntil: 'networkidle'});
  await p.evaluate(() => document.fonts.ready);
  await p.pdf({path: out, format: 'A4', printBackground: true,
    margin: {top: '16mm', bottom: '16mm', left: '14mm', right: '14mm'},
    displayHeaderFooter: true, headerTemplate: '<span></span>',
    footerTemplate: '<div style="font-size:8px;width:100%;text-align:center;color:#666">VMP-ENG-STE-001 · Rev. 00 · <span class="pageNumber"></span>/<span class="totalPages"></span></div>'});
  await b.close();
})();
"""


def build_pdf():
    with tempfile.TemporaryDirectory() as tmp:
        js = pathlib.Path(tmp) / "pdf.js"
        js.write_text(PDF_JS)
        subprocess.run(["node", str(js), str(SRC), str(OUT_PDF)], check=True)
    print("wrote", OUT_PDF)


if __name__ == "__main__":
    targets = sys.argv[1:] or ["docx", "pdf"]
    if "docx" in targets:
        build_docx()
    if "pdf" in targets:
        build_pdf()
