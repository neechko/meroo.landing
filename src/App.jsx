import { AnimatePresence } from 'framer-motion'
import { useCallback, useEffect, useState } from 'react'
import Background from './components/Background'
import Cursor from './components/Cursor'
import Intro from './components/Intro'
import Preloader from './components/Preloader'
import Hud from './components/Hud'
import { startBgm } from './lib/bgm'

const LOADING_MS = 10_000

export default function App() {
  const [phase, setPhase] = useState('loading')

  // A deliberate ten-second cold open. The HUD is already mounted underneath
  // so its data requests and model chunk warm up while the water logo plays.
  useEffect(() => {
    if (phase !== 'loading') return undefined
    const timer = window.setTimeout(() => setPhase('intro'), LOADING_MS)
    return () => window.clearTimeout(timer)
  }, [phase])

  const enterHud = useCallback(() => {
    startBgm()
    setPhase('hud')
  }, [])

  return (
    <div className="hud-shell relative">
      {phase !== 'loading' ? <Background /> : null}
      {phase !== 'loading' ? <Cursor /> : null}
      <Hud entered={phase === 'hud'} />

      <AnimatePresence mode="wait">
        {phase === 'loading' ? (
          <Preloader key="preloader" />
        ) : phase === 'intro' ? (
          <Intro key="intro" onEnter={enterHud} />
        ) : null}
      </AnimatePresence>
    </div>
  )
}
