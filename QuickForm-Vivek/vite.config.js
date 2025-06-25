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
  plugins: [react()],
  resolve: {
    alias: {
      '@': '/src'
    }
  },
  define: {
    'process.env': {
      REACT_APP_GET_ACCESS_TOKEN_URL: 'https://76vlfwtmig.execute-api.us-east-1.amazonaws.com/getAccessToken/',
      REACT_APP_FETCH_METADATA_URL: 'https://hmcyy3382m.execute-api.us-east-1.amazonaws.com/fetchMetadata/',
      REACT_APP_FETCH_FIELDS_URL: 'https://f9g3ezxfj3.execute-api.us-east-1.amazonaws.com/fetchFieldsForObject/',
      REACT_APP_SAVE_FORM_URL: 'https://a3vtckwcyl.execute-api.us-east-1.amazonaws.com/create-form-fields/',
      REACT_APP_SUBMIT_FORM_URL: 'https://c7kjp77sxa.execute-api.us-east-1.amazonaws.com/submit-form',
      REACT_APP_FETCH_FORM_BY_LINK_URL: 'https://lzpmoc4p3b.execute-api.us-east-1.amazonaws.com/fetch-form-by-link'
    }
  }
})
