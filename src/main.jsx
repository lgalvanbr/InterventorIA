import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

if (window.self !== window.top) {
  // If loaded inside an iframe (like the PDF viewer fallback), prevent rendering the entire React app
  document.getElementById('root').innerHTML = '<div style="padding: 20px; font-family: sans-serif; color: #64748b;">Cargando documento...</div>';
} else {
  createRoot(document.getElementById('root')).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
}
