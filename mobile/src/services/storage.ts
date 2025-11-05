import { ref, getDownloadURL, uploadBytesResumable } from 'firebase/storage'
import * as ImagePicker from 'expo-image-picker'
import { getFirebase } from '@/config/firebase'

export const pickImageFromLibrary = async (): Promise<ImagePicker.ImagePickerAsset | null> => {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync()
  if (permission.status !== 'granted') {
    return null
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    allowsEditing: true,
    quality: 0.8
  })

  if (result.canceled || !result.assets.length) return null
  return result.assets[0]
}

export const uploadUserImage = async (
  userId: string,
  file: ImagePicker.ImagePickerAsset,
  kind: 'selfie' | 'photo'
): Promise<string> => {
  const { storage } = getFirebase()
  const response = await fetch(file.uri)
  const blob = await response.blob()
  const key = `${userId}/${kind}/${Date.now()}-${file.fileName ?? 'image'}.jpg`
  const storageRef = ref(storage, key)
  const uploadTask = uploadBytesResumable(storageRef, blob)
  await uploadTask
  return getDownloadURL(storageRef)
}
