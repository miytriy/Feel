import React from 'react'
import ReactDOM from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import App from './App.jsx'

registerSW({ immediate: true })

ReactDOM.createRoot(document.getElementById('root')).render(<App />)
