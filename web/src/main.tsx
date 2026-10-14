import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
// theme.css 提供全局 CSS 变量（明/暗两套），各页面样式只引用变量
import './styles/theme.css'
import './index.css'
import App from './App.tsx'
import { ThemeProvider } from './theme/ThemeProvider.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <App />
    </ThemeProvider>
  </StrictMode>,
)
