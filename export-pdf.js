function getValueFromStyle(name, element = document.documentElement) {
  return getComputedStyle(element).getPropertyValue(name).trim();
}

function getCardState() {
  const rows = [...document.querySelectorAll(".row")].map((row) => ({
    bandColor: getValueFromStyle("--band", row),
    trackColor: getValueFromStyle("--track", row),
    cellColor: getValueFromStyle("--cell", row),
    numberColor: getValueFromStyle("--num", row),
    lockFillColor: getValueFromStyle("--lock-fill", row),
    numbers: [...row.querySelectorAll(".cell span")].map((span) =>
      Number(span.textContent),
    ),
  }));

  const points = [...document.querySelectorAll(".points .pt")].map((point) => {
    const [crosses, value] = point.querySelectorAll("span");
    return { crosses: crosses.textContent, points: value.textContent };
  });
  const colors = {
    black: getValueFromStyle("--ink"),
    boxLine: getValueFromStyle("--box-line"),
    sheet: getValueFromStyle("--sheet"),
    boxFill: getValueFromStyle("--box-fill"),
    cellBorder: getValueFromStyle("--cell-border"),
    arrowFill: getValueFromStyle("--arrow-fill"),
    arrowOutline: getValueFromStyle("--arrow-outline"),
    pointsDivider: getValueFromStyle("--points-divider"),
    bar: getValueFromStyle("--bar"),
    barTopLine: getValueFromStyle("--bar-top-line"),
    totalBorder: getValueFromStyle("--total-border"),
  };
  // Border colours of the red, yellow, green, blue and penalty boxes.
  const scoreColors = [
    ...document.querySelectorAll(".bar .box:not(.total)"),
  ].map((box) => getValueFromStyle("--band", box));

  return { rows, points, colors, scoreColors };
}

const FONT_WEIGHTS = [400, 600, 700, 800];
const CHUNK = 0x8000;
let fontsPromise;
function loadFonts() {
  fontsPromise ??= Promise.all(
    FONT_WEIGHTS.map(async (weight) => {
      const response = await fetch(`fonts/fira-${weight}.ttf`);
      if (!response.ok)
        throw new Error(`Font fira-${weight}.ttf niet gevonden`);

      const bytes = new Uint8Array(await response.arrayBuffer());
      let bin = "";
      for (let i = 0; i < bytes.length; i += CHUNK)
        bin += String.fromCharCode(...bytes.subarray(i, i + CHUNK));

      return [weight, btoa(bin)];
    }),
  )
    .then(Object.fromEntries)
    .catch((error) => {
      fontsPromise = null;
      throw error;
    });
  return fontsPromise;
}

// No magic numbers here
// score card was roughly measured to 12cm x 7,5cm and an A4 page rouglhy fits four cards
const SHEET_WIDTH = 500;
const SHEET_HEIGHT = 314;
const CARD_WIDTH = 120;
const MM_PER_UNIT = CARD_WIDTH / SHEET_WIDTH; // -> 0.24 mm per sheet unit
const CARD_HEIGHT = SHEET_HEIGHT * MM_PER_UNIT;
const A4_PAGE_WIDTH = 297;
const A4_PAGE_HEIGHT = 210;
const CARDS_ACROSS = 2;
const CARDS_DOWN = 2;

function toFontPoints(units) {
  // jsPDF sizes fonts in typographic points: 1 pt = 1/72 inch = 25.4/72 mm --Claude.
  const MM_PER_POINT = 25.4 / 72;
  return (units * MM_PER_UNIT) / MM_PER_POINT;
}

