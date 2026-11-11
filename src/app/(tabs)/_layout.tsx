import { Ionicons } from '@expo/vector-icons'
import { Tabs } from 'expo-router'
import type { ColorValue } from 'react-native'
import type { IconName } from '@/components/ui'
import { colors, font } from '@/lib/theme'

const tabIcon = (name: IconName) => ({ color, size }: { color: ColorValue; size: number }) => (
  // The navigator passes the tint colours set below, which are always strings
  <Ionicons name={name} size={size} color={color as string} />
)

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.accentText,
        tabBarInactiveTintColor: colors.faint,
        tabBarStyle: { backgroundColor: colors.card, borderTopColor: colors.divider },
        tabBarLabelStyle: { fontFamily: font.semibold, fontSize: 11 },
        tabBarHideOnKeyboard: true,
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Home', tabBarIcon: tabIcon('home') }} />
      <Tabs.Screen name="members" options={{ title: 'Members', tabBarIcon: tabIcon('people') }} />
      <Tabs.Screen name="funds" options={{ title: 'Funds', tabBarIcon: tabIcon('wallet') }} />
      <Tabs.Screen name="settings" options={{ title: 'Settings', tabBarIcon: tabIcon('settings') }} />
    </Tabs>
  )
}
