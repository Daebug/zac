import { useLocalSearchParams, useRouter } from 'expo-router'
import { useState } from 'react'
import { Alert } from 'react-native'
import { DateField, FormScreen, TextField } from '@/components/form'
import { Button } from '@/components/ui'
import { bulkUpdateMembers } from '@/data/members'
import { getSettings } from '@/data/settings'
import { hapticSuccess } from '@/lib/feedback'
import { computeExpiryDate, errorMessage, parseAmount, plural, today } from '@/lib/utils'

// Applies a new expiry date and/or fee to every selected member; blank fields are left unchanged
export default function BulkEditScreen() {
  const router = useRouter()
  const { ids } = useLocalSearchParams<{ ids: string }>()
  const memberIds = ids ? ids.split(',') : []
  const [months] = useState(() => getSettings().default_duration_months)
  const [expiryDate, setExpiryDate] = useState('')
  const [feeText, setFeeText] = useState('')
  const fee = parseAmount(feeText)
  const feeInvalid = feeText.trim() !== '' && fee === null
  const hasChanges = expiryDate !== '' || fee !== null

  const save = () => {
    try {
      bulkUpdateMembers(memberIds, {
        ...(expiryDate ? { expiry_date: expiryDate } : {}),
        ...(fee !== null ? { fee } : {}),
      })
      hapticSuccess()
      router.back()
    } catch (error) {
      Alert.alert('Could not update the members', errorMessage(error))
    }
  }

  return (
    <FormScreen
      footer={<>
        <Button title="Cancel" variant="secondary" flex onPress={() => router.back()} />
        <Button
          title={`Apply to ${plural(memberIds.length, 'Member')}`}
          flex
          onPress={save}
          disabled={memberIds.length === 0 || !hasChanges || feeInvalid}
        />
      </>}
    >
      <DateField label="Expiry date" value={expiryDate} onChange={setExpiryDate} clearable />
      <Button
        title={`Renew all (${months} mo from today)`}
        icon="refresh"
        variant="secondary"
        onPress={() => setExpiryDate(computeExpiryDate(today(), months))}
      />
      <TextField
        label="Fee (PHP)"
        value={feeText}
        onChangeText={setFeeText}
        keyboardType="decimal-pad"
        placeholder="Leave blank to keep each member's fee"
        error={feeInvalid ? 'Enter a fee of 0 or more' : undefined}
        hint="Changing these here does not record any payment."
      />
    </FormScreen>
  )
}
