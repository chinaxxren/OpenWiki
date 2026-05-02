import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'

/** Determine which component to render based on the URL path. */
const pathname = window.location.pathname

// Bubble and spotlight windows need fully transparent backgrounds
if (pathname === '/bubble' || pathname === '/spotlight') {
  document.documentElement.classList.add('transparent-window')
}

async function loadRootComponent() {
  if (pathname === '/spotlight') {
    return import('./features/spotlight/SpotlightView.tsx')
  }
  if (pathname === '/bubble') {
    return import('./components/BubbleView.tsx')
  }
  return import('./App.tsx')
}

async function bootstrap() {
  const bootNamespaces = pathname === '/' ? ['common', 'update', 'automation'] as const : ['common'] as const
  const { initI18nWithNamespaces } = await import('./i18n')
  await initI18nWithNamespaces(bootNamespaces)
  const { default: RootComponent } = await loadRootComponent()
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <RootComponent />
    </StrictMode>,
  )
}

void bootstrap()
