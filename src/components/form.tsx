import { Ionicons } from '@expo/vector-icons'
import { DateTimePickerAndroid } from '@react-native-community/datetimepicker'
import { parseISO } from 'date-fns'
import type { ReactNode } from 'react'
import {
  KeyboardAvoidingView, Pressable, ScrollView, StyleSheet, Text, TextInput, View, type TextInputProps,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { colors, font, radius, space } from '@/lib/theme'
import { formatDate, toDateString } from '@/lib/utils'
import { Chip } from './ui'

// Scrollable form body, with optional action buttons pinned above the keyboard
export function FormScreen({ children, footer }: { children: ReactNode; footer?: ReactNode }) {
  const insets = useSafeAreaInsets()
  return (
    <KeyboardAvoidingView behavior="padding" style={styles.screen}>
      <ScrollView
        contentContainerStyle={[styles.body, !footer && { paddingBottom: insets.bottom + space.xl }]}
        keyboardShouldPersistTaps="handled"
      >
        {children}
      </ScrollView>
      {footer ? <View style={[styles.footer, { paddingBottom: insets.bottom + space.md }]}>{footer}</View> : null}
    </KeyboardAvoidingView>
  )
}

function Field({ label, required, error, hint, children }: {
  label: string
  required?: boolean
  error?: string
  hint?: string
  children: ReactNode
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>
        {label}{required ? <Text style={styles.required}> *</Text> : null}
      </Text>
      {children}
      {error
        ? <Text style={[styles.message, styles.errorText]}>{error}</Text>
        : hint ? <Text style={styles.message}>{hint}</Text> : null}
    </View>
  )
}

interface TextFieldProps extends Omit<TextInputProps, 'style'> {
  label: string
  required?: boolean
  error?: string
  hint?: string
}

export function TextField({ label, required, error, hint, multiline, ...inputProps }: TextFieldProps) {
  return (
    <Field label={label} required={required} error={error} hint={hint}>
      <TextInput
        {...inputProps}
        multiline={multiline}
        accessibilityLabel={label}
        placeholderTextColor={colors.faint}
        style={[styles.input, multiline && styles.multiline, error ? styles.inputError : null]}
      />
    </Field>
  )
}

// Opens the native Android calendar; `value` is yyyy-MM-dd or '' when unset
export function DateField({ label, value, onChange, required, error, clearable }: {
  label: string
  value: string
  onChange: (value: string) => void
  required?: boolean
  error?: string
  clearable?: boolean
}) {
  const open = () => DateTimePickerAndroid.open({
    value: value ? parseISO(value) : new Date(),
    mode: 'date',
    onValueChange: (_event, date) => onChange(toDateString(date)),
  })
  return (
    <Field label={label} required={required} error={error}>
      <Pressable
        onPress={open}
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${value ? formatDate(value) : 'not set'}`}
        style={[styles.input, styles.dateInput, error ? styles.inputError : null]}
      >
        <Ionicons name="calendar-outline" size={20} color={colors.accentText} />
        <Text style={[styles.dateText, !value && styles.placeholder]}>
          {value ? formatDate(value) : 'Select a date'}
        </Text>
        {clearable && value ? (
          <Pressable onPress={() => onChange('')} hitSlop={space.md} accessibilityLabel={`Clear ${label}`}>
            <Ionicons name="close-circle" size={20} color={colors.faint} />
          </Pressable>
        ) : null}
      </Pressable>
    </Field>
  )
}

// One-of-many choice shown as chips. With `optional`, tapping the selected chip clears it.
export function ChoiceField<T extends string | number>({ label, options, value, onChange, required, optional, format }: {
  label: string
  options: readonly T[]
  value: T | ''
  onChange: (value: T | '') => void
  required?: boolean
  optional?: boolean
  format?: (option: T) => string
}) {
  return (
    <Field label={label} required={required}>
      <View style={styles.choices}>
        {options.map(option => (
          <Chip
            key={option}
            label={format ? format(option) : String(option)}
            selected={option === value}
            onPress={() => onChange(optional && option === value ? '' : option)}
          />
        ))}
      </View>
    </Field>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  body: { padding: space.lg, gap: space.xl },
  footer: {
    flexDirection: 'row',
    gap: space.md,
    paddingHorizontal: space.lg,
    paddingTop: space.md,
    backgroundColor: colors.card,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.divider,
  },
  field: { gap: space.sm },
  label: { fontFamily: font.semibold, fontSize: 15, color: colors.text },
  required: { color: colors.expense },
  message: { fontFamily: font.regular, fontSize: 13, color: colors.muted, lineHeight: 18 },
  errorText: { color: colors.expense },
  input: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.divider,
    borderRadius: radius.md,
    paddingHorizontal: space.lg,
    minHeight: 52,
    fontFamily: font.regular,
    fontSize: 16,
    color: colors.text,
  },
  inputError: { borderColor: colors.expense },
  multiline: { minHeight: 96, paddingTop: space.md, textAlignVertical: 'top' },
  dateInput: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  dateText: { flex: 1, fontFamily: font.regular, fontSize: 16, color: colors.text },
  placeholder: { color: colors.faint },
  choices: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
})
