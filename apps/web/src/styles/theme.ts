// Consistent theme across the application
export const themeClasses = {
  // Spacing
  spacing: {
    section: 'space-y-6',
    container: 'space-y-6',
    tight: 'space-y-3',
  },

  // Headers
  pageTitle: 'text-2xl font-semibold text-foreground',
  cardTitle: 'text-sm font-medium text-foreground',
  cardSubtitle: 'text-xs text-muted-foreground',

  // Controls
  headerContainer: 'flex justify-between items-center mb-6',
  controlGroup: 'flex items-center gap-3',
  selectTrigger: 'w-[180px] h-9 text-sm',
  buttonSmall: 'size="sm" className="h-9"',

  // Cards
  card: 'shadow-[0_0_0_1px_rgba(255,255,255,0.06),_0_25px_50px_-30px_rgba(0,0,0,0.7)]',
  cardInteractive: 'shadow-[0_0_0_1px_rgba(255,255,255,0.06),_0_25px_50px_-30px_rgba(0,0,0,0.7)] hover:shadow-[0_0_0_1px_rgba(255,255,255,0.1),_0_35px_60px_-30px_rgba(0,0,0,0.8)] transition-shadow',
  cardHeader: 'border-b border-white/10 bg-white/5',
  cardContent: 'pt-4',

  // Grids
  gridCols: 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6',
  gridTight: 'grid grid-cols-1 lg:grid-cols-2 gap-3',

  // Text colors
  textMuted: 'text-muted-foreground',
  textNormal: 'text-foreground',
  textRed: 'text-destructive',
  textGreen: 'text-emerald-400',

  // Empty state
  emptyState: 'py-12 text-center text-muted-foreground',
};
