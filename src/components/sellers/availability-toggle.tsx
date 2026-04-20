import { useAuthStore } from '@/stores/auth.store'
import { useToggleAvailability } from '@/hooks/use-sellers'
import { cn } from '@/lib/utils'

const AvailabilityToggle = () => {
  const profile = useAuthStore((s) => s.profile)
  const toggle = useToggleAvailability()
  const available = profile?.is_available ?? false

  return (
    <button
      onClick={() => toggle.mutate(!available)}
      className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs text-sidebar-foreground hover:bg-sidebar-accent transition-smooth w-full"
    >
      <span className={cn('h-2 w-2 rounded-full', available ? 'bg-green-500' : 'bg-muted-foreground/30')} />
      <span>{available ? 'Disponivel' : 'Indisponivel'}</span>
    </button>
  )
}

export { AvailabilityToggle }
