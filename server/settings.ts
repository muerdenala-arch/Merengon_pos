import type { VercelRequest, VercelResponse } from '@vercel/node';
import { query } from './_lib/db.js';
import { methodNotAllowed, requireBody, withErrorHandling } from './_lib/http.js';

interface Setting {
  key: string;
  value: unknown;
}

async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'GET') {
    const rows = await query<Setting>('SELECT key, value FROM settings');
    // Convert array of {key, value} to an object
    const settingsObj = rows.reduce((acc, row) => {
      acc[row.key] = row.value;
      return acc;
    }, {} as Record<string, unknown>);
    
    res.status(200).json(settingsObj);
    return;
  }

  if (req.method === 'POST') {
    const body = requireBody<Record<string, unknown>>(req);
    
    // Upsert each setting
    for (const [key, value] of Object.entries(body)) {
      await query(
        `INSERT INTO settings (key, value) VALUES ($1, $2)
         ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
        [key, JSON.stringify(value)]
      );
    }
    
    // Return all settings after update
    const rows = await query<Setting>('SELECT key, value FROM settings');
    const settingsObj = rows.reduce((acc, row) => {
      acc[row.key] = row.value;
      return acc;
    }, {} as Record<string, unknown>);
    
    res.status(200).json(settingsObj);
    return;
  }

  methodNotAllowed(res, ['GET', 'POST']);
}

export default withErrorHandling(handler);
