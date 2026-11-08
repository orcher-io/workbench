import {
  Tree,
  formatFiles,
  generateFiles,
  names,
  joinPathFragments,
  offsetFromRoot,
} from '@nx/devkit';
import * as path from 'path';

interface PluginGeneratorSchema {
  name: string;
  directory: string;
  withEditor: boolean;
  withView: boolean;
  withCommand: boolean;
}

export default async function pluginGenerator(
  tree: Tree,
  options: PluginGeneratorSchema,
) {
  const pluginNames = names(options.name);
  const pluginDir = joinPathFragments(options.directory, pluginNames.fileName);

  // Generate files from templates
  generateFiles(tree, path.join(__dirname, 'files'), pluginDir, {
    ...options,
    ...pluginNames,
    tmpl: '',
  });

  const packageName = `@orcher/workbench-plugin-${pluginNames.fileName}`;
  const root = offsetFromRoot(pluginDir);
  const writeJson = (file: string, value: unknown) =>
    tree.write(joinPathFragments(pluginDir, file), JSON.stringify(value, null, 2) + '\n');

  // The same layout as the built-in plugins: a vite library build through
  // tools/vite/lib.ts, shipping dist/ only. Project references are filled
  // in by `nx sync`.
  writeJson('package.json', {
    name: packageName,
    version: '0.1.0',
    description: `${pluginNames.className} plugin for the workbench`,
    main: './dist/index.cjs',
    module: './dist/index.mjs',
    types: './dist/index.d.ts',
    sideEffects: false,
    license: 'Apache-2.0',
    peerDependencies: { react: '>=18.0.0' },
    dependencies: {
      '@orcher/workbench-plugin-api': 'workspace:^',
      '@radix-ui/themes': '^3.1.6',
    },
    publishConfig: { access: 'public' },
    exports: {
      '.': {
        types: './dist/index.d.ts',
        import: './dist/index.mjs',
        require: './dist/index.cjs',
      },
    },
    files: ['dist'],
    scripts: { prepack: `nx build ${packageName}` },
  });

  writeJson('project.json', {
    name: packageName,
    $schema: `${root}node_modules/nx/schemas/project-schema.json`,
    sourceRoot: `${pluginDir}/src`,
    projectType: 'library',
    tags: ['scope:workbench', 'type:lib'],
    targets: {
      build: {
        executor: 'nx:run-commands',
        outputs: ['{projectRoot}/dist'],
        options: { command: 'npx vite build', cwd: '{projectRoot}' },
      },
    },
  });

  tree.write(
    joinPathFragments(pluginDir, 'vite.config.ts'),
    `import { libConfig } from '${root}tools/vite/lib';\n\nexport default libConfig(__dirname, 'WorkbenchPlugin${pluginNames.className}');\n`,
  );

  writeJson('tsconfig.json', {
    extends: `${root}tsconfig.base.json`,
    compilerOptions: { outDir: './dist', rootDir: './src' },
    include: ['src/**/*'],
    exclude: ['node_modules', 'dist'],
  });

  writeJson('tsconfig.lib.json', {
    extends: `${root}tsconfig.base.json`,
    compilerOptions: {
      outDir: 'dist',
      rootDir: 'src',
      declaration: true,
      declarationMap: true,
      jsx: 'react-jsx',
      types: ['node'],
      paths: {},
    },
    include: ['src/**/*.ts', 'src/**/*.tsx'],
    exclude: ['src/**/*.test.ts', 'src/**/*.test.tsx', 'src/**/*.spec.ts', 'src/**/*.spec.tsx'],
  });

  await formatFiles(tree);

  return () => {
    console.log(`
Plugin created at ${pluginDir}

Next:
1. pnpm install && pnpm exec nx sync
2. Import the definition and module in your app
3. Add them to the plugins array in WorkbenchProvider

Example:
  import { ${pluginNames.propertyName}Definition, ${pluginNames.propertyName}Module } from '${packageName}';

  <WorkbenchProvider
    config={{
      plugins: [
        { definition: ${pluginNames.propertyName}Definition, module: ${pluginNames.propertyName}Module }
      ]
    }}
  >
    `);
  };
}
