import { berechneAuszahlung, BerechnungsErgebnis } from './index';

// ---------------------------------------------------------------------------
// Hilfsfunktion
// ---------------------------------------------------------------------------
function berechne(schadenshoehe: number, tarif: string): BerechnungsErgebnis {
  return berechneAuszahlung(schadenshoehe, tarif);
}

// ===========================================================================
// User Story 1: Auszahlung berechnen
// ===========================================================================
describe('US1 – Auszahlung berechnen', () => {

  // --- Tarif basis ---
  describe('Tarif basis (Selbstbeteiligung 500 EUR)', () => {
    it('akzeptiert Schadenshöhe ≥ 0 und liefert korrekte Selbstbeteiligung', () => {
      const ergebnis = berechne(1000, 'basis');
      expect(ergebnis.selbstbeteiligung).toBe(500);
    });

    it('Schadenshöhe 0 EUR → Auszahlung 0 EUR', () => {
      const ergebnis = berechne(0, 'basis');
      expect(ergebnis.auszahlung).toBe(0);
      expect(ergebnis.schadenshoehe).toBe(0);
    });

    it('Schadenshöhe = Selbstbeteiligung (500 EUR) → Auszahlung 0 EUR', () => {
      const ergebnis = berechne(500, 'basis');
      expect(ergebnis.auszahlung).toBe(0);
    });

    it('Schadenshöhe < Selbstbeteiligung → Auszahlung 0 EUR (nicht negativ)', () => {
      const ergebnis = berechne(200, 'basis');
      expect(ergebnis.auszahlung).toBe(0);
    });

    it('Schadenshöhe 1000 EUR → Auszahlung 500 EUR', () => {
      const ergebnis = berechne(1000, 'basis');
      expect(ergebnis.auszahlung).toBe(500);
    });

    it('Rundungsfall 0,005 EUR: Schadenshöhe 500,005 EUR → Auszahlung 0,01 EUR', () => {
      const ergebnis = berechne(500.005, 'basis');
      expect(ergebnis.auszahlung).toBe(0.01);
    });
  });

  // --- Tarif komfort ---
  describe('Tarif komfort (Selbstbeteiligung 250 EUR)', () => {
    it('akzeptiert Tarif komfort und liefert korrekte Selbstbeteiligung', () => {
      const ergebnis = berechne(1000, 'komfort');
      expect(ergebnis.selbstbeteiligung).toBe(250);
    });

    it('Schadenshöhe 0 EUR → Auszahlung 0 EUR', () => {
      const ergebnis = berechne(0, 'komfort');
      expect(ergebnis.auszahlung).toBe(0);
    });

    it('Schadenshöhe = Selbstbeteiligung (250 EUR) → Auszahlung 0 EUR', () => {
      const ergebnis = berechne(250, 'komfort');
      expect(ergebnis.auszahlung).toBe(0);
    });

    it('Schadenshöhe 1000 EUR → Auszahlung 750 EUR', () => {
      const ergebnis = berechne(1000, 'komfort');
      expect(ergebnis.auszahlung).toBe(750);
    });

    it('Rundungsfall 0,005 EUR: Schadenshöhe 250,005 EUR → Auszahlung 0,01 EUR', () => {
      const ergebnis = berechne(250.005, 'komfort');
      expect(ergebnis.auszahlung).toBe(0.01);
    });
  });

  // --- Tarif premium ---
  describe('Tarif premium (Selbstbeteiligung 100 EUR)', () => {
    it('akzeptiert Tarif premium und liefert korrekte Selbstbeteiligung', () => {
      const ergebnis = berechne(1000, 'premium');
      expect(ergebnis.selbstbeteiligung).toBe(100);
    });

    it('Schadenshöhe 0 EUR → Auszahlung 0 EUR', () => {
      const ergebnis = berechne(0, 'premium');
      expect(ergebnis.auszahlung).toBe(0);
    });

    it('Schadenshöhe = Selbstbeteiligung (100 EUR) → Auszahlung 0 EUR', () => {
      const ergebnis = berechne(100, 'premium');
      expect(ergebnis.auszahlung).toBe(0);
    });

    it('Schadenshöhe 1000 EUR → Auszahlung 900 EUR', () => {
      const ergebnis = berechne(1000, 'premium');
      expect(ergebnis.auszahlung).toBe(900);
    });

    it('Rundungsfall 0,005 EUR: Schadenshöhe 100,005 EUR → Auszahlung 0,01 EUR', () => {
      const ergebnis = berechne(100.005, 'premium');
      expect(ergebnis.auszahlung).toBe(0.01);
    });
  });

  // --- Ergebnisobjekt-Struktur ---
  describe('Ergebnisobjekt BerechnungsErgebnis', () => {
    it('enthält alle Pflichtfelder: schadenshoehe, selbstbeteiligung, auszahlung, gekuerzt', () => {
      const ergebnis = berechne(1000, 'basis');
      expect(ergebnis).toHaveProperty('schadenshoehe');
      expect(ergebnis).toHaveProperty('selbstbeteiligung');
      expect(ergebnis).toHaveProperty('auszahlung');
      expect(ergebnis).toHaveProperty('gekuerzt');
    });

    it('schadenshoehe im Ergebnis entspricht dem Eingabewert', () => {
      const ergebnis = berechne(1234.56, 'komfort');
      expect(ergebnis.schadenshoehe).toBe(1234.56);
    });

    it('nicht gekürztes Ergebnis hat gekuerzt = false', () => {
      const ergebnis = berechne(1000, 'basis');
      expect(ergebnis.gekuerzt).toBe(false);
    });
  });

  // --- Allgemeine Rundung ---
  describe('Kaufmännische Rundung auf 2 Nachkommastellen', () => {
    it('Ergebnis hat maximal zwei Nachkommastellen', () => {
      const ergebnis = berechne(1000.1, 'basis');
      const str = ergebnis.auszahlung.toString();
      const dezimalstellen = str.includes('.') ? str.split('.')[1].length : 0;
      expect(dezimalstellen).toBeLessThanOrEqual(2);
    });

    it('Schadenshöhe 500,004 EUR bei basis → Auszahlung 0,00 EUR (abrunden)', () => {
      const ergebnis = berechne(500.004, 'basis');
      expect(ergebnis.auszahlung).toBe(0);
    });
  });
});

