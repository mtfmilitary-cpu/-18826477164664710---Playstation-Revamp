import { StrictMode, Component } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

function reportDiagnostic(entry) {
  const bridge = window.consoleBridge
  if (typeof bridge?.reportDiagnostic === 'function') {
    bridge.reportDiagnostic(entry).catch(() => {
      console.error('[DIAG-BRIDGE-0001] Renderer diagnostic could not reach the main process.')
    })
  } else {
    console.error(`[${entry.code}] ${entry.message}`)
  }
}

class ConsoleErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error) {
    reportDiagnostic({
      code: 'RENDERER-BOOT-0002',
      message: 'React caught an interface rendering error.',
      name: error?.name || 'Error',
      detail: error?.message || 'No error message was provided.',
    })
  }

  render() {
    if (this.state.hasError) {
      return <main role="alert" style={{ padding: 32, color: '#fff', background: '#070a12', minHeight: '100vh' }}>
        <h1>Console interface error</h1>
        <p>The interface hit an error. Check logs/console-diagnostics.log for the diagnostic code.</p>
      </main>
    }
    return this.props.children
  }
}

window.addEventListener('error', (event) => {
  if (event.target && event.target !== window) {
    const target = event.target
    const rawPath = target.currentSrc || target.src || target.href || ''
    let assetName = 'unknown asset'
    try { assetName = new URL(rawPath, window.location.href).pathname.split('/').filter(Boolean).pop() || 'unknown asset' } catch {}
    reportDiagnostic({
      code: 'RENDERER-ASSET-0001',
      message: 'A page asset failed to load.',
      name: String(target.tagName || 'resource').slice(0, 40),
      detail: assetName.slice(0, 120),
    })
    return
  }

  reportDiagnostic({
    code: 'RENDERER-0001',
    message: 'Uncaught renderer JavaScript error.',
    name: event.error?.name || 'Error',
    detail: event.error?.message || event.message || 'No error message was provided.',
  })
})

window.addEventListener('unhandledrejection', (event) => {
  const reason = event.reason
  reportDiagnostic({
    code: 'RENDERER-PROMISE-0001',
    message: 'Unhandled renderer promise rejection.',
    name: reason?.name || 'PromiseRejection',
    detail: reason?.message || String(reason || 'No rejection details were provided.'),
  })
})

function mediaFileName(target) {
  try {
    const source = target.currentSrc || target.src || ''
    return new URL(source, window.location.href).pathname.split('/').filter(Boolean).pop() || 'unknown media'
  } catch {
    return 'unknown media'
  }
}

document.addEventListener('play', (event) => {
  const target = event.target
  if (!(target instanceof HTMLMediaElement)) return
  reportDiagnostic({
    code: 'RENDERER-MEDIA-0001',
    message: 'Audio or video playback started.',
    name: String(target.tagName || 'MEDIA'),
    detail: mediaFileName(target),
  })
}, true)

document.addEventListener('ended', (event) => {
  const target = event.target
  if (!(target instanceof HTMLMediaElement)) return
  reportDiagnostic({
    code: 'RENDERER-MEDIA-0002',
    message: 'Audio or video playback ended.',
    name: String(target.tagName || 'MEDIA'),
    detail: mediaFileName(target),
  })
}, true)

const rootElement = document.getElementById('root')
if (!rootElement) {
  reportDiagnostic({
    code: 'RENDERER-BOOT-0001',
    message: 'Required root element was not found.',
    name: 'MissingRootElement',
    detail: 'The document did not contain an element with id root.',
  })
  throw new Error('[RENDERER-BOOT-0001] Required #root element was not found.')
}

try {
  createRoot(rootElement).render(
    <StrictMode>
      <ConsoleErrorBoundary>
        <App />
      </ConsoleErrorBoundary>
    </StrictMode>,
  )
  reportDiagnostic({
    code: 'RENDERER-BOOT-0003',
    message: 'Renderer boot completed.',
    name: 'Startup',
    detail: 'React root mounted.',
  })
} catch (error) {
  reportDiagnostic({
    code: 'RENDERER-BOOT-0002',
    message: 'React could not mount the console application.',
    name: error?.name || 'Error',
    detail: error?.message || 'No error message was provided.',
  })
  throw error
}
