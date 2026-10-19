import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// Renderer diagnostics: print stable identifiers so crashes can be matched to a subsystem.
window.addEventListener('error', (event) => {
  console.error('[RENDERER-0001] Uncaught renderer error.', event.error || event.message)
})

window.addEventListener('unhandledrejection', (event) => {
  console.error('[RENDERER-PROMISE-0001] Unhandled renderer promise rejection.', event.reason)
})

const rootElement = document.getElementById('root')
if (!rootElement) {
  console.error('[RENDERER-BOOT-0001] Required #root element was not found.')
  throw new Error('[RENDERER-BOOT-0001] Required #root element was not found.')
}

try {
  createRoot(rootElement).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
} catch (error) {
  console.error('[RENDERER-BOOT-0002] React could not mount the console application.', error)
  throw error
}
