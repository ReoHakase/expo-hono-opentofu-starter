import { zValidator } from '@hono/zod-validator';
import { feedQuerySchema, postInputSchema, postParamsSchema } from '@starter/shared';
import { and, desc, eq, sql } from 'drizzle-orm';
import { Hono } from 'hono';

import type { Database } from '../../db/client';
import type { Auth, AuthenticatedEnv } from '../auth';

import { like, post, user } from '../../db/schema';
import { requireSession } from '../auth';

export function postRoutes(db: Database, auth: Auth) {
  return new Hono<AuthenticatedEnv>()
    .get('/posts', zValidator('query', feedQuerySchema), async (c) => {
      const { offset, author } = c.req.valid('query');
      const session = await auth.api.getSession({ headers: c.req.raw.headers });
      const items = await db
        .select({
          id: post.id,
          body: post.body,
          createdAt: post.createdAt,
          author: { id: user.id, name: user.name, image: user.image },
          likeCount: sql<number>`(select count(*)::int from ${like} where ${like.postId} = ${post.id})`,
          liked: session
            ? sql<boolean>`exists(select 1 from ${like} where ${like.postId} = ${post.id} and ${like.userId} = ${session.user.id})`
            : sql<boolean>`false`,
        })
        .from(post)
        .innerJoin(user, eq(post.userId, user.id))
        .where(author ? eq(post.userId, author) : undefined)
        .orderBy(desc(post.createdAt), desc(post.id))
        .limit(21)
        .offset(offset);
      return c.json({
        items: items.slice(0, 20),
        nextOffset: items.length > 20 ? offset + 20 : null,
      });
    })
    .post('/posts', requireSession(auth), zValidator('json', postInputSchema), async (c) => {
      const id = crypto.randomUUID();
      await db
        .insert(post)
        .values({ id, userId: c.get('currentUser').id, body: c.req.valid('json').body });
      return c.json({ id }, 201);
    })
    .delete(
      '/posts/:id',
      requireSession(auth),
      zValidator('param', postParamsSchema),
      async (c) => {
        const deleted = await db
          .delete(post)
          .where(
            and(eq(post.id, c.req.valid('param').id), eq(post.userId, c.get('currentUser').id)),
          )
          .returning({ id: post.id });
        if (!deleted.length) {
          return c.json({ error: 'not_found' as const }, 404);
        }
        return c.json({ success: true });
      },
    )
    .put(
      '/posts/:id/like',
      requireSession(auth),
      zValidator('param', postParamsSchema),
      async (c) => {
        const id = c.req.valid('param').id;
        const userId = c.get('currentUser').id;
        // Keep the post from being deleted between selecting it and inserting the like.
        const target = db
          .$with('target_post')
          .as(db.select({ id: post.id }).from(post).where(eq(post.id, id)).for('key share'));
        const insert = db.$with('insert_like').as(
          db
            .insert(like)
            .select(
              db
                .select({ postId: target.id, userId: sql<string>`${userId}`.as('user_id') })
                .from(target),
            )
            .onConflictDoNothing({ target: [like.postId, like.userId] }),
        );
        const [existing] = await db.with(target, insert).select({ id: target.id }).from(target);
        if (!existing) {
          return c.json({ error: 'not_found' as const }, 404);
        }
        return c.json({ success: true });
      },
    )
    .delete(
      '/posts/:id/like',
      requireSession(auth),
      zValidator('param', postParamsSchema),
      async (c) => {
        await db
          .delete(like)
          .where(
            and(eq(like.postId, c.req.valid('param').id), eq(like.userId, c.get('currentUser').id)),
          );
        return c.json({ success: true });
      },
    );
}
