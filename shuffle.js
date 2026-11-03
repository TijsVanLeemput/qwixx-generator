const BASE_COLORS = ["red", "yellow", "green", "blue"];

const RANDOM_VARIANT_ORDERS = {
  red: ["10", "6", "2", "8", "3", "4", "12", "5", "9", "7", "11"],
  yellow: ["9", "12", "4", "6", "7", "2", "5", "8", "11", "3", "10"],
  green: ["8", "2", "10", "12", "6", "9", "7", "4", "5", "11", "3"],
  blue: ["5", "7", "11", "9", "12", "3", "8", "10", "2", "6", "4"],
};

const COLOR_MIX_SEGMENTS = {
  red: [
    ["yellow", 3],
    ["blue", 3],
    ["green", 3],
    ["red", 2],
  ],
  yellow: [
    ["red", 2],
    ["green", 4],
    ["blue", 2],
    ["yellow", 3],
  ],
  green: [
    ["blue", 3],
    ["yellow", 3],
    ["red", 3],
    ["green", 2],
  ],
  blue: [
    ["green", 2],
    ["red", 4],
    ["yellow", 2],
    ["blue", 3],
  ],
};

function shuffled(list) {
  list = [...list];
  for (let i = list.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [list[i], list[j]] = [list[j], list[i]];
  }
  return list;
}

function cellSpans(row) {
  return [...row.querySelectorAll(".cell span")];
}

function applyOrder(row, order) {
  cellSpans(row).forEach((span, i) => {
    span.textContent = order[i];
  });
}

function rowColor(row) {
  return BASE_COLORS.find((color) => row.classList.contains(color));
}

const defaultOrders = new Map(
  [...document.querySelectorAll(".row")].map((row) => [
    row,
    cellSpans(row).map((span) => span.textContent),
  ]),
);

function clearColorMix(row) {
  row.querySelectorAll(".cell, .lock, .link").forEach((element) => {
    element.classList.remove(...BASE_COLORS);
  });
  row.querySelector(".band").style.background = "";
  row.querySelector(".track").style.background = "";
}

function gapMiddle(leftCell, rightCell) {
  const leftEdge = leftCell.getBoundingClientRect().right;
  const rightEdge = rightCell.getBoundingClientRect().left;
  return (leftEdge + rightEdge) / 2;
}

function colorSegments(cells, cellColors) {
  const segments = [];
  cells.forEach((cell, i) => {
    if (i > 0 && cellColors[i] === cellColors[i - 1]) return;
    const start = i === 0 ? null : gapMiddle(cells[i - 1], cell);
    segments.push({ cell, start });
  });
  return segments;
}

function percentageOf(box, position) {
  return (((position - box.left) / box.width) * 100).toFixed(3);
}

function paintSegments(element, segments, colorProperty) {
  const box = element.getBoundingClientRect();
  const stops = segments.map((segment, i) => {
    const color = getComputedStyle(segment.cell)
      .getPropertyValue(colorProperty)
      .trim();
    const nextSegment = segments[i + 1];
    const start = segment.start === null ? 0 : percentageOf(box, segment.start);
    const end = nextSegment ? percentageOf(box, nextSegment.start) : 100;
    return `${color} ${start}% ${end}%`;
  });
  element.style.background = `linear-gradient(to right, ${stops.join(", ")})`;
}

function applyColorMix(row) {
  const cells = [...row.querySelectorAll(".cell")];
  const cellColors = COLOR_MIX_SEGMENTS[rowColor(row)].flatMap(
    ([color, count]) => Array(count).fill(color),
  );
  const lastColor = cellColors[cellColors.length - 1];

  cells.forEach((cell, i) => cell.classList.add(cellColors[i]));
  row.querySelector(".lock").classList.add(lastColor);
  row.querySelector(".link").classList.add(lastColor);

  const segments = colorSegments(cells, cellColors);
  paintSegments(row.querySelector(".band"), segments, "--band");
  paintSegments(row.querySelector(".track"), segments, "--track");
}

function shuffleRows() {
  defaultOrders.forEach((defaultOrder, row) => {
    clearColorMix(row);
    applyOrder(row, shuffled(defaultOrder));
  });
}

function resetRows() {
  defaultOrders.forEach((defaultOrder, row) => {
    clearColorMix(row);
    applyOrder(row, defaultOrder);
  });
}

function applyRandomVariant() {
  defaultOrders.forEach((defaultOrder, row) => {
    clearColorMix(row);
    applyOrder(row, RANDOM_VARIANT_ORDERS[rowColor(row)]);
  });
}

function applyColorMixVariant() {
  defaultOrders.forEach((defaultOrder, row) => {
    clearColorMix(row);
    applyOrder(row, defaultOrder);
    applyColorMix(row);
  });
}

document.getElementById("shuffle").onclick = shuffleRows;
document.getElementById("reset").onclick = resetRows;
document.getElementById("random-variant").onclick = applyRandomVariant;
document.getElementById("color-mix").onclick = applyColorMixVariant;
