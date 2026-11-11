import {
  PlusJakartaSans_400Regular, PlusJakartaSans_500Medium, PlusJakartaSans_600SemiBold, PlusJakartaSans_700Bold,
  useFonts,
} from '@expo-google-fonts/plus-jakarta-sans'
import { useMigrations } from 'drizzle-orm/expo-sqlite/migrator'
import { Stack } from 'expo-router'
import * as SplashScreen from 'expo-splash-screen'
import { StatusBar } from 'expo-status-bar'
import { useEffect, useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import migrations from '../../drizzle/migrations'
import { db, ensureSingletonRows } from '@/db/client'
import { colors, font, space } from '@/lib/theme'
import { SyncProvider } from '@/sync/SyncContext'

SplashScreen.preventAutoHideAsync()

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    PlusJakartaSans_400Regular, PlusJakartaSans_500Medium, PlusJakartaSans_600SemiBold, PlusJakartaSans_700Bold,
  })
  const migration = useMigrations(db, migrations)
  const [databaseReady, setDatabaseReady] = useState(false)

  useEffect(() => {
    if (!migration.success) return
    ensureSingletonRows()
    setDatabaseReady(true)
  }, [migration.success])

  // A font failure falls back to the system font rather than blocking the app
  const fontsSettled = fontsLoaded || fontError !== null
  const settled = fontsSettled && (databaseReady || migration.error !== undefined)

  useEffect(() => {
    if (settled) void SplashScreen.hideAsync()
  }, [settled])

  if (!settled) return null

  if (migration.error) {
    return (
      <View style={styles.error}>
        <Text style={styles.errorTitle}>The database could not be opened</Text>
        <Text style={styles.errorMessage}>{migration.error.message}</Text>
      </View>
    )
  }

  return (
    <SyncProvider>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.background },
          headerShadowVisible: false,
          headerTintColor: colors.text,
          headerTitleStyle: { fontFamily: font.semibold },
          contentStyle: { backgroundColor: colors.background },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="member/[id]" options={{ title: 'Member' }} />
        <Stack.Screen name="member/form" options={{ presentation: 'modal' }} />
        <Stack.Screen name="member/renew" options={{ presentation: 'modal', title: 'Renew Membership' }} />
        <Stack.Screen name="member/bulk-edit" options={{ presentation: 'modal', title: 'Edit Members' }} />
        <Stack.Screen name="transaction/form" options={{ presentation: 'modal' }} />
        <Stack.Screen name="settings/defaults" options={{ title: 'Club Defaults' }} />
        <Stack.Screen name="settings/sync" options={{ title: 'Sync' }} />
        <Stack.Screen name="settings/data" options={{ title: 'Export & Import' }} />
      </Stack>
    </SyncProvider>
  )
}

const styles = StyleSheet.create({
  error: {
    flex: 1, alignItems: 'center', justifyContent: 'center', padding: space.xl, gap: space.sm,
    backgroundColor: colors.background,
  },
  errorTitle: { fontSize: 18, fontWeight: '600', textAlign: 'center', color: colors.text },
  errorMessage: { fontSize: 14, textAlign: 'center', color: colors.muted },
})
