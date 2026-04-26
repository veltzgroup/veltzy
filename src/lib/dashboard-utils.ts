export const calculatePeriodChange = (current: number, previous: number) => {
  if (previous === 0 && current === 0) return { percentage: 0, isPositive: false, isNeutral: true }
  if (previous === 0) return { percentage: 100, isPositive: true, isNeutral: false }
  const pct = Math.round(((current - previous) / previous) * 100)
  return { percentage: Math.abs(pct), isPositive: pct > 0, isNeutral: pct === 0 }
}
