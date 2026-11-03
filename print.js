const CARDS_PER_PAGE = 4;
const MAX_PAGES = 100;

function setStatus(text) {
  document.getElementById("status").textContent = text;
}

function readPageCount(input) {
  const pages = Math.max(
    1,
    Math.min(MAX_PAGES, Math.round(Number(input.value) || 1)),
  );
  input.value = pages;
  return pages;
}

function createPrintCard(sheet) {
  const card = document.createElement("div");
  card.className = "print-card";
  const copy = sheet.cloneNode(true);
  copy.removeAttribute("id");
  card.append(copy);
  return card;
}

function createPrintPage(sheet) {
  const page = document.createElement("div");
  page.className = "print-page";
  for (let i = 0; i < CARDS_PER_PAGE; i++) page.append(createPrintCard(sheet));
  return page;
}

function printCards() {
  const pages = readPageCount(document.getElementById("pages"));
  const sheet = document.getElementById("sheet");
  const printArea = document.getElementById("print-area");

  const fragment = document.createDocumentFragment();
  for (let i = 0; i < pages; i++) fragment.append(createPrintPage(sheet));
  printArea.replaceChildren(fragment);

  const cardCount = pages * CARDS_PER_PAGE;
  setStatus(
    `${pages} A4${pages > 1 ? "'s" : ""} met ${cardCount} kaartjes naar het afdrukscherm gestuurd. Kies "Opslaan als PDF" voor een PDF-bestand.`,
  );
  window.print();
}

function clearPrintArea() {
  document.getElementById("print-area").replaceChildren();
}

document.getElementById("print").onclick = printCards;
window.addEventListener("afterprint", clearPrintArea);