// ===========================================================================
// User Story 2: Auszahlungsobergrenze
// ===========================================================================
describe('US2 – Auszahlungsobergrenze', () => {

  // --- basis: Obergrenze 5.000 EUR ---
  describe('Tarif basis (Obergrenze 5.000 EUR)', () => {
    it('Auszahlung unter Obergrenze → nicht gekürzt', () => {
      const ergebnis = berechne(1000, 'basis');
      expect(ergebnis.auszahlung).toBe(500);
      expect(ergebnis.gekuerzt).toBe(false);
    });

    it('Auszahlung genau auf Obergrenze (5.500 EUR Schaden) → nicht gekürzt', () => {
      const ergebnis = berechne(5500, 'basis');
      expect(ergebnis.auszahlung).toBe(5000);
      expect(ergebnis.gekuerzt).toBe(false);
    });

    it('Auszahlung über Obergrenze → auf 5.000 EUR begrenzt, gekuerzt = true', () => {
      const ergebnis = berechne(10000, 'basis');
      expect(ergebnis.auszahlung).toBe(5000);
      expect(ergebnis.gekuerzt).toBe(true);
    });

    it('Sehr hoher Schaden → auf Obergrenze 5.000 EUR begrenzt', () => {
      const ergebnis = berechne(100000, 'basis');
      expect(ergebnis.auszahlung).toBe(5000);
      expect(ergebnis.gekuerzt).toBe(true);
    });
  });

  // --- komfort: Obergrenze 20.000 EUR ---
  describe('Tarif komfort (Obergrenze 20.000 EUR)', () => {
    it('Auszahlung unter Obergrenze → nicht gekürzt', () => {
      const ergebnis = berechne(1000, 'komfort');
      expect(ergebnis.auszahlung).toBe(750);
      expect(ergebnis.gekuerzt).toBe(false);
    });

    it('Auszahlung genau auf Obergrenze (20.250 EUR Schaden) → nicht gekürzt', () => {
      const ergebnis = berechne(20250, 'komfort');
      expect(ergebnis.auszahlung).toBe(20000);
      expect(ergebnis.gekuerzt).toBe(false);
    });

    it('Auszahlung über Obergrenze → auf 20.000 EUR begrenzt, gekuerzt = true', () => {
      const ergebnis = berechne(25000, 'komfort');
      expect(ergebnis.auszahlung).toBe(20000);
      expect(ergebnis.gekuerzt).toBe(true);
    });
  });

  // --- premium: Obergrenze 50.000 EUR ---
  describe('Tarif premium (Obergrenze 50.000 EUR)', () => {
    it('Auszahlung unter Obergrenze → nicht gekürzt', () => {
      const ergebnis = berechne(1000, 'premium');
      expect(ergebnis.auszahlung).toBe(900);
      expect(ergebnis.gekuerzt).toBe(false);
    });

    it('Auszahlung genau auf Obergrenze (50.100 EUR Schaden) → nicht gekürzt', () => {
      const ergebnis = berechne(50100, 'premium');
      expect(ergebnis.auszahlung).toBe(50000);
      expect(ergebnis.gekuerzt).toBe(false);
    });

    it('Auszahlung über Obergrenze → auf 50.000 EUR begrenzt, gekuerzt = true', () => {
      const ergebnis = berechne(60000, 'premium');
      expect(ergebnis.auszahlung).toBe(50000);
      expect(ergebnis.gekuerzt).toBe(true);
    });
  });

  // --- Rundung bei Obergrenzen ---
  describe('Kaufmännische Rundung bei Obergrenzenfällen', () => {
    it('Betrag knapp über Obergrenze (nach Rundung) wird korrekt begrenzt', () => {
      // Schaden 5500.01 EUR, Tarif basis → Rohwert 5000.01 EUR > 5000 EUR → gekürzt
      const ergebnis = berechne(5500.01, 'basis');
      expect(ergebnis.auszahlung).toBe(5000);
      expect(ergebnis.gekuerzt).toBe(true);
    });
  });
});

