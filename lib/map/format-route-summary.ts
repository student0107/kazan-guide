export function formatWalkingSummary(distanceM: number, durationS: number): string {
  const km =
    distanceM >= 1000
      ? `${(distanceM / 1000).toFixed(1).replace(".", ",")} км`
      : `${Math.round(distanceM)} м`;
  const min = Math.max(1, Math.round(durationS / 60));
  return `Пешком ≈ ${km}, ~${min} мин`;
}
