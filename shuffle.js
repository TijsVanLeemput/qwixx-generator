function shuffled(list) {
  list = [...list];
  for (let i = list.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [list[i], list[j]] = [list[j], list[i]];
  }
  return list;
}

function shuffleRows() {
  document.querySelectorAll(".row").forEach((row) => {
    const spans = [...row.querySelectorAll(".cell span")];
    const order = shuffled(spans.map((span) => span.textContent));
    spans.forEach((span, i) => {
      span.textContent = order[i];
    });
  });
}

document.getElementById("shuffle").onclick = shuffleRows;
