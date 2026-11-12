import { AnimatePresence, motion } from 'framer-motion'
import { Activity, ListVideo, Mail, UserRound, Volume2, VolumeX } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { discordProfileUrl, site } from '../config'
import { useBgm } from '../lib/bgm'
import { statusMeta, localTime } from '../lib/format'
import { useGithubRepos } from '../lib/github'
import { useNow } from '../lib/hooks'
import { useLanyard } from '../lib/lanyard'
import { useMalList } from '../lib/mal'
import { useViews } from '../lib/views'
import { getNowPlaying } from '../lib/nowPlaying'
import { TUTORIAL_ORDER } from '../lib/tutorial'
import ActivityPanel from './ActivityPanel'
import AnimePanel from './AnimePanel'
import CastoriceViewer from './CastoriceViewer'
import ContactModal from './ContactModal'
import GithubPanel from './GithubPanel'
import { CastoriceGlyph, DiscordIcon, GithubIcon } from './icons'
import MusicPlayer from './MusicPlayer'
import ProfilePanel from './ProfilePanel'
import Tilt from './Tilt'
import Tutorial from './Tutorial'
import { StatusDot } from './ui'
import ViewsPill from './ViewsPill'

const TABS = [
  { id: 'activity', label: 'Activity', Icon: Activity },
  { id: 'github', label: 'GitHub', Icon: GithubIcon },
  { id: 'anime', label: 'Anime', Icon: ListVideo },
  { id: 'profile', label: 'Profile', Icon: UserRound },
]

const REVEAL_INDEX = { activity: 0, github: 1, anime: 2, profile: 3 }
// Permanent, not per-session: once the tour is finished it stays finished
// across tabs, refreshes and browser restarts. Replay is offered from the
// player card if someone wants to see it again.
const TUTORIAL_KEY = 'meroo.tutorial.v2'

// The 3D scene is a separate chunk. Warming it up on hover (and quietly after
// the page loads) keeps the archive from showing a long loading state.
const prefetchCastoriceScene = () => {
  import('../lib/castoriceScene').catch(() => {})
}

