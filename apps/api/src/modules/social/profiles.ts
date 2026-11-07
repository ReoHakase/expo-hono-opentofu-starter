import { zValidator } from '@hono/zod-validator';
import { avatarBase64Limit, profileUpdateSchema, userParamsSchema } from '@starter/shared';
import { and, eq, sql } from 'drizzle-orm';
import { Hono } from 'hono';
import { bodyLimit } from 'hono/body-limit';
import { z } from 'zod';

import type { Database } from '../../db/client';
import type { Auth, AuthenticatedEnv } from '../auth';

import { avatar, user } from '../../db/schema';
import { requireSession } from '../auth';
import { normalizeAvatar } from './avatar';

const publicUser = { id: user.id, name: user.name, image: user.image };

export function profileRoutes(db: Database, auth: Auth) {
  return new Hono<AuthenticatedEnv>()
    .get(
      '/users/:id/avatar/:version',
      zValidator('param', userParamsSchema.extend({ version: z.uuid() })),
      async (c) => {
        const { id, version } = c.req.valid('param');
        const etag = `"${version.toLowerCase()}"`;
        const ifNoneMatch = c.req.header('if-none-match');
        const unchanged =
          ifNoneMatch === '*' ||
          ifNoneMatch?.split(',').some((tag) => tag.trim().replace(/^W\//, '') === etag);
        // Confirm the version still exists without loading the JPEG on revalidation.
        const [image] = await db
          .select({ data: unchanged ? sql<null>`null` : avatar.data })
          .from(avatar)
          .where(and(eq(avatar.userId, id), eq(avatar.version, version)));
        if (!image) {
          return c.json({ error: 'not_found' as const }, 404);
        }
        c.header('Cache-Control', 'public, max-age=300');
        c.header('ETag', etag);
        if (image.data === null) {
          return c.body(null, 304);
        }
        return c.body(new Uint8Array(image.data), 200, {
          'Content-Type': 'image/jpeg',
        });
      },
    )
    .put(
      '/me/profile',
      requireSession(auth),
      bodyLimit({ maxSize: avatarBase64Limit + 1024 }),
      zValidator('json', profileUpdateSchema),
      async (c) => {
        const input = c.req.valid('json');
        const id = c.get('currentUser').id;
        let data: Buffer | undefined;
        if (typeof input.avatar === 'string') {
          try {
            data = await normalizeAvatar(input.avatar);
          } catch {
            return c.json({ error: 'invalid_avatar' as const }, 400);
          }
        }
        const person = await db.transaction(async (tx) => {
          let image: string | null | undefined;
          if (data) {
            const version = crypto.randomUUID();
            await tx
              .insert(avatar)
              .values({ userId: id, version, data })
              .onConflictDoUpdate({ target: avatar.userId, set: { version, data } });
            image = `/api/users/${encodeURIComponent(id)}/avatar/${version}`;
          } else if (input.avatar === null) {
            await tx.delete(avatar).where(eq(avatar.userId, id));
            image = null;
          }
          const [updated] = await tx
            .update(user)
            .set({
              name: input.name,
              ...(image !== undefined ? { image } : {}),
              updatedAt: new Date(),
            })
            .where(eq(user.id, id))
            .returning(publicUser);
          if (!updated) {
            throw new Error('User no longer exists');
          }
          return updated;
        });
        return c.json({ user: person });
      },
    )
    .get('/users/:id', zValidator('param', userParamsSchema), async (c) => {
      const [profile] = await db
        .select(publicUser)
        .from(user)
        .where(eq(user.id, c.req.valid('param').id));
      if (!profile) {
        return c.json({ error: 'not_found' as const }, 404);
      }
      return c.json({ user: profile });
    })
    .get('/me', requireSession(auth), (c) => {
      const current = c.get('currentUser');
      return c.json({ user: { id: current.id, name: current.name, email: current.email } });
    });
}
