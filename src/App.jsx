import { Routes, Route, Navigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import Layout from './components/Layout'
import GeneratePage from './pages/GeneratePage'
import HistoryPage from './pages/HistoryPage'
import SettingsPage from './pages/SettingsPage'

export default function App() {
  const [darkMode, setDarkMode] = useState(() => {
    return localStorage.getItem('darkMode') === 'true'
  })

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
    localStorage.setItem('darkMode', darkMode)
  }, [darkMode])

  return (
    <div className={darkMode ? 'dark' : ''} style={{ height: '100%' }}>
      <Layout darkMode={darkMode} setDarkMode={setDarkMode}>
        <Routes>
          <Route path="/" element={<Navigate to="/generate" replace />} />
          <Route path="/generate" element={<GeneratePage />} />
          <Route path="/history" element={<HistoryPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Routes>
      </Layout>
    </div>
  )
}
