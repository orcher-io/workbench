'use client';

import { type ReactNode } from 'react';
import { Box } from '@radix-ui/themes';
import { useDroppable } from '@dnd-kit/core';
import type { DropPosition } from '../models';

export interface DropZoneProps {
  /** Pane ID this drop zone belongs to */
  paneId: string;
  /** Children to render */
  children: ReactNode;
  /**
   * Retained for API compatibility — the actual split is resolved by the
   * DndContext in layout-renderer (it owns the active tab). Unused here.
   */
  onDrop?: (tabId: string, paneId: string, position: DropPosition) => void;
  /** Whether drop zone is active (dragging in progress) */
  isDragging?: boolean;
}

const ZONE_SIZE = 80; // px-thick edge band that triggers an edge split

/** Geometry of the thin detection band for each split position. */
const bandStyle: Record<DropPosition, React.CSSProperties> = {
  left: { left: 0, top: 0, bottom: 0, width: ZONE_SIZE },
  right: { right: 0, top: 0, bottom: 0, width: ZONE_SIZE },
  top: { top: 0, left: 0, right: 0, height: ZONE_SIZE },
  bottom: { bottom: 0, left: 0, right: 0, height: ZONE_SIZE },
  center: {
    top: ZONE_SIZE,
    left: ZONE_SIZE,
    right: ZONE_SIZE,
    bottom: ZONE_SIZE,
  },
};

/** Geometry of the highlight preview shown while hovering a split position. */
const previewStyle: Record<DropPosition, React.CSSProperties> = {
  left: { top: 0, left: 0, bottom: 0, width: '50%' },
  right: { top: 0, right: 0, bottom: 0, width: '50%' },
  top: { top: 0, left: 0, right: 0, height: '50%' },
  bottom: { bottom: 0, left: 0, right: 0, height: '50%' },
  center: { inset: ZONE_SIZE },
};

/**
 * One droppable split region (a thin edge band, or the center). dnd-kit
 * detects it geometrically, so it can stay `pointerEvents: none` and never
 * interfere with the editor underneath. When the dragged tab is over it, a
 * translucent preview of the resulting pane is shown.
 */
function SplitDropRegion({
  paneId,
  position,
}: {
  paneId: string;
  position: DropPosition;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: `zone:${paneId}:${position}`,
    data: { type: 'zone', paneId, position },
  });

  return (
    <>
      <Box
        ref={setNodeRef}
        style={{
          position: 'absolute',
          pointerEvents: 'none',
          ...bandStyle[position],
        }}
      />
      {isOver && (
        <Box
          style={{
            position: 'absolute',
            pointerEvents: 'none',
            zIndex: 5,
            backgroundColor: 'var(--accent-a3)',
            border: '1px solid var(--accent-7)',
            borderRadius: 3,
            ...previewStyle[position],
          }}
        />
      )}
    </>
  );
}

const POSITIONS: DropPosition[] = ['left', 'right', 'top', 'bottom', 'center'];

/**
 * Drop zone for splitting a pane by dragging a tab to its edge. The split
 * itself is performed by the DndContext in layout-renderer on drop; this
 * component only contributes the droppable regions and their hover previews.
 */
export function DropZone({ paneId, children }: DropZoneProps) {
  return (
    <Box
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        minHeight: 0,
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {children}
      {POSITIONS.map((position) => (
        <SplitDropRegion key={position} paneId={paneId} position={position} />
      ))}
    </Box>
  );
}
