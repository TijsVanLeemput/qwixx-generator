# Qwixx generator

Statische pagina met een replica van het Qwixx-scoreblad.

- **Nieuwe volgorde**: zet de getallen per rij in een willekeurige volgorde.
- **Afdrukken**: zet het kaartje 4 keer op elk A4 (liggend, 12 × 7,5 cm per kaartje) voor het gekozen aantal A4's en opent het afdrukscherm. Kies daar "Opslaan als PDF" voor een PDF-bestand.

Afdrukken gebruikt geen PDF-library: de browser drukt kopieën van de HTML af met een print-stylesheet (`@media print` in `styles.css`).

## Hosting

De site draait op GitHub Pages: https://tijsvanleemput.github.io/qwixx-generator/

Geen build nodig. Pages publiceert rechtstreeks vanaf de `main` branch (map `/`).
Eenmalig instellen: **Settings → Pages → Build and deployment → Source: Deploy from a branch → `main` / `/ (root)`**.
`.nojekyll` zorgt dat GitHub de bestanden ongewijzigd serveert.