function HudHeader({ presence, onContact, views, onCastorice }) {
  const now = useNow(30_000)
  const status = presence?.discord_status ?? 'offline'
  const meta = statusMeta(status)
  const bgm = useBgm()

  return (
    <header className="hud-topbar relative z-20 flex h-14 shrink-0 items-center justify-between gap-3 border-b border-white/[0.06] bg-[#05030c]/50 px-3 backdrop-blur-xl sm:px-4">
      <div className="flex min-w-0 items-center gap-2.5">
        <span className="relative h-8 w-8 shrink-0 overflow-hidden rounded-lg ring-1 ring-violet-300/35 shadow-[0_0_22px_-4px_rgba(168,85,247,0.8)]">
          <img src="/profile.jpg" alt="" className="h-full w-full object-cover" />
          <span className="pointer-events-none absolute inset-0 bg-gradient-to-tr from-violet-600/30 via-transparent to-cyan-300/20" />
        </span>
        <div className="min-w-0">
          <p className="truncate font-display text-[13px] font-semibold leading-none tracking-tight text-white">
            {site.name}
          </p>
        </div>
      </div>

      <div className="hidden items-center gap-1.5 md:flex">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-white/[0.08] bg-white/[0.03] px-2.5 py-1 font-mono text-[9px] font-semibold uppercase tracking-[0.14em] text-zinc-300">
          <StatusDot status={status} pulse={status !== 'offline'} className="h-1.5 w-1.5" />
          {meta.label}
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-white/[0.08] bg-white/[0.03] px-2.5 py-1 font-mono text-[9px] uppercase tracking-[0.14em] text-zinc-400">
          {localTime(site.timezone, now)} WIB
        </span>
        <ViewsPill
          count={views?.count}
          offline={views?.offline}
          className="hidden xl:inline-flex"
        />
        <span className="inline-flex items-center gap-1.5 rounded-full border border-cyan-300/20 bg-cyan-300/[0.06] px-2.5 py-1 font-mono text-[9px] font-semibold uppercase tracking-[0.14em] text-cyan-200">
          <span className="h-1 w-1 rounded-full bg-cyan-300 shadow-[0_0_8px_2px_rgba(103,232,249,0.7)]" />
          online
        </span>
      </div>

      <div className="flex items-center gap-1.5">
        <a
          href={site.socials.github}
          target="_blank"
          rel="noreferrer"
          aria-label="GitHub"
          className="grid h-8 w-8 place-items-center rounded-lg border border-white/[0.08] bg-white/[0.03] text-zinc-400 transition hover:border-violet-400/35 hover:bg-violet-500/10 hover:text-violet-200"
        >
          <GithubIcon className="h-4 w-4" />
        </a>
        {discordProfileUrl ? (
          <a
            href={discordProfileUrl}
            target="_blank"
            rel="noreferrer"
            aria-label="Discord profile"
            className="grid h-8 w-8 place-items-center rounded-lg border border-white/[0.08] bg-white/[0.03] text-zinc-400 transition hover:border-violet-400/35 hover:bg-violet-500/10 hover:text-violet-200"
          >
            <DiscordIcon className="h-4 w-4" />
          </a>
        ) : null}
        <button
          type="button"
          onClick={bgm.toggle}
          aria-label={bgm.playing ? 'Pause background music' : 'Play background music'}
          title={bgm.playing ? 'Pause background music' : 'Play background music'}
          className={`relative grid h-8 w-8 place-items-center rounded-lg border transition ${
            bgm.playing
              ? 'border-violet-300/35 bg-violet-500/10 text-violet-200'
              : 'border-white/[0.08] bg-white/[0.03] text-zinc-400 hover:border-violet-400/35 hover:text-violet-200'
          }`}
        >
          {bgm.playing ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
          {bgm.playing ? (
            <span className="absolute right-1 top-1 h-1 w-1 rounded-full bg-cyan-300 shadow-[0_0_8px_2px_rgba(103,232,249,0.7)]" />
          ) : null}
        </button>
        <button
          type="button"
          onClick={onCastorice}
          onPointerEnter={prefetchCastoriceScene}
          onFocus={prefetchCastoriceScene}
          aria-label="Open Castorice"
          title="Open Castorice"
          className="shine group inline-flex h-8 items-center gap-1.5 rounded-lg border border-violet-300/35 bg-gradient-to-r from-violet-600/75 via-indigo-600/65 to-cyan-600/55 px-2.5 font-mono text-[9px] font-semibold uppercase tracking-[0.1em] text-white shadow-[0_10px_30px_-14px_rgba(139,92,246,0.9)] transition hover:brightness-110 active:scale-95"
        >
          <CastoriceGlyph className="relative z-[2] h-3.5 w-3.5" />
          <span className="relative z-[2] hidden min-[360px]:inline">Castorice</span>
        </button>
        <button
          type="button"
          onClick={onContact}
          className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-violet-400/30 bg-violet-500/10 px-2.5 font-mono text-[9px] font-semibold uppercase tracking-[0.1em] text-violet-200 transition hover:bg-violet-500/20 active:scale-95"
        >
          <Mail className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Contact</span>
        </button>
      </div>
    </header>
  )
}

function MobileTabs({ tab, setTab, hasMusic }) {
  return (
    <nav className="hud-tabbar relative z-20 flex shrink-0 items-stretch gap-1 border-t border-white/[0.06] bg-[#05030c]/60 px-2 pb-[calc(env(safe-area-inset-bottom)+0.4rem)] pt-1.5 backdrop-blur-xl xl:hidden">
      {TABS.map(({ id, label, Icon }) => {
        const active = tab === id
        return (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            aria-pressed={active}
            className={`relative flex flex-1 flex-col items-center gap-1 rounded-lg py-1.5 font-mono text-[8.5px] font-medium uppercase tracking-[0.08em] transition ${
              active ? 'bg-violet-500/15 text-violet-200' : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <Icon className="h-4 w-4" />
            {label}
            {id === 'activity' && hasMusic ? (
              <span className="absolute right-[28%] top-1 h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_2px_rgba(52,211,153,0.6)]" />
            ) : null}
            {active ? (
              <span className="absolute inset-x-4 -bottom-0.5 h-px bg-gradient-to-r from-transparent via-violet-300 to-transparent" />
            ) : null}
          </button>
        )
      })}
    </nav>
  )
}

export default function Hud({ entered }) {
  const [tab, setTab] = useState('activity')
  const [contactOpen, setContactOpen] = useState(false)
  const [playerTrack, setPlayerTrack] = useState(null)
  const [castoriceOpen, setCastoriceOpen] = useState(
    () => typeof window !== 'undefined' && window.location.hash === '#castorice',
  )
  const [tutorialDone, setTutorialDone] = useState(() => {
    try {
      return window.localStorage.getItem(TUTORIAL_KEY) === '1'
    } catch {
      return false
    }
  })
  const [revealed, setRevealed] = useState(() =>
    tutorialDone ? TUTORIAL_ORDER.length : 0,
  )

  const { presence, isDemo, isLive, lastUpdate, loading, error } = useLanyard(site.discordUserId, {
    demoFallback: site.demoFallback,
  })

  const nowPlaying = getNowPlaying(presence)

  const github = useGithubRepos(site.github.username, {
    limit: site.github.limit,
    featured: site.github.featured,
    notes: site.projectNotes,
  })

  const mal = useMalList(site.myanimelist.username, { limit: site.myanimelist.limit })
  const views = useViews()

  useEffect(() => {
    if (!entered) return undefined
    const timer = window.setTimeout(prefetchCastoriceScene, 3000)
    return () => window.clearTimeout(timer)
  }, [entered])

  useEffect(() => {
    if (!entered || tutorialDone || revealed > 0) return undefined
    const timer = window.setTimeout(() => setRevealed(1), 700)
    return () => window.clearTimeout(timer)
  }, [entered, tutorialDone, revealed])

  const finishTutorial = useCallback(() => {
    setRevealed(TUTORIAL_ORDER.length)
    setTutorialDone(true)
    try {
      window.localStorage.setItem(TUTORIAL_KEY, '1')
    } catch {
      // Private mode: the tutorial simply shows again next time.
    }
  }, [])

  const replayTutorial = useCallback(() => {
    setTutorialDone(false)
    setRevealed(0)
    try {
      window.localStorage.removeItem(TUTORIAL_KEY)
    } catch {
      // Nothing to clear.
    }
  }, [])

  const nextTutorial = useCallback(() => {
    if (revealed >= TUTORIAL_ORDER.length) {
      finishTutorial()
      return
    }
    const next = revealed + 1
    setRevealed(next)
    setTab(TUTORIAL_ORDER[next - 1])
  }, [revealed, finishTutorial])

  const lockClass = (id) => (revealed > REVEAL_INDEX[id] ? '' : ' is-locked')

  // The Castorice archive is linkable: `#castorice` opens it directly and the
  // browser back button closes it, so it behaves like a page inside the HUD.
  const openCastorice = useCallback(() => {
    setCastoriceOpen(true)
    if (window.location.hash !== '#castorice') {
      window.location.hash = 'castorice'
    }
  }, [])

  const closeCastorice = useCallback(() => {
    setCastoriceOpen(false)
    if (window.location.hash === '#castorice') {
      window.history.replaceState(null, '', window.location.pathname + window.location.search)
    }
  }, [])

  useEffect(() => {
    const sync = () => setCastoriceOpen(window.location.hash === '#castorice')
    window.addEventListener('hashchange', sync)
    window.addEventListener('popstate', sync)
    return () => {
      window.removeEventListener('hashchange', sync)
      window.removeEventListener('popstate', sync)
    }
  }, [])

  return (
    <motion.div
      className="relative z-10 flex h-[100dvh] w-full flex-col overflow-hidden"
      initial={false}
      animate={entered ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.975 }}
      transition={{ duration: 0.85, ease: [0.22, 1, 0.36, 1] }}
      inert={!entered ? true : undefined}
      aria-hidden={!entered}
    >
      <HudHeader
        presence={presence}
        onContact={() => setContactOpen(true)}
        onCastorice={openCastorice}
        views={views}
      />

      <main
        key={`${entered ? 'in' : 'out'}-${tab}`}
        className="relative z-10 mx-auto flex min-h-0 w-full max-w-[1000px] flex-1 flex-col gap-2 px-2.5 py-2.5 xl:grid xl:max-w-[1800px] xl:grid-cols-[300px_minmax(0,1fr)_330px] xl:grid-rows-[minmax(0,1.16fr)_minmax(0,0.84fr)] xl:gap-3 xl:px-4 xl:py-3 2xl:grid-cols-[320px_minmax(0,1fr)_350px]"
      >
        <Tilt
          className={`hud-lockable${lockClass('profile')} ${tab === 'profile' ? 'flex' : 'hidden'} hud-rise min-h-0 flex-1 xl:col-start-1 xl:row-span-2 xl:flex`}
          style={{ animationDelay: '0.16s' }}
        >
          <ProfilePanel
            presence={presence}
            onContact={() => setContactOpen(true)}
            onReplayTutorial={replayTutorial}
            views={views}
            className="h-full w-full"
          />
        </Tilt>

        <Tilt
          className={`hud-lockable${lockClass('activity')} ${tab === 'activity' ? 'flex' : 'hidden'} hud-rise min-h-0 flex-1 xl:col-start-2 xl:row-start-1 xl:flex`}
          style={{ animationDelay: '0.24s' }}
        >
          <ActivityPanel
            presence={presence}
            nowPlaying={nowPlaying}
            loading={loading}
            isLive={isLive}
            isDemo={isDemo}
            lastUpdate={lastUpdate}
            error={error}
            onPlay={() => setPlayerTrack(nowPlaying)}
            className="h-full w-full"
          />
        </Tilt>

        <Tilt
          className={`hud-lockable${lockClass('github')} ${tab === 'github' ? 'flex' : 'hidden'} hud-rise min-h-0 flex-1 xl:col-start-3 xl:row-span-2 xl:flex`}
          style={{ animationDelay: '0.32s' }}
        >
          <GithubPanel
            repos={github.repos}
            status={github.status}
            error={github.error}
            syncedAt={github.syncedAt}
            onRefresh={github.refresh}
            className="h-full w-full"
          />
        </Tilt>

        <Tilt
          className={`hud-lockable${lockClass('anime')} ${tab === 'anime' ? 'flex' : 'hidden'} hud-rise min-h-0 flex-1 xl:col-start-2 xl:row-start-2 xl:flex`}
          style={{ animationDelay: '0.4s' }}
        >
          <AnimePanel
            entries={mal.entries}
            watching={mal.watching}
            status={mal.status}
            error={mal.error}
            updatedAt={mal.updatedAt}
            onRefresh={mal.refresh}
            className="h-full w-full"
          />
        </Tilt>
      </main>

      <MobileTabs tab={tab} setTab={setTab} hasMusic={Boolean(nowPlaying)} />

      <Tutorial
        key={revealed}
        revealed={revealed}
        active={entered && !tutorialDone && revealed > 0}
        onNext={nextTutorial}
        onSkip={finishTutorial}
      />

      <AnimatePresence>
        {contactOpen ? <ContactModal onClose={() => setContactOpen(false)} /> : null}
      </AnimatePresence>

      <AnimatePresence>
        {castoriceOpen ? <CastoriceViewer onClose={closeCastorice} /> : null}
      </AnimatePresence>

      <AnimatePresence>
        {playerTrack ? (
          <MusicPlayer track={playerTrack} onClose={() => setPlayerTrack(null)} />
        ) : null}
      </AnimatePresence>
    </motion.div>
  )
}
