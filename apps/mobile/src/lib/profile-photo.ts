import { avatarBase64Limit } from '@starter/shared';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { launchImageLibraryAsync } from 'expo-image-picker';

export type ProfilePhoto = { uri: string; base64: string };

export async function pickProfilePhoto(): Promise<ProfilePhoto | null> {
  const result = await launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    aspect: [1, 1],
    quality: 1,
  });
  const asset = result.assets?.[0];
  if (!asset) {
    return null;
  }
  const context = ImageManipulator.manipulate(asset.uri);
  try {
    context.resize(asset.width >= asset.height ? { width: 512 } : { height: 512 });
    const image = await context.renderAsync();
    try {
      const photo = await image.saveAsync({ format: SaveFormat.JPEG, compress: 0.8, base64: true });
      if (!photo.base64 || photo.base64.length > avatarBase64Limit) {
        throw new Error('Photo is too large');
      }
      return { uri: photo.uri, base64: photo.base64 };
    } finally {
      image.release();
    }
  } finally {
    context.release();
  }
}
