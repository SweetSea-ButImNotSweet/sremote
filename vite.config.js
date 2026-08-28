import fs from 'node:fs';
import path from 'node:path';
import CleanCSS from 'clean-css';
import { defineConfig } from 'vite';
import monkey from 'vite-plugin-monkey';

export default defineConfig(() => {
  const isMinify = process.env.MINIFY === 'true';

  return {
    server: {
      open: false, // Prevents Windows spawn EPERM error
      host: '127.0.0.1',
      port: 5500,
      cors: true,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Private-Network': 'true',
        'Access-Control-Allow-Headers': '*',
        'Access-Control-Allow-Methods': '*',
      },
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
                  return {
                    code: `export default ${JSON.stringify(output.styles)};`,
                    map: null,
                  };
                }
              },
            },
          ]
        : []),
      {
        name: 'serve-root-index-html',
        enforce: 'pre',
        configureServer(server) {
          server.middlewares.use((req, res, next) => {
            const url = req.url ? req.url.split('?')[0] : '/';
            if (url === '/' || url === '/index.html') {
              const htmlPath = path.resolve(process.cwd(), 'index.html');
              try {
                let html = fs.readFileSync(htmlPath, 'utf-8');
                res.setHeader('content-type', 'text/html; charset=utf-8');
                res.setHeader('cache-control', 'no-cache');
                res.end(html);
                return;
              } catch (err) {
                console.error('Error serving index.html:', err);
              }
            }
            next();
          });
        },
      },
      monkey({
        entry: 'src/main.js',
        server: {
          open: false, // Prevent monkey plugin from auto-opening the userscript install URL
        },
        userscript: {
          name: 'SRemote Frame Controller',
          namespace: 'sweetsea.sremote',
          version: '1.0.0',
          author: 'sweetsea',
          license: 'LGPL-3.0',
          description: 'Allow a parent page to control media inside an iframe with permission.',
          match: ['*://*/*', 'http://*/*', 'https://*/*', 'file:///*'],
          include: ['*'],
          'run-at': 'document-start',
          grant: ['GM_getValue', 'GM_setValue', 'GM_deleteValue', 'GM_listValues', 'GM_registerMenuCommand', 'unsafeWindow'],
        },
        build: {
          fileName: isMinify ? 'sremote.min.user.js' : 'sremote.user.js',
        },
      }),
    ],
    build: {
      outDir: 'dist',
      emptyOutDir: !isMinify,
      minify: isMinify,
    },
  };
});
