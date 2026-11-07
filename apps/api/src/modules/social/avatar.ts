import { avatarSizeLimit } from '@starter/shared';
import sharp from 'sharp';

export async function normalizeAvatar(encoded: string) {
  const input = Buffer.from(encoded, 'base64');
  if (input.length > avatarSizeLimit) {
    throw new Error('Avatar is too large');
  }
  const image = sharp(input, { limitInputPixels: 16 * 1024 * 1024 });
  const metadata = await image.metadata();
  if (metadata.format !== 'jpeg' || (metadata.pages ?? 1) !== 1) {
    throw new Error('Expected a JPEG image');
  }
  const output = await image
    .rotate()
    .resize(512, 512, { fit: 'cover' })
    .jpeg({ quality: 80 })
    .toBuffer();
  if (output.length > avatarSizeLimit) {
    throw new Error('Avatar is too large');
  }
  return output;
}
