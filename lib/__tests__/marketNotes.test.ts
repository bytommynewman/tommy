import { describe, expect, it } from 'vitest';
import { buildMarketNotes, type MarketNoteQuote } from '../marketNotes';

function q(symbol: string, label: string, changePct: number, price = 100): MarketNoteQuote {
  return { symbol, label, price, changePct };
}

const trackers = [
  q('^GSPC', 's&p 500', 0.8),
  q('^IXIC', 'nasdaq', 1.2),
  q('^DJI', 'dow jones', 0.4),
  q('^GSPTSE', 'tsx', 0.3),
  q('BTC-USD', 'bitcoin', 2.1, 109431.4),
];

describe('buildMarketNotes', () => {
  it('covers breadth, leader/laggard, indexes, btc, and the read', () => {
    const stocks = [
      q('NVDA', 'nvidia', 2.41),
      q('AAPL', 'apple', 0.5),
      q('TSLA', 'tesla', -1.83),
    ];
    const notes = buildMarketNotes(trackers, stocks);
    expect(notes).toContain('2 of 3 big names in the green today');
    expect(notes).toContain('leader nvidia +2.41% · laggard tesla -1.83%');
    expect(notes).toContain('s&p 500 +0.80% · nasdaq +1.20% · tsx +0.30%');
    expect(notes).toContain('bitcoin $109,431 +2.10%');
    expect(notes).toContain('read: risk-on — buyers swinging freely');
  });

  it('calls a mostly-red board risk-off', () => {
    const stocks = [
      q('NVDA', 'nvidia', -2.4),
      q('AAPL', 'apple', -0.5),
      q('TSLA', 'tesla', -1.8),
      q('META', 'meta', -3.1),
      q('AMZN', 'amazon', -0.9),
      q('MSFT', 'microsoft', -0.2),
      q('JPM', 'jp morgan', 0.1),
    ];
    const notes = buildMarketNotes([], stocks);
    expect(notes).toContain('1 of 7 big names in the green today');
    expect(notes).toContain('read: risk-off — protect the scorecard');
  });

  it('handles an empty overview without crashing', () => {
    expect(buildMarketNotes([], [])).toEqual([]);
  });

  it('skips the read line when there are too few quotes to call a tone', () => {
    const notes = buildMarketNotes([], [q('NVDA', 'nvidia', 1.0), q('TSLA', 'tesla', -1.0)]);
    expect(notes.some((n) => n.startsWith('read:'))).toBe(false);
  });
});
