import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { YoutubeTranscript } from 'youtube-transcript'

function transcriptPlugin() {
  return {
    name: 'youtube-transcript-api',
    configureServer(server) {
      server.middlewares.use('/api/transcript', async (req, res, next) => {
        try {
          const url = new URL(req.originalUrl || req.url, `http://${req.headers.host}`);
          const videoId = url.searchParams.get('videoId');
          if (!videoId) {
            res.statusCode = 400;
            return res.end(JSON.stringify({ error: 'Missing videoId' }));
          }
          
          const transcript = await YoutubeTranscript.fetchTranscript(videoId);
          // Prefer english, else grab whatever
          const text = transcript.map(t => t.text).join(' ');
          
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ text }));
        } catch (e) {
          res.statusCode = 500;
          res.end(JSON.stringify({ error: e.message }));
        }
      });
    }
  }
}

export default defineConfig({
  plugins: [react(), transcriptPlugin()],
  server: {
    watch: {
      ignored: ['**/android/**']
    }
  },
  optimizeDeps: {
    include: ['pdfjs-dist']
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          pdf: ['pdfjs-dist'],
          motion: ['framer-motion']
        }
      }
    }
  }
})