// html to jsPDF layout, this has only magic numbers
const LAYOUT = {
  row: {
    firstTop: 13,
    pitch: 51,
    band: { left: 13, width: 477, height: 48 },
    track: { left: 26, top: 3, width: 423, height: 42, radius: 7 },
    link: { left: 448, top: 22.5, width: 6, height: 3 },
  },
  cell: {
    left: 29,
    top: 5,
    pitch: 38.4,
    width: 34,
    height: 38,
    radius: 6,
    borderWidth: 1,
    fontSize: 31,
    textCenterY: 24.6,
  },
  lock: {
    centerX: 467,
    centerY: 24,
    radius: 15,
    border: 2.5,
  },
  arrow: {
    top: 14.5,
    tipX: 19,
    tipY: 24,
    bottom: 33.5,
    outline: 1,
  },
  labels: {
    left: 13,
    fontSize: 11.5,
    crossesY: 227.5,
    pointsY: 248.5,
    scoreY: 288,
  },
  points: {
    left: 50,
    top: 217,
    pitch: 29,
    width: 26,
    height: 42,
    radius: 5,
    border: 1,
    divider: { y: 238, inset: 4, width: 0.8 },
    crossesY: 228,
    crossesFontSize: 13,
    pointsY: 248.5,
    pointsFontSize: 12,
  },
  penalties: {
    label: "Elke mislukte worp: ",
    value: "-5",
    labelLeft: 405,
    labelY: 228,
    fontSize: 10,
    count: 4,
    left: 409,
    top: 241,
    pitch: 20.5,
    size: 18,
    radius: 4,
    border: 1,
  },
  bar: {
    top: 264,
    height: 50,
    topLineHeight: 1,
    boxLefts: [57, 115, 174, 232, 306],
    box: { top: 272, width: 40, height: 29, radius: 6, border: 1.6 },
    operators: [
      [106, "+"],
      [165, "+"],
      [223, "+"],
      [288, "-"],
      [361, "="],
    ],
    operatorY: 288.5,
    operatorFontSize: 22,
    total: {
      left: 378,
      top: 271,
      width: 112,
      height: 31,
      radius: 7,
      border: 2.2,
    },
  },
};

// lock svg converted to a format jsPdf accepts
const LOCK_ICON = {
  rotation: { center: [12, 13], degrees: -18 },
  shackle: {
    start: [7.2, 10.5],
    arcStart: [7.2, 7.2],
    arcEnd: [15.6, 5.3],
    center: [11.6, 7.13],
    radius: 4.4,
    fromDegrees: 179.1,
    toDegrees: 335.4,
    stepDegrees: 8,
    strokeWidth: 2.6,
  },
  body: { x: 4.5, y: 10.2, width: 13.5, height: 11, radius: 2.2 },
  keyhole: {
    center: [11.25, 14.6],
    radius: 1.6,
    slot: { x: 10.5, y: 15, width: 1.5, height: 3.4 },
  },
};

function rotate(point, center, degrees) {
  const angle = (degrees * Math.PI) / 180;
  const deltaX = point[0] - center[0];
  const deltaY = point[1] - center[1];
  return [
    center[0] + deltaX * Math.cos(angle) - deltaY * Math.sin(angle),
    center[1] + deltaX * Math.sin(angle) + deltaY * Math.cos(angle),
  ];
}

const ROUND_CORNER_SEGMENTS = 6;
function roundRectanglePoints(x, y, width, height, radius) {
  const points = [];
  [
    [x + width - radius, y + radius, -90],
    [x + width - radius, y + height - radius, 0],
    [x + radius, y + height - radius, 90],
    [x + radius, y + radius, 180],
  ].forEach(([cornerX, cornerY, startDegrees]) => {
    for (let segment = 0; segment <= ROUND_CORNER_SEGMENTS; segment++) {
      const angle =
        ((startDegrees + (90 * segment) / ROUND_CORNER_SEGMENTS) * Math.PI) /
        180;
      points.push([
        cornerX + radius * Math.cos(angle),
        cornerY + radius * Math.sin(angle),
      ]);
    }
  });
  return points;
}

function rotateLockIcon(icon) {
  const { center, degrees } = icon.rotation;
  const half = 12;
  function place(point) {
    const [x, y] = rotate(point, center, degrees);
    return [x - half, y - half];
  }

  const shackle = icon.shackle;
  const shacklePoints = [shackle.start, shackle.arcStart];
  for (
    let angle = shackle.fromDegrees;
    angle <= shackle.toDegrees;
    angle += shackle.stepDegrees
  )
    shacklePoints.push([
      shackle.center[0] + shackle.radius * Math.cos((angle * Math.PI) / 180),
      shackle.center[1] + shackle.radius * Math.sin((angle * Math.PI) / 180),
    ]);
  shacklePoints.push(shackle.arcEnd);

  const { body, keyhole } = icon;
  const { slot } = keyhole;
  return {
    strokeWidth: shackle.strokeWidth,
    keyholeRadius: keyhole.radius,
    shackle: shacklePoints.map(place),
    body: roundRectanglePoints(
      body.x,
      body.y,
      body.width,
      body.height,
      body.radius,
    ).map(place),
    keyholeCenter: place(keyhole.center),
    keyholeSlot: [
      [slot.x, slot.y],
      [slot.x + slot.width, slot.y],
      [slot.x + slot.width, slot.y + slot.height],
      [slot.x, slot.y + slot.height],
    ].map(place),
  };
}

