export type Tone = 'neutral' | 'success' | 'warning' | 'danger' | 'blue' | 'purple' | 'teal' | 'gold'

// Warm, always-light palette. `bg` is a soft tint for badges and icon circles, `fg` the readable colour on it.
export const colors = {
  background: '#FAF7F2',
  card: '#FFFFFF',
  text: '#1C1917',
  muted: '#78716C',
  // Chevrons, placeholders and other low-emphasis marks
  faint: '#A8A29E',
  divider: '#EEE9E1',
  // Recessed surfaces: search bar, segmented control track
  fill: '#F0EBE3',
  // Gold fill for primary actions; `accentText` is the darker gold that stays readable as text on white
  accent: '#F2B01E',
  onAccent: '#1C1917',
  accentText: '#9A6700',
  income: '#15803D',
  expense: '#DC2626',
  tones: {
    neutral: { bg: '#F0EBE3', fg: '#57534E' },
    success: { bg: '#DCFCE7', fg: '#166534' },
    warning: { bg: '#FEF3C7', fg: '#92400E' },
    danger: { bg: '#FEE2E2', fg: '#991B1B' },
    blue: { bg: '#DBEAFE', fg: '#1E40AF' },
    purple: { bg: '#EDE9FE', fg: '#5B21B6' },
    teal: { bg: '#CCFBF1', fg: '#115E59' },
    gold: { bg: '#FCF1D2', fg: '#9A6700' },
  } satisfies Record<Tone, { bg: string; fg: string }>,
} as const

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24 } as const
export const radius = { sm: 8, md: 12, lg: 16, pill: 999 } as const

export const font = {
  regular: 'PlusJakartaSans_400Regular',
  medium: 'PlusJakartaSans_500Medium',
  semibold: 'PlusJakartaSans_600SemiBold',
  bold: 'PlusJakartaSans_700Bold',
} as const
