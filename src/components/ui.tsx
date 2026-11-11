import { Ionicons } from '@expo/vector-icons'
import { Children, Fragment, type ComponentProps, type ReactNode } from 'react'
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, TextInput, View, type ViewStyle } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { colors, font, radius, space, type Tone } from '@/lib/theme'
import { STATUS_LABEL, type MemberStatus } from '@/types'

export type IconName = ComponentProps<typeof Ionicons>['name']

// Large page title for tab screens, with an optional small line above it and actions on the right
export function ScreenHeader({ eyebrow, title, right }: { eyebrow?: string; title: string; right?: ReactNode }) {
  const insets = useSafeAreaInsets()
  return (
    <View style={[styles.header, { paddingTop: insets.top + space.md }]}>
      {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
      <View style={styles.headerRow}>
        <Text style={styles.headerTitle} numberOfLines={1} adjustsFontSizeToFit>{title}</Text>
        {right ? <View style={styles.headerActions}>{right}</View> : null}
      </View>
    </View>
  )
}

// Compact labelled action for headers. `filled` is the gold primary style, otherwise plain gold text.
export function HeaderButton({ label, onPress, icon, filled = false }: {
  label: string
  onPress: () => void
  icon?: IconName
  filled?: boolean
}) {
  const color = filled ? colors.onAccent : colors.accentText
  return (
    <Pressable
      onPress={onPress}
      hitSlop={space.sm}
      accessibilityRole="button"
      style={({ pressed }) => [styles.headerButton, filled && styles.headerButtonFilled, pressed && styles.pressed]}
    >
      {icon ? <Ionicons name={icon} size={18} color={color} /> : null}
      <Text style={[styles.headerButtonText, { color }]}>{label}</Text>
    </Pressable>
  )
}

// Tappable summary: tinted icon, a big number, and a label
export function SummaryTile({ icon, tone, value, label, onPress }: {
  icon: IconName
  tone: Tone
  value: string
  label: string
  onPress: () => void
}) {
  const { bg, fg } = colors.tones[tone]
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${label}: ${value}`}
      style={({ pressed }) => [styles.tile, pressed && styles.pressed]}
    >
      <View style={styles.tileTop}>
        <View style={[styles.iconCircle, { backgroundColor: bg }]}>
          <Ionicons name={icon} size={20} color={fg} />
        </View>
        <Text style={styles.tileValue}>{value}</Text>
      </View>
      <Text style={styles.tileLabel} numberOfLines={1}>{label}</Text>
    </Pressable>
  )
}

// One-of-many filter shown as a single bar of segments
export function Segmented<T extends string>({ options, value, onChange }: {
  options: readonly { value: T; label: string }[]
  value: T
  onChange: (value: T) => void
}) {
  return (
    <View style={styles.segmented} accessibilityRole="tablist">
      {options.map((option) => {
        const selected = option.value === value
        return (
          <Pressable
            key={option.value}
            onPress={() => onChange(option.value)}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            style={[styles.segment, selected && styles.segmentSelected]}
          >
            <Text
              style={[styles.segmentText, selected && styles.segmentTextSelected]}
              numberOfLines={1}
              adjustsFontSizeToFit
            >
              {option.label}
            </Text>
          </Pressable>
        )
      })}
    </View>
  )
}

function Divider() {
  return <View style={styles.divider} />
}

// Rounded white container that draws a thin divider between its children
export function Group({ children }: { children: ReactNode }) {
  const items = Children.toArray(children)
  return (
    <View style={styles.group}>
      {items.map((child, index) => (
        <Fragment key={index}>
          {index > 0 ? <Divider /> : null}
          {child}
        </Fragment>
      ))}
    </View>
  )
}

// Rounds only the outer corners, so separately rendered list items read as one group
export function groupItemStyle(index: number, count: number): ViewStyle {
  return {
    backgroundColor: colors.card,
    borderTopLeftRadius: index === 0 ? radius.lg : 0,
    borderTopRightRadius: index === 0 ? radius.lg : 0,
    borderBottomLeftRadius: index === count - 1 ? radius.lg : 0,
    borderBottomRightRadius: index === count - 1 ? radius.lg : 0,
  }
}

// Divider between list items rendered with groupItemStyle
export function GroupSeparator() {
  return <View style={styles.separator}><Divider /></View>
}

export function Row({ left, title, subtitle, right, onPress, chevron = false }: {
  left?: ReactNode
  title: string
  subtitle?: string
  right?: ReactNode
  onPress?: () => void
  chevron?: boolean
}) {
  const content = (
    <>
      {left}
      <View style={styles.rowBody}>
        <Text style={styles.rowTitle} numberOfLines={1}>{title}</Text>
        {subtitle ? <Text style={styles.rowSubtitle} numberOfLines={1}>{subtitle}</Text> : null}
      </View>
      {right}
      {chevron ? <Ionicons name="chevron-forward" size={18} color={colors.faint} /> : null}
    </>
  )
  return onPress
    ? (
      <Pressable onPress={onPress} accessibilityRole="button" style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}>
        {content}
      </Pressable>
    )
    : <View style={styles.row}>{content}</View>
}

// Icon in a tinted circle, for the left side of a Row
export function IconCircle({ icon, tone }: { icon: IconName; tone: Tone }) {
  const { bg, fg } = colors.tones[tone]
  return (
    <View style={[styles.iconCircle, { backgroundColor: bg }]}>
      <Ionicons name={icon} size={20} color={fg} />
    </View>
  )
}

export function Badge({ label, tone }: { label: string; tone: Tone }) {
  const { bg, fg } = colors.tones[tone]
  return (
    <View style={[styles.badge, { backgroundColor: bg }]}>
      <Text style={[styles.badgeText, { color: fg }]}>{label}</Text>
    </View>
  )
}

export const STATUS_TONE: Record<MemberStatus, Tone> = { active: 'success', expiring_soon: 'warning', expired: 'danger' }

export function StatusBadge({ status }: { status: MemberStatus }) {
  return <Badge label={STATUS_LABEL[status]} tone={STATUS_TONE[status]} />
}

const CATEGORY_TONE: Record<string, Tone> = { Barebow: 'blue', Compound: 'purple', Recurve: 'teal' }

export function CategoryBadge({ category }: { category: string | null }) {
  return category ? <Badge label={category} tone={CATEGORY_TONE[category] ?? 'neutral'} /> : null
}

export function Avatar({ name, uri, size }: { name: string; uri: string | null; size: number }) {
  const shape = { width: size, height: size, borderRadius: size / 2 }
  if (uri) return <Image source={{ uri }} style={shape} accessibilityLabel={`Photo of ${name}`} />
  const initials = name.trim().split(/\s+/).slice(0, 2).map(part => part[0]?.toUpperCase() ?? '').join('')
  return (
    <View style={[shape, styles.avatar]}>
      <Text style={[styles.avatarText, { fontSize: size * 0.38 }]}>{initials}</Text>
    </View>
  )
}

export function Chip({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      style={[styles.chip, selected && styles.chipSelected]}
    >
      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{label}</Text>
    </Pressable>
  )
}

export function SearchBar({ value, onChangeText, placeholder }: {
  value: string
  onChangeText: (text: string) => void
  placeholder: string
}) {
  return (
    <View style={styles.search}>
      <Ionicons name="search" size={18} color={colors.muted} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.muted}
        style={styles.searchInput}
        autoCorrect={false}
        returnKeyType="search"
      />
      {value ? (
        <Pressable onPress={() => onChangeText('')} hitSlop={space.md} accessibilityLabel="Clear search">
          <Ionicons name="close-circle" size={18} color={colors.faint} />
        </Pressable>
      ) : null}
    </View>
  )
}

type ButtonVariant = 'primary' | 'secondary' | 'danger'

const BUTTON_COLORS: Record<ButtonVariant, { bg: string; fg: string; border: string }> = {
  primary: { bg: colors.accent, fg: colors.onAccent, border: colors.accent },
  secondary: { bg: colors.card, fg: colors.text, border: colors.divider },
  danger: { bg: colors.tones.danger.bg, fg: colors.tones.danger.fg, border: colors.tones.danger.bg },
}

// With `flex`, the button shares a row equally with its siblings
export function Button({ title, onPress, variant = 'primary', icon, loading = false, disabled = false, flex = false }: {
  title: string
  onPress: () => void
  variant?: ButtonVariant
  icon?: IconName
  loading?: boolean
  disabled?: boolean
  flex?: boolean
}) {
  const { bg, fg, border } = BUTTON_COLORS[variant]
  const inactive = disabled || loading
  return (
    <Pressable
      onPress={onPress}
      disabled={inactive}
      accessibilityRole="button"
      accessibilityState={{ disabled: inactive, busy: loading }}
      style={({ pressed }) => [
        styles.button,
        flex && styles.flex,
        { backgroundColor: bg, borderColor: border, opacity: inactive ? 0.45 : pressed ? 0.8 : 1 },
      ]}
    >
      {loading
        ? <ActivityIndicator color={fg} />
        : icon ? <Ionicons name={icon} size={18} color={fg} /> : null}
      <Text style={[styles.buttonText, { color: fg }]} numberOfLines={1}>{title}</Text>
    </Pressable>
  )
}

// Low-emphasis inline action, shown as gold text
export function TextButton({ label, onPress, icon }: { label: string; onPress: () => void; icon?: IconName }) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={space.md}
      accessibilityRole="button"
      style={({ pressed }) => [styles.textButton, pressed && styles.pressed]}
    >
      {icon ? <Ionicons name={icon} size={16} color={colors.accentText} /> : null}
      <Text style={styles.textButtonLabel}>{label}</Text>
    </Pressable>
  )
}

// Action bar pinned to the bottom of a screen
export function BottomBar({ children }: { children: ReactNode }) {
  return <View style={styles.bottomBar}>{children}</View>
}

export function EmptyState({ icon, title, message }: { icon: IconName; title: string; message: string }) {
  return (
    <View style={styles.empty}>
      <View style={[styles.emptyIcon, { backgroundColor: colors.tones.gold.bg }]}>
        <Ionicons name={icon} size={30} color={colors.accentText} />
      </View>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyMessage}>{message}</Text>
    </View>
  )
}

// Padded white surface for free-form content
export function Card({ children }: { children: ReactNode }) {
  return <View style={styles.card}>{children}</View>
}

export function SectionTitle({ children, action }: { children: string; action?: ReactNode }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{children}</Text>
      {action}
    </View>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  pressed: { opacity: 0.6 },
  header: { paddingHorizontal: space.lg, paddingBottom: space.md, backgroundColor: colors.background },
  eyebrow: { fontFamily: font.semibold, fontSize: 13, color: colors.muted, textTransform: 'uppercase', letterSpacing: 0.4 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: space.md, minHeight: 44 },
  headerTitle: { flex: 1, fontFamily: font.bold, fontSize: 32, color: colors.text },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  headerButton: { flexDirection: 'row', alignItems: 'center', gap: space.xs, minHeight: 38, paddingHorizontal: space.xs },
  headerButtonFilled: { backgroundColor: colors.accent, borderRadius: radius.pill, paddingHorizontal: space.lg },
  headerButtonText: { fontFamily: font.semibold, fontSize: 15 },
  tile: { flex: 1, backgroundColor: colors.card, borderRadius: radius.lg, padding: space.lg, gap: space.md },
  tileTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  tileValue: { fontFamily: font.bold, fontSize: 28, color: colors.text },
  tileLabel: { fontFamily: font.semibold, fontSize: 15, color: colors.muted },
  iconCircle: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  segmented: { flexDirection: 'row', backgroundColor: colors.fill, borderRadius: radius.md, padding: 3 },
  segment: { flex: 1, minHeight: 38, alignItems: 'center', justifyContent: 'center', borderRadius: radius.md - 3, paddingHorizontal: space.xs },
  segmentSelected: { backgroundColor: colors.card, elevation: 1 },
  segmentText: { fontFamily: font.medium, fontSize: 13, color: colors.muted },
  segmentTextSelected: { fontFamily: font.semibold, color: colors.text },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.divider, marginLeft: space.lg },
  separator: { backgroundColor: colors.card },
  group: { backgroundColor: colors.card, borderRadius: radius.lg, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md, minHeight: 60, paddingHorizontal: space.lg, paddingVertical: space.md },
  rowPressed: { backgroundColor: colors.fill },
  rowBody: { flex: 1, gap: 2 },
  rowTitle: { fontFamily: font.semibold, fontSize: 16, color: colors.text },
  rowSubtitle: { fontFamily: font.regular, fontSize: 14, color: colors.muted },
  badge: { alignSelf: 'flex-start', borderRadius: radius.pill, paddingHorizontal: space.sm + 2, paddingVertical: 4 },
  badgeText: { fontFamily: font.semibold, fontSize: 12 },
  avatar: { alignItems: 'center', justifyContent: 'center', backgroundColor: colors.tones.gold.bg },
  avatarText: { fontFamily: font.bold, color: colors.accentText },
  chip: {
    borderWidth: 1,
    borderColor: colors.divider,
    backgroundColor: colors.card,
    borderRadius: radius.pill,
    paddingHorizontal: space.lg,
    minHeight: 40,
    justifyContent: 'center',
  },
  chipSelected: { backgroundColor: colors.accent, borderColor: colors.accent },
  chipText: { fontFamily: font.medium, fontSize: 14, color: colors.text },
  chipTextSelected: { fontFamily: font.semibold, color: colors.onAccent },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    backgroundColor: colors.fill,
    borderRadius: radius.md,
    paddingHorizontal: space.md,
    height: 46,
  },
  searchInput: { flex: 1, fontFamily: font.regular, fontSize: 16, color: colors.text, paddingVertical: 0 },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.sm,
    borderWidth: 1,
    borderRadius: radius.md,
    minHeight: 52,
    paddingHorizontal: space.lg,
  },
  buttonText: { fontFamily: font.semibold, fontSize: 16 },
  textButton: { flexDirection: 'row', alignItems: 'center', gap: space.xs },
  textButtonLabel: { fontFamily: font.semibold, fontSize: 14, color: colors.accentText },
  bottomBar: {
    flexDirection: 'row',
    gap: space.md,
    padding: space.lg,
    backgroundColor: colors.card,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.divider,
  },
  empty: { alignItems: 'center', paddingVertical: space.xl * 2, paddingHorizontal: space.xl, gap: space.sm },
  emptyIcon: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center', marginBottom: space.xs },
  emptyTitle: { fontFamily: font.semibold, fontSize: 17, color: colors.text },
  emptyMessage: { fontFamily: font.regular, fontSize: 15, color: colors.muted, textAlign: 'center', lineHeight: 21 },
  card: { backgroundColor: colors.card, borderRadius: radius.lg, padding: space.lg, gap: space.lg },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: space.xs },
  sectionTitle: { fontFamily: font.bold, fontSize: 20, color: colors.text },
})
