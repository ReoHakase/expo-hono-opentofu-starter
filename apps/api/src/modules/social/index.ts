import { Hono } from 'hono';

import type { Database } from '../../db/client';
import type { Auth } from '../auth';

import { postRoutes } from './posts';
import { profileRoutes } from './profiles';

export function socialRoutes(db: Database, auth: Auth) {
  return new Hono().route('/', profileRoutes(db, auth)).route('/', postRoutes(db, auth));
}
