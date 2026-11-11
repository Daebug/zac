import { Ionicons } from '@expo/vector-icons'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useEffect, useMemo, useState } from 'react'
import { BackHandler, FlatList, Pressable, StyleSheet, Text, View } from 'react-native'
import {
  Avatar, BottomBar, Button, CategoryBadge, EmptyState, GroupSeparator, groupItemStyle, HeaderButton, ScreenHeader,
  SearchBar, Segmented, StatusBadge, TextButton,
} from '@/components/ui'
import { deleteMembers, useMembers } from '@/data/members'
import { confirmDestructive, hapticSelect, hapticSuccess } from '@/lib/feedback'
import { colors, font, space } from '@/lib/theme'
import { formatDate, plural } from '@/lib/utils'
import type { MemberStatus, MemberWithStatus } from '@/types'

type StatusFilter = 'all' | MemberStatus

const FILTER_LABELS: Record<StatusFilter, string> = {
  all: 'All',
  active: 'Active',
  expiring_soon: 'Expiring',
  expired: 'Expired',
}
const FILTERS = Object.keys(FILTER_LABELS) as StatusFilter[]

const SORTS = [
  { label: 'Name', compare: (a: MemberWithStatus, b: MemberWithStatus) => a.name.localeCompare(b.name) },
  { label: 'Expiry date', compare: (a: MemberWithStatus, b: MemberWithStatus) => a.expiry_date.localeCompare(b.expiry_date) },
  { label: 'Newest', compare: (a: MemberWithStatus, b: MemberWithStatus) => b.date_joined.localeCompare(a.date_joined) },
]

function matchesSearch(member: MemberWithStatus, query: string) {
  return [member.name, member.contact, member.category, member.address]
    .some(value => value?.toLowerCase().includes(query))
}

function toggled<T>(set: Set<T>, value: T): Set<T> {
  const next = new Set(set)
  if (!next.delete(value)) next.add(value)
  return next
}

