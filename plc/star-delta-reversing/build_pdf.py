"""
Builds report.html (Lao) with SVG ladder rungs, then prints it to
star_delta_ladder_review.pdf with Chromium:

    python3 build_pdf.py && NODE_PATH=$(npm root -g) node print_pdf.js

Requires the "Noto Sans Lao" font (Ubuntu package fonts-noto-core).
"""
from html import escape
from pathlib import Path

HERE = Path(__file__).parent
W = 700                 # rung drawing width
CW = 64                 # width of one contact cell
ROW = 54                # vertical distance between parallel branches
TOP = 34                # y of the first branch


# ---------------------------------------------------------------- ladder SVG
def contact(x, y, name, kind):
    """kind: '' = NO, 'NC' = normally closed, 'P' = rising edge."""
    s = [f'<line x1="{x}" y1="{y}" x2="{x+22}" y2="{y}" class="w"/>',
         f'<line x1="{x+22}" y1="{y-13}" x2="{x+22}" y2="{y+13}" class="b"/>',
         f'<line x1="{x+42}" y1="{y-13}" x2="{x+42}" y2="{y+13}" class="b"/>',
         f'<line x1="{x+42}" y1="{y}" x2="{x+CW}" y2="{y}" class="w"/>',
         f'<text x="{x+32}" y="{y-19}" class="lbl">{name}</text>']
    if kind == "NC":
        s.append(f'<line x1="{x+26}" y1="{y+11}" x2="{x+38}" y2="{y-11}" class="b"/>')
    if kind == "P":
        s.append(f'<path d="M{x+32} {y+8} V{y-8} M{x+27} {y-3} L{x+32} {y-9} L{x+37} {y-3}" class="arrow"/>')
    return s


def rung_svg(segments, out, changed=False):
    """segments: series list; each is a list of parallel branches; each branch a
    list of (name, kind).  out: ('coil', name, note) or ('timer', name, K, note)."""
    rows = max(len(seg) for seg in segments)
    h = TOP + (rows - 1) * ROW + (40 if out[0] == "timer" else 26)
    y0 = TOP
    s = [f'<svg viewBox="0 0 {W} {h}" width="100%" xmlns="http://www.w3.org/2000/svg">',
         f'<line x1="6" y1="4" x2="6" y2="{h-4}" class="rail"/>',
         f'<line x1="{W-6}" y1="4" x2="{W-6}" y2="{h-4}" class="rail"/>']
    x = 6
    for seg in segments:
        par = len(seg) > 1
        m = 10 if par else 0
        wseg = max(len(b) for b in seg) * CW + 2 * m
        for i, br in enumerate(seg):
            y = y0 + i * ROW
            s.append(f'<line x1="{x}" y1="{y}" x2="{x+m}" y2="{y}" class="w"/>')
            cx = x + m
            for name, kind in br:
                s += contact(cx, y, name, kind)
                cx += CW
            s.append(f'<line x1="{cx}" y1="{y}" x2="{x+wseg}" y2="{y}" class="w"/>')
        if par:
            yl = y0 + (len(seg) - 1) * ROW
            s.append(f'<line x1="{x}" y1="{y0}" x2="{x}" y2="{yl}" class="w"/>')
            s.append(f'<line x1="{x+wseg}" y1="{y0}" x2="{x+wseg}" y2="{yl}" class="w"/>')
        x += wseg
    if out[0] == "coil":
        cx = W - 118
        s += [f'<line x1="{x}" y1="{y0}" x2="{cx-14}" y2="{y0}" class="w"/>',
              f'<circle cx="{cx}" cy="{y0}" r="13" class="coil"/>',
              f'<line x1="{cx+14}" y1="{y0}" x2="{W-6}" y2="{y0}" class="w"/>',
              f'<text x="{cx+22}" y="{y0-8}" class="out">{out[1]}</text>',
              f'<text x="{cx+22}" y="{y0+17}" class="note">{out[2]}</text>']
    else:
        bx, bw = W - 170, 150
        s += [f'<line x1="{x}" y1="{y0}" x2="{bx}" y2="{y0}" class="w"/>',
              f'<rect x="{bx}" y="{y0-14}" width="{bw}" height="28" rx="5" class="tbox"/>',
              f'<text x="{bx+bw/2}" y="{y0+5}" class="tlbl">{out[1]}  {out[2]}</text>',
              f'<line x1="{bx+bw}" y1="{y0}" x2="{W-6}" y2="{y0}" class="w"/>',
              f'<text x="{bx+bw/2}" y="{y0+30}" class="note">{out[3]}</text>']
    s.append("</svg>")
    return "".join(s)


NO, NC, P = "", "NC", "P"
c = lambda *pairs: [list(pairs)]           # one-branch segment helper

