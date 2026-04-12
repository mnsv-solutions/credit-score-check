import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  clean: true,
  minify: true,
  external: [
    '@prisma/client',
    '@prisma/client/runtime/client',
    '@prisma/client/runtime/query_compiler_fast_bg.postgresql.mjs',
    '@prisma/client/runtime/query_compiler_fast_bg.postgresql.wasm-base64.mjs',
    'dotenv',
    'fastify',
  ],
});
