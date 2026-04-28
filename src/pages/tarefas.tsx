import { useState, useMemo } from 'react'
import {
  DndContext, closestCorners, PointerSensor, useSensor, useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { useDroppable } from '@dnd-kit/core'
import {
  ListTodo, Plus, Search, Loader2, ClipboardList,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { TaskCard } from '@/components/tarefas/task-card'
import { CreateTaskModal } from '@/components/tarefas/create-task-modal'
import { EditTaskModal } from '@/components/tarefas/edit-task-modal'
import { useTasks, useUpdateTaskStatus } from '@/hooks/use-tasks'
import { useTeamMembers } from '@/hooks/use-team'
import { useAuthStore } from '@/stores/auth.store'
import { useRoles } from '@/hooks/use-roles'
import type { TaskWithRelations, TaskType, TaskStatus } from '@/types/database'

type Tab = 'all' | 'mine' | 'team'

const columns: Array<{ status: TaskStatus; label: string; color: string }> = [
  { status: 'pending', label: 'A fazer', color: 'bg-yellow-500' },
  { status: 'in_progress', label: 'Em andamento', color: 'bg-blue-500' },
  { status: 'done', label: 'Feito', color: 'bg-emerald-500' },
]

interface DroppableColumnProps {
  status: TaskStatus
  label: string
  color: string
  tasks: TaskWithRelations[]
  onEdit: (task: TaskWithRelations) => void
}

const DroppableColumn = ({ status, label, color, tasks, onEdit }: DroppableColumnProps) => {
  const { setNodeRef, isOver } = useDroppable({ id: status })

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'flex flex-col rounded-xl bg-muted/30 border border-border/30 min-h-[300px]',
        isOver && 'ring-2 ring-primary/30',
      )}
    >
      <div className="flex items-center gap-2 px-3 py-2.5 border-b border-border/20">
        <span className={cn('h-2 w-2 rounded-full', color)} />
        <span className="text-sm font-medium">{label}</span>
        <span className="ml-auto text-xs text-muted-foreground">{tasks.length}</span>
      </div>

      <div className="flex-1 p-2 space-y-2 overflow-y-auto scrollbar-minimal max-h-[calc(100vh-280px)]">
        <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
          {tasks.map((task) => (
            <TaskCard key={task.id} task={task} onEdit={onEdit} />
          ))}
        </SortableContext>

        {tasks.length === 0 && (
          <div className="flex items-center justify-center py-8 text-muted-foreground/50">
            <p className="text-xs">Nenhuma tarefa</p>
          </div>
        )}
      </div>
    </div>
  )
}

const TarefasPage = () => {
  const profile = useAuthStore((s) => s.profile)
  const { isAdmin, isManager } = useRoles()
  const [tab, setTab] = useState<Tab>('all')
  const [typeFilter, setTypeFilter] = useState<TaskType | 'all'>('all')
  const [assignedFilter, setAssignedFilter] = useState<string>('all')
  const [search, setSearch] = useState('')
  const [createOpen, setCreateOpen] = useState(false)
  const [editTask, setEditTask] = useState<TaskWithRelations | null>(null)

  const { data: members } = useTeamMembers()
  const { data: allTasks, isLoading } = useTasks()
  const updateStatus = useUpdateTaskStatus()

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  )

  const filtered = useMemo(() => {
    if (!allTasks) return []
    let result = allTasks

    if (tab === 'mine') result = result.filter((t) => t.assigned_to === profile?.id)
    if (tab === 'team') result = result.filter((t) => t.assigned_to !== profile?.id)

    if (typeFilter !== 'all') result = result.filter((t) => t.type === typeFilter)
    if (assignedFilter !== 'all') result = result.filter((t) => t.assigned_to === assignedFilter)
    if (search) {
      const q = search.toLowerCase()
      result = result.filter((t) => t.title.toLowerCase().includes(q))
    }

    return result
  }, [allTasks, tab, typeFilter, assignedFilter, search, profile?.id])

  const columnTasks = (status: TaskStatus) => filtered.filter((t) => t.status === status)

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over) return

    const taskId = active.id as string
    const newStatus = over.id as TaskStatus
    const task = allTasks?.find((t) => t.id === taskId)
    if (!task || task.status === newStatus) return

    updateStatus.mutate({ taskId, status: newStatus })
  }

  const tabs: Array<{ key: Tab; label: string; visible: boolean }> = [
    { key: 'all', label: 'Todas', visible: true },
    { key: 'mine', label: 'Minhas tarefas', visible: true },
    { key: 'team', label: 'Equipe', visible: isAdmin || isManager },
  ]

  return (
    <div className="min-h-full p-6">
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15">
              <ListTodo className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Tarefas</h1>
              <p className="text-sm text-muted-foreground">Gerencie atividades e acompanhamentos</p>
            </div>
          </div>
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Nova Tarefa
          </Button>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-4 border-b">
          {tabs.map((t) => t.visible && (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={cn(
                'pb-2 text-sm transition-smooth border-b-2',
                tab === t.key
                  ? 'border-primary text-primary font-medium'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              )}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar tarefa..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-9 w-52 pl-8"
            />
          </div>
          <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as TaskType | 'all')}>
            <SelectTrigger className="h-9 w-36">
              <SelectValue placeholder="Tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os tipos</SelectItem>
              <SelectItem value="todo">Tarefa</SelectItem>
              <SelectItem value="followup">Follow-up</SelectItem>
              <SelectItem value="call">Ligacao</SelectItem>
              <SelectItem value="meeting">Reuniao</SelectItem>
            </SelectContent>
          </Select>
          <Select value={assignedFilter} onValueChange={setAssignedFilter}>
            <SelectTrigger className="h-9 w-40">
              <SelectValue placeholder="Responsavel" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {members?.map((m) => (
                <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Kanban */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : allTasks?.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted">
              <ClipboardList className="h-8 w-8 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground">Nenhuma tarefa criada ainda</p>
            <Button variant="outline" size="sm" onClick={() => setCreateOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Criar primeira tarefa
            </Button>
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCorners}
            onDragEnd={handleDragEnd}
          >
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {columns.map((col) => (
                <DroppableColumn
                  key={col.status}
                  status={col.status}
                  label={col.label}
                  color={col.color}
                  tasks={columnTasks(col.status)}
                  onEdit={setEditTask}
                />
              ))}
            </div>
          </DndContext>
        )}
      </div>

      <CreateTaskModal open={createOpen} onClose={() => setCreateOpen(false)} />
      <EditTaskModal task={editTask} open={!!editTask} onClose={() => setEditTask(null)} />
    </div>
  )
}

export default TarefasPage
