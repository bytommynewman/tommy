/** Battle winner = higher proper-score accuracy. Within 0.5 points is a push. */
export function battleWinner(
  a: { userId: string; accuracy: number },
  b: { userId: string; accuracy: number },
): string | null {
  if (Math.abs(a.accuracy - b.accuracy) < 0.5) return null;
  return a.accuracy > b.accuracy ? a.userId : b.userId;
}