RUNGS = [
    (0, "ຍັດສະຖານະ M0 — Start ແບບຂອບຂາຂຶ້ນ, ຢຸດເມື່ອ Stop / OL / T7 ຄົບ 3600 s",
     [[[("X0", P)], [("M0", NO)]], c(("X1", NO), ("X2", NO), ("T7", NC))],
     ("coil", "M0", "System Run"), "edit"),
    (1, "ເວລາລວມຊ່ວງທີ 1 (1800 s)",
     [c(("M0", NO))], ("timer", "T3", "K18000", "1800 s"), "edit"),
    (2, "ເວລາລວມຊ່ວງທີ 2 — cascade ຕໍ່ຈາກ T3 ⇒ ລວມ 3600 s",
     [c(("T3", NO))], ("timer", "T7", "K18000", "+1800 s = 3600 s"), "new"),
    (3, "ຄາບໝູນໜ້າ",
     [c(("M0", NO), ("M2", NC), ("T2", NC))], ("coil", "M1", "Forward Period"), ""),
    (4, "ເວລາຄາບໝູນໜ້າ",
     [c(("M1", NO))], ("timer", "T1", "K1800", "180 s"), ""),
    (5, "ຄາບໝູນຫຼັງ — ແກ້ deadlock ແລະ ເພີ່ມ M0 ໃຫ້ Stop/OL ຕັດໄດ້ທັນທີ",
     [[[("T1", NO)], [("M2", NO)]], c(("M0", NO), ("T2", NC))],
     ("coil", "M2", "Reverse Period"), "edit"),
    (6, "ເວລາຄາບໝູນຫຼັງ",
     [c(("M2", NO))], ("timer", "T2", "K1800", "180 s"), ""),
    (7, "Dead time ກ່ອນໝູນໜ້າ",
     [c(("M1", NO))], ("timer", "T4", "K50", "5 s"), ""),
    (8, "Dead time ກ່ອນໝູນຫຼັງ",
     [c(("M2", NO))], ("timer", "T5", "K50", "5 s"), ""),
    (9, "ໜ້າຕ່າງຈ່າຍໄຟ (ຫຼັງໝົດ dead time)",
     [[[("M1", NO), ("T4", NO)], [("M2", NO), ("T5", NO)]]],
     ("coil", "M3", "Power Window"), ""),
    (10, "ເວລາ Star",
     [c(("M3", NO))], ("timer", "T0", "K100", "10 s"), ""),
    (11, "ພັກປ່ຽນ Star → Delta",
     [c(("M3", NO), ("T0", NO))], ("timer", "T6", "K10", "1 s"), ""),
    (12, "Main contactor",
     [c(("M3", NO))], ("coil", "Y0", "KM"), ""),
    (13, "Forward contactor + interlock",
     [c(("M1", NO), ("T4", NO), ("Y2", NC))], ("coil", "Y1", "KMF"), ""),
    (14, "Reverse contactor + interlock",
     [c(("M2", NO), ("T5", NO), ("Y1", NC))], ("coil", "Y2", "KMR"), ""),
    (15, "Star contactor + interlock",
     [c(("M3", NO), ("T0", NC), ("Y4", NC))], ("coil", "Y3", "KM★"), ""),
    (16, "Delta contactor + interlock",
     [c(("M3", NO), ("T0", NO), ("T6", NO), ("Y3", NC))], ("coil", "Y4", "KMΔ"), ""),
]

ORIGINAL_RUNG4 = rung_svg(
    [[[("T1", NO), ("M1", NC)], [("M2", NO), ("M1", NC), ("T2", NC)]]],
    ("coil", "M2", "Reverse Period"))


def rung_block(num, desc, segs, out, tag):
    badge = {"edit": '<span class="tag edit">ແກ້ໄຂ</span>',
             "new": '<span class="tag new">ໃໝ່</span>'}.get(tag, "")
    return (f'<div class="rung {tag}"><div class="rh"><span class="rn">{num}</span>'
            f'<span class="rd">{escape(desc)}</span>{badge}</div>{rung_svg(segs, out)}</div>')


# ------------------------------------------------------------ instruction list
IL = """LDP X0|OR M0|AND X1|AND X2|ANI T7|OUT M0|LD M0|OUT T3 K18000|LD T3|OUT T7 K18000|
LD M0|ANI M2|ANI T2|OUT M1|LD M1|OUT T1 K1800|LD T1|OR M2|AND M0|ANI T2|OUT M2|
LD M2|OUT T2 K1800|LD M1|OUT T4 K50|LD M2|OUT T5 K50|LD M1|AND T4|LD M2|AND T5|ORB|OUT M3|
LD M3|OUT T0 K100|LD M3|AND T0|OUT T6 K10|LD M3|OUT Y0|LD M1|AND T4|ANI Y2|OUT Y1|
LD M2|AND T5|ANI Y1|OUT Y2|LD M3|ANI T0|ANI Y4|OUT Y3|LD M3|AND T0|AND T6|ANI Y3|OUT Y4|END"""
CHANGED_STEPS = {0, 4, 7, 8, 9, 17, 18, 19}   # instructions that differ from the original


