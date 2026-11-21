import tailwindcss from '@tailwindcss/vite';
import { devtools } from '@tanstack/devtools-vite';
import { tanstackStart } from '@tanstack/react-start/plugin/vite';
import { redact } from '@tanstack/redact/vite';
import viteReact from '@vitejs/plugin-react';
import { nitro } from 'nitro/vite';
import { defineConfig } from 'vite';

const config = defineConfig({
  build: {
    license: false
  },
  server: {
    host: true,
    port: 3000,
    fs: {
      deny: ['.env', '.env.*', '*.{crt,pem,key,p12,pfx,cer,der}', '**/.git/**']
    }
  },
  resolve: {
    tsconfigPaths: true
  },

  optimizeDeps: {
    exclude: ['cloudflare:workers']
  },

  plugins: [
    devtools(),
    nitro({
      rollupConfig: {
        external: [/^@sentry\//]
      }
    }),
    tailwindcss(),
    tanstackStart({
      srcDirectory: 'src',
      router: {
        routeFileIgnorePattern: '\\.test\\.tsx?$'
      }
    }),
    viteReact(),
    redact()
  ]
});

export default config;
