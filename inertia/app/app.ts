/// <reference path="../../adonisrc.ts" />
/// <reference path="../../config/inertia.ts" />
import '../../resources/css/app.css'
import { createInertiaApp } from '@inertiajs/svelte'
import { resolvePageComponent } from '@adonisjs/inertia/helpers'
import { hydrate, mount } from 'svelte'
// Using native SW registration instead of vite-pwa-register for explicit scope control

const appName = import.meta.env.VITE_APP_NAME || 'AdonisJS'

createInertiaApp({
  progress: { color: '#5468FF' },

  title: (title: string) => (title ? `${title} - ${appName}` : appName),

  resolve: (name) => {
    return resolvePageComponent(`../pages/${name}.svelte`, import.meta.glob('../pages/**/*.svelte'))
  },

  setup({ el, App, props }) {
    if (el.dataset.serverRendered === 'true') {
      hydrate(App, { target: el, props })
    } else {
      mount(App, { target: el, props, hydrate: true })
    }
  },
})

// Register PWA service worker with root scope
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js', { scope: '/' }).then((registration) => {
    // Handle updates - activate new SW immediately
    registration.addEventListener('updatefound', () => {
      const newWorker = registration.installing
      if (newWorker) {
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            newWorker.postMessage({ type: 'SKIP_WAITING' })
          }
        })
      }
    })
  })
}
