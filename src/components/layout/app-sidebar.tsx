import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  Kanban,
  MessageSquare,
  Handshake,
  Settings,
  Shield,
  Crown,
  LogOut,
  ChevronDown,
  Users,
  FileText,
  MessageCircleReply,
  Bot,
  BarChart3,
  ScrollText,
  Lock,
  Plug,
  Building2,
  Palette,
  ClipboardList,
  BrainCircuit,
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
}

interface NavGroup {
  label: string
  icon: React.ComponentType<{ className?: string }>
  visible: boolean
  children: NavItem[]
}

const directItems: NavItem[] = [
  { label: 'Dashboard', href: '/', icon: LayoutDashboard },
  { label: 'Pipeline', href: '/pipeline', icon: Kanban },
  { label: 'Inbox', href: '/inbox', icon: MessageSquare },
  { label: 'Negocios', href: '/deals', icon: Handshake },
]

const AppSidebar = () => {
  const { profile, company, signOut } = useAuth()
  const { canAccessGestao, canAccessAdmin, isSuperAdmin } = useRoles()

  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({})

  const toggleGroup = (key: string) =>
    setOpenGroups((prev) => ({ ...prev, [key]: !prev[key] }))

  const navGroups: NavGroup[] = [
    {
      label: 'Gestao',
      icon: Users,
      visible: canAccessGestao,
      children: [
        { label: 'Vendedores', href: '/gestao?tab=vendedores', icon: Users },
        { label: 'Scripts', href: '/gestao?tab=scripts', icon: FileText },
        { label: 'Auto-Reply', href: '/gestao?tab=auto-reply', icon: MessageCircleReply },
        { label: 'IA SDR', href: '/gestao?tab=ia-sdr', icon: Bot },
        { label: 'Relatorios', href: '/gestao?tab=relatorios', icon: BarChart3 },
        { label: 'Logs comerciais', href: '/gestao?tab=logs-comerciais', icon: ScrollText },
      ],
    },
    {
      label: 'Admin',
      icon: Shield,
      visible: canAccessAdmin,
      children: [
        { label: 'Permissoes', href: '/admin?tab=permissoes', icon: Lock },
        { label: 'Integracoes', href: '/admin?tab=integracoes', icon: Plug },
        { label: 'Empresa', href: '/admin?tab=empresa', icon: Building2 },
        { label: 'Aparencia', href: '/admin?tab=aparencia', icon: Palette },
        { label: 'Logs avancados', href: '/admin?tab=logs-avancados', icon: ClipboardList },
        { label: 'IA SDR avancado', href: '/admin?tab=ia-sdr-avancado', icon: BrainCircuit },
      ],
    },
  ]

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

      <nav className="flex-1 space-y-1 px-3 py-4 overflow-y-auto scrollbar-minimal">
        {directItems.map((item) => (
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
        ))}

        {navGroups.map((group) => {
          if (!group.visible) return null
          const isOpen = !!openGroups[group.label]

          return (
            <div key={group.label}>
              <button
                onClick={() => toggleGroup(group.label)}
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-sidebar-foreground hover:bg-sidebar-accent transition-smooth"
              >
                <group.icon className="h-4 w-4" />
                <span className="flex-1 text-left">{group.label}</span>
                <ChevronDown
                  className={cn(
                    'h-3.5 w-3.5 transition-transform duration-200',
                    isOpen && 'rotate-180'
                  )}
                />
              </button>

              {isOpen && (
                <div className="ml-4 space-y-0.5 mt-0.5">
                  {group.children.map((child) => (
                    <NavLink
                      key={child.href}
                      to={child.href}
                      className={({ isActive }) =>
                        cn(
                          'flex items-center gap-3 rounded-lg px-3 py-1.5 text-sm transition-smooth',
                          isActive
                            ? 'bg-sidebar-accent text-sidebar-primary font-medium'
                            : 'text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground'
                        )
                      }
                    >
                      <child.icon className="h-3.5 w-3.5" />
                      {child.label}
                    </NavLink>
                  ))}
                </div>
              )}
            </div>
          )
        })}

        {isSuperAdmin && (
          <NavLink
            to="/super-admin"
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-smooth',
                isActive
                  ? 'bg-sidebar-accent text-sidebar-primary font-medium'
                  : 'text-sidebar-foreground hover:bg-sidebar-accent'
              )
            }
          >
            <Crown className="h-4 w-4" />
            Super Admin
          </NavLink>
        )}
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
