const ASC = [2,3,4,5,6,7,8,9,10,11,12];
const shuffled = a => { a = [...a]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const ROWS = [
  { band: "#d43c48", track: "#8e252d", cell: "#fbdfe5", num: "#d43c48", lockFill: "#fff7f8", nums: ASC },
  { band: "#fce045", track: "#d5954c", cell: "#fdfbf3", num: "#f7d52c", lockFill: "#fdfbf3", nums: ASC },
  { band: "#3b9b58", track: "#1d7738", cell: "#ebf3ee", num: "#3b9b58", lockFill: "#ffffff", nums: [...ASC].reverse() },
  { band: "#35478d", track: "#2b335e", cell: "#e3e1f1", num: "#35478d", lockFill: "#ffffff", nums: [...ASC].reverse() },
];
const SCORE_COLORS = ["#d43c48", "#fce045", "#3b9b58", "#35478d", "#a7a9b3"];
const pts = n => n * (n + 1) / 2;

const sheet = document.getElementById("sheet");
function el(tag, cls, box, style = {}, html = "") {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  const [l, t, w, h] = box;
  Object.assign(e.style, { left: l + "em", top: t + "em", width: w + "em", height: h + "em" }, style);
  e.innerHTML = html;
  sheet.appendChild(e);
  return e;
}
const lockSvg = c => `<svg viewBox="0 0 24 24" aria-hidden="true"><g transform="rotate(-18 12 13)">
    <path d="M7.2 10.5V7.2a4.4 4.4 0 0 1 8.4-1.9" fill="none" stroke="${c}" stroke-width="2.6" stroke-linecap="round"/>
    <rect x="4.5" y="10.2" width="13.5" height="11" rx="2.2" fill="${c}"/>
    <circle cx="11.25" cy="14.6" r="1.6" fill="#fff"/><rect x="10.5" y="15" width="1.5" height="3.4" rx=".7" fill="#fff"/></g></svg>`;

// ---------- rows ----------
const cellEls = [];
ROWS.forEach((r, ri) => {
  const top = 13 + 51 * ri;
  el("div", "band", [13, top, 477, 48], { background: r.band });
  el("div", "track", [26, top + 3, 423, 42], { background: r.track });
  el("div", "link", [448, top + 22.5, 6, 3], { background: r.track });
  cellEls[ri] = r.nums.map((n, i) => {
    return el("div", "cell", [29 + 38.4 * i, top + 5, 34, 38],
      { background: r.cell, color: r.num }, `<span>${n}</span>`);
  });
  el("div", "lock", [452, top + 9, 30, 30],
    { background: r.lockFill, borderColor: r.track }, lockSvg(r.track));
  el("div", "arrow", [0, top + 13.5, 20, 21], {},
    `<svg viewBox="0 0 20 21" width="100%" height="100%"><polygon points="0,1 19,10.5 0,20" fill="#0c0c13" stroke="#fff" stroke-width="1"/></svg>`);
});

// ---------- points table ----------
el("div", "label", [13, 217, 40, 21], { display: "flex", alignItems: "center" }, "<span>Kruisjes</span>");
el("div", "label", [13, 238, 40, 21], { display: "flex", alignItems: "center" }, "<span>Punten</span>");
for (let n = 1; n <= 12; n++) {
  el("div", "pt", [50 + 29 * (n - 1), 217, 26, 42], {},
    `<div><span>${n}x</span></div><div><span>${pts(n)}</span></div>`);
}
el("div", "pen-label", [405, 220, 86, 16], { display: "flex", alignItems: "center" },
  "<span>Elke mislukte worp: <b>-5</b></span>");
[0, 1, 2, 3].forEach(i => el("div", "pen", [409 + 20.5 * i, 241, 18, 18]));

// ---------- score bar ----------
el("div", "bar", [0, 264, 500, 50]);
el("div", "label", [13, 278, 40, 20], { display: "flex", alignItems: "center" }, "<span>Score</span>");
const boxX = [57, 115, 174, 232, 306];
boxX.map((x, i) => el("div", "box", [x, 272, 40, 29], { borderColor: SCORE_COLORS[i] }, "<span></span>"));
[[106, "+"], [165, "+"], [223, "+"], [288, "−"], [361, "="]].forEach(([x, s]) =>
  el("div", "op", [x - 8, 278, 16, 20], {}, `<span>${s}</span>`));
el("div", "box total", [378, 271, 112, 31], { borderColor: "#16171c" }, "<span></span>");

// ---------- random order ----------
function shuffleRows() {
  cellEls.forEach(row => {
    shuffled(ASC).forEach((n, i) => { row[i].firstChild.textContent = n; });
  });
}
document.getElementById("shuffle").onclick = shuffleRows;

// ---------- PDF: A4 landscape, 2 x 2 cards of 120 x 75 mm ----------
// Fira Sans Extra Condensed (SIL OFL), subset to the characters on the card.
// jsPDF needs TTF bytes, so the files in fonts/ are fetched once on the first print.
const FONT_WEIGHTS = [400, 600, 700, 800];
let fontsPromise;
function loadFonts() {
  fontsPromise ??= Promise.all(FONT_WEIGHTS.map(async w => {
    const res = await fetch(`fonts/fira-${w}.ttf`);
    if (!res.ok) throw new Error(`Font fira-${w}.ttf niet gevonden`);
    const bytes = new Uint8Array(await res.arrayBuffer());
    let bin = "";
    for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
    return [w, btoa(bin)];
  })).then(Object.fromEntries).catch(e => { fontsPromise = null; throw e; });
  return fontsPromise;
}
const CARD_W = 120, K = CARD_W / 500, CARD_H = 314 * K;       // mm per sheet unit
const PT = u => u * K / 0.352778;                               // sheet units -> font pt
const downloadsReady = window.claude?.use ? window.claude.use("downloads").catch(() => null) : Promise.resolve(null);
const statusEl = document.getElementById("status");
const setStatus = t => { statusEl.textContent = t; };

function rot(p, c, deg) {
  const a = deg * Math.PI / 180, dx = p[0] - c[0], dy = p[1] - c[1];
  return [c[0] + dx * Math.cos(a) - dy * Math.sin(a), c[1] + dx * Math.sin(a) + dy * Math.cos(a)];
}
function roundRectPts(x, y, w, h, r) {
  const pts = [], seg = 6;
  [[x + w - r, y + r, -90], [x + w - r, y + h - r, 0], [x + r, y + h - r, 90], [x + r, y + r, 180]].forEach(([cx, cy, a0]) => {
    for (let s = 0; s <= seg; s++) {
      const a = (a0 + 90 * s / seg) * Math.PI / 180;
      pts.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]);
    }
  });
  return pts;
}

