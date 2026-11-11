import { zodResolver } from '@hookform/resolvers/zod'
import { Stack, useLocalSearchParams, useRouter } from 'expo-router'
import { useRef, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { Alert } from 'react-native'
import { z } from 'zod'
import { ChoiceField, DateField, FormScreen, TextField } from '@/components/form'
import { Button, EmptyState } from '@/components/ui'
import { createMembers, getMember, updateMember } from '@/data/members'
import { getSettings } from '@/data/settings'
import { hapticSuccess } from '@/lib/feedback'
import { computeExpiryDate, errorMessage, parseAmount, today } from '@/lib/utils'
import { ARCHER_CATEGORIES, GENDERS } from '@/types'

const schema = z.object({
  name: z.string().trim().min(1, 'Name is required'),
  gender: z.string(),
  category: z.string(),
  birth_date: z.string(),
  contact: z.string(),
  address: z.string(),
  fee: z.string().refine(value => parseAmount(value) !== null, 'Enter a fee of 0 or more'),
  date_joined: z.string().min(1, 'Date joined is required'),
  expiry_date: z.string().min(1, 'Expiry date is required'),
  notes: z.string(),
})

type FormValues = z.infer<typeof schema>

function initialValues(id: string | undefined): FormValues | undefined {
  if (!id) {
    const { default_fee, default_duration_months } = getSettings()
    return {
      name: '', gender: '', category: '', birth_date: '', contact: '', address: '', notes: '',
      fee: String(default_fee),
      date_joined: today(),
      expiry_date: computeExpiryDate(today(), default_duration_months),
    }
  }
  const member = getMember(id)
  return member && {
    name: member.name,
    gender: member.gender ?? '',
    category: member.category ?? '',
    birth_date: member.birth_date ?? '',
    contact: member.contact ?? '',
    address: member.address ?? '',
    notes: member.notes ?? '',
    fee: String(member.fee),
    date_joined: member.date_joined,
    expiry_date: member.expiry_date,
  }
}

export default function MemberFormScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>()
  const [initial] = useState(() => initialValues(id))
  const title = id ? 'Edit Member' : 'Add Member'

  return (
    <>
      <Stack.Screen options={{ title }} />
      {initial
        ? <MemberForm id={id} initial={initial} />
        : <EmptyState icon="person-outline" title="Member not found" message="This member may have been removed." />}
    </>
  )
}

function MemberForm({ id, initial }: { id: string | undefined; initial: FormValues }) {
  const router = useRouter()
  const { control, handleSubmit, setValue, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: initial,
  })
  // For a new member the expiry follows the join date until the user sets it themselves
  const expiryFollowsJoinDate = useRef(!id)

  const save = handleSubmit((values) => {
    const input = { ...values, fee: parseAmount(values.fee) ?? 0 }
    try {
      if (id) updateMember(id, input)
      else createMembers([input])
      hapticSuccess()
      router.back()
    } catch (error) {
      Alert.alert('Could not save the member', errorMessage(error))
    }
  })

  return (
    <FormScreen
      footer={<>
        <Button title="Cancel" variant="secondary" flex onPress={() => router.back()} />
        <Button title={id ? 'Save Changes' : 'Add Member'} flex onPress={save} loading={isSubmitting} />
      </>}
    >
      <Controller control={control} name="name" render={({ field }) => (
        <TextField label="Name" required value={field.value} onChangeText={field.onChange} onBlur={field.onBlur}
          error={errors.name?.message} autoCapitalize="words" />
      )} />
      <Controller control={control} name="gender" render={({ field }) => (
        <ChoiceField label="Gender" options={GENDERS} value={field.value as typeof GENDERS[number] | ''} onChange={field.onChange} optional />
      )} />
      <Controller control={control} name="category" render={({ field }) => (
        <ChoiceField label="Category" options={ARCHER_CATEGORIES} value={field.value as typeof ARCHER_CATEGORIES[number] | ''}
          onChange={field.onChange} optional />
      )} />
      <Controller control={control} name="birth_date" render={({ field }) => (
        <DateField label="Date of birth" value={field.value} onChange={field.onChange} clearable />
      )} />
      <Controller control={control} name="contact" render={({ field }) => (
        <TextField label="Contact" value={field.value} onChangeText={field.onChange} onBlur={field.onBlur}
          placeholder="Phone / email" autoCapitalize="none" />
      )} />
      <Controller control={control} name="address" render={({ field }) => (
        <TextField label="Address" value={field.value} onChangeText={field.onChange} onBlur={field.onBlur} />
      )} />
      <Controller control={control} name="fee" render={({ field }) => (
        <TextField label="Fee (PHP)" required value={field.value} onChangeText={field.onChange} onBlur={field.onBlur}
          error={errors.fee?.message} keyboardType="decimal-pad"
          hint={id ? undefined : 'A fee above 0 is also recorded as income in Funds.'} />
      )} />
      <Controller control={control} name="date_joined" render={({ field }) => (
        <DateField label="Date joined" required value={field.value} error={errors.date_joined?.message}
          onChange={(value) => {
            field.onChange(value)
            if (expiryFollowsJoinDate.current) {
              setValue('expiry_date', computeExpiryDate(value, getSettings().default_duration_months))
            }
          }} />
      )} />
      <Controller control={control} name="expiry_date" render={({ field }) => (
        <DateField label="Expiry date" required value={field.value} error={errors.expiry_date?.message}
          onChange={(value) => {
            expiryFollowsJoinDate.current = false
            field.onChange(value)
          }} />
      )} />
      <Controller control={control} name="notes" render={({ field }) => (
        <TextField label="Notes" value={field.value} onChangeText={field.onChange} onBlur={field.onBlur} multiline />
      )} />
    </FormScreen>
  )
}