const ROTATED_LOCK_ICON = rotateLockIcon(LOCK_ICON);

function drawCard(pdf, originX, originY, card, lockIcon) {
  function toPageX(units) {
    return originX + units * MM_PER_UNIT;
  }
  function toPageY(units) {
    return originY + units * MM_PER_UNIT;
  }
  function toMm(units) {
    return units * MM_PER_UNIT;
  }
  function fill(color) {
    pdf.setFillColor(color);
  }
  function stroke(color) {
    pdf.setDrawColor(color);
  }
  function rectangle(x, y, width, height, color) {
    fill(color);
    pdf.rect(toPageX(x), toPageY(y), toMm(width), toMm(height), "F");
  }
  function roundedRectangle(
    x,
    y,
    width,
    height,
    radius,
    fillColor,
    strokeColor,
    lineWidth,
  ) {
    if (strokeColor) {
      const inset = lineWidth / 2;
      stroke(strokeColor);
      pdf.setLineWidth(toMm(lineWidth));
      x += inset;
      y += inset;
      width -= lineWidth;
      height -= lineWidth;
      radius -= inset;
    }
    if (fillColor) fill(fillColor);
    pdf.roundedRect(
      toPageX(x),
      toPageY(y),
      toMm(width),
      toMm(height),
      toMm(radius),
      toMm(radius),
      fillColor && strokeColor ? "FD" : fillColor ? "F" : "S",
    );
  }
  function poly(points, style) {
    const deltas = points
      .slice(1)
      .map((point, i) => [
        toMm(point[0] - points[i][0]),
        toMm(point[1] - points[i][1]),
      ]);
    pdf.lines(
      deltas,
      toPageX(points[0][0]),
      toPageY(points[0][1]),
      [1, 1],
      style,
      style !== "S",
    );
  }
  function text(content, x, y, size, font, color, align = "center") {
    pdf.setFont(font, "normal");
    pdf.setFontSize(toFontPoints(size));
    pdf.setTextColor(color);
    pdf.text(String(content), toPageX(x), toPageY(y), {
      align,
      baseline: "middle",
    });
  }

  const { row, cell, lock, arrow, labels, points, penalties, bar } = LAYOUT;

  rectangle(0, 0, SHEET_WIDTH, SHEET_HEIGHT, card.colors.sheet);

  card.rows.forEach((cardRow, rowIndex) => {
    const top = row.firstTop + row.pitch * rowIndex;
    rectangle(
      row.band.left,
      top,
      row.band.width,
      row.band.height,
      cardRow.bandColor,
    );
    roundedRectangle(
      row.track.left,
      top + row.track.top,
      row.track.width,
      row.track.height,
      row.track.radius,
      cardRow.trackColor,
    );
    rectangle(
      row.link.left,
      top + row.link.top,
      row.link.width,
      row.link.height,
      cardRow.trackColor,
    );
    cardRow.numbers.forEach((number, i) => {
      const x = cell.left + cell.pitch * i;
      roundedRectangle(
        x,
        top + cell.top,
        cell.width,
        cell.height,
        cell.radius,
        cardRow.cellColor,
        card.colors.cellBorder,
        cell.borderWidth,
      );
      text(
        number,
        x + cell.width / 2,
        top + cell.textCenterY,
        cell.fontSize,
        "Fira600",
        cardRow.numberColor,
      );
    });

    const lockCenterX = lock.centerX;
    const lockCenterY = top + lock.centerY;
    fill(cardRow.lockFillColor);
    stroke(cardRow.trackColor);
    pdf.setLineWidth(toMm(lock.border));
    pdf.circle(
      toPageX(lockCenterX),
      toPageY(lockCenterY),
      toMm(lock.radius - lock.border / 2),
      "FD",
    );

    function placeOnLock([x, y]) {
      return [lockCenterX + x, lockCenterY + y];
    }

    stroke(cardRow.trackColor);
    pdf.setLineWidth(toMm(lockIcon.strokeWidth));
    pdf.setLineCap("round");
    pdf.setLineJoin("round");
    poly(lockIcon.shackle.map(placeOnLock), "S");
    pdf.setLineCap("butt");
    pdf.setLineJoin("miter");

    fill(cardRow.trackColor);
    poly(lockIcon.body.map(placeOnLock), "F");

    fill(cardRow.lockFillColor);
    const [keyholeX, keyholeY] = placeOnLock(lockIcon.keyholeCenter);
    pdf.circle(
      toPageX(keyholeX),
      toPageY(keyholeY),
      toMm(lockIcon.keyholeRadius),
      "F",
    );
    poly(lockIcon.keyholeSlot.map(placeOnLock), "F");

    fill(card.colors.arrowFill);
    stroke(card.colors.arrowOutline);
    pdf.setLineWidth(toMm(arrow.outline));
    poly(
      [
        [0, top + arrow.top],
        [arrow.tipX, top + arrow.tipY],
        [0, top + arrow.bottom],
      ],
      "FD",
    );
  });

  const {
    black: COLOR_BLACK,
    boxLine: BOX_LINE,
    boxFill: BOX_FILL,
  } = card.colors;
  text(
    "Kruisjes",
    labels.left,
    labels.crossesY,
    labels.fontSize,
    "Fira700",
    COLOR_BLACK,
    "left",
  );
  text(
    "Punten",
    labels.left,
    labels.pointsY,
    labels.fontSize,
    "Fira700",
    COLOR_BLACK,
    "left",
  );
  card.points.forEach(({ crosses, points: value }, i) => {
    const x = points.left + points.pitch * i;
    const centerX = x + points.width / 2;
    roundedRectangle(
      x,
      points.top,
      points.width,
      points.height,
      points.radius,
      BOX_FILL,
      BOX_LINE,
      points.border,
    );
    stroke(card.colors.pointsDivider);
    pdf.setLineWidth(toMm(points.divider.width));
    pdf.line(
      toPageX(x + points.divider.inset),
      toPageY(points.divider.y),
      toPageX(x + points.width - points.divider.inset),
      toPageY(points.divider.y),
    );
    text(
      crosses,
      centerX,
      points.crossesY,
      points.crossesFontSize,
      "Fira700",
      COLOR_BLACK,
    );
    text(
      value,
      centerX,
      points.pointsY,
      points.pointsFontSize,
      "Fira600",
      COLOR_BLACK,
    );
  });

  pdf.setFont("Fira400", "normal");
  pdf.setFontSize(toFontPoints(penalties.fontSize));
  const labelWidth = pdf.getTextWidth(penalties.label) / MM_PER_UNIT;
  text(
    penalties.label,
    penalties.labelLeft,
    penalties.labelY,
    penalties.fontSize,
    "Fira400",
    COLOR_BLACK,
    "left",
  );
  text(
    penalties.value,
    penalties.labelLeft + labelWidth,
    penalties.labelY,
    penalties.fontSize,
    "Fira700",
    COLOR_BLACK,
    "left",
  );
  for (let i = 0; i < penalties.count; i++)
    roundedRectangle(
      penalties.left + penalties.pitch * i,
      penalties.top,
      penalties.size,
      penalties.size,
      penalties.radius,
      BOX_FILL,
      BOX_LINE,
      penalties.border,
    );

  rectangle(0, bar.top, SHEET_WIDTH, bar.height, card.colors.bar);
  rectangle(0, bar.top, SHEET_WIDTH, bar.topLineHeight, card.colors.barTopLine);
  text(
    "Score",
    labels.left,
    labels.scoreY,
    labels.fontSize,
    "Fira700",
    COLOR_BLACK,
    "left",
  );
  bar.boxLefts.forEach((left, i) =>
    roundedRectangle(
      left,
      bar.box.top,
      bar.box.width,
      bar.box.height,
      bar.box.radius,
      BOX_FILL,
      card.scoreColors[i],
      bar.box.border,
    ),
  );
  bar.operators.forEach(([centerX, sign]) =>
    text(
      sign,
      centerX,
      bar.operatorY,
      bar.operatorFontSize,
      "Fira800",
      COLOR_BLACK,
    ),
  );
  const total = bar.total;
  roundedRectangle(
    total.left,
    total.top,
    total.width,
    total.height,
    total.radius,
    BOX_FILL,
    card.colors.totalBorder,
    total.border,
  );
}

