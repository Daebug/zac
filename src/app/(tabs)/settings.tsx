import { useRouter } from 'expo-router'
import { ScrollView, StyleSheet, View } from 'react-native'
import { Group, IconCircle, Row, ScreenHeader } from '@/components/ui'
import { useSettings } from '@/data/settings'
import { space } from '@/lib/theme'
import { formatCurrency, plural } from '@/lib/utils'
import { usePendingCount, useSyncState } from '@/sync/hooks'

export default function SettingsScreen() {
  const router = useRouter()
  const settings = useSettings()
  const syncState = useSyncState()
  const pending = usePendingCount()

  const syncSummary = !syncState?.email
    ? 'Not connected'
    : pending > 0 ? `${plural(pending, 'change')} waiting to sync` : `Connected as ${syncState.email}`

  return (
    <View style={styles.flex}>
      <ScreenHeader title="Settings" />
      <ScrollView contentContainerStyle={styles.body}>
        <Group>
          <Row
            left={<IconCircle icon="options" tone="gold" />}
            title="Club Defaults"
            subtitle={`${plural(settings.default_duration_months, 'month')} · ${formatCurrency(settings.default_fee)}`}
            chevron
            onPress={() => router.push('/settings/defaults')}
          />
          <Row
            left={<IconCircle icon="sync" tone="blue" />}
            title="Sync"
            subtitle={syncSummary}
            chevron
            onPress={() => router.push('/settings/sync')}
          />
          <Row
            left={<IconCircle icon="document-text" tone="teal" />}
            title="Export & Import"
            subtitle="CSV and PDF files"
            chevron
            onPress={() => router.push('/settings/data')}
          />
        </Group>
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  body: { paddingHorizontal: space.lg, paddingBottom: space.xl * 2 },
})
