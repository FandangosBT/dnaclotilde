import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './ui/App'
import './index.css'
import ChatCommercialWidget from './ui/components/ChatCommercialWidget'

const rootEl = document.getElementById('root')!
const useWidget = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('widget') === 'commercial'

createRoot(rootEl).render(
  <React.StrictMode>
    {useWidget ? <ChatCommercialWidget /> : <App />}
  </React.StrictMode>,
)
