import { ThemeProvider } from './context/ThemeContext'
import { ConversationProvider } from './context/ConversationContext'
import BookEditor from './components/BookEditor'

function App() {
  return (
    <ThemeProvider>
      <ConversationProvider>
        <BookEditor />
      </ConversationProvider>
    </ThemeProvider>
  )
}

export default App

