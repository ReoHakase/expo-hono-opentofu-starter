import { z } from 'zod';

export const preferencesSchema = z.object({
  appearance: z.enum(['system', 'light', 'dark']).default('system'),
  haptics: z.boolean().default(true),
});

export type Preferences = z.infer<typeof preferencesSchema>;

export const postInputSchema = z.object({
  body: z
    .string()
    .trim()
    .min(1, '本文を入力してください')
    .max(500, '500文字以内で入力してください'),
});
export const postParamsSchema = z.object({ id: z.uuid() });
export const userParamsSchema = z.object({ id: z.string().min(1).max(128) });
export const feedQuerySchema = z.object({
  offset: z.coerce.number().int().min(0).max(10000).default(0),
  author: z.string().min(1).max(128).optional(),
});
export const profileInputSchema = z.object({
  name: z.string().trim().min(1, '名前を入力してください').max(40, '40文字以内で入力してください'),
});
export const avatarSizeLimit = 256 * 1024;
export const avatarBase64Limit = Math.ceil(avatarSizeLimit / 3) * 4;
export const profileUpdateSchema = profileInputSchema.extend({
  avatar: z.base64().min(1).max(avatarBase64Limit).nullable().optional(),
});
