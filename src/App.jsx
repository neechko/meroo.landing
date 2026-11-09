import { AnimatePresence } from 'framer-motion'
import { useCallback, useState } from 'react'
import Background from './components/Background'
import Cursor from './components/Cursor'
import Intro from './components/Intro'
import World from './components/World'

export default function App() {
  const [phase, setPhase] = useState('intro')

  const enterWorld = useCallback(() => setPhase('world'), [])

  return (
    <div className="world-shell relative">
      <Background />
      <Cursor />
      <World entered={phase === 'world'} />

      <AnimatePresence mode="wait">
        {phase === 'intro' ? <Intro key="intro" onEnter={enterWorld} /> : null}
      </AnimatePresence>
    </div>
  )
}
