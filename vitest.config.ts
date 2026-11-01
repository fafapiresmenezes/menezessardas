import { defineConfig } from 'vitest/config'
import { fileURLToPath } from 'node:url'

export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      // Edge Functions importam o supabase-js por URL (Deno); nos testes vira o dublê em memória.
      'https://esm.sh/@supabase/supabase-js@2': fileURLToPath(new URL('./supabase/functions/_testes/supabase-js.ts', import.meta.url)),
      'jsr:@supabase/supabase-js@2': fileURLToPath(new URL('./supabase/functions/_testes/supabase-js.ts', import.meta.url)),
    },
  },
  test: { environment: 'node', exclude: ['e2e/**', 'node_modules/**', 'dist/**'] }, // e2e é do Playwright (npm run e2e)
})
