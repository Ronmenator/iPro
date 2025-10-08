import { Routes, Route } from 'react-router-dom'
import { ThemeProvider } from './context/ThemeContext'
import Layout from './components/Layout'

function App() {
  return (
    <ThemeProvider>
      <Routes>
        <Route path="/*" element={<Layout />} />
      </Routes>
    </ThemeProvider>
  )
}

export default App