function buildPdf(pages, fonts, card) {
  const pdf = new window.jspdf.jsPDF({
    orientation: "landscape",
    unit: "mm",
    format: "a4",
    compress: true,
  });
  Object.entries(fonts).forEach(([weight, base64]) => {
    pdf.addFileToVFS(`fira${weight}.ttf`, base64);
    pdf.addFont(`fira${weight}.ttf`, `Fira${weight}`, "normal");
  });
  const blockLeft = (A4_PAGE_WIDTH - CARDS_ACROSS * CARD_WIDTH) / 2;
  const blockTop = (A4_PAGE_HEIGHT - CARDS_DOWN * CARD_HEIGHT) / 2;
  for (let page = 0; page < pages; page++) {
    if (page) pdf.addPage();
    for (
      let cardIndex = 0;
      cardIndex < CARDS_ACROSS * CARDS_DOWN;
      cardIndex++
    ) {
      drawCard(
        pdf,
        blockLeft + (cardIndex % CARDS_ACROSS) * CARD_WIDTH,
        blockTop + Math.floor(cardIndex / CARDS_ACROSS) * CARD_HEIGHT,
        card,
        ROTATED_LOCK_ICON,
      );
    }

    pdf.setDrawColor("#9a9a9a");
    pdf.setLineWidth(0.15);

    pdf.rect(
      blockLeft,
      blockTop,
      CARDS_ACROSS * CARD_WIDTH,
      CARDS_DOWN * CARD_HEIGHT,
      "S",
    );
    for (let i = 1; i < CARDS_ACROSS; i++)
      pdf.line(
        blockLeft + i * CARD_WIDTH,
        blockTop,
        blockLeft + i * CARD_WIDTH,
        blockTop + CARDS_DOWN * CARD_HEIGHT,
      );
    for (let i = 1; i < CARDS_DOWN; i++)
      pdf.line(
        blockLeft,
        blockTop + i * CARD_HEIGHT,
        blockLeft + CARDS_ACROSS * CARD_WIDTH,
        blockTop + i * CARD_HEIGHT,
      );
  }
  pdf.setProperties({ title: "Qwixx kaartjes" });
  pdf.autoPrint();
  return pdf;
}