function drawCard(pdf, ox, oy, rowsNums) {
  const X = u => ox + u * K, Y = u => oy + u * K, L = u => u * K;
  const fill = c => pdf.setFillColor(c), stroke = c => pdf.setDrawColor(c);
  const rect = (x, y, w, h, c) => { fill(c); pdf.rect(X(x), Y(y), L(w), L(h), "F"); };
  const rrect = (x, y, w, h, r, f, s, lw) => {
    if (s) { const i = lw / 2; stroke(s); pdf.setLineWidth(L(lw)); x += i; y += i; w -= lw; h -= lw; r -= i; }
    if (f) fill(f);
    pdf.roundedRect(X(x), Y(y), L(w), L(h), L(r), L(r), f && s ? "FD" : f ? "F" : "S");
  };
  const poly = (pts, style) => {
    const d = pts.slice(1).map((p, i) => [L(p[0] - pts[i][0]), L(p[1] - pts[i][1])]);
    pdf.lines(d, X(pts[0][0]), Y(pts[0][1]), [1, 1], style, style !== "S");
  };
  const text = (s, x, y, size, font, color, align = "center") => {
    pdf.setFont(font, "normal"); pdf.setFontSize(PT(size)); pdf.setTextColor(color);
    pdf.text(String(s), X(x), Y(y), { align, baseline: "middle" });
  };

  rect(0, 0, 500, 314, "#e3e3e3");

  ROWS.forEach((r, ri) => {
    const top = 13 + 51 * ri;
    rect(13, top, 477, 48, r.band);
    rrect(26, top + 3, 423, 42, 7, r.track);
    rect(448, top + 22.5, 6, 3, r.track);
    rowsNums[ri].forEach((n, i) => {
      const x = 29 + 38.4 * i;
      rrect(x, top + 5, 34, 38, 6, r.cell, "#ffffff", 1);
      text(n, x + 17, top + 24.6, 31, "Fira600", r.num);
    });
    // lock
    const cx = 467, cy = top + 24;
    fill(r.lockFill); stroke(r.track); pdf.setLineWidth(L(2.5));
    pdf.circle(X(cx), Y(cy), L(13.75), "FD");
    const T = p => { const q = rot(p, [12, 13], -18); return [cx - 12 + q[0], cy - 12 + q[1]]; };
    const shackle = [[7.2, 10.5], [7.2, 7.2]];
    for (let a = 179.1; a <= 335.4; a += 8) shackle.push([11.6 + 4.4 * Math.cos(a * Math.PI / 180), 7.13 + 4.4 * Math.sin(a * Math.PI / 180)]);
    shackle.push([15.6, 5.3]);
    stroke(r.track); pdf.setLineWidth(L(2.6)); pdf.setLineCap("round"); pdf.setLineJoin("round");
    poly(shackle.map(T), "S");
    pdf.setLineCap("butt"); pdf.setLineJoin("miter");
    fill(r.track); poly(roundRectPts(4.5, 10.2, 13.5, 11, 2.2).map(T), "F");
    fill("#ffffff");
    const kc = T([11.25, 14.6]); pdf.circle(X(kc[0]), Y(kc[1]), L(1.6), "F");
    poly([[10.5, 15], [12, 15], [12, 18.4], [10.5, 18.4]].map(T), "F");
    // arrow
    fill("#0c0c13"); stroke("#ffffff"); pdf.setLineWidth(L(1));
    poly([[0, top + 14.5], [19, top + 24], [0, top + 33.5]], "FD");
  });

  // points table
  text("Kruisjes", 13, 227.5, 11.5, "Fira700", "#111216", "left");
  text("Punten", 13, 248.5, 11.5, "Fira700", "#111216", "left");
  for (let n = 1; n <= 12; n++) {
    const x = 50 + 29 * (n - 1);
    rrect(x, 217, 26, 42, 5, "#ffffff", "#b4b4b6", 1);
    stroke("#d6d6d8"); pdf.setLineWidth(L(.8));
    pdf.line(X(x + 4), Y(238), X(x + 22), Y(238));
    text(n + "x", x + 13, 228, 13, "Fira700", "#111216");
    text(pts(n), x + 13, 248.5, 12, "Fira600", "#111216");
  }
  pdf.setFont("Fira400", "normal"); pdf.setFontSize(PT(10));
  const lab = "Elke mislukte worp: ";
  text(lab, 405, 228, 10, "Fira400", "#111216", "left");
  text("-5", 405 + pdf.getTextWidth(lab) / K, 228, 10, "Fira700", "#111216", "left");
  for (let i = 0; i < 4; i++) rrect(409 + 20.5 * i, 241, 18, 18, 4, "#ffffff", "#b4b4b6", 1);

  // score bar
  rect(0, 264, 500, 50, "#bcbcbc");
  rect(0, 264, 500, 1, "#c9c7c7");
  text("Score", 13, 288, 11.5, "Fira700", "#111216", "left");
  [57, 115, 174, 232, 306].forEach((x, i) => rrect(x, 272, 40, 29, 6, "#ffffff", SCORE_COLORS[i], 1.6));
  [[106, "+"], [165, "+"], [223, "+"], [288, "−"], [361, "="]].forEach(([x, s]) => text(s, x, 288.5, 22, "Fira800", "#111216"));
  rrect(378, 271, 112, 31, 7, "#ffffff", "#16171c", 2.2);
}