def il_html():
    ins = [i.strip() for i in IL.replace("\n", "").split("|")]
    cells = []
    for n, i in enumerate(ins):
        op, _, arg = i.partition(" ")
        cls = ' class="chg"' if n in CHANGED_STEPS else ""
        cells.append(f"<tr{cls}><td class='n'>{n:02d}</td><td class='op'>{op}</td><td>{arg}</td></tr>")
    k = (len(cells) + 2) // 3
    cols = [cells[i:i + k] for i in range(0, len(cells), k)]
    return "".join(f'<table class="il">{"".join(col)}</table>' for col in cols)


# ------------------------------------------------------------------- the page
CSS = """
@page { size: A4; margin: 14mm 13mm 16mm; }
:root { --navy:#1f3a5f; --ink:#1d2733; --mute:#5b6b7d; --line:#cfd9e4; --soft:#f2f6fa;
        --red:#b42318; --redbg:#fdecea; --amber:#b54708; --amberbg:#fef4e6;
        --green:#067647; --greenbg:#e8f6ee; --blue:#2e6fb0; }
* { box-sizing: border-box; }
body { font-family: "Noto Sans Lao", "Noto Sans", sans-serif; color: var(--ink);
       font-size: 10.2pt; line-height: 1.62; margin: 0; background: #fff; }
code, .mono, .il, .lbl, .out, .tlbl { font-family: "Noto Sans Mono", "DejaVu Sans Mono", monospace; }
h1 { font-size: 21pt; line-height: 1.3; margin: 6px 0 4px; color: var(--navy); }
h2 { font-size: 13.5pt; color: var(--navy); margin: 22px 0 8px; padding-bottom: 4px;
     border-bottom: 2px solid var(--navy); break-after: avoid; }
h2 .num { display:inline-block; background: var(--navy); color:#fff; border-radius: 4px;
          padding: 0 8px; margin-right: 8px; font-size: 11pt; }
h3 { font-size: 11pt; margin: 14px 0 6px; color: var(--navy); break-after: avoid; }
p { margin: 5px 0; }
.kicker { letter-spacing: .28em; font-size: 8pt; color: var(--mute); font-weight: 700; }
.cover { border: 1.5px solid var(--navy); border-radius: 10px; padding: 16px 20px 14px;
         background: linear-gradient(180deg, var(--soft), #fff); }
.meta { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin-top: 12px; }
.meta div { background: #fff; border: 1px solid var(--line); border-radius: 6px; padding: 6px 9px; }
.meta b { display: block; font-size: 7.6pt; color: var(--mute); letter-spacing: .06em; }
.meta span { font-size: 9.6pt; font-weight: 600; }
.verdict { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin: 12px 0 4px; }
.vbox { border-radius: 8px; padding: 10px 14px; border-left: 5px solid; }
.vbox.bad { background: var(--redbg); border-color: var(--red); }
.vbox.good { background: var(--greenbg); border-color: var(--green); }
.vbox .t { font-weight: 700; font-size: 10.6pt; }
.vbox.bad .t { color: var(--red); } .vbox.good .t { color: var(--green); }
table.grid { width: 100%; border-collapse: collapse; margin: 6px 0; font-size: 9.2pt; }
table.grid th { background: var(--navy); color: #fff; text-align: left; padding: 5px 8px; font-weight: 600; }
table.grid td { border-bottom: 1px solid var(--line); padding: 5px 8px; vertical-align: top; }
table.grid tr { break-inside: avoid; }
table.grid tr:nth-child(even) td { background: #fafcfe; }
.sev { font-weight: 700; white-space: nowrap; border-radius: 4px; padding: 1px 7px; font-size: 8.4pt; }
.sev.r { background: var(--redbg); color: var(--red); }
.sev.a { background: var(--amberbg); color: var(--amber); }
.ok { color: var(--green); font-weight: 700; }
.note-box { border: 1px solid var(--line); border-left: 4px solid var(--blue); border-radius: 6px;
            padding: 8px 12px; background: var(--soft); margin: 10px 0; break-inside: avoid; }
.warn-box { border: 1px solid #f3d3a5; border-left: 4px solid var(--amber); border-radius: 6px;
            padding: 8px 12px; background: var(--amberbg); margin: 10px 0; break-inside: avoid; }
.cmp { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; break-inside: avoid; }
.cmp .col { border: 1px solid var(--line); border-radius: 8px; padding: 6px 8px 2px; }
.cmp .col.bad { border-color: #f1b5ae; background: #fffafa; }
.cmp .col.good { border-color: #a6dcbc; background: #fbfefc; }
.cmp .h { font-weight: 700; font-size: 9.2pt; }
.cmp .bad .h { color: var(--red); } .cmp .good .h { color: var(--green); }
.rung { border: 1px solid var(--line); border-radius: 7px; padding: 4px 8px 0; margin: 6px 0;
        break-inside: avoid; background: #fff; }
.rung.edit { border-color: #f0b35f; background: #fffbf3; }
.rung.new { border-color: #7cc79b; background: #f6fcf8; }
.rh { display: flex; align-items: center; gap: 8px; font-size: 8.8pt; }
.rn { font-family: "Noto Sans Mono", monospace; font-weight: 700; color: #fff; background: var(--navy);
      border-radius: 4px; min-width: 26px; text-align: center; font-size: 8.4pt; }
.rd { color: var(--mute); }
.tag { margin-left: auto; font-size: 7.8pt; font-weight: 700; border-radius: 10px; padding: 0 9px; }
.tag.edit { background: #fde7c4; color: var(--amber); }
.tag.new { background: #cdeeda; color: var(--green); }
svg .w { stroke: var(--navy); stroke-width: 2; }
svg .b { stroke: var(--navy); stroke-width: 2.6; }
svg .rail { stroke: var(--navy); stroke-width: 4; }
svg .coil { fill: #fff; stroke: var(--navy); stroke-width: 2.4; }
svg .tbox { fill: #eef3f9; stroke: var(--navy); stroke-width: 1.8; }
svg .arrow { fill: none; stroke: var(--amber); stroke-width: 2; }
svg text { fill: var(--ink); }
svg .lbl { font-size: 12.5px; font-weight: 700; text-anchor: middle; }
svg .out { font-size: 13px; font-weight: 700; }
svg .tlbl { font-size: 12.5px; font-weight: 700; text-anchor: middle; fill: var(--navy); }
svg .note { font-size: 10.5px; fill: var(--mute); font-family: "Noto Sans Lao", "Noto Sans", sans-serif; }
svg text.note { text-anchor: start; }
.legend { display: flex; flex-wrap: wrap; gap: 14px; font-size: 8.6pt; color: var(--mute); margin: 4px 0 6px; }
.legend code { color: var(--ink); font-weight: 700; }
.ilwrap { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; break-inside: avoid; }
table.il { border-collapse: collapse; width: 100%; font-size: 9pt; border: 1px solid var(--line); }
table.il td { padding: 1.5px 8px; border-bottom: 1px solid #eef2f6; }
table.il td.n { color: #9aa7b5; width: 30px; }
table.il td.op { font-weight: 700; color: var(--navy); width: 44px; }
table.il tr.chg td { background: #fde7c4; }
.seq td:nth-child(2) { font-family: "Noto Sans Mono", monospace; font-weight: 700; }
.pill { display:inline-block; font-family: "Noto Sans Mono", monospace; font-size: 8.4pt; font-weight:700;
        border-radius: 4px; padding: 0 5px; margin-right: 2px; background:#e6eef7; color: var(--navy); }
.pill.star { background:#fde7c4; color: var(--amber); } .pill.delta { background:#cdeeda; color: var(--green); }
ol.req li, ul.req li { margin: 3px 0; }
.pb { break-before: page; }
.foot { margin-top: 18px; padding-top: 8px; border-top: 1px solid var(--line); font-size: 8.4pt; color: var(--mute); }
"""