// ===========================================================================
// User Story 3: Eingaben prüfen und Fehler melden
// ===========================================================================
describe('US3 – Eingaben prüfen und Fehler melden', () => {

  // --- Negative Schadenshöhe ---
  describe('Negative Schadenshöhe', () => {
    it('wirft einen Fehler bei -1 EUR', () => {
      expect(() => berechne(-1, 'basis')).toThrow();
    });

    it('Fehlermeldung ist auf Deutsch', () => {
      expect(() => berechne(-1, 'basis')).toThrow(/[Uu]ngültig|[Nn]egativ/);
    });

    it('liefert kein falsches Berechnungsergebnis', () => {
      expect(() => berechne(-0.01, 'komfort')).toThrow(Error);
    });
  });

  // --- Keine Zahl als Schadenshöhe ---
  describe('Keine Zahl als Schadenshöhe', () => {
    it('wirft einen Fehler bei string "1000"', () => {
      expect(() => berechneAuszahlung('1000', 'basis')).toThrow();
    });

    it('wirft einen Fehler bei null', () => {
      expect(() => berechneAuszahlung(null, 'basis')).toThrow();
    });

    it('wirft einen Fehler bei undefined', () => {
      expect(() => berechneAuszahlung(undefined, 'basis')).toThrow();
    });

    it('wirft einen Fehler bei NaN', () => {
      expect(() => berechneAuszahlung(NaN, 'basis')).toThrow();
    });

    it('wirft einen Fehler bei Infinity', () => {
      expect(() => berechneAuszahlung(Infinity, 'basis')).toThrow();
    });

    it('wirft einen Fehler bei -Infinity', () => {
      expect(() => berechneAuszahlung(-Infinity, 'basis')).toThrow();
    });

    it('wirft einen Fehler bei einem Objekt', () => {
      expect(() => berechneAuszahlung({}, 'basis')).toThrow();
    });

    it('Fehlermeldung ist auf Deutsch', () => {
      expect(() => berechneAuszahlung('abc', 'basis')).toThrow(/[Uu]ngültig/);
    });
  });

  // --- Unbekannter Tarif ---
  describe('Unbekannter Tarif', () => {
    it('wirft einen Fehler bei Tarif "gold"', () => {
      expect(() => berechne(1000, 'gold')).toThrow();
    });

    it('wirft einen Fehler bei leerem String', () => {
      expect(() => berechneAuszahlung(1000, '')).toThrow();
    });

    it('wirft einen Fehler bei null als Tarif', () => {
      expect(() => berechneAuszahlung(1000, null)).toThrow();
    });

    it('wirft einen Fehler bei undefined als Tarif', () => {
      expect(() => berechneAuszahlung(1000, undefined)).toThrow();
    });

    it('wirft einen Fehler bei Tarif "BASIS" (Groß-/Kleinschreibung)', () => {
      expect(() => berechne(1000, 'BASIS')).toThrow();
    });

    it('Fehlermeldung enthält den ungültigen Tarif und ist auf Deutsch', () => {
      expect(() => berechne(1000, 'silber')).toThrow(/[Uu]ngültig.*[Tt]arif|[Tt]arif.*[Uu]ngültig/);
    });

    it('liefert kein falsches Berechnungsergebnis bei unbekanntem Tarif', () => {
      expect(() => berechne(1000, 'unbekannt')).toThrow(Error);
    });
  });

  // --- Fehlermeldungen allgemein ---
  describe('Fehlermeldungen', () => {
    it('Fehlermeldung ist eine Instanz von Error', () => {
      expect(() => berechne(-1, 'basis')).toThrow(Error);
      expect(() => berechneAuszahlung('x', 'basis')).toThrow(Error);
      expect(() => berechne(1000, 'unbekannt')).toThrow(Error);
    });

    it('Fehlermeldung ist nicht leer', () => {
      try {
        berechne(-1, 'basis');
        fail('Kein Fehler geworfen');
      } catch (e) {
        expect(e instanceof Error && e.message.length).toBeGreaterThan(0);
      }
    });
  });
});
