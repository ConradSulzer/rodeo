import {
  DndContext,
  type DragEndEvent,
  type DragOverEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors
} from '@dnd-kit/core'
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable
} from '@dnd-kit/sortable'
import { restrictToParentElement } from '@dnd-kit/modifiers'
import { CSS } from '@dnd-kit/utilities'
import { useEffect, useState, type ReactNode } from 'react'
import { GrDrag } from 'react-icons/gr'
import { Pill } from '../ui/pill'
import { cn } from '../../lib/utils'

export type DraggablePillItem = {
  id: string
  label: ReactNode
  ariaLabel?: string
}

type DraggablePillListProps = {
  items: readonly DraggablePillItem[]
  onReorder: (orderedIds: string[]) => void
  className?: string
}

export function DraggablePillList({ items, onReorder, className = '' }: DraggablePillListProps) {
  // Keep a local ordered copy so we can preview pill movement without committing to the DB yet.
  const [orderedItems, setOrderedItems] = useState<readonly DraggablePillItem[]>(items)

  useEffect(() => {
    // Once the parent pushes a new order (e.g. after mutation success), sync the preview list.
    setOrderedItems(items)
  }, [items])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = orderedItems.findIndex((item) => item.id === active.id)
    const newIndex = orderedItems.findIndex((item) => item.id === over.id)
    if (oldIndex === -1 || newIndex === -1) return
    const ordered = arrayMove(orderedItems.slice(), oldIndex, newIndex)
    setOrderedItems(ordered)
    onReorder(ordered.map((item) => item.id))
  }

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    setOrderedItems((prev) => {
      const oldIndex = prev.findIndex((item) => item.id === active.id)
      const newIndex = prev.findIndex((item) => item.id === over.id)
      if (oldIndex === -1 || newIndex === -1) return prev
      return arrayMove(prev.slice(), oldIndex, newIndex)
    })
  }

  const handleDragCancel = () => {
    // If the drag is aborted (ESC), reset to whatever the parent last gave us.
    setOrderedItems(items)
  }

  if (!items.length) return null

  return (
    <DndContext
      sensors={sensors}
      onDragEnd={handleDragEnd}
      onDragOver={handleDragOver}
      onDragCancel={handleDragCancel}
      autoScroll={false}
      modifiers={[restrictToParentElement]}
    >
      <SortableContext items={orderedItems.map((item) => item.id)} strategy={rectSortingStrategy}>
        <div className={cn('flex flex-wrap gap-2', className)}>
          {orderedItems.map((item) => (
            <SortablePill key={item.id} item={item} />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  )
}

type SortablePillProps = {
  item: DraggablePillItem
}

function SortablePill({ item }: SortablePillProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: item.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.85 : 1
  }

  return (
    <span ref={setNodeRef} style={style} className="inline-flex shrink-0" {...attributes}>
      <Pill variant="drag" size="sm" className="flex items-center gap-2 pr-3 whitespace-nowrap">
        <button
          type="button"
          ref={setActivatorNodeRef}
          {...listeners}
          className="flex h-5 w-5 cursor-grab items-center justify-center rounded-full bg-transparent text-xs ro-text-muted"
          aria-label={item.ariaLabel ?? 'Drag to reorder'}
        >
          <GrDrag />
        </button>
        <span>{item.label}</span>
      </Pill>
    </span>
  )
}
