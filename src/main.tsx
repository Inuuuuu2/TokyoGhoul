import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { SillytavernProvider } from './hooks/useSillytavern'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <SillytavernProvider>
      <App />
    </SillytavernProvider>
  </StrictMode>,
)
