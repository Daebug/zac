import { useState } from 'react'
import { Alert, ScrollView, StyleSheet, View } from 'react-native'
import { Group, IconCircle, Row, SectionTitle } from '@/components/ui'
import { createMembers, useMembers } from '@/data/members'
import { summarize, useTransactions } from '@/data/transactions'
import { hapticSuccess } from '@/lib/feedback'
import { exportFundsPdf, exportMembersCsv, exportMembersPdf, pickMembersCsv, shareImportTemplate } from '@/lib/io'
import { space } from '@/lib/theme'
import { errorMessage, plural } from '@/lib/utils'

export default function DataScreen() {
  const members = useMembers()
  const transactions = useTransactions()
  const [busy, setBusy] = useState(false)

  // Runs one export/import at a time and reports any failure
  const run = async (failureTitle: string, action: () => Promise<void>) => {
    if (busy) return
    setBusy(true)
    try {
      await action()
    } catch (error) {
      Alert.alert(failureTitle, errorMessage(error))
    } finally {
      setBusy(false)
    }
  }

  const exportMembers = (action: () => Promise<void>) => {
    if (members.length === 0) Alert.alert('Nothing to export', 'There are no members yet.')
    else void run('Could not export members', action)
  }

  const exportFunds = () => {
    if (transactions.length === 0) Alert.alert('Nothing to export', 'There are no transactions yet.')
    else void run('Could not export funds', () => exportFundsPdf(transactions, summarize(transactions)))
  }

  const importMembers = () => run('Could not import the file', async () => {
    const rows = await pickMembersCsv()
    if (!rows) return
    createMembers(rows)
    hapticSuccess()
    Alert.alert('Import complete', `Imported ${plural(rows.length, 'member')}.`)
  })

  return (
    <ScrollView contentContainerStyle={styles.body}>
      <View style={styles.section}>
        <SectionTitle>Export</SectionTitle>
        <Group>
          <Row left={<IconCircle icon="grid" tone="success" />} title="Members as CSV" subtitle="Opens in Excel or Google Sheets"
            chevron onPress={() => exportMembers(() => exportMembersCsv(members))} />
          <Row left={<IconCircle icon="document" tone="danger" />} title="Members as PDF" subtitle="A printable member list"
            chevron onPress={() => exportMembers(() => exportMembersPdf(members))} />
          <Row left={<IconCircle icon="document" tone="danger" />} title="Funds as PDF" subtitle="All transactions with totals"
            chevron onPress={exportFunds} />
        </Group>
      </View>

      <View style={styles.section}>
        <SectionTitle>Import</SectionTitle>
        <Group>
          <Row left={<IconCircle icon="cloud-upload" tone="blue" />} title="Import members from CSV"
            subtitle="Adds every row as a new member" chevron onPress={importMembers} />
          <Row left={<IconCircle icon="download" tone="gold" />} title="Get the CSV template"
            subtitle="An empty file with the right columns" chevron
            onPress={() => run('Could not share the template', shareImportTemplate)} />
        </Group>
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  body: { padding: space.lg, gap: space.xl },
  section: { gap: space.md },
})
