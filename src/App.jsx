import { AnimatePresence } from 'framer-motion'
import { useCallback, useState } from 'react'
import Background from './components/Background'
import Cursor from './components/Cursor'
import Intro from './components/Intro'
import World from './components/World'

export default function App() {
  const [entered, setEntered] = useState(false)
  const enter = useCallback(() => setEntered(true), [])

  return (
    <div className="world-shell relative">
      <Background />
      <Cursor />
      <World entered={entered} />

      <AnimatePresence>
        {!entered ? <Intro key="intro" onEnter={enter} /> : null}
      </AnimatePresence>
    </div>
  )
}
