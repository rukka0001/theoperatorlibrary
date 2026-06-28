// @ts-check
import { defineConfig } from 'astro/config';

import vercel from '@astrojs/vercel';

import tailwindcss from '@tailwindcss/vite';

// https://astro.build/config
export default defineConfig({
  // Pages are static by default; API routes opt into SSR via
  // `export const prerender = false`.
  site: 'https://theoperatorlibrary.com',

  adapter: vercel(),

  // Root redirects to the Spanish storefront.
  redirects: {
    '/': '/es'
  },

  // Flow's server-to-server webhook (/api/webhooks/flow) posts without a
  // matching Origin header, which Astro's default CSRF check would reject.
  // The webhook is instead secured by verifying payment state via Flow's
  // signed payment/getStatus call, so we disable the origin check.
  security: {
    checkOrigin: false
  },

  vite: {
    plugins: [tailwindcss()]
  }
});