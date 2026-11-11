import { format } from 'date-fns'
import { useRouter } from 'expo-router'
import { useMemo } from 'react'
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native'
import {
  Avatar, Button, Card, Group, Row, ScreenHeader, SectionTitle, STATUS_TONE, SummaryTile, TextButton,
} from '@/components/ui'
import { useMembers } from '@/data/members'
import { summarize, useTransactions } from '@/data/transactions'
import { hapticSuccess } from '@/lib/feedback'
import { colors, font, space } from '@/lib/theme'
import { expiryPhrase, formatCurrency, formatDateTime, plural } from '@/lib/utils'
import { usePendingCount, useSyncState } from '@/sync/hooks'
import { useSync } from '@/sync/SyncContext'
import type { MemberStatus } from '@/types'

const ATTENTION_LIMIT = 5

export default function HomeScreen() {
  const router = useRouter()
  const members = useMembers()
  const transactions = useTransactions()
  const syncState = useSyncState()
  const pending = usePendingCount()
  const { syncing, syncNow } = useSync()

  const counts = useMemo(() => {
    const result: Record<MemberStatus, number> = { active: 0, expiring_soon: 0, expired: 0 }
    for (const member of members) result[member.status]++
    return result
  }, [members])

  const totals = useMemo(() => summarize(transactions), [transactions])

  // Expired first, then soonest to expire
  const needsAttention = useMemo(
    () => members.filter(m => m.status !== 'active').sort((a, b) => a.expiry_date.localeCompare(b.expiry_date)),
    [members],
  )

  // `at` makes each tap a new navigation, so the filter is applied even if it was chosen before
  const openMembers = (status: MemberStatus | 'all') =>
    router.navigate({ pathname: '/members', params: { status, at: String(Date.now()) } })

  const connected = Boolean(syncState?.email)

  const runSync = async () => {
    if (!connected) {
      router.push('/settings/sync')
      return
    }
    const outcome = await syncNow()
    if (outcome.ok) hapticSuccess()
    else Alert.alert('Sync did not finish', outcome.message)
  }

  const syncStatus = !connected
    ? 'Sync is not set up. Your data is saved on this phone.'
    : pending > 0
      ? `${plural(pending, 'change')} waiting to sync`
      : `Synced ${syncState?.last_synced_at ? formatDateTime(syncState.last_synced_at) : 'never'}`

  return (
    <View style={styles.flex}>
      <ScreenHeader eyebrow={format(new Date(), 'EEEE, MMMM d')} title="Archery Club" />
      <ScrollView contentContainerStyle={styles.body}>
        <View style={styles.tiles}>
          <SummaryTile icon="people" tone="gold" value={String(members.length)} label="All Members" onPress={() => openMembers('all')} />
          <SummaryTile icon="checkmark-circle" tone={STATUS_TONE.active} value={String(counts.active)} label="Active"
            onPress={() => openMembers('active')} />
        </View>
        <View style={styles.tiles}>
          <SummaryTile icon="time" tone={STATUS_TONE.expiring_soon} value={String(counts.expiring_soon)} label="Expiring Soon"
            onPress={() => openMembers('expiring_soon')} />
          <SummaryTile icon="alert-circle" tone={STATUS_TONE.expired} value={String(counts.expired)} label="Expired"
            onPress={() => openMembers('expired')} />
        </View>

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
              <Text style={[styles.amount, { color: colors.income }]}>{formatCurrency(totals.income)}</Text>
            </View>
            <View style={styles.flex}>
              <Text style={styles.caption}>Expenses</Text>
              <Text style={[styles.amount, { color: colors.expense }]}>{formatCurrency(totals.expenses)}</Text>
            </View>
          </View>
        </Card>

        <View style={styles.section}>
          <SectionTitle>Quick actions</SectionTitle>
          <View style={styles.actions}>
            <Button title="Add Member" icon="person-add" flex onPress={() => router.push('/member/form')} />
            <Button title="Add Transaction" icon="add-circle" variant="secondary" flex
              onPress={() => router.push('/transaction/form')} />
          </View>
          <Button title={connected ? 'Sync Now' : 'Set Up Sync'} icon="sync" variant="secondary" onPress={runSync} loading={syncing} />
          <Text style={styles.syncStatus}>{syncStatus}</Text>
        </View>

        <View style={styles.section}>
          <SectionTitle
            action={needsAttention.length > ATTENTION_LIMIT
              ? <TextButton label="See all members" onPress={() => openMembers('all')} />
              : undefined}
          >
            Needs attention
          </SectionTitle>
          {needsAttention.length === 0 ? (
            <Card>
              <Text style={styles.allGood}>Every membership is up to date.</Text>
            </Card>
          ) : (
            <Group>
              {needsAttention.slice(0, ATTENTION_LIMIT).map(member => (
                <Row
                  key={member.id}
                  left={<Avatar name={member.name} uri={member.photo_uri} size={44} />}
                  title={member.name}
                  subtitle={expiryPhrase(member.expiry_date)}
                  onPress={() => router.push({ pathname: '/member/[id]', params: { id: member.id } })}
                  right={
                    <TextButton label="Renew" icon="refresh"
                      onPress={() => router.push({ pathname: '/member/renew', params: { id: member.id } })} />
                  }
                />
              ))}
            </Group>
          )}
        </View>
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  body: { paddingHorizontal: space.lg, paddingBottom: space.xl * 2, gap: space.md },
  tiles: { flexDirection: 'row', gap: space.md },
  caption: { fontFamily: font.medium, fontSize: 14, color: colors.muted },
  balance: { fontFamily: font.bold, fontSize: 34, color: colors.text, marginTop: 2 },
  split: { flexDirection: 'row', gap: space.lg },
  amount: { fontFamily: font.semibold, fontSize: 17, marginTop: 2 },
  section: { gap: space.md, marginTop: space.md },
  actions: { flexDirection: 'row', gap: space.md },
  syncStatus: { fontFamily: font.regular, fontSize: 13, color: colors.muted, textAlign: 'center' },
  allGood: { fontFamily: font.medium, fontSize: 15, color: colors.muted, textAlign: 'center' },
})
