import { createRoot } from 'react-dom/client';

// Import polyfills first
import './lib/polyfills.ts';

// Import font
import '@fontsource-variable/inter';

import App from './App.tsx';
import './index.css';

createRoot(document.getElementById("root")!).render(<App />);
