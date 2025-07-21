import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { validateEnv } from './config/env';

// Validate environment variables on startup
if (!validateEnv()) {
  console.error('❌ Environment validation failed. Check your environment variables.');
}

createRoot(document.getElementById('root')!).render(<App />);
