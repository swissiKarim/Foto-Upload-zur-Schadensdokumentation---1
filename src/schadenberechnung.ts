/**
 * Versicherungs-Schadenberechnung Bibliothek
 */

export type Tarif = 'basis' | 'komfort' | 'premium';

export interface BerechnungsErgebnis {
  schadenshoehe: number;
  selbstbeteiligung: number;
  auszahlung: number;
  gekuerzt: boolean;
}

const SELBSTBETEILIGUNG: Record<Tarif, number> = {
  basis: 500,
  komfort: 250,
  premium: 100,
};

const AUSZAHLUNGSOBERGRENZE: Record<Tarif, number> = {
  basis: 5000,
  komfort: 20000,
  premium: 50000,
};

const GUELTIGE_TARIFE: Tarif[] = ['basis', 'komfort', 'premium'];

/**
 * Kaufmännisches Runden auf zwei Nachkommastellen.
 * Verwendet Multiplikation/Division um Floating-Point-Probleme zu minimieren.
 */
function rundeKaufmaennisch(wert: number): number {
  return Math.round((wert + Number.EPSILON) * 100) / 100;
}

/**
 * Berechnet die Auszahlung einer Versicherungs-Schadensmeldung.
 *
 * @param schadenshoehe - Schadenshöhe in EUR (>= 0)
 * @param tarif - Tarif: 'basis', 'komfort' oder 'premium'
 * @returns BerechnungsErgebnis mit Auszahlung und Kürzungskennzeichen
 * @throws Error bei ungültigen Eingaben (Fehlermeldung auf Deutsch)
 */
export function berechneAuszahlung(
  schadenshoehe: unknown,
  tarif: unknown,
): BerechnungsErgebnis {
  // Eingabe: Schadenshöhe prüfen
  if (typeof schadenshoehe !== 'number' || isNaN(schadenshoehe)) {
    throw new Error(
      'Ungültige Eingabe: Die Schadenshöhe muss eine Zahl sein.',
    );
  }
  if (schadenshoehe < 0) {
    throw new Error(
      'Ungültige Eingabe: Die Schadenshöhe darf nicht negativ sein.',
    );
  }

  // Eingabe: Tarif prüfen
  if (typeof tarif !== 'string' || !GUELTIGE_TARIFE.includes(tarif as Tarif)) {
    throw new Error(
      `Ungültige Eingabe: Der Tarif muss einer der folgenden Werte sein: ${GUELTIGE_TARIFE.join(', ')}.`,
    );
  }

  const gueltigerTarif = tarif as Tarif;
  const selbstbeteiligung = SELBSTBETEILIGUNG[gueltigerTarif];
  const obergrenze = AUSZAHLUNGSOBERGRENZE[gueltigerTarif];

  // Auszahlung berechnen: Schadenshöhe - Selbstbeteiligung, mind. 0
  const rohauszahlung = Math.max(0, schadenshoehe - selbstbeteiligung);
  const gerundeteAuszahlung = rundeKaufmaennisch(rohauszahlung);

  // Obergrenze anwenden
  let auszahlung: number;
  let gekuerzt: boolean;

  if (gerundeteAuszahlung > obergrenze) {
    auszahlung = obergrenze;
    gekuerzt = true;
  } else {
    auszahlung = gerundeteAuszahlung;
    gekuerzt = false;
  }

  return {
    schadenshoehe: rundeKaufmaennisch(schadenshoehe),
    selbstbeteiligung,
    auszahlung,
    gekuerzt,
  };
}
