import path from 'path';
import fs from 'fs';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

const base64Loader = {
  name: 'base64-loader',
  transform(_: any, id: string) {
    if (id.includes('?base64')) {
      try {
        const [rawPath] = id.split('?');
        const fullPath = path.resolve(path.dirname(id), rawPath);

        if (!fs.existsSync(fullPath)) {
          // Fallback to rawPath if it's already absolute
          if (!fs.existsSync(rawPath)) {
            console.error(`[base64-loader] File not found: ${rawPath} or ${fullPath}`);
            return;
          }
          const buffer = fs.readFileSync(rawPath);
          return {
            code: generateResponse(rawPath, buffer),
            map: null
          };
        }

        const buffer = fs.readFileSync(fullPath);
        return {
          code: generateResponse(fullPath, buffer),
          map: null
        };
      } catch (err) {
        console.error(`[base64-loader] Error:`, err);
        return;
      }
    }
  }
};

function generateResponse(filePath: string, buffer: Buffer) {
  const ext = path.extname(filePath).slice(1).toLowerCase();
  const mime = ext === 'ttf' ? 'font/ttf' : (ext === 'png' ? 'image/png' : (ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' : `application/octet-stream`));
  return `export default 'data:${mime};base64,${buffer.toString('base64')}'`;
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    server: {
      port: 3000,
      host: '0.0.0.0',
    },
    plugins: [react(), base64Loader],
    define: {
      'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      }
    }
  };
});
