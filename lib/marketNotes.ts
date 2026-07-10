// Caddie's read: turns the day's quotes into short jot notes for the market
// screen. Pure function on already-fetched data, per the lib/ convention.

export type MarketNoteQuote = {
  symbol: string;
  label: string;
  price: number;
  changePct: number;
};

function pct(n: number): string {
  return `${n >= 0 ? '+' : ''}${n.toFixed(2)}%`;
}

export function buildMarketNotes(trackers: MarketNoteQuote[], stocks: MarketNoteQuote[]): string[] {
  const notes: string[] = [];

  if (stocks.length > 0) {
    const up = stocks.filter((s) => s.changePct >= 0).length;
    notes.push(`${up} of ${stocks.length} big names in the green today`);
    const sorted = [...stocks].sort((a, b) => b.changePct - a.changePct);
    const lead = sorted[0];
    const lag = sorted[sorted.length - 1];
    if (lead !== lag) {
      notes.push(`leader ${lead.label} ${pct(lead.changePct)} · laggard ${lag.label} ${pct(lag.changePct)}`);
    }
  }

  const idx = ['^GSPC', '^IXIC', '^GSPTSE']
    .map((s) => trackers.find((t) => t.symbol === s))
    .filter((t): t is MarketNoteQuote => !!t);
  if (idx.length > 0) {
    notes.push(idx.map((t) => `${t.label} ${pct(t.changePct)}`).join(' · '));
  }

  const btc = trackers.find((t) => t.symbol === 'BTC-USD');
  if (btc) {
    notes.push(`bitcoin $${Math.round(btc.price).toLocaleString('en-US')} ${pct(btc.changePct)}`);
  }

  // The one-line read: how much of the board is green sets the tone.
  const all = [...stocks, ...idx];
  if (all.length >= 3) {
    const upShare = all.filter((q) => q.changePct >= 0).length / all.length;
    notes.push(
      upShare >= 0.7
        ? 'read: risk-on — buyers swinging freely'
        : upShare <= 0.3
          ? 'read: risk-off — protect the scorecard'
          : 'read: mixed tape — pick your spots'
    );
  }

  return notes;
}
