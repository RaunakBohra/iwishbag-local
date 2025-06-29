import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
<<<<<<< HEAD
import { componentTagger } from "lovable-tagger";
=======
>>>>>>> ed4ff60d414419cde21cca73f742c35e0184a312

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
<<<<<<< HEAD
    mode === 'development' &&
    componentTagger(),
  ].filter(Boolean),
=======
  ],
>>>>>>> ed4ff60d414419cde21cca73f742c35e0184a312
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
<<<<<<< HEAD
}));
=======
}));
>>>>>>> ed4ff60d414419cde21cca73f742c35e0184a312