const MAX_PAGES = 100;
const PAINT_DELAY_MS = 30;
const REVOKE_URL_AFTER_MS = 60_000;

function setStatus(text) {
  document.getElementById("status").textContent = text;
}

async function printCards() {
  const btn = document.getElementById("print");
  const input = document.getElementById("pages");
  const pages = Math.max(
    1,
    Math.min(MAX_PAGES, Math.round(Number(input.value) || 1)),
  );
  input.value = pages;
  if (!window.jspdf) {
    setStatus(
      "De PDF-bibliotheek is niet geladen. Controleer je internetverbinding en probeer opnieuw.",
    );
    return;
  }
  btn.disabled = true;
  setStatus("PDF maken…");
  try {
    await new Promise((resolve) => setTimeout(resolve, PAINT_DELAY_MS));
    const pdf = buildPdf(pages, await loadFonts(), getCardState());
    const blob = pdf.output("blob");
    const filename = `qwixx-kaartjes-${pages * CARDS_ACROSS * CARDS_DOWN}.pdf`;
    const label = `${pages} A4${pages > 1 ? "'s" : ""} met ${pages * CARDS_ACROSS * CARDS_DOWN} kaartjes`;

    const url = URL.createObjectURL(blob);
    const win = window.open(url, "_blank");
    if (win) {
      setStatus(`${label} geopend in een nieuw tabblad met het afdrukscherm.`);
    } else {
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      setStatus(
        `${label} gedownload. Open de PDF: het afdrukscherm verschijnt automatisch.`,
      );
    }
    setTimeout(() => URL.revokeObjectURL(url), REVOKE_URL_AFTER_MS);
  } catch (error) {
    setStatus(
      "Er ging iets mis bij het maken van de PDF: " + (error?.message || error),
    );
  } finally {
    btn.disabled = false;
  }
}

document.getElementById("print").onclick = printCards;
