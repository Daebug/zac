import { Ionicons } from '@expo/vector-icons'
import { format, parseISO } from 'date-fns'
import { useRouter } from 'expo-router'
import { useMemo, useState } from 'react'
import { Pressable, SectionList, StyleSheet, Text, View } from 'react-native'
import {
  Card, EmptyState, GroupSeparator, groupItemStyle, HeaderButton, ScreenHeader, SearchBar, Segmented,
} from '@/components/ui'
import { summarize, useTransactions } from '@/data/transactions'
import { colors, font, space } from '@/lib/theme'
import { formatCurrency, formatDate } from '@/lib/utils'
import type { Transaction, TransactionType } from '@/types'

type TypeFilter = 'all' | TransactionType

const FILTER_OPTIONS: { value: TypeFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'income', label: 'Income' },
  { value: 'expense', label: 'Expenses' },
]

function matchesSearch(transaction: Transaction, query: string) {
  return [transaction.description, transaction.category, transaction.payment_mode, transaction.notes]
    .some(value => value?.toLowerCase().includes(query))
}

// Groups transactions (already newest first) under "Month Year" headings
function groupByMonth(transactions: Transaction[]) {
  const sections: { title: string; data: Transaction[] }[] = []
  let currentMonth = ''
  for (const transaction of transactions) {
    const month = transaction.date.slice(0, 7)
    if (month !== currentMonth) {
      currentMonth = month
      sections.push({ title: format(parseISO(transaction.date), 'MMMM yyyy'), data: [] })
    }
    sections[sections.length - 1].data.push(transaction)
  }
  return sections
}

export default function FundsScreen() {
  const router = useRouter()
  const transactions = useTransactions()
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<TypeFilter>('all')

  const totals = useMemo(() => summarize(transactions), [transactions])

  const sections = useMemo(() => {
    const needle = query.trim().toLowerCase()
    const visible = transactions
      .filter(t => filter === 'all' || t.type === filter)
      .filter(t => needle === '' || matchesSearch(t, needle))
      // Newest first; same-day entries keep the most recently added on top
      .sort((a, b) => b.date.localeCompare(a.date) || b.created_at.localeCompare(a.created_at))
    return groupByMonth(visible)
  }, [transactions, query, filter])

  return (
    <View style={styles.flex}>
      <ScreenHeader
        title="Funds"
        right={<HeaderButton label="Add" icon="add" filled onPress={() => router.push('/transaction/form')} />}
      />

      <SectionList
        sections={sections}
        keyExtractor={transaction => transaction.id}
        contentContainerStyle={styles.list}
        keyboardShouldPersistTaps="handled"
        stickySectionHeadersEnabled={false}
        ItemSeparatorComponent={GroupSeparator}
        ListHeaderComponent={
          <View style={styles.top}>
            <Card>
              <View>
                <Text style={styles.caption}>Club balance</Text>
                <Text style={[styles.balance, totals.balance < 0 && { color: colors.expense }]}>
                  {formatCurrency(totals.balance)}
                </Text>
              </View>
              <View style={styles.split}>
                <View style={styles.flex}>
                  <Text style={styles.caption}>Income</Text>
                  <Text style={[styles.total, { color: colors.income }]}>{formatCurrency(totals.income)}</Text>
                </View>
                <View style={styles.flex}>
                  <Text style={styles.caption}>Expenses</Text>
                  <Text style={[styles.total, { color: colors.expense }]}>{formatCurrency(totals.expenses)}</Text>
                </View>
              </View>
            </Card>
            <SearchBar value={query} onChangeText={setQuery} placeholder="Search transactions" />
            <Segmented options={FILTER_OPTIONS} value={filter} onChange={setFilter} />
          </View>
        }
        ListEmptyComponent={transactions.length === 0
          ? <EmptyState icon="wallet-outline" title="No transactions yet" message="Tap Add at the top to record income or an expense." />
          : <EmptyState icon="search-outline" title="No matches" message="No transactions match your search or filter." />}
        renderSectionHeader={({ section }) => <Text style={styles.month}>{section.title}</Text>}
        renderItem={({ item, index, section }) => {
          const isIncome = item.type === 'income'
          const tone = colors.tones[isIncome ? 'success' : 'danger']
          return (
            <Pressable
              onPress={() => router.push({ pathname: '/transaction/form', params: { id: item.id } })}
              accessibilityRole="button"
              style={({ pressed }) => [styles.row, groupItemStyle(index, section.data.length), pressed && styles.rowPressed]}
            >
              <View style={[styles.icon, { backgroundColor: tone.bg }]}>
                <Ionicons name={isIncome ? 'arrow-down' : 'arrow-up'} size={20} color={tone.fg} />
              </View>
              <View style={styles.rowBody}>
                <Text style={styles.description} numberOfLines={1}>{item.description}</Text>
                <Text style={styles.detail} numberOfLines={1}>
                  {[item.category, formatDate(item.date), item.payment_mode].filter(Boolean).join(' · ')}
                </Text>
              </View>
              <Text style={[styles.amount, { color: isIncome ? colors.income : colors.expense }]}>
                {isIncome ? '+' : '−'}{formatCurrency(item.amount)}
              </Text>
            </Pressable>
          )
        }}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  list: { paddingHorizontal: space.lg, paddingBottom: space.xl * 2 },
  top: { gap: space.md },
  caption: { fontFamily: font.medium, fontSize: 14, color: colors.muted },
  balance: { fontFamily: font.bold, fontSize: 34, color: colors.text, marginTop: 2 },
  split: { flexDirection: 'row', gap: space.lg },
  total: { fontFamily: font.semibold, fontSize: 17, marginTop: 2 },
  month: {
    fontFamily: font.bold, fontSize: 18, color: colors.text,
    marginTop: space.xl, marginBottom: space.sm, paddingHorizontal: space.xs,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingHorizontal: space.lg, paddingVertical: space.md },
  rowPressed: { backgroundColor: colors.fill },
  icon: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  rowBody: { flex: 1, gap: 3 },
  description: { fontFamily: font.semibold, fontSize: 16, color: colors.text },
  detail: { fontFamily: font.regular, fontSize: 13, color: colors.muted },
  amount: { fontFamily: font.bold, fontSize: 15 },
})
