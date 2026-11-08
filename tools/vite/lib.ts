import { copyFileSync } from 'node:fs';
import { resolve, isAbsolute } from 'node:path';
import react from '@vitejs/plugin-react';
import dts from 'vite-plugin-dts';
import type { Plugin, UserConfig } from 'vite';

/** The repository's licence file, shipped inside every published package. */
const LICENSE = resolve(__dirname, '../../LICENSE');

function shipLicense(dirname: string): Plugin {
  return {
    name: 'ship-license',
    closeBundle() {
      copyFileSync(LICENSE, resolve(dirname, 'dist/LICENSE'));
    },
  };
}

/**
 * Shared library build for every @orcher/workbench-* package.
 *
 * Produces a package-local `dist/` containing dual ESM (`index.mjs`) + CJS
 * (`index.cjs`) bundles and rolled-up types (`index.d.ts`). Every bare
 * specifier is externalized, so only the package's own `src/` is bundled and
 * consumers supply react, radix, and sibling workbench packages. Keeping this
 * in one place means a new package or plugin gets a correct, consistent build
 * from a two-line vite.config.ts — no per-package drift.
 */
export function libConfig(dirname: string, name: string): UserConfig {
  return {
    plugins: [
      react(),
      // Emit per-file .d.ts via tsc (no api-extractor rollup — it chokes on
      // re-exported external types like React's ReactNode). types resolves to
      // dist/index.d.ts, which references the sibling declarations.
      dts({
        include: ['src'],
        tsconfigPath: resolve(dirname, 'tsconfig.lib.json'),
      }),
      shipLicense(dirname),
    ],
    build: {
      lib: {
        entry: resolve(dirname, 'src/index.ts'),
        name,
        formats: ['es', 'cjs'],
        fileName: (format) => `index.${format === 'es' ? 'mjs' : 'cjs'}`,
      },
      rollupOptions: {
        // Externalize all bare specifiers (deps + peerDeps); bundle only local src.
        external: (id) => !id.startsWith('.') && !isAbsolute(id),
      },
      outDir: 'dist',
      emptyOutDir: true,
      sourcemap: true,
    },
  };
}
