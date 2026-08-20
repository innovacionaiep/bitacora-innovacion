'use client';

import * as React from 'react';
import * as TabsPrimitive from '@radix-ui/react-tabs';

import { cn } from '@/lib/utils';
import { stableTabA11yIds } from '@/lib/stable-tab-ids';

const TabsStableIdContext = React.createContext<string | undefined>(undefined);

const Tabs = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Root>
>(({ id, ...props }, ref) => (
  <TabsStableIdContext.Provider value={id}>
    <TabsPrimitive.Root ref={ref} id={id} {...props} />
  </TabsStableIdContext.Provider>
));
Tabs.displayName = TabsPrimitive.Root.displayName;

const TabsList = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.List
    ref={ref}
    className={cn(
      'inline-flex h-9 items-center justify-center rounded-lg bg-muted p-1 text-muted-foreground',
      className
    )}
    {...props}
  />
));
TabsList.displayName = TabsPrimitive.List.displayName;

const TabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
>(({ className, value, id, ...props }, ref) => {
  const prefix = React.useContext(TabsStableIdContext);
  const ids = prefix && value ? stableTabA11yIds(prefix, value) : undefined;
  const ariaControls = props['aria-controls'];
  return (
    <TabsPrimitive.Trigger
      ref={ref}
      value={value}
      className={cn(
        'inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow',
        className
      )}
      {...props}
      {...(id || ids
        ? {
            id: id ?? ids?.triggerId,
            'aria-controls': ariaControls ?? ids?.contentId,
          }
        : {})}
    />
  );
});
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName;

const TabsContent = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, value, id, ...props }, ref) => {
  const prefix = React.useContext(TabsStableIdContext);
  const ids = prefix && value ? stableTabA11yIds(prefix, value) : undefined;
  const ariaLabelledBy = props['aria-labelledby'];
  return (
    <TabsPrimitive.Content
      ref={ref}
      value={value}
      className={cn(
        'mt-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
        className
      )}
      {...props}
      {...(id || ids
        ? {
            id: id ?? ids?.contentId,
            'aria-labelledby': ariaLabelledBy ?? ids?.triggerId,
          }
        : {})}
    />
  );
});
TabsContent.displayName = TabsPrimitive.Content.displayName;

export { Tabs, TabsList, TabsTrigger, TabsContent };
