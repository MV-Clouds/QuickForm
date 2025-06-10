// import { defineConfig } from 'vite';
// import reactRefresh from '@vitejs/plugin-react-refresh';
// import path from 'path';
// import { fileURLToPath } from 'url';

// const __dirname = path.dirname(fileURLToPath(import.meta.url));

// // https://vitejs.dev/config/
// export default defineConfig({
//   resolve: {
//     alias: [{ find: '@', replacement: path.resolve(__dirname, 'src') }],
//   },
//   plugins: [reactRefresh()],
// });
// vite.config.js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
// import path from 'path'

export default defineConfig({
  plugins: [ react(),],
  resolve: {
    alias: {
      '@': '/src'
    }
  }
})