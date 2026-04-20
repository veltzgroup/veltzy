export const timeAgo = (dateStr: string): string => {
  const now = Date.now()
  const then = new Date(dateStr).getTime()
  const diffMs = now - then

  const minutes = Math.floor(diffMs / 60000)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)
  const weeks = Math.floor(days / 7)
  const months = Math.floor(days / 30)

  if (months > 0) return `${months}m`
  if (weeks > 0) return `${weeks}sem`
  if (days > 0) return `${days}d`
  if (hours > 0) return `${hours}h`
  if (minutes > 0) return `${minutes}min`
  return 'agora'
}
