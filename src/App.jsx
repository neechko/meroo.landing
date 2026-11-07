import About from './components/About'
import Background from './components/Background'
import Connect from './components/Connect'
import Cursor from './components/Cursor'
import Footer from './components/Footer'
import Hero from './components/Hero'
import LiveNow from './components/LiveNow'
import Navbar from './components/Navbar'
import OffTheClock from './components/OffTheClock'
import Projects from './components/Projects'
import { site } from './config'
import { useLanyard } from './lib/lanyard'

export default function App() {
  const { presence, isDemo, isLive, lastUpdate, loading, error } = useLanyard(site.discordUserId, {
    demoFallback: site.demoFallback,
  })

  return (
    <div className="relative min-h-screen overflow-x-hidden">
      <a
        href="#now"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-full focus:bg-violet-600 focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-white"
      >
        Skip to live activity
      </a>

      <Background />
      <Cursor />
      <Navbar status={presence?.discord_status ?? 'offline'} />

      <main className="relative z-10">
        <Hero
          presence={presence}
          loading={loading}
          isLive={isLive}
          isDemo={isDemo}
          lastUpdate={lastUpdate}
        />
        <LiveNow
          presence={presence}
          isLive={isLive}
          isDemo={isDemo}
          lastUpdate={lastUpdate}
          loading={loading}
          error={error}
        />
        <About presence={presence} />
        <OffTheClock />
        <Projects />
        <Connect presence={presence} />
      </main>

      <Footer />
    </div>
  )
}