function buildPdf(pages, fonts) {
  const pdf = new window.jspdf.jsPDF({ orientation: "landscape", unit: "mm", format: "a4", compress: true });
  Object.entries(fonts).forEach(([w, b64]) => {
    pdf.addFileToVFS(`fira${w}.ttf`, b64);
    pdf.addFont(`fira${w}.ttf`, "Fira" + w, "normal");
  });
  const pw = 297, ph = 210;
  const x0 = (pw - 2 * CARD_W) / 2, y0 = (ph - 2 * CARD_H) / 2;
  for (let p = 0; p < pages; p++) {
    if (p) pdf.addPage();
    for (let c = 0; c < 4; c++) {
      drawCard(pdf, x0 + (c % 2) * CARD_W, y0 + Math.floor(c / 2) * CARD_H, ROWS.map(() => shuffled(ASC)));
    }
    // thin cut lines between and around the cards
    pdf.setDrawColor("#9a9a9a"); pdf.setLineWidth(.15);
    pdf.rect(x0, y0, 2 * CARD_W, 2 * CARD_H, "S");
    pdf.line(x0 + CARD_W, y0, x0 + CARD_W, y0 + 2 * CARD_H);
    pdf.line(x0, y0 + CARD_H, x0 + 2 * CARD_W, y0 + CARD_H);
  }
  pdf.setProperties({ title: "Qwixx kaartjes" });
  pdf.autoPrint();
  return pdf;
}

