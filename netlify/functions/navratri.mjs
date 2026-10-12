// Netlify Function: /api/navratri — scoreboard for Navratri at VoloFin.
// All logic lives in ../lib/navratri-core.mjs.
import { getStore } from '@netlify/blobs';
import { createHandler } from '../lib/navratri-core.mjs';

export default async (req, context) => {
  const handle = createHandler({
    store: getStore({ name: 'navratri-2026', consistency: 'strong' }),
    env: process.env,
  });
  return handle(req, context.ip || req.headers.get('x-nf-client-connection-ip') || '0.0.0.0');
};

export const config = { path: '/api/navratri' };