def seq_row(t, outs, state):
    def pill(o):
        cls = " star" if o == "Y3" else " delta" if o == "Y4" else ""
        return f'<span class="pill{cls}">{o}</span>'
    return f"<tr><td>{t}</td><td>{''.join(pill(o) for o in outs) or '—'}</td><td>{state}</td></tr>"


def build():
    rungs = "".join(rung_block(*r) for r in RUNGS)
    seq = "".join([
        seq_row("0 – 5", [], "Dead time ຫຼັງກົດ Start (ມໍເຕີຢຸດ)"),
        seq_row("5 – 15", ["Y0", "Y1", "Y3"], "ໝູນໜ້າແບບ Star"),
        seq_row("15 – 16", ["Y0", "Y1"], "ພັກປ່ຽນ Star → Delta"),
        seq_row("16 – 180", ["Y0", "Y1", "Y4"], "ໝູນໜ້າແບບ Delta"),
        seq_row("180 – 185", [], "Dead time ກ່ອນປີ້ນທິດ"),
        seq_row("185 – 195", ["Y0", "Y2", "Y3"], "ໝູນຫຼັງແບບ Star"),
        seq_row("195 – 196", ["Y0", "Y2"], "ພັກປ່ຽນ Star → Delta"),
        seq_row("196 – 360", ["Y0", "Y2", "Y4"], "ໝູນຫຼັງແບບ Delta"),
        seq_row("360 – 3600", ["…"], "ວົນຊ້ຳ ລວມ 10 ຮອບ (ໜ້າ 10 + ຫຼັງ 10 ຄາບ)"),
        seq_row("3600", [], "<b>T7 ຄົບ → M0 ດັບ → ຢຸດອັດຕະໂນມັດ</b>"),
    ])
    html = f"""<!doctype html><html lang="lo"><head><meta charset="utf-8">
<title>ກວດສອບ ແລະ ແກ້ໄຂ Ladder Star/Delta</title><style>{CSS}</style></head><body>

<div class="cover">
  <div class="kicker">PLC LADDER REVIEW · MITSUBISHI FX SERIES</div>
  <h1>ລາຍງານກວດສອບ ແລະ ແກ້ໄຂ<br>ວົງຈອນ Ladder Star / Delta ສະຫຼັບໜ້າ–ຫຼັງ</h1>
  <p style="color:var(--mute);margin:0">ໝູນໜ້າ 180 s ↔ ໝູນຫຼັງ 180 s · Star 10 s · Dead time 5 s / 1 s · ຢຸດອັດຕະໂນມັດເມື່ອຄົບ 3600 s</p>
  <div class="meta">
    <div><b>ເອກະສານທີ່ກວດ</b><span>star_delta_ladder_mitsubishi_fx.pdf (13.09.2026)</span></div>
    <div><b>PLC / ໂປຣແກຣມ</b><span>Mitsubishi FX · GX Works2</span></div>
    <div><b>ວິທີກວດ</b><span>ກວດ logic + ຈຳລອງ scan cycle</span></div>
    <div><b>ວັນທີ</b><span>25 ກັນຍາ 2026</span></div>
  </div>
</div>

<div class="verdict">
  <div class="vbox bad"><div class="t">✗ ສະບັບເດີມ — ນຳໃຊ້ຈິງບໍ່ໄດ້</div>
    ພົບຂໍ້ຜິດພາດຮ້າຍແຮງ 3 ຈຸດ: ໂຫຼດເຂົ້າ PLC ບໍ່ໄດ້, ມໍເຕີບໍ່ປີ້ນທິດ ແລະ ມີຄວາມສ່ຽງທີ່ Stop ຈະບໍ່ຢຸດມໍເຕີ</div>
  <div class="vbox good"><div class="t">✓ ສະບັບແກ້ໄຂ — ຜ່ານການຈຳລອງ</div>
    ສະຫຼັບໜ້າ 10 + ຫຼັງ 10 ຄາບ ຢຸດທີ່ 3600 s, ບໍ່ມີ output ຂັດກັນຕິດພ້ອມກັນ ແລະ Stop ຕັດທັນທີ</div>
</div>

<h2><span class="num">1</span>ສະຫຼຸບຂໍ້ຜິດພາດທີ່ພົບ</h2>
<table class="grid">
<tr><th style="width:4%">#</th><th style="width:15%">ຈຸດ</th><th>ບັນຫາ</th><th style="width:30%">ຜົນກະທົບ</th><th style="width:11%">ລະດັບ</th></tr>
<tr><td>1</td><td class="mono">Rung 1<br>T3 K36000</td>
<td>Timer 16-bit ຂອງ FX ຮັບຄ່າໄດ້ສູງສຸດ <b>K32767</b> (3276.7 s). ເອກະສານພາກ 5 ຂຽນຂັດກັນເອງ: ບອກວ່າສູງສຸດ 32767 ແຕ່ “ຮອງຮັບ K36000 ໄດ້ສະບາຍ”</td>
<td>GX Works2 ບໍ່ຍອມຮັບຄ່ານີ້, <b>ໂຫຼດໂປຣແກຣມເຂົ້າ PLC ບໍ່ໄດ້</b></td><td><span class="sev r">ຮ້າຍແຮງ</span></td></tr>
<tr><td>2</td><td class="mono">Rung 4<br>coil M2</td>
<td>ທັງສອງສາຍມີ <code>/M1</code> ຕໍ່ອະນຸກົມ. ຕອນ T1 ຄົບ, M1 ຍັງ ON ຢູ່ ຈຶ່ງເຮັດໃຫ້ M2 ຕິດບໍ່ໄດ້. ສ່ວນ M1 ຈະດັບກໍ່ຕໍ່ເມື່ອ M2 ຕິດ ⇒ <b>Deadlock</b></td>
<td>ມໍເຕີ <b>ໝູນໜ້າຢ່າງດຽວ ບໍ່ປີ້ນທິດເລີຍ</b> (ຈຳລອງ: Y0 Y1 Y4 ຄ້າງ ON ຕັ້ງແຕ່ 17 s ເປັນຕົ້ນໄປ)</td><td><span class="sev r">ຮ້າຍແຮງ</span></td></tr>
<tr><td>3</td><td class="mono">Rung 4<br>coil M2</td>
<td>ບໍ່ມີ <code>M0</code> ຕໍ່ອະນຸກົມ, ສະນັ້ນ M2 ຍັດຕົວເອງໄດ້ໂດຍບໍ່ຂຶ້ນກັບ M0. ບັນຫານີ້ຈະສະແດງອອກທັນທີ ເມື່ອແກ້ຂໍ້ 2 ແລ້ວ</td>
<td>ຖ້າກົດ <b>Stop ຫຼື Overload ຕັດ ໃນຊ່ວງໝູນຫຼັງ ມໍເຕີຈະບໍ່ຢຸດ</b> (ຈຳລອງ: ກົດ Stop ຕອນ 281 s ແຕ່ຢຸດແທ້ 361 s, ຊ້າ 80 s)</td><td><span class="sev r">ຮ້າຍແຮງ<br>(Safety)</span></td></tr>
<tr><td>4</td><td class="mono">Rung 0<br>X0</td>
<td>ໃຊ້ຕິດຕໍ່ Start ແບບລະດັບ (level)</td>
<td>ປຸ່ມ Start ຄ້າງ ຫຼື ຕິດກົບ ⇒ ລະບົບເລີ່ມເອງຄືນຫຼັງຢຸດຄົບ 3600 s</td><td><span class="sev a">ຄວນແກ້</span></td></tr>
</table>

<div class="note-box"><b>ສ່ວນທີ່ຖືກຕ້ອງແລ້ວ ບໍ່ຕ້ອງແກ້:</b>
ຕິດຕໍ່ X1/X2 ແບບ NO ສຳລັບອຸປະກອນຕໍ່ NC (fail-safe), dead time T4/T5 ແຍກຕາມທິດ,
ລຳດັບ Star → ພັກ 1 s → Delta (T0/T6), interlock Y1/Y2 ແລະ Y3/Y4 ໃນໂປຣແກຣມ ແລະ ຄ່າ K ຂອງ timer ອື່ນໆທັງໝົດ</div>

<h3>ລາຍລະອຽດຂໍ້ 2 ແລະ 3: Rung ຂອງ coil M2</h3>
<div class="cmp">
  <div class="col bad"><div class="h">✗ ເດີມ: (T1·/M1) + (M2·/M1·/T2)</div>{ORIGINAL_RUNG4}
  <p style="font-size:8.6pt;color:var(--mute)">ຕອນ T1 ຄົບ, M1 ຍັງ ON ⇒ /M1 ເປີດ ⇒ M2 ຕິດບໍ່ໄດ້. ແລະ ບໍ່ມີ M0 ໃຫ້ Stop ຕັດ</p></div>
  <div class="col good"><div class="h">✓ ແກ້: M0 · (T1 + M2) · /T2</div>{rung_svg(RUNGS[5][2], RUNGS[5][3])}
  <p style="font-size:8.6pt;color:var(--mute)">T1 ຄົບ ⇒ M2 ຕິດ ⇒ ຍັດຕົວເອງ ⇒ M1 ດັບ (Rung 3) ⇒ T2 ຄົບ ⇒ M2 ດັບ ⇒ M1 ຕິດຄືນ</p></div>
</div>

<h2><span class="num">2</span>ລາຍການແກ້ໄຂ</h2>
<table class="grid">
<tr><th style="width:12%">Rung (ໃໝ່)</th><th style="width:25%">ເດີມ</th><th style="width:29%">ແກ້ເປັນ</th><th>ເຫດຜົນ</th></tr>
<tr><td>0</td><td class="mono">LD X0 … ANI T3</td><td class="mono"><b>LDP X0</b> … <b>ANI T7</b></td><td>Start ແບບຂອບຂາຂຶ້ນ, ໃຊ້ T7 ເປັນຕົວຢຸດລວມ</td></tr>
<tr><td>1 – 2</td><td class="mono">T3 K36000</td><td class="mono">T3 K18000 + <b>T7 K18000</b></td><td>1800 + 1800 = 3600 s ພໍດີ, ຢູ່ໃນຂອບເຂດ K32767</td></tr>
<tr><td>5</td><td class="mono">(T1·/M1)+(M2·/M1·/T2)</td><td class="mono"><b>M0·(T1+M2)·/T2</b></td><td>ແກ້ deadlock ແລະ ໃຫ້ Stop/OL ຕັດ M2 ທັນທີ</td></tr>
</table>
<p>ໃຊ້ timer ເພີ່ມ 1 ຕົວ (<b>T7</b>) ແລະ ໃສ່ເລກ rung ໃໝ່ເປັນ 0–16. ສ່ວນ Rung ອື່ນໆ, I/O ແລະ ການຕໍ່ສາຍ <b>ຄືເກົ່າທັງໝົດ</b>.</p>

<table class="grid">
<tr><th style="width:12%">ອຸປະກອນ</th><th style="width:18%">ຄ່າຕັ້ງ</th><th>ໜ້າທີ່</th><th style="width:16%">ສະຖານະ</th></tr>
<tr><td class="mono">X0 / X1 / X2</td><td>—</td><td>Start (NO) / Stop (NC) / Overload (NC)</td><td>ຄືເກົ່າ</td></tr>
<tr><td class="mono">Y0 – Y4</td><td>—</td><td>KM · KMF · KMR · KM★ · KMΔ</td><td>ຄືເກົ່າ</td></tr>
<tr><td class="mono">M0 – M3</td><td>—</td><td>System Run / Forward / Reverse / Power Window</td><td>ຄືເກົ່າ</td></tr>
<tr><td class="mono">T0 · T6</td><td class="mono">K100 · K10</td><td>Star 10 s · ພັກ Star→Delta 1 s</td><td>ຄືເກົ່າ</td></tr>
<tr><td class="mono">T1 · T2</td><td class="mono">K1800</td><td>ຄາບໝູນໜ້າ / ຫຼັງ 180 s</td><td>ຄືເກົ່າ</td></tr>
<tr><td class="mono">T4 · T5</td><td class="mono">K50</td><td>Dead time 5 s ກ່ອນເລີ່ມແຕ່ລະທິດ</td><td>ຄືເກົ່າ</td></tr>
<tr><td class="mono">T3</td><td class="mono"><b>K18000</b></td><td>ເວລາລວມຊ່ວງທີ 1 (1800 s)</td><td><span class="sev a">ປ່ຽນຄ່າ</span></td></tr>
<tr><td class="mono">T7</td><td class="mono"><b>K18000</b></td><td>ເວລາລວມຊ່ວງທີ 2 (cascade ⇒ 3600 s)</td><td><span class="sev" style="background:#cdeeda;color:var(--green)">ເພີ່ມໃໝ່</span></td></tr>
</table>

<h2><span class="num">3</span>ແຜນວາດ Ladder ສະບັບແກ້ໄຂ (17 rungs)</h2>
<div class="legend">
  <span><code>─┤ ├─</code> NO</span><span><code>─┤/├─</code> NC</span>
  <span><code>─┤↑├─</code> ຂອບຂາຂຶ້ນ (LDP)</span><span><code>─( )─</code> Coil</span>
  <span><code>[T K]</code> Timer 100 ms</span>
  <span><span class="tag edit">ແກ້ໄຂ</span> rung ທີ່ແກ້</span><span><span class="tag new">ໃໝ່</span> rung ທີ່ເພີ່ມ</span>
</div>
{rungs}
<div class="rung"><div class="rh"><span class="rn">—</span><span class="rd">ຈົບໂປຣແກຣມ</span></div>
<svg viewBox="0 0 {W} 40" width="100%"><line x1="6" y1="4" x2="6" y2="36" class="rail"/>
<line x1="6" y1="20" x2="{W-170}" y2="20" class="w"/><rect x="{W-170}" y="6" width="150" height="28" rx="5" class="tbox"/>
<text x="{W-95}" y="25" class="tlbl">END</text><line x1="{W-20}" y1="20" x2="{W-6}" y2="20" class="w"/>
<line x1="{W-6}" y1="4" x2="{W-6}" y2="36" class="rail"/></svg></div>

<h2 class="pb"><span class="num">4</span>Instruction List — ພິມເຂົ້າ GX Works2 / GX Developer ໄດ້ໂດຍກົງ</h2>
<p style="font-size:8.8pt;color:var(--mute)">ແຖວສີສົ້ມ = ຄຳສັ່ງທີ່ຕ່າງຈາກສະບັບເດີມ. ຄຳສັ່ງ <code>LDP</code> ໃຊ້ໄດ້ກັບ FX1S / FX1N / FX2N / FX3 / FX5. ຖ້າເປັນລຸ່ນ FX0/FX0N ໃຫ້ໃຊ້ <code>PLS M10</code> ແທນ.</p>
<div class="ilwrap">{il_html()}</div>

<h2><span class="num">5</span>ຜົນການຈຳລອງສະບັບແກ້ໄຂ</h2>
<p>ຈຳລອງດ້ວຍ <code>simulate.py</code>: ແກ້ທຸກ rung ຈາກເທິງລົງລຸ່ມທຸກ scan (10 ms), timer 100 ms ຣີເຊັດທັນທີເມື່ອ coil ດັບ ຄືກັບ FX ຈິງ. ເວລານັບຈາກກົດ Start.</p>
<table class="grid seq">
<tr><th style="width:16%">ເວລາ (s)</th><th style="width:28%">Output ON</th><th>ສະຖານະ</th></tr>{seq}
</table>
<table class="grid">
<tr><th>ລາຍການທົດສອບ</th><th style="width:40%">ຜົນ</th></tr>
<tr><td>ຈຳນວນຄາບໝູນໜ້າ / ໝູນຫຼັງ</td><td class="ok">10 / 10 ✓</td></tr>
<tr><td>ຢຸດອັດຕະໂນມັດ</td><td class="ok">3600 s ✓</td></tr>
<tr><td>Y1 + Y2 (KMF + KMR) ຕິດພ້ອມກັນ</td><td class="ok">ບໍ່ເຄີຍເກີດ ✓</td></tr>
<tr><td>Y3 + Y4 (KM★ + KMΔ) ຕິດພ້ອມກັນ</td><td class="ok">ບໍ່ເຄີຍເກີດ ✓</td></tr>
<tr><td>ກົດ Stop ຕອນ 281 s (ໃນຊ່ວງໝູນຫຼັງ Delta)</td><td class="ok">Output ທັງໝົດດັບໃນ scan ດຽວກັນ ✓</td></tr>
<tr><td>ສະບັບເດີມ (ປຽບທຽບ)</td><td style="color:var(--red);font-weight:700">ບໍ່ປີ້ນທິດ ✗ · Stop ຊ້າ 80 s ✗</td></tr>
</table>

<h2><span class="num">6</span>ຈຸດທີ່ຕ້ອງຢືນຢັນກັບ URS</h2>
<div class="warn-box">ການອອກແບບນີ້ນັບ <b>180 s ລວມ dead time 5 s ແລ້ວ</b>, ສະນັ້ນມໍເຕີໝູນຈິງພຽງ <b>175 s ຕໍ່ທິດ</b>.
ຖ້າ URS ຕ້ອງການໃຫ້ “ມໍເຕີໝູນຈິງ 180 s”, ໃຫ້ຕັ້ງ T1 = T2 = <b>K1850</b>. ເມື່ອປັບແລ້ວ 20 ຄາບຈະໃຊ້ເວລາ 3700 s; ຖ້າຍັງຢຸດທີ່ 3600 s ຄາບສຸດທ້າຍຈະຖືກຕັດໃຫ້ສັ້ນລົງ.
ຄວນຕົກລົງເລື່ອງນີ້ໃຫ້ຊັດເຈນກ່ອນເຮັດ FAT / OQ.</div>

<h2><span class="num">7</span>ສິ່ງທີ່ຕ້ອງມີເພີ່ມ ຈຶ່ງນຳໃຊ້ຈິງໄດ້ (ຢູ່ນອກ Ladder)</h2>
<ol class="req">
<li><b>Emergency Stop ແບບ hardwired</b> ຜ່ານ safety relay ທີ່ຕັດໄຟ coil ຂອງ contactor ໂດຍກົງ ບໍ່ຜ່ານ PLC (IEC 60204-1). ເອກະສານເດີມບໍ່ມີ E-stop ເລີຍ</li>
<li><b>ຕິດຕໍ່ NC ຂອງ Overload (95-96)</b> ຕໍ່ອະນຸກົມໃນວົງຈອນ coil ຂອງ contactor ທັງໝົດ ເພີ່ມຈາກ input X2</li>
<li><b>Interlock ທາງກົນຈັກ + aux NC</b> ລະຫວ່າງ KMF ↔ KMR ແລະ KM★ ↔ KMΔ</li>
<li><b>ກວດຈຳນວນຄັ້ງເລີ່ມຕໍ່ຊົ່ວໂມງ:</b> ໂປຣແກຣມນີ້ເລີ່ມມໍເຕີ 20 ຄັ້ງ/ຊົ່ວໂມງ. ຕ້ອງກວດກັບ datasheet ຂອງມໍເຕີ ແລະ ເລືອກ contactor (AC-3) ໃຫ້ຮອງຮັບ</li>
<li><b>(ແນະນຳ)</b> ໃຫ້ KM★ ປິດກ່ອນ KM/KMF ປະມານ 0.1–0.3 s ເພື່ອໃຫ້ star contactor ປິດໂດຍບໍ່ມີກະແສ ຊ່ວຍຍືດອາຍຸໜ້າສຳຜັດ</li>
<li><b>ທົດສອບຕາມລຳດັບ:</b> ທົດສອບໂດຍບໍ່ຕໍ່ມໍເຕີ (Monitor mode) → ທົດສອບບໍ່ມີໂຫຼດ → ທົດສອບໂຫຼດເຕັມ.
ທຸກຂັ້ນຕ້ອງທົດສອບ Stop / OL / E-stop ໃນ <b>ທຸກຊ່ວງ</b> (Star, ພັກ, Delta, ໜ້າ, ຫຼັງ) ແລະ ບັນທຶກຜົນໃນ protocol</li>
</ol>

<div class="foot">ເອກະສານນີ້ສ້າງຈາກ <code>plc/star-delta-reversing/build_pdf.py</code>. ຜົນການຈຳລອງກວດສອບຄືນໄດ້ດ້ວຍ <code>python3 simulate.py</code>.
ໂປຣແກຣມທີ່ແກ້ໄຂແລ້ວຍັງຕ້ອງຜ່ານການທົດສອບຢູ່ໜ້າງານ (FAT/SAT) ກ່ອນນຳໃຊ້ຈິງ.</div>
</body></html>"""
    (HERE / "report.html").write_text(html, encoding="utf-8")


if __name__ == "__main__":
    build()
    print("wrote", HERE / "report.html")
