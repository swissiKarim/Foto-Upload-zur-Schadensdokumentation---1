import { berechneAuszahlung } from './schadenberechnung';

// ============================================================
// User Story 1: Auszahlung berechnen
// ============================================================

describe('US1: Auszahlung berechnen', () => {
  describe('Selbstbeteiligungen je Tarif', () => {
    test('Tarif basis: Selbstbeteiligung 500 EUR', () => {
      const ergebnis = berechneAuszahlung(1000, 'basis');
      expect(ergebnis.selbstbeteiligung).toBe(500);
      expect(ergebnis.auszahlung).toBe(500);
    });

    test('Tarif komfort: Selbstbeteiligung 250 EUR', () => {
      const ergebnis = berechneAuszahlung(1000, 'komfort');
      expect(ergebnis.selbstbeteiligung).toBe(250);
      expect(ergebnis.auszahlung).toBe(750);
    });

    test('Tarif premium: Selbstbeteiligung 100 EUR', () => {
      const ergebnis = berechneAuszahlung(1000, 'premium');
      expect(ergebnis.selbstbeteiligung).toBe(100);
      expect(ergebnis.auszahlung).toBe(900);
    });
  });

  describe('Auszahlung nicht kleiner als 0', () => {
    test('Schadenshöhe kleiner als Selbstbeteiligung ergibt 0 EUR Auszahlung', () => {
      const ergebnis = berechneAuszahlung(100, 'basis');
      expect(ergebnis.auszahlung).toBe(0);
    });
  });

  describe('Schadenshöhe 0 EUR', () => {
    test('Schadenshöhe 0 EUR wird korrekt verarbeitet', () => {
      const ergebnis = berechneAuszahlung(0, 'basis');
      expect(ergebnis.schadenshoehe).toBe(0);
      expect(ergebnis.auszahlung).toBe(0);
    });
  });

  describe('Schadenshöhe genau auf Höhe der Selbstbeteiligung', () => {
    test('basis: Schaden = 500 EUR -> Auszahlung 0 EUR', () => {
      const ergebnis = berechneAuszahlung(500, 'basis');
      expect(ergebnis.auszahlung).toBe(0);
    });

    test('komfort: Schaden = 250 EUR -> Auszahlung 0 EUR', () => {
      const ergebnis = berechneAuszahlung(250, 'komfort');
      expect(ergebnis.auszahlung).toBe(0);
    });

    test('premium: Schaden = 100 EUR -> Auszahlung 0 EUR', () => {
      const ergebnis = berechneAuszahlung(100, 'premium');
      expect(ergebnis.auszahlung).toBe(0);
    });
  });

  describe('Kaufmännische Rundung', () => {
    test('Rundungsfall 0,005 EUR wird auf 0,01 aufgerundet', () => {
      // 600.005 - 500 = 100.005 -> kaufmännisch gerundet 100.01 (halber Cent wird aufgerundet)
      const ergebnis = berechneAuszahlung(600.005, 'basis');
      expect(ergebnis.auszahlung).toBe(100.01);
    });

    test('Beträge werden auf zwei Nachkommastellen gerundet', () => {
      // 1000.126 - 500 = 500.126 -> 500.13
      const ergebnis = berechneAuszahlung(1000.126, 'basis');
      expect(ergebnis.auszahlung).toBe(500.13);
    });
  });
});

// ============================================================
// User Story 2: Auszahlungsobergrenze
// ============================================================

