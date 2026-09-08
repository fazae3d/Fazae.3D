"use client";

import { useState } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";

export type KanbanColumn = { key: string; label: string };

export type KanbanBoardProps<T> = {
  columns: KanbanColumn[];
  items: T[];
  getItemId: (item: T) => string;
  getItemColumn: (item: T) => string;
  renderCard: (item: T) => React.ReactNode;
  onMove: (itemId: string, newColumnKey: string) => void;
};

function KanbanCard<T>({
  item,
  id,
  renderCard,
}: {
  item: T;
  id: string;
  renderCard: (item: T) => React.ReactNode;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id });

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={`cursor-grab touch-none border border-mist bg-paper p-3 text-xs text-ink active:cursor-grabbing ${
        isDragging ? "opacity-30" : ""
      }`}
    >
      {renderCard(item)}
    </div>
  );
}

function KanbanColumnDroppable({
  column,
  children,
  count,
}: {
  column: KanbanColumn;
  children: React.ReactNode;
  count: number;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: column.key });

  return (
    <div
      ref={setNodeRef}
      className={`flex w-72 shrink-0 flex-col gap-3 border border-mist p-3 transition-colors ${
        isOver ? "bg-mist/30" : "bg-mist/10"
      }`}
    >
      <div className="flex items-center justify-between border-b border-mist pb-2">
        <span className="label-caps text-[11px] text-graphite">{column.label}</span>
        <span className="label-caps border border-mist px-1.5 py-0.5 text-[10px] text-graphite">{count}</span>
      </div>
      <div className="flex flex-col gap-2">{children}</div>
    </div>
  );
}

export function KanbanBoard<T>({
  columns,
  items,
  getItemId,
  getItemColumn,
  renderCard,
  onMove,
}: KanbanBoardProps<T>) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const byId = new Map(items.map((item) => [getItemId(item), item]));
  const activeItem = activeId ? byId.get(activeId) : undefined;

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(String(event.active.id));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = event;
    if (!over) return;
    const itemId = String(active.id);
    const newColumnKey = String(over.id);
    const item = byId.get(itemId);
    if (!item || getItemColumn(item) === newColumnKey) return;
    onMove(itemId, newColumnKey);
  };

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="flex gap-4 overflow-x-auto pb-4">
        {columns.map((column) => {
          const columnItems = items.filter((item) => getItemColumn(item) === column.key);
          return (
            <KanbanColumnDroppable key={column.key} column={column} count={columnItems.length}>
              {columnItems.map((item) => (
                <KanbanCard key={getItemId(item)} id={getItemId(item)} item={item} renderCard={renderCard} />
              ))}
            </KanbanColumnDroppable>
          );
        })}
      </div>
      <DragOverlay>
        {activeItem ? (
          <div className="w-72 cursor-grabbing border border-petrol bg-paper p-3 text-xs text-ink shadow-lg">
            {renderCard(activeItem)}
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
