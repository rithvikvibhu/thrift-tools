import { defineConfig, Plugin } from 'vite';
import react from '@vitejs/plugin-react';

function umamiPlugin(): Plugin {
  return {
    name: 'umami-plugin',
    transformIndexHtml(html) {
      // Only inject in production builds
      if (process.env.NODE_ENV === 'production') {
        return html.replace(
          '</head>',
          '    <script defer src="https://umami.htools.work/u.js" data-website-id="e43ac61d-1588-431b-a54d-f0f5629dfa7c"></script>\n  </head>'
        );
      }
      return html;
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), umamiPlugin()],
});
