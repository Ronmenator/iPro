import { ThemeProvider } from './context/ThemeContext'
import BookEditor from './components/BookEditor'

function App() {
  return (
    <ThemeProvider>
      <BookEditor />
    </ThemeProvider>
  )
}

export default App