document.getElementById("print").onclick = async () => {
  const btn = document.getElementById("print");
  const input = document.getElementById("pages");
  const pages = Math.max(1, Math.min(100, Math.round(Number(input.value) || 1)));
  input.value = pages;
  if (!window.jspdf) { setStatus("De PDF-bibliotheek is niet geladen. Controleer je internetverbinding en probeer opnieuw."); return; }
  btn.disabled = true;
  setStatus("PDF maken…");
  try {
    await new Promise(r => setTimeout(r, 30));
    const pdf = buildPdf(pages, await loadFonts());
    const blob = pdf.output("blob");
    const filename = `qwixx-kaartjes-${pages * 4}.pdf`;
    const label = `${pages} A4${pages > 1 ? "'s" : ""} met ${pages * 4} kaartjes`;

    // Inside Claude: hand the PDF over as a download (the print dialog opens when the PDF is opened).
    const downloads = await downloadsReady;
    if (downloads) {
      try {
        await downloads.save({ filename, data: blob });
        setStatus(`${label} opgeslagen. Open de PDF: het afdrukscherm verschijnt automatisch.`);
      } catch (e) {
        setStatus(e?.code === "declined" ? "Opslaan geannuleerd." : "Opslaan lukte niet in deze weergave.");
      }
      return;
    }

    // Standalone in a browser: open the PDF in a new tab; it opens the print dialog itself.
    const url = URL.createObjectURL(blob);
    const win = window.open(url, "_blank");
    if (win) {
      setStatus(`${label} geopend in een nieuw tabblad met het afdrukscherm.`);
    } else {
      const a = document.createElement("a");
      a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove();
      setStatus(`${label} gedownload. Open de PDF: het afdrukscherm verschijnt automatisch.`);
    }
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  } catch (e) {
    setStatus("Er ging iets mis bij het maken van de PDF: " + (e?.message || e));
  } finally {
    btn.disabled = false;
  }
};
