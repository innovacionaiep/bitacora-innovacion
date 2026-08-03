'use client';

import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

type SectionPanelProps = {
  title: string;
  icon?: LucideIcon;
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
  headerClassName?: string;
  bodyClassName?: string;
};

export function SectionPanel({
  title,
  icon: Icon,
  children,
  footer,
  className,
  headerClassName,
  bodyClassName,
}: SectionPanelProps) {
  return (
    <section
      className={cn(
        'rounded-lg border border-gray-200 bg-white shadow-none overflow-hidden',
        className
      )}
    >
      <header
        className={cn(
          'shrink-0 flex items-center gap-2 px-5 py-3 border-b border-gray-100 bg-gray-50/90',
          headerClassName
        )}
      >
        {Icon ? (
          <span className="text-gray-500 [&_svg]:h-3.5 [&_svg]:w-3.5">
            <Icon strokeWidth={1.75} />
          </span>
        ) : null}
        <h3 className="text-[13px] font-medium tracking-wide text-gray-800">
          {title}
        </h3>
      </header>
      <div className={cn('px-5 py-4', bodyClassName)}>{children}</div>
      {footer ? (
        <div className="shrink-0 px-5 py-2.5 border-t border-gray-100 bg-white">
          {footer}
        </div>
      ) : null}
    </section>
  );
}
