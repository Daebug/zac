import { Ionicons } from '@expo/vector-icons'
import * as ImagePicker from 'expo-image-picker'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Avatar, Button, Card, CategoryBadge, EmptyState, Group, SectionTitle, StatusBadge } from '@/components/ui'
import { deleteMembers, setMemberPhoto, useMember } from '@/data/members'
import { useSettings } from '@/data/settings'
import { confirmDestructive, hapticSuccess } from '@/lib/feedback'
import { savePhoto } from '@/lib/photos'
import { colors, font, space } from '@/lib/theme'
import {
  calcAge, errorMessage, expiryPhrase, formatCurrency, formatDate, getMemberStatus, membershipDuration,
} from '@/lib/utils'
import type { Member } from '@/types'

const PHOTO_OPTIONS: ImagePicker.ImagePickerOptions = {
  mediaTypes: ['images'],
  allowsEditing: true,
  aspect: [1, 1],
  quality: 0.7,
}

async function pickPhoto(member: Member, source: 'camera' | 'library') {
  try {
    if (source === 'camera') {
      const permission = await ImagePicker.requestCameraPermissionsAsync()
      if (!permission.granted) {
        Alert.alert('Camera access needed', 'Allow camera access in your phone settings to take a member photo.')
        return
      }
    }
    const result = source === 'camera'
      ? await ImagePicker.launchCameraAsync(PHOTO_OPTIONS)
      : await ImagePicker.launchImageLibraryAsync(PHOTO_OPTIONS)
    if (result.canceled) return
    setMemberPhoto(member, await savePhoto(result.assets[0].uri))
  } catch (error) {
    Alert.alert('Could not save the photo', errorMessage(error))
  }
}

function choosePhoto(member: Member) {
  Alert.alert('Member photo', undefined, [
    { text: 'Take photo', onPress: () => void pickPhoto(member, 'camera') },
    { text: 'Choose from gallery', onPress: () => void pickPhoto(member, 'library') },
    member.photo_uri
      ? { text: 'Remove photo', style: 'destructive', onPress: () => setMemberPhoto(member, null) }
      : { text: 'Cancel', style: 'cancel' },
  ])
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  )
}

export default function MemberProfileScreen() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const { id } = useLocalSearchParams<{ id: string }>()
  const { member, loaded } = useMember(id)
  const { expiry_warning_days } = useSettings()

  if (!loaded) return null
  if (!member) {
    return <EmptyState icon="person-outline" title="Member not found" message="This member may have been removed." />
  }

  const age = calcAge(member.birth_date)

  const remove = () => confirmDestructive(
    'Remove member?',
    `${member.name} will be removed. Their past payments stay in Funds. This cannot be undone.`,
    'Remove',
    () => {
      deleteMembers([member.id])
      hapticSuccess()
      router.back()
    },
  )

  return (
    <ScrollView contentContainerStyle={[styles.body, { paddingBottom: insets.bottom + space.xl }]}>
      <View style={styles.hero}>
        <Pressable onPress={() => choosePhoto(member)} accessibilityRole="button" accessibilityLabel="Change member photo">
          <Avatar name={member.name} uri={member.photo_uri} size={112} />
          <View style={styles.camera}>
            <Ionicons name="camera" size={16} color={colors.onAccent} />
          </View>
        </Pressable>
        <Text style={styles.name}>{member.name}</Text>
        <View style={styles.badges}>
          <StatusBadge status={getMemberStatus(member.expiry_date, expiry_warning_days)} />
          <CategoryBadge category={member.category} />
        </View>
        <Text style={styles.expiry}>{expiryPhrase(member.expiry_date)}</Text>
      </View>

      <Button
        title="Renew Membership"
        icon="refresh"
        onPress={() => router.push({ pathname: '/member/renew', params: { id: member.id } })}
      />

      <View style={styles.section}>
        <SectionTitle>Club</SectionTitle>
        <Group>
          <InfoRow label="Date joined" value={formatDate(member.date_joined)} />
          <InfoRow label="Member for" value={membershipDuration(member.date_joined)} />
          <InfoRow label="Expiry date" value={formatDate(member.expiry_date)} />
          <InfoRow label="Fee" value={formatCurrency(member.fee)} />
        </Group>
      </View>

      <View style={styles.section}>
        <SectionTitle>Personal</SectionTitle>
        <Group>
          <InfoRow label="Gender" value={member.gender ?? '—'} />
          <InfoRow label="Age" value={age === null ? '—' : `${age} yr${age === 1 ? '' : 's'}`} />
          <InfoRow label="Date of birth" value={member.birth_date ? formatDate(member.birth_date) : '—'} />
          <InfoRow label="Category" value={member.category ?? '—'} />
          {member.contact ? <InfoRow label="Phone / email" value={member.contact} /> : null}
          {member.address ? <InfoRow label="Address" value={member.address} /> : null}
        </Group>
      </View>

      {member.notes ? (
        <View style={styles.section}>
          <SectionTitle>Notes</SectionTitle>
          <Card>
            <Text style={styles.notes}>{member.notes}</Text>
          </Card>
        </View>
      ) : null}

      <View style={styles.actions}>
        <Button
          title="Edit"
          icon="create-outline"
          variant="secondary"
          flex
          onPress={() => router.push({ pathname: '/member/form', params: { id: member.id } })}
        />
        <Button title="Remove" icon="trash-outline" variant="danger" flex onPress={remove} />
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  body: { padding: space.lg, gap: space.xl },
  hero: { alignItems: 'center', gap: space.sm },
  camera: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 3,
    borderColor: colors.background,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  name: { fontFamily: font.bold, fontSize: 26, color: colors.text, textAlign: 'center', marginTop: space.xs },
  badges: { flexDirection: 'row', gap: space.xs },
  expiry: { fontFamily: font.medium, fontSize: 15, color: colors.muted },
  section: { gap: space.md },
  infoRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: space.lg,
    minHeight: 52, paddingHorizontal: space.lg, paddingVertical: space.md,
  },
  infoLabel: { fontFamily: font.regular, fontSize: 16, color: colors.muted },
  infoValue: { flex: 1, fontFamily: font.semibold, fontSize: 16, color: colors.text, textAlign: 'right' },
  notes: { fontFamily: font.regular, fontSize: 16, lineHeight: 23, color: colors.text },
  actions: { flexDirection: 'row', gap: space.md },
})
