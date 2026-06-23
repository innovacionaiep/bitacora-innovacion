'use client';

import { useVirtualizer } from '@tanstack/react-virtual';
import { useCallback, useEffect, type RefObject } from 'react';
import type { Activity } from '@/hooks/useGantt';

type GanttActivityListProps<TActivityRowProps> = {
  activities: Activity[];
  expandedDescriptions: Set<string>;
  scrollContainerRef: RefObject<HTMLDivElement | null>;
  renderActivityRow: (
    activity: Activity,
    virtualRow: { index: number; start: number }
  ) => React.ReactNode;
};

/**
 * Lista virtualizada de filas del Gantt (solo renderiza filas visibles).
 */
export function GanttActivityVirtualList({
  activities,
  expandedDescriptions,
  scrollContainerRef,
  renderActivityRow,
}: GanttActivityListProps<unknown>) {
  const getActivityRowHeight = useCallback(
    (activity: Activity) => {
      const isExpanded = expandedDescriptions.has(activity.id);
      const baseHeight = 3 + 50;
      const taskHeight = isExpanded ? activity.tasks.length * 22 : 0;
      return Math.max(48, baseHeight + taskHeight + 10);
    },
    [expandedDescriptions]
  );

  const rowVirtualizer = useVirtualizer({
    count: activities.length,
    getScrollElement: () => scrollContainerRef.current,
    estimateSize: (index) => getActivityRowHeight(activities[index]),
    overscan: 4,
  });

  useEffect(() => {
    rowVirtualizer.measure();
  }, [expandedDescriptions, activities.length, rowVirtualizer]);

  return (
    <div
      style={{
        height: `${rowVirtualizer.getTotalSize()}px`,
        width: '100%',
        position: 'relative',
      }}
    >
      {rowVirtualizer.getVirtualItems().map((virtualRow) => {
        const activity = activities[virtualRow.index];
        return (
          <div
            key={activity.id}
            data-index={virtualRow.index}
            ref={rowVirtualizer.measureElement}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              transform: `translateY(${virtualRow.start}px)`,
            }}
          >
            {renderActivityRow(activity, virtualRow)}
          </div>
        );
      })}
    </div>
  );
}
