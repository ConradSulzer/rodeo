import {
  DndContext,
  type DragEndEvent,
  useSensor,
  useSensors,
  PointerSensor,
  KeyboardSensor
} from '@dnd-kit/core'
import {
  arrayMove,
  sortableKeyboardCoordinates,
  SortableContext,
  verticalListSortingStrategy,
  useSortable
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { ReactNode } from 'react'
import { TableRow } from '../ui/table'
import { GrDrag } from 'react-icons/gr'

export type DragRenderItem<T extends { id: string }> = (
  item: T,
  options: {
    listeners: ReturnType<typeof useSortable>['listeners']
    setActivatorNodeRef: ReturnType<typeof useSortable>['setActivatorNodeRef']
    isDragging: boolean
  }
) => ReactNode

type DragDropTableProps<T extends { id: string }> = {
  items: readonly T[]
  onReorder: (items: T[]) => void
  children: DragRenderItem<T>
}

export function DragDropTable<T extends { id: string }>({
  items,
  onReorder,
  children
}: DragDropTableProps<T>) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const oldIndex = items.findIndex((item) => item.id === active.id)
    const newIndex = items.findIndex((item) => item.id === over.id)
    if (oldIndex === -1 || newIndex === -1) return

    const mutable = [...items]
    onReorder(arrayMove(mutable, oldIndex, newIndex))
  }

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd} autoScroll={false}>
      <SortableContext items={items.map((item) => item.id)} strategy={verticalListSortingStrategy}>
        {items.map((item) => (
          <SortableTableRow key={item.id} id={item.id} item={item} render={children} />
        ))}
      </SortableContext>
    </DndContext>
  )
}

type DragDropTableRowProps<T extends { id: string }> = {
  id: string
  item: T
  render: DragRenderItem<T>
}

function SortableTableRow<T extends { id: string }>({
  id,
  item,
  render
}: DragDropTableRowProps<T>) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1
  }

  return (
    <TableRow ref={setNodeRef} style={style} className="transition-opacity" {...attributes}>
      {render(item, { listeners, setActivatorNodeRef, isDragging })}
    </TableRow>
  )
}

export function DragHandle({
  listeners,
  setActivatorNodeRef,
  label
}: {
  listeners: ReturnType<typeof useSortable>['listeners']
  setActivatorNodeRef: ReturnType<typeof useSortable>['setActivatorNodeRef']
  label?: string
}) {
  return (
    <button
      type="button"
      ref={setActivatorNodeRef}
      {...listeners}
      className="h-6 w-6 cursor-grab rounded-md bg-transparent text-sm uppercase tracking-[0.3em] ro-text-muted"
      aria-label={label ?? 'Drag to reorder'}
    >
      <GrDrag />
    </button>
  )
}