export default function MembersScreen() {
  const router = useRouter()
  const params = useLocalSearchParams<{ status?: string; at?: string }>()
  const members = useMembers()
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<StatusFilter>('all')
  const [sortIndex, setSortIndex] = useState(0)
  // null = browsing; a set (possibly empty) = select mode
  const [selected, setSelected] = useState<Set<string> | null>(null)

  // Home's summary tiles open this screen with a filter already chosen
  useEffect(() => {
    if (FILTERS.includes(params.status as StatusFilter)) setFilter(params.status as StatusFilter)
  }, [params.status, params.at])

  const counts = useMemo(() => {
    const result: Record<StatusFilter, number> = { all: members.length, active: 0, expiring_soon: 0, expired: 0 }
    for (const member of members) result[member.status]++
    return result
  }, [members])

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return members
      .filter(m => filter === 'all' || m.status === filter)
      .filter(m => needle === '' || matchesSearch(m, needle))
      .sort(SORTS[sortIndex].compare)
  }, [members, query, filter, sortIndex])

  // The Android back button leaves select mode before it leaves the screen
  useEffect(() => {
    if (!selected) return
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      setSelected(null)
      return true
    })
    return () => subscription.remove()
  }, [selected])

  const toggle = (id: string) => setSelected(current => toggled(current ?? new Set(), id))

  const removeSelected = (ids: string[]) => confirmDestructive(
    `Remove ${plural(ids.length, 'member')}?`,
    'Their past payments stay in Funds. This cannot be undone.',
    'Remove',
    () => {
      deleteMembers(ids)
      setSelected(null)
      hapticSuccess()
    },
  )

  const editSelected = (ids: string[]) => {
    router.push({ pathname: '/member/bulk-edit', params: { ids: ids.join(',') } })
    setSelected(null)
  }

  const selectedIds = selected ? [...selected] : []

  return (
    <View style={styles.flex}>
      <ScreenHeader
        title={selected ? `${selected.size} Selected` : 'Members'}
        right={selected ? (
          <>
            <HeaderButton label="Select All" onPress={() => setSelected(new Set(visible.map(m => m.id)))} />
            <HeaderButton label="Cancel" onPress={() => setSelected(null)} />
          </>
        ) : (
          <>
            {members.length > 0 ? <HeaderButton label="Select" onPress={() => setSelected(new Set())} /> : null}
            <HeaderButton label="Add" icon="add" filled onPress={() => router.push('/member/form')} />
          </>
        )}
      />

      <View style={styles.controls}>
        <SearchBar value={query} onChangeText={setQuery} placeholder="Search members" />
        <Segmented
          options={FILTERS.map(value => ({ value, label: `${FILTER_LABELS[value]} ${counts[value]}` }))}
          value={filter}
          onChange={setFilter}
        />
        <View style={styles.listInfo}>
          <Text style={styles.count}>{plural(visible.length, 'member')}</Text>
          <TextButton
            label={`Sort: ${SORTS[sortIndex].label}`}
            icon="swap-vertical"
            onPress={() => setSortIndex(index => (index + 1) % SORTS.length)}
          />
        </View>
      </View>

      <FlatList
        data={visible}
        keyExtractor={member => member.id}
        contentContainerStyle={styles.list}
        keyboardShouldPersistTaps="handled"
        ItemSeparatorComponent={GroupSeparator}
        ListEmptyComponent={members.length === 0
          ? <EmptyState icon="people-outline" title="No members yet" message="Tap Add at the top to add your first member." />
          : <EmptyState icon="search-outline" title="No matches" message="No members match your search or filter." />}
        renderItem={({ item, index }) => {
          const isSelected = selected?.has(item.id) ?? false
          return (
            <Pressable
              onPress={() => (selected ? toggle(item.id) : router.push({ pathname: '/member/[id]', params: { id: item.id } }))}
              onLongPress={() => {
                hapticSelect()
                toggle(item.id)
              }}
              accessibilityRole="button"
              accessibilityState={selected ? { selected: isSelected } : undefined}
              style={({ pressed }) => [styles.row, groupItemStyle(index, visible.length), pressed && styles.rowPressed]}
            >
              {selected ? (
                <Ionicons
                  name={isSelected ? 'checkmark-circle' : 'ellipse-outline'}
                  size={26}
                  color={isSelected ? colors.accentText : colors.faint}
                />
              ) : null}
              <Avatar name={item.name} uri={item.photo_uri} size={48} />
              <View style={styles.rowBody}>
                <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
                <Text style={styles.detail} numberOfLines={1}>Expires {formatDate(item.expiry_date)}</Text>
                <View style={styles.badges}>
                  <StatusBadge status={item.status} />
                  <CategoryBadge category={item.category} />
                </View>
              </View>
              {selected ? null : <Ionicons name="chevron-forward" size={18} color={colors.faint} />}
            </Pressable>
          )
        }}
      />

      {selected ? (
        <BottomBar>
          <Button title="Edit" icon="create-outline" variant="secondary" flex disabled={selected.size === 0}
            onPress={() => editSelected(selectedIds)} />
          <Button title="Remove" icon="trash-outline" variant="danger" flex disabled={selected.size === 0}
            onPress={() => removeSelected(selectedIds)} />
        </BottomBar>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  controls: { paddingHorizontal: space.lg, paddingBottom: space.md, gap: space.md },
  listInfo: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: space.xs },
  count: { fontFamily: font.medium, fontSize: 14, color: colors.muted },
  list: { paddingHorizontal: space.lg, paddingBottom: space.xl * 2 },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingHorizontal: space.lg, paddingVertical: space.md },
  rowPressed: { backgroundColor: colors.fill },
  rowBody: { flex: 1, gap: 4 },
  name: { fontFamily: font.semibold, fontSize: 17, color: colors.text },
  detail: { fontFamily: font.regular, fontSize: 14, color: colors.muted },
  badges: { flexDirection: 'row', gap: space.xs, marginTop: 2 },
})
