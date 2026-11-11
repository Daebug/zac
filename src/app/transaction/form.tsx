import { zodResolver } from '@hookform/resolvers/zod'
import { Stack, useLocalSearchParams, useRouter } from 'expo-router'
import { useState } from 'react'
import { Controller, useForm, useWatch } from 'react-hook-form'
import { Alert } from 'react-native'
import { z } from 'zod'
import { ChoiceField, DateField, FormScreen, TextField } from '@/components/form'
import { Button, EmptyState } from '@/components/ui'
import { createTransaction, deleteTransaction, getTransaction, updateTransaction } from '@/data/transactions'
import { confirmDestructive, hapticSuccess } from '@/lib/feedback'
import { errorMessage, parseAmount, today } from '@/lib/utils'
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES, PAYMENT_MODES, type TransactionType } from '@/types'

const MIN_AMOUNT = 0.01
const TYPES: readonly TransactionType[] = ['income', 'expense']
const TYPE_LABEL: Record<TransactionType, string> = { income: 'Income', expense: 'Expense' }
const CATEGORIES: Record<TransactionType, readonly string[]> = { income: INCOME_CATEGORIES, expense: EXPENSE_CATEGORIES }

const schema = z.object({
  type: z.enum(['income', 'expense']),
  category: z.string().min(1),
  description: z.string().trim().min(1, 'Description is required'),
  amount: z.string().refine(value => parseAmount(value, MIN_AMOUNT) !== null, 'Enter an amount greater than 0'),
  date: z.string().min(1, 'Date is required'),
  payment_mode: z.string(),
  notes: z.string(),
})

type FormValues = z.infer<typeof schema>

function initialValues(id: string | undefined): FormValues | undefined {
  if (!id) {
    return {
      type: 'income', category: INCOME_CATEGORIES[0], description: '', amount: '', date: today(), payment_mode: '', notes: '',
    }
  }
  const transaction = getTransaction(id)
  return transaction && {
    type: transaction.type,
    category: transaction.category,
    description: transaction.description,
    amount: String(transaction.amount),
    date: transaction.date,
    payment_mode: transaction.payment_mode ?? '',
    notes: transaction.notes ?? '',
  }
}

export default function TransactionFormScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>()
  const [initial] = useState(() => initialValues(id))

  return (
    <>
      <Stack.Screen options={{ title: id ? 'Edit Transaction' : 'Add Transaction' }} />
      {initial
        ? <TransactionForm id={id} initial={initial} />
        : <EmptyState icon="wallet-outline" title="Transaction not found" message="This transaction may have been deleted." />}
    </>
  )
}

function TransactionForm({ id, initial }: { id: string | undefined; initial: FormValues }) {
  const router = useRouter()
  const { control, handleSubmit, setValue, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: initial,
  })
  const type = useWatch({ control, name: 'type' })
  const category = useWatch({ control, name: 'category' })
  // A category saved earlier that is no longer in the list stays selectable
  const categories = CATEGORIES[type].includes(category) ? CATEGORIES[type] : [category, ...CATEGORIES[type]]

  const save = handleSubmit((values) => {
    const input = { ...values, amount: parseAmount(values.amount, MIN_AMOUNT) ?? 0 }
    try {
      if (id) updateTransaction(id, input)
      else createTransaction(input)
      hapticSuccess()
      router.back()
    } catch (error) {
      Alert.alert('Could not save the transaction', errorMessage(error))
    }
  })

  const remove = (transactionId: string) => confirmDestructive(
    'Delete transaction?',
    `"${initial.description}" will be deleted. This cannot be undone.`,
    'Delete',
    () => {
      deleteTransaction(transactionId)
      hapticSuccess()
      router.back()
    },
  )

  return (
    <FormScreen
      footer={<>
        <Button title="Cancel" variant="secondary" flex onPress={() => router.back()} />
        <Button title={id ? 'Save Changes' : 'Add Transaction'} flex onPress={save} loading={isSubmitting} />
      </>}
    >
      <Controller control={control} name="type" render={({ field }) => (
        <ChoiceField label="Type" required options={TYPES} value={field.value} format={option => TYPE_LABEL[option]}
          onChange={(value) => {
            if (value === '' || value === field.value) return
            field.onChange(value)
            setValue('category', CATEGORIES[value][0])
          }} />
      )} />
      <Controller control={control} name="category" render={({ field }) => (
        <ChoiceField label="Category" required options={categories} value={field.value}
          onChange={value => value !== '' && field.onChange(value)} />
      )} />
      <Controller control={control} name="description" render={({ field }) => (
        <TextField label="Description" required value={field.value} onChangeText={field.onChange} onBlur={field.onBlur}
          error={errors.description?.message} />
      )} />
      <Controller control={control} name="amount" render={({ field }) => (
        <TextField label="Amount (PHP)" required value={field.value} onChangeText={field.onChange} onBlur={field.onBlur}
          error={errors.amount?.message} keyboardType="decimal-pad" placeholder="0.00" />
      )} />
      <Controller control={control} name="date" render={({ field }) => (
        <DateField label="Date" required value={field.value} onChange={field.onChange} error={errors.date?.message} />
      )} />
      <Controller control={control} name="payment_mode" render={({ field }) => (
        <ChoiceField label="Mode of payment" options={PAYMENT_MODES} value={field.value as typeof PAYMENT_MODES[number] | ''}
          onChange={field.onChange} optional />
      )} />
      <Controller control={control} name="notes" render={({ field }) => (
        <TextField label="Notes" value={field.value} onChangeText={field.onChange} onBlur={field.onBlur} multiline />
      )} />
      {id ? <Button title="Delete Transaction" icon="trash-outline" variant="danger" onPress={() => remove(id)} /> : null}
    </FormScreen>
  )
}