describe('US2: Auszahlungsobergrenze', () => {
  describe('Obergrenze basis: 5.000 EUR', () => {
    test('Auszahlung über 5.000 EUR wird auf 5.000 EUR begrenzt', () => {
      // 6000 - 500 = 5500 > 5000 -> 5000, gekuerzt = true
      const ergebnis = berechneAuszahlung(6000, 'basis');
      expect(ergebnis.auszahlung).toBe(5000);
      expect(ergebnis.gekuerzt).toBe(true);
    });

    test('Auszahlung genau 5.000 EUR wird nicht gekürzt', () => {
      // 5500 - 500 = 5000 -> gekuerzt = false
      const ergebnis = berechneAuszahlung(5500, 'basis');
      expect(ergebnis.auszahlung).toBe(5000);
      expect(ergebnis.gekuerzt).toBe(false);
    });

    test('Auszahlung unter 5.000 EUR wird nicht gekürzt', () => {
      const ergebnis = berechneAuszahlung(1000, 'basis');
      expect(ergebnis.auszahlung).toBe(500);
      expect(ergebnis.gekuerzt).toBe(false);
    });
  });

  describe('Obergrenze komfort: 20.000 EUR', () => {
    test('Auszahlung über 20.000 EUR wird auf 20.000 EUR begrenzt', () => {
      // 25000 - 250 = 24750 > 20000 -> 20000, gekuerzt = true
      const ergebnis = berechneAuszahlung(25000, 'komfort');
      expect(ergebnis.auszahlung).toBe(20000);
      expect(ergebnis.gekuerzt).toBe(true);
    });

    test('Auszahlung genau 20.000 EUR wird nicht gekürzt', () => {
      // 20250 - 250 = 20000 -> gekuerzt = false
      const ergebnis = berechneAuszahlung(20250, 'komfort');
      expect(ergebnis.auszahlung).toBe(20000);
      expect(ergebnis.gekuerzt).toBe(false);
    });

    test('Auszahlung unter 20.000 EUR wird nicht gekürzt', () => {
      const ergebnis = berechneAuszahlung(1000, 'komfort');
      expect(ergebnis.auszahlung).toBe(750);
      expect(ergebnis.gekuerzt).toBe(false);
    });
  });

  describe('Obergrenze premium: 50.000 EUR', () => {
    test('Auszahlung über 50.000 EUR wird auf 50.000 EUR begrenzt', () => {
      // 55000 - 100 = 54900 > 50000 -> 50000, gekuerzt = true
      const ergebnis = berechneAuszahlung(55000, 'premium');
      expect(ergebnis.auszahlung).toBe(50000);
      expect(ergebnis.gekuerzt).toBe(true);
    });

    test('Auszahlung genau 50.000 EUR wird nicht gekürzt', () => {
      // 50100 - 100 = 50000 -> gekuerzt = false
      const ergebnis = berechneAuszahlung(50100, 'premium');
      expect(ergebnis.auszahlung).toBe(50000);
      expect(ergebnis.gekuerzt).toBe(false);
    });

    test('Auszahlung unter 50.000 EUR wird nicht gekürzt', () => {
      const ergebnis = berechneAuszahlung(1000, 'premium');
      expect(ergebnis.auszahlung).toBe(900);
      expect(ergebnis.gekuerzt).toBe(false);
    });
  });

  describe('Rundung bei Obergrenze', () => {
    test('Beträge bei Obergrenze werden auf zwei Nachkommastellen gerundet', () => {
      // 500.126 - 500 = 0.126 -> 0.13, nicht gekuerzt
      const ergebnis = berechneAuszahlung(500.126, 'basis');
      expect(ergebnis.auszahlung).toBe(0.13);
      expect(ergebnis.gekuerzt).toBe(false);
    });
  });

  describe('gekuerzt-Feld ist immer gesetzt', () => {
    test('gekuerzt ist false wenn keine Kürzung', () => {
      const ergebnis = berechneAuszahlung(1000, 'basis');
      expect(ergebnis.gekuerzt).toBe(false);
    });

    test('gekuerzt ist true wenn Kürzung angewendet', () => {
      const ergebnis = berechneAuszahlung(10000, 'basis');
      expect(ergebnis.gekuerzt).toBe(true);
    });
  });
});

// ============================================================
// User Story 3: Eingaben prüfen und Fehler melden
// ============================================================

describe('US3: Eingaben prüfen und Fehler melden', () => {
  describe('Negative Schadenshöhe', () => {
    test('Negative Schadenshöhe wird abgewiesen', () => {
      expect(() => berechneAuszahlung(-1, 'basis')).toThrow();
    });

    test('Fehlermeldung bei negativer Schadenshöhe ist auf Deutsch', () => {
      expect(() => berechneAuszahlung(-1, 'basis')).toThrow(
        /negativ/i,
      );
    });
  });

  describe('Keine Zahl als Schadenshöhe', () => {
    test('String wird als Schadenshöhe abgewiesen', () => {
      expect(() => berechneAuszahlung('abc', 'basis')).toThrow();
    });

    test('null wird als Schadenshöhe abgewiesen', () => {
      expect(() => berechneAuszahlung(null, 'basis')).toThrow();
    });

    test('undefined wird als Schadenshöhe abgewiesen', () => {
      expect(() => berechneAuszahlung(undefined, 'basis')).toThrow();
    });

    test('NaN wird als Schadenshöhe abgewiesen', () => {
      expect(() => berechneAuszahlung(NaN, 'basis')).toThrow();
    });

    test('Fehlermeldung bei ungültigem Typ ist auf Deutsch', () => {
      expect(() => berechneAuszahlung('abc', 'basis')).toThrow(
        /Zahl/i,
      );
    });
  });

  describe('Unbekannter Tarif', () => {
    test('Unbekannter Tarif wird abgewiesen', () => {
      expect(() => berechneAuszahlung(1000, 'gold')).toThrow();
    });

    test('Leerer String als Tarif wird abgewiesen', () => {
      expect(() => berechneAuszahlung(1000, '')).toThrow();
    });

    test('null als Tarif wird abgewiesen', () => {
      expect(() => berechneAuszahlung(1000, null)).toThrow();
    });

    test('Fehlermeldung bei unbekanntem Tarif ist auf Deutsch', () => {
      expect(() => berechneAuszahlung(1000, 'gold')).toThrow(
        /Tarif/i,
      );
    });
  });

  describe('Bei ungültigen Eingaben kein falsches Ergebnis', () => {
    test('Bei negativer Schadenshöhe wird kein Ergebnis geliefert', () => {
      let ergebnis: unknown;
      try {
        ergebnis = berechneAuszahlung(-100, 'basis');
      } catch {
        ergebnis = undefined;
      }
      expect(ergebnis).toBeUndefined();
    });

    test('Bei ungültigem Tarif wird kein Ergebnis geliefert', () => {
      let ergebnis: unknown;
      try {
        ergebnis = berechneAuszahlung(1000, 'silber');
      } catch {
        ergebnis = undefined;
      }
      expect(ergebnis).toBeUndefined();
    });
  });
});
