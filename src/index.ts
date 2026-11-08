/**
 * Versicherungs-Auszahlungsberechnung
 *
 * Reine TypeScript-Bibliothek ohne externe Abhängigkeiten,
 * keine Oberfläche, keine Datenbank, keine externen Dienste.
 */

/** Gültige Tarife */
export type Tarif = 'basis' | 'komfort' | 'premium';

/** Ergebnis der Auszahlungsberechnung */
export interface BerechnungsErgebnis {
  /** Ursprüngliche Schadenshöhe in EUR */
  schadenshoehe: number;
  /** Angewendete Selbstbeteiligung in EUR */
  selbstbeteiligung: number;
  /** Berechnete Auszahlung in EUR (nach Selbstbeteiligung und Obergrenze) */
  auszahlung: number;
  /** true, wenn die Auszahlungsobergrenze angewendet wurde */
  gekuerzt: boolean;
}

/** Selbstbeteiligung je Tarif in EUR */
const SELBSTBETEILIGUNG: Record<Tarif, number> = {
  basis: 500,
  komfort: 250,
  premium: 100,
};

/** Auszahlungsobergrenze je Tarif in EUR */
const OBERGRENZE: Record<Tarif, number> = {
  basis: 5_000,
  komfort: 20_000,
  premium: 50_000,
};

/** Menge der gültigen Tarife */
const GUELTIGE_TARIFE: ReadonlySet<string> = new Set<Tarif>([
  'basis',
  'komfort',
  'premium',
]);

/**
 * Rundet einen Betrag kaufmännisch auf zwei Nachkommastellen.
 * Verwendet Math.round(x * 100) / 100.
 */
function runden(betrag: number): number {
  return Math.round(betrag * 100) / 100;
}

/**
 * Berechnet die Differenz zweier Beträge präzise in ganzzahligen Cent,
 * um IEEE-754-Gleitkommafehler zu vermeiden.
 * Rundet beide Eingaben zuerst auf Cent, subtrahiert ganzzahlig und
 * gibt das Ergebnis in EUR zurück.
 */
function differenzInEuro(a: number, b: number): number {
  const aCents = Math.round(a * 100);
  const bCents = Math.round(b * 100);
  return (aCents - bCents) / 100;
}

/**
 * Prüft, ob der übergebene Wert ein gültiger Tarif ist.
 */
function istGueltigerTarif(wert: unknown): wert is Tarif {
  return typeof wert === 'string' && GUELTIGE_TARIFE.has(wert);
}

/**
 * Berechnet die Auszahlung einer Versicherungs-Schadensmeldung.
 *
 * @param schadenshoehe - Schadenshöhe in EUR (muss eine Zahl ≥ 0 sein)
 * @param tarif         - Tarif: 'basis', 'komfort' oder 'premium'
 * @returns BerechnungsErgebnis mit Selbstbeteiligung, Auszahlung und Kürzungs-Flag
 * @throws Error mit deutschsprachiger Fehlermeldung bei ungültigen Eingaben
 */
export function berechneAuszahlung(
  schadenshoehe: unknown,
  tarif: unknown,
): BerechnungsErgebnis {
  // --- Eingabe: Schadenshöhe ---
  if (typeof schadenshoehe !== 'number' || !isFinite(schadenshoehe)) {
    throw new Error(
      'Ungültige Schadenshöhe: Der Wert muss eine endliche Zahl sein.',
    );
  }
  if (isNaN(schadenshoehe)) {
    throw new Error(
      'Ungültige Schadenshöhe: Der Wert darf nicht NaN sein.',
    );
  }
  if (schadenshoehe < 0) {
    throw new Error(
      `Ungültige Schadenshöhe: Der Wert darf nicht negativ sein (erhalten: ${schadenshoehe}).`,
    );
  }

  // --- Eingabe: Tarif ---
  if (!istGueltigerTarif(tarif)) {
    throw new Error(
      `Ungültiger Tarif: "${String(tarif)}" ist nicht bekannt. Gültige Tarife sind: basis, komfort, premium.`,
    );
  }

  const selbstbeteiligung = SELBSTBETEILIGUNG[tarif];
  const obergrenze = OBERGRENZE[tarif];

  // Auszahlung = max(0, Schadenshöhe − Selbstbeteiligung), kaufmännisch gerundet.
  // Differenz wird cent-genau berechnet, um IEEE-754-Fehler zu vermeiden.
  const rohAuszahlung = runden(Math.max(0, differenzInEuro(schadenshoehe, selbstbeteiligung)));

  // Obergrenze anwenden
  let auszahlung: number;
  let gekuerzt: boolean;

  if (rohAuszahlung > obergrenze) {
    auszahlung = obergrenze;
    gekuerzt = true;
  } else {
    auszahlung = rohAuszahlung;
    gekuerzt = false;
  }

  return {
    schadenshoehe,
    selbstbeteiligung,
    auszahlung,
    gekuerzt,
  };
}
