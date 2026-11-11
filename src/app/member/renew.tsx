import { useLocalSearchParams, useRouter } from 'expo-router'
import { useState } from 'react'
import { Alert } from 'react-native'
import { ChoiceField, DateField, FormScreen, TextField } from '@/components/form'
import { Button, EmptyState } from '@/components/ui'
import { getMember, renewMember } from '@/data/members'
import { getSettings } from '@/data/settings'
import { hapticSuccess } from '@/lib/feedback'
import { computeRenewalDate, errorMessage, parseAmount, today } from '@/lib/utils'
import { PAYMENT_MODES, type Member } from '@/types'

export default function RenewScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const [member] = useState(() => getMember(id))
  return member
    ? <RenewForm member={member} />
    : <EmptyState icon="person-outline" title="Member not found" message="This member may have been removed." />
}

function RenewForm({ member }: { member: Member }) {
  const router = useRouter()
  const [expiryDate, setExpiryDate] = useState(() => computeRenewalDate(member.expiry_date, getSettings().default_duration_months))
  const [amountText, setAmountText] = useState(String(member.fee))
  const [paymentDate, setPaymentDate] = useState(today)
  const [paymentMode, setPaymentMode] = useState<typeof PAYMENT_MODES[number] | ''>('')
  const amount = parseAmount(amountText)

  const save = () => {
    if (amount === null) return
    try {
      renewMember(member, { expiry_date: expiryDate, amount, date: paymentDate, payment_mode: paymentMode })
      hapticSuccess()
      router.back()
    } catch (error) {
      Alert.alert('Could not renew the membership', errorMessage(error))
    }
  }

  return (
    <FormScreen
      footer={<>
        <Button title="Cancel" variant="secondary" flex onPress={() => router.back()} />
        <Button title="Renew" icon="refresh" flex onPress={save} disabled={amount === null} />
      </>}
    >
      <DateField label={`New expiry date for ${member.name}`} required value={expiryDate} onChange={setExpiryDate} />
      <TextField
        label="Amount paid (PHP)"
        required
        value={amountText}
        onChangeText={setAmountText}
        keyboardType="decimal-pad"
        error={amount === null ? 'Enter an amount of 0 or more' : undefined}
        hint="Recorded as Membership Fee income in Funds. Enter 0 to renew without a payment."
      />
      <DateField label="Payment date" required value={paymentDate} onChange={setPaymentDate} />
      <ChoiceField label="Mode of payment" options={PAYMENT_MODES} value={paymentMode} onChange={setPaymentMode} optional />
    </FormScreen>
  )
}
