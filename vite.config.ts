import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { copyFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';

function copyMediaFilesPlugin() {
  return {
    name: 'copy-media-files',
    closeBundle() {
      const distMedia = join('dist', 'Media');

      if (!existsSync(distMedia)) {
        mkdirSync(distMedia, { recursive: true });
      }

      try {
        copyFileSync(
          join('public', 'Media', 'image.png'),
          join(distMedia, 'image.png')
        );
        copyFileSync(
          join('public', 'Media', 'wevysyalogo.png'),
          join(distMedia, 'wevysyalogo.png')
        );
        console.log('✓ Media files copied successfully');
      } catch (err: any) {
        console.error('Error copying media files:', err.message);
      }

      try {
        copyFileSync(
          join('public', '_redirects'),
          join('dist', '_redirects')
        );
        console.log('✓ _redirects file copied successfully');
      } catch (err: any) {
        console.error('Error copying _redirects file:', err.message);
      }
    },
  };
}

export default defineConfig({
  plugins: [react(), copyMediaFilesPlugin()],
  optimizeDeps: {
    exclude: ['lucide-react'],
    include: ['xlsx'],
  },
  publicDir: false,
});
