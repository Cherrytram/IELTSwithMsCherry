
import 'server-only';

import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export async function serverDb() {
  const jar = await cookies();

  return createServerClient(url, anon, {
    cookies: {
      getAll() {
        return jar.getAll();
      },
setAll(items: { name: string; value: string; options?: Record<string, any> }[]) {
        try {
          items.forEach(({ name, value, options }) => {
            jar.set(name, value, options);
          });
        } catch {
          // Cookies cannot be modified in some server contexts.
        }
      },
    },
  });
}

export function adminDb() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!key) {
    throw new Error('Missing server secret');
  }

  return createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
