export function stableTabA11yIds(prefix: string, value: string) {
  return {
    triggerId: `${prefix}-trigger-${value}`,
    contentId: `${prefix}-content-${value}`,
  };
}
