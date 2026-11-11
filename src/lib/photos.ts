import { randomUUID } from 'expo-crypto'
import { Directory, File, Paths } from 'expo-file-system'

const photosDir = new Directory(Paths.document, 'photos')

// Copies a picked or captured image into app storage and returns the copy's uri
export async function savePhoto(sourceUri: string): Promise<string> {
  if (!photosDir.exists) photosDir.create()
  const destination = new File(photosDir, `${randomUUID()}.jpg`)
  await new File(sourceUri).copy(destination)
  return destination.uri
}

export function deletePhoto(uri: string | null) {
  if (!uri) return
  const file = new File(uri)
  if (file.exists) file.delete()
}
