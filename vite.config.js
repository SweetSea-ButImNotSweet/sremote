import path from 'node:path';
import CleanCSS from 'clean-css';
import { defineConfig } from 'vite';
import monkey from 'vite-plugin-monkey';

export default defineConfig(({ command }) => {
  const isMinify = process.env.MINIFY === 'true';
  const isBuild = command === 'build';

  return {
    root: import.meta.dirname,
    resolve: {
      alias: { '@sremote/wrapper': path.resolve(import.meta.dirname, 'packages/wrapper/src/index.js'), '@sremote/shared': path.resolve(import.meta.dirname, 'packages/shared') },
    },
    server: {
      open: false, // Prevents Windows spawn EPERM error
      host: '127.0.0.1',
      port: 5500,
      cors: true,
      headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Private-Network': 'true', 'Access-Control-Allow-Headers': '*', 'Access-Control-Allow-Methods': '*' },
    },
    plugins: [
      ...(isMinify
        ? [
            {
              name: 'minify-raw-css',
              enforce: 'pre',
              transform(code, id) {
                if (id.includes('.css?raw')) {
                  const clean = new CleanCSS({ level: 2 });
                  const output = clean.minify(code);
                  return { code: `export default ${JSON.stringify(output.styles)};`, map: null };
                }
              },
            },
          ]
        : []),
      // Only attach vite-plugin-monkey when building the userscript bundle,
      // preventing monkey from hijacking dev server root (index.html) and mounting __vite_plugin_monkey
      ...(isBuild
        ? [
            monkey({
              entry: path.resolve(import.meta.dirname, 'packages/userscript/src/main.js'),
              server: { open: false },
              userscript: {
                name: 'SRemote Frame Controller',
                namespace: 'sweetsea.sremote',
                version: '2.0.0',
                author: 'sweetsea',
                license: 'LGPL-3.0',
                description: 'Allow a parent page to control media inside an iframe with permission.',
                match: ['*://*/*', 'http://*/*', 'https://*/*', 'file:///*'],
                include: ['*'],
                'run-at': 'document-start',
                grant: ['GM_getValue', 'GM_setValue', 'GM_deleteValue', 'GM_listValues', 'GM_registerMenuCommand', 'unsafeWindow'],
              },
              build: { fileName: isMinify ? 'sremote.min.user.js' : 'sremote.user.js' },
            }),
          ]
        : []),
    ],
    build: { outDir: path.resolve(import.meta.dirname, 'dist'), emptyOutDir: !isMinify, minify: isMinify },
  };
});
