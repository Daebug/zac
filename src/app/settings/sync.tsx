import { useState } from 'react'
import { Alert, StyleSheet, Text } from 'react-native'
import { FormScreen, TextField } from '@/components/form'
import { Button, Card, Group, IconCircle, Row } from '@/components/ui'
import { confirmDestructive, hapticSuccess } from '@/lib/feedback'
import { colors, font } from '@/lib/theme'
import { formatDateTime, plural } from '@/lib/utils'
import { usePendingCount, useSyncState } from '@/sync/hooks'
import { connect, disconnect } from '@/sync/sync'
import { useSync } from '@/sync/SyncContext'

export default function SyncScreen() {
  const state = useSyncState()
  const pending = usePendingCount()
  const { syncing, lastOutcome, syncNow } = useSync()
  const [serverUrl, setServerUrl] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [connecting, setConnecting] = useState(false)

  const connected = Boolean(state?.email)
  const signedOut = lastOutcome?.ok === false && lastOutcome.reason === 'signed_out'
  // Shown for a first-time setup and again when the 30-day sign-in has expired
  const showSignIn = !connected || signedOut
  const server = serverUrl || state?.server_url || ''
  const account = email || state?.email || ''
  const problem = lastOutcome?.ok === false && lastOutcome.reason !== 'not_connected' ? lastOutcome.message : null

  const signIn = async () => {
    setConnecting(true)
    const outcome = await connect(server, account, password)
    setConnecting(false)
    if (!outcome.ok) {
      Alert.alert('Could not connect', outcome.message)
      return
    }
    setPassword('')
    const result = await syncNow()
    if (result.ok) hapticSuccess()
    else Alert.alert('Connected, but the first sync failed', result.message)
  }

  const runSync = async () => {
    const outcome = await syncNow()
    if (outcome.ok) hapticSuccess()
    else Alert.alert('Sync did not finish', outcome.message)
  }

  const confirmDisconnect = () => confirmDestructive(
    'Disconnect sync?',
    'Your data stays on this phone, but changes will no longer sync with the web app until you connect again.',
    'Disconnect',
    () => void disconnect(),
  )

  return (
    <FormScreen>
      {connected ? (
        <Group>
          <Row left={<IconCircle icon="person" tone="gold" />} title={state?.email ?? ''} subtitle={state?.server_url ?? ''} />
          <Row
            left={<IconCircle icon="time" tone="blue" />}
            title="Last synced"
            subtitle={state?.last_synced_at ? formatDateTime(state.last_synced_at) : 'Never'}
          />
          <Row
            left={<IconCircle icon={pending > 0 ? 'cloud-upload' : 'checkmark-circle'} tone={pending > 0 ? 'warning' : 'success'} />}
            title={pending > 0 ? `${plural(pending, 'change')} waiting to sync` : 'Everything is synced'}
          />
        </Group>
      ) : (
        <Card>
          <Text style={styles.info}>
            The app works fully offline. Connect to keep it in step with the web app whenever your phone is on the same
            Wi-Fi as your PC.
          </Text>
        </Card>
      )}

      {problem ? <Text style={styles.problem}>{problem}</Text> : null}

      {showSignIn ? (
        <>
          <TextField
            label="Server address"
            value={server}
            onChangeText={setServerUrl}
            placeholder="192.168.1.5:3001"
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
            hint="Your PC's address on your Wi-Fi, followed by :3001"
          />
          <TextField
            label="Email"
            value={account}
            onChangeText={setEmail}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            hint="The same email and password you use for the web app."
          />
          <TextField label="Password" value={password} onChangeText={setPassword} secureTextEntry autoCapitalize="none" />
          <Button
            title={connected ? 'Sign In Again' : 'Connect'}
            icon="link"
            onPress={signIn}
            loading={connecting}
            disabled={!server.trim() || !account.trim() || !password}
          />
        </>
      ) : (
        <Button title="Sync Now" icon="sync" onPress={runSync} loading={syncing} />
      )}
      {connected ? <Button title="Disconnect" variant="secondary" onPress={confirmDisconnect} /> : null}
    </FormScreen>
  )
}

const styles = StyleSheet.create({
  info: { fontFamily: font.regular, fontSize: 15, lineHeight: 22, color: colors.muted },
  problem: { fontFamily: font.medium, fontSize: 14, lineHeight: 20, color: colors.expense },
})
