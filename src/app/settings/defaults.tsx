import { useRouter } from 'expo-router'
import { useState } from 'react'
import { Alert } from 'react-native'
import { ChoiceField, FormScreen, TextField } from '@/components/form'
import { Button } from '@/components/ui'
import { updateSettings, useSettings } from '@/data/settings'
import { hapticSuccess } from '@/lib/feedback'
import { errorMessage, parseAmount, plural } from '@/lib/utils'
import { DURATION_MONTH_OPTIONS, type SettingsInput } from '@/types'

// Whole number of at least `min`, or null when the text is not one
function parseWholeNumber(text: string, min: number): number | null {
  const value = Number(text.trim())
  return text.trim() !== '' && Number.isInteger(value) && value >= min ? value : null
}

export default function ClubDefaultsScreen() {
  const settings = useSettings()
  // Remounting on change refreshes the form when settings arrive from a sync
  const formKey = `${settings.default_duration_months}-${settings.default_fee}-${settings.expiry_warning_days}`
  return <DefaultsForm key={formKey} settings={settings} />
}

function DefaultsForm({ settings }: { settings: SettingsInput }) {
  const router = useRouter()
  const [months, setMonths] = useState(settings.default_duration_months)
  const [feeText, setFeeText] = useState(String(settings.default_fee))
  const [warningText, setWarningText] = useState(String(settings.expiry_warning_days))
  const fee = parseAmount(feeText)
  const warningDays = parseWholeNumber(warningText, 1)
  const changed = months !== settings.default_duration_months
    || fee !== settings.default_fee
    || warningDays !== settings.expiry_warning_days

  const save = () => {
    if (fee === null || warningDays === null) return
    try {
      updateSettings({ default_duration_months: months, default_fee: fee, expiry_warning_days: warningDays })
      hapticSuccess()
      router.back()
    } catch (error) {
      Alert.alert('Could not save the settings', errorMessage(error))
    }
  }

  return (
    <FormScreen
      footer={<Button title="Save" flex onPress={save} disabled={!changed || fee === null || warningDays === null} />}
    >
      <ChoiceField
        label="Default membership duration"
        options={DURATION_MONTH_OPTIONS}
        value={months}
        format={option => plural(option, 'month')}
        onChange={value => value !== '' && setMonths(value)}
      />
      <TextField
        label="Default fee (PHP)"
        value={feeText}
        onChangeText={setFeeText}
        keyboardType="decimal-pad"
        error={fee === null ? 'Enter a fee of 0 or more' : undefined}
        hint="Filled in automatically when you add a member."
      />
      <TextField
        label="Expiry warning (days before)"
        value={warningText}
        onChangeText={setWarningText}
        keyboardType="number-pad"
        error={warningDays === null ? 'Enter a whole number of 1 or more' : undefined}
        hint="Members are shown as Expiring Soon this many days before they expire."
      />
    </FormScreen>
  )
}
