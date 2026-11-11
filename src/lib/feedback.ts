import * as Haptics from 'expo-haptics'
import { Alert } from 'react-native'

export function hapticSuccess() {
  void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
}

export function hapticSelect() {
  void Haptics.selectionAsync()
}

// Asks before a destructive action; `onConfirm` runs only if the user agrees
export function confirmDestructive(title: string, message: string, actionLabel: string, onConfirm: () => void) {
  Alert.alert(title, message, [
    { text: 'Cancel', style: 'cancel' },
    { text: actionLabel, style: 'destructive', onPress: onConfirm },
  ])
}
