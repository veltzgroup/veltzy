import { useNavigate } from 'react-router-dom'
import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  Kanban,
  MessageSquare,
  Handshake,
  Shield,
  Crown,
  LogOut,
  Users,
  User,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/hooks/use-auth'
import { useRoles } from '@/hooks/use-roles'
import { useToggleAvailability } from '@/hooks/use-sellers'
import { useTeamMembers } from '@/hooks/use-team'
import { ThemeToggle } from '@/components/layout/theme-toggle'
import { NotificationCenter } from '@/components/shared/notification-center'
import { Separator } from '@/components/ui/separator'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'

interface NavItem {
  label: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  visible?: boolean
}

const getInitials = (name: string | undefined) =>
  name
    ?.split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() ?? '?'

const AppSidebar = () => {
  const navigate = useNavigate()
  const { profile, company, signOut } = useAuth()
  const { canAccessGestao, canAccessAdmin, isSuperAdmin, isAdmin, isManager } = useRoles()
  const toggle = useToggleAvailability()
  const { data: members } = useTeamMembers()

  const available = profile?.is_available ?? false
  const onlineMembers = members?.filter((m) => m.is_available && m.id !== profile?.id) ?? []

  const navItems: NavItem[] = [
    { label: 'Dashboard', href: '/', icon: LayoutDashboard },
    { label: 'Pipeline', href: '/pipeline', icon: Kanban },
    { label: 'Inbox', href: '/inbox', icon: MessageSquare },
    { label: 'Negócios', href: '/deals', icon: Handshake },
    { label: 'Gestão', href: '/gestao', icon: Users, visible: canAccessGestao },
    { label: 'Admin', href: '/admin', icon: Shield, visible: canAccessAdmin },
    { label: 'Super Admin', href: '/super-admin', icon: Crown, visible: isSuperAdmin },
  ]

  const initials = getInitials(profile?.name)

  return (
    <aside className="flex h-screen w-64 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground">
      <div className="flex items-center gap-3 px-4 py-5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold text-sm">
          V
        </div>
        <div className="flex flex-col">
          <span className="text-sm font-semibold truncate max-w-[160px]">
            {company?.name ?? 'Veltzy'}
          </span>
          <span className="text-xs text-muted-foreground">CRM</span>
        </div>
      </div>

      <Separator className="bg-sidebar-border" />

      <nav className="flex-1 space-y-1 px-3 py-4 overflow-y-auto scrollbar-minimal">
        {navItems.map((item) => {
          if (item.visible === false) return null

          return (
            <NavLink
              key={item.href}
              to={item.href}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-smooth',
                  isActive
                    ? 'bg-sidebar-accent text-sidebar-primary font-medium'
                    : 'text-sidebar-foreground hover:bg-sidebar-accent'
                )
              }
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </NavLink>
          )
        })}
      </nav>

      {(isAdmin || isManager) && (
        <>
          <Separator className="bg-sidebar-border" />
          <div className="px-4 py-3">
            <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground mb-2">
              Usuários online
            </p>
            {onlineMembers.length === 0 ? (
              <p className="text-xs text-muted-foreground/60">Nenhum usuário online</p>
            ) : (
              <div className="space-y-1.5 max-h-28 overflow-y-auto scrollbar-minimal">
                {onlineMembers.map((m) => (
                  <div key={m.id} className="flex items-center gap-2">
                    <Avatar className="h-5 w-5">
                      <AvatarFallback className="text-[8px] bg-primary/10 text-primary">
                        {getInitials(m.name)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-xs truncate">{m.name}</span>
                    <span className="h-1.5 w-1.5 rounded-full bg-green-500 shrink-0 ml-auto" />
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      <Separator className="bg-sidebar-border" />

      <div className="flex items-center justify-between px-4 py-2">
        <ThemeToggle />
        <NotificationCenter />
      </div>

      <Separator className="bg-sidebar-border" />

      <div className="flex items-center gap-3 px-4 py-4">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-3 flex-1 min-w-0 text-left hover:opacity-80 transition-smooth">
              <Avatar className="h-8 w-8 shrink-0">
                <AvatarFallback className="text-xs bg-primary/10 text-primary">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{profile?.name}</p>
                <p className="text-xs text-muted-foreground truncate">{profile?.email}</p>
              </div>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="top" align="start" className="w-48">
            <DropdownMenuItem onClick={() => navigate('/minha-conta')}>
              <User className="h-4 w-4" />
              Minha conta
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={signOut} className="text-destructive focus:text-destructive">
              <LogOut className="h-4 w-4" />
              Sair
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={() => toggle.mutate(!available)}
              className="shrink-0 p-1"
            >
              <span
                className={cn(
                  'block h-2.5 w-2.5 rounded-full transition-smooth',
                  available
                    ? 'bg-green-500 shadow-[0_0_6px_rgba(34,197,94,0.5)]'
                    : 'bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.5)]'
                )}
              />
            </button>
          </TooltipTrigger>
          <TooltipContent side="top">
            {available ? 'Disponível' : 'Indisponível'}
          </TooltipContent>
        </Tooltip>
      </div>
    </aside>
  )
}

export { AppSidebar }
