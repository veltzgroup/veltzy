import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  Kanban,
  MessageSquare,
  Handshake,
  Settings,
  Shield,
  Building2,
  Crown,
  LogOut,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/hooks/use-auth'
import { useRoles } from '@/hooks/use-roles'
import { ThemeToggle } from '@/components/layout/theme-toggle'
import { NotificationCenter } from '@/components/shared/notification-center'
import { AvailabilityToggle } from '@/components/sellers/availability-toggle'
import { Separator } from '@/components/ui/separator'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'

interface NavItem {
  label: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  disabled?: boolean
  adminOnly?: boolean
  managerOnly?: boolean
  superAdminOnly?: boolean
}

const navItems: NavItem[] = [
  { label: 'Dashboard', href: '/', icon: LayoutDashboard },
  { label: 'Pipeline', href: '/pipeline', icon: Kanban },
  { label: 'Inbox', href: '/inbox', icon: MessageSquare },
  { label: 'Deals', href: '/deals', icon: Handshake, disabled: true },
  { label: 'Admin', href: '/admin', icon: Shield, managerOnly: true },
  { label: 'Empresa', href: '/company', icon: Building2, adminOnly: true },
  { label: 'Super Admin', href: '/super-admin', icon: Crown, superAdminOnly: true },
]

const AppSidebar = () => {
  const { profile, company, signOut } = useAuth()
  const { isAdmin, isManager, isSuperAdmin } = useRoles()

  const initials = profile?.name
    ?.split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() ?? '?'

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

      <nav className="flex-1 space-y-1 px-3 py-4">
        {navItems.map((item) => {
          if (item.superAdminOnly && !isSuperAdmin) return null
          if (item.adminOnly && !isAdmin) return null
          if (item.managerOnly && !isManager) return null

          return (
            <NavLink
              key={item.href}
              to={item.disabled ? '#' : item.href}
              onClick={(e) => item.disabled && e.preventDefault()}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-smooth',
                  isActive && !item.disabled
                    ? 'bg-sidebar-accent text-sidebar-primary font-medium'
                    : 'text-sidebar-foreground hover:bg-sidebar-accent',
                  item.disabled && 'opacity-40 cursor-not-allowed'
                )
              }
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </NavLink>
          )
        })}
      </nav>

      <Separator className="bg-sidebar-border" />

      <div className="space-y-1 px-3 py-3">
        <NavLink
          to="/settings"
          className={({ isActive }) =>
            cn(
              'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-smooth',
              isActive ? 'bg-sidebar-accent text-sidebar-primary font-medium' : 'text-sidebar-foreground hover:bg-sidebar-accent'
            )
          }
        >
          <Settings className="h-4 w-4" />
          Configuracoes
        </NavLink>

        <AvailabilityToggle />

        <div className="flex items-center justify-between px-3">
          <ThemeToggle />
          <NotificationCenter />
        </div>
      </div>

      <Separator className="bg-sidebar-border" />

      <div className="flex items-center gap-3 px-4 py-4">
        <Avatar className="h-8 w-8">
          <AvatarFallback className="text-xs bg-primary/10 text-primary">
            {initials}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{profile?.name}</p>
          <p className="text-xs text-muted-foreground truncate">{profile?.email}</p>
        </div>
        <button
          onClick={signOut}
          className="text-muted-foreground hover:text-destructive transition-smooth"
          title="Sair"
        >
          <LogOut className="h-4 w-4" />
        </button>
      </div>
    </aside>
  )
}

export { AppSidebar }
