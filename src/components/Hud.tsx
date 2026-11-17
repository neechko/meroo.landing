import { AnimatePresence, motion } from 'framer-motion'
import { Activity, ListVideo, Mail, UserRound, Volume2, VolumeX, Waves } from 'lucide-react'
import type { ComponentType } from 'react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { discordProfileUrl, site } from '../config'
import type { NowPlaying, Presence, TutorialStep } from '../types'
import { retrySkippedBgm, setBgmTrack, useBgm } from '../lib/bgm'
import { statusMeta, localTime } from '../lib/format'
import { useGithubRepos } from '../lib/github'
import { useNow } from '../lib/hooks'
import { useLanyard } from '../lib/lanyard'
import { useMalList } from '../lib/mal'
import { useViews } from '../lib/views'
import type { ViewsResult } from '../lib/views'
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

type TabId = TutorialStep

interface TabDefinition {
  id: TabId
  label: string
  Icon: ComponentType<{ className?: string }>
}

const TABS: TabDefinition[] = [
  { id: 'activity', label: 'Activity', Icon: Activity },
  { id: 'github', label: 'GitHub', Icon: GithubIcon },
  { id: 'anime', label: 'Anime', Icon: ListVideo },
  { id: 'profile', label: 'Profile', Icon: UserRound },
]

const REVEAL_INDEX: Record<TabId, number> = { activity: 0, github: 1, anime: 2, profile: 3 }
// Permanent, not per-session: once the tour is finished it stays finished
// across tabs, refreshes and browser restarts. Replay is offered from the
// player card if someone wants to see it again.
const TUTORIAL_KEY = 'meroo.tutorial.v2'
// Ambient motion can be paused from the header; the choice outlives the tab.
const MOTION_KEY = 'meroo.motion'

// The 3D scene is a separate chunk. Warming it up on hover (and quietly after
// the page loads) keeps the archive from showing a long loading state.
const prefetchCastoriceScene = () => {
  import('../lib/castoriceScene').catch(() => {})
}

interface HudHeaderProps {
  presence: Presence | null
  onContact: () => void
  views: ViewsResult
  onCastorice: () => void
}

function HudHeader({ presence, onContact, views, onCastorice }: HudHeaderProps) {
  const now = useNow(30_000)
  const status = presence?.discord_status ?? 'offline'
  const meta = statusMeta(status)
  const bgm = useBgm()
  const trackLabel = bgm.title || 'background music'
  const toggleLabel = `${bgm.playing ? 'Pause' : 'Play'} ${trackLabel}`
  const toggleTitle = bgm.skipped
    ? `${toggleLabel}. ${bgm.skipped} cannot be embedded here, so the Castorice track plays instead`
    : toggleLabel
  const [motionOff, setMotionOff] = useState(() => {
    try {
      return window.localStorage.getItem(MOTION_KEY) === 'off'
    } catch {
      return false
    }
  })

  useEffect(() => {
    document.documentElement.classList.toggle('motion-off', motionOff)
  }, [motionOff])

  const toggleMotion = useCallback(() => {
    setMotionOff((current) => {
      const next = !current
      try {
        window.localStorage.setItem(MOTION_KEY, next ? 'off' : 'on')
      } catch {
        // Private mode: the choice lasts for this session only.
      }
      return next
    })
  }, [])

  const motionLabel = motionOff ? 'Resume ambient motion' : 'Pause ambient motion'

  return (
    <header className="hud-topbar relative z-20 flex h-14 shrink-0 items-center justify-between gap-3 border-b border-white/[0.06] bg-[#05030c]/50 px-3 backdrop-blur-xl sm:px-4">
      <div className="flex min-w-0 items-center gap-2.5">
        <span className="relative h-8 w-8 shrink-0 overflow-hidden rounded-lg ring-1 ring-violet-300/35 shadow-[0_0_22px_-4px_rgba(168,85,247,0.8)]">
          <img src="/profile.jpg" alt="" width={32} height={32} className="h-full w-full object-cover" />
          <span className="pointer-events-none absolute inset-0 bg-gradient-to-tr from-violet-600/30 via-transparent to-cyan-300/20" />
        </span>
        <div className="min-w-0">
          <h1 className="truncate font-display text-[13px] font-semibold leading-none tracking-tight text-white">
            {site.name}
          </h1>
        </div>
      </div>

      <div className="hidden items-center gap-1.5 md:flex">
        <span className="inline-flex items-center gap-1.5 rounded-md border border-white/[0.08] bg-white/[0.03] px-2.5 py-1 font-mono text-[9px] font-semibold uppercase tracking-[0.14em] text-zinc-300">
          <StatusDot status={status} pulse={status !== 'offline'} className="h-1.5 w-1.5" />
          {meta.label}
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-md border border-white/[0.08] bg-white/[0.03] px-2.5 py-1 font-mono text-[9px] uppercase tracking-[0.14em] text-zinc-400">
          {localTime(site.timezone, now)} WIB
        </span>
        <ViewsPill
          count={views.count}
          offline={views.offline}
          className="hidden xl:inline-flex"
        />
        <span className="inline-flex items-center gap-1.5 rounded-md border border-cyan-300/20 bg-cyan-300/[0.06] px-2.5 py-1 font-mono text-[9px] font-semibold uppercase tracking-[0.14em] text-cyan-200">
          <span className="h-1 w-1 rounded-full bg-cyan-300" />
          online
        </span>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={toggleMotion}
          data-sfx="toggle"
          aria-pressed={!motionOff}
          aria-label={motionLabel}
          title={motionLabel}
          className={`tap-44 grid h-8 w-8 place-items-center rounded-lg border transition hover:-translate-y-px active:translate-y-0 ${
            motionOff
              ? 'border-white/[0.08] bg-white/[0.03] text-zinc-400 hover:border-violet-400/35 hover:text-violet-200'
              : 'border-cyan-300/25 bg-cyan-300/[0.07] text-cyan-200 hover:border-cyan-300/45 hover:bg-cyan-300/[0.12]'
          }`}
        >
          <Waves className="h-4 w-4" />
        </button>
        <a
          href={site.socials.github}
          target="_blank"
          rel="noreferrer"
          aria-label="GitHub"
          className="tap-44 grid h-8 w-8 place-items-center rounded-lg border border-white/[0.08] bg-white/[0.03] text-zinc-400 transition hover:-translate-y-px hover:border-violet-400/35 hover:bg-violet-500/10 hover:text-violet-200 active:translate-y-0"
        >
          <GithubIcon className="h-4 w-4" />
        </a>
        {discordProfileUrl ? (
          <a
            href={discordProfileUrl}
            target="_blank"
            rel="noreferrer"
            aria-label="Discord profile"
            className="tap-44 grid h-8 w-8 place-items-center rounded-lg border border-white/[0.08] bg-white/[0.03] text-zinc-400 transition hover:-translate-y-px hover:border-violet-400/35 hover:bg-violet-500/10 hover:text-violet-200 active:translate-y-0"
          >
            <DiscordIcon className="h-4 w-4" />
          </a>
        ) : null}
        <button
          type="button"
          onClick={bgm.toggle}
          aria-label={toggleLabel}
          title={toggleTitle}
          className={`tap-44 relative grid h-8 w-8 place-items-center rounded-lg border transition hover:-translate-y-px active:translate-y-0 ${
            bgm.playing
              ? 'border-violet-300/35 bg-violet-500/10 text-violet-200'
              : 'border-white/[0.08] bg-white/[0.03] text-zinc-400 hover:border-violet-400/35 hover:text-violet-200'
          }`}
        >
          {bgm.playing ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
          {bgm.playing ? (
            <span className="absolute right-1 top-1 h-1 w-1 rounded-full bg-cyan-300" />
          ) : null}
        </button>
        <button
          type="button"
          onClick={onCastorice}
          onPointerEnter={prefetchCastoriceScene}
          onFocus={prefetchCastoriceScene}
          data-sfx="chime"
          aria-label="Open Castorice"
          title="Open Castorice"
          className="tap-44 shine group inline-flex h-8 items-center gap-1.5 rounded-lg border border-violet-300/35 bg-gradient-to-r from-violet-600/75 via-indigo-600/65 to-cyan-600/55 px-2.5 font-mono text-[9px] font-semibold uppercase tracking-[0.1em] text-white shadow-[0_10px_30px_-14px_rgba(139,92,246,0.9)] transition hover:-translate-y-px hover:brightness-110 active:translate-y-0 active:scale-95"
        >
          <CastoriceGlyph className="relative z-[2] h-3.5 w-3.5" />
          <span className="relative z-[2] hidden min-[360px]:inline">Castorice</span>
        </button>
        <button
          type="button"
          onClick={onContact}
          className="tap-44 inline-flex h-8 items-center gap-1.5 rounded-lg border border-violet-400/30 bg-violet-500/10 px-2.5 font-mono text-[9px] font-semibold uppercase tracking-[0.1em] text-violet-200 transition hover:-translate-y-px hover:bg-violet-500/20 active:translate-y-0 active:scale-95"
        >
          <Mail className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Contact</span>
        </button>
      </div>
    </header>
  )
}

interface MobileTabsProps {
  tab: TabId
  setTab: (tab: TabId) => void
  hasMusic: boolean
  isLocked: (tab: TabId) => boolean
}

function MobileTabs({ tab, setTab, hasMusic, isLocked }: MobileTabsProps) {
  return (
    <nav className="hud-tabbar relative z-20 flex shrink-0 items-stretch gap-1 border-t border-white/[0.06] bg-[#05030c]/85 px-2 pb-[calc(env(safe-area-inset-bottom)+0.4rem)] pt-1.5 xl:hidden">
      {TABS.map(({ id, label, Icon }) => {
        const active = tab === id
        const locked = isLocked(id)
        return (
          <button
            key={id}
            type="button"
            onClick={() => {
              if (!locked) setTab(id)
            }}
            disabled={locked}
            aria-pressed={active}
            aria-disabled={locked || undefined}
            className={`relative flex min-h-11 flex-1 flex-col items-center gap-1 rounded-lg py-1.5 font-mono text-[8.5px] font-medium uppercase tracking-[0.08em] transition ${
              locked
                ? 'cursor-not-allowed text-zinc-400 opacity-45'
                : active
                  ? 'bg-violet-500/15 text-violet-200'
                  : 'text-zinc-400 hover:text-zinc-200'
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

export interface HudProps {
  entered: boolean
}

export default function Hud({ entered }: HudProps) {
  const [tab, setTab] = useState<TabId>('activity')
  const [contactOpen, setContactOpen] = useState(false)
  const [playerTrack, setPlayerTrack] = useState<NowPlaying | null>(null)
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

  // Memoised so the BGM effect only re-runs when the reported track changes,
  // not on every render of the presence card.
  const nowPlaying = useMemo(() => getNowPlaying(presence), [presence])
  const bgm = useBgm()

  // A track detected by Lanyard becomes the BGM when it has a YouTube source;
  // otherwise the local Castorice track stays in charge.
  useEffect(() => {
    setBgmTrack(nowPlaying)
  }, [nowPlaying])

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
    // The first card is the activity panel, so start there again.
    setTab('activity')
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

  const isLocked = (id: TabId) => revealed <= REVEAL_INDEX[id]
  const lockClass = (id: TabId) => (isLocked(id) ? ' is-locked' : '')

  const openContact = useCallback(() => setContactOpen(true), [])
  const closeContact = useCallback(() => setContactOpen(false), [])
  const openPlayer = useCallback(() => setPlayerTrack(nowPlaying), [nowPlaying])
  const closePlayer = useCallback(() => setPlayerTrack(null), [])
  const modalOpen = contactOpen || castoriceOpen || playerTrack !== null
  const footerNow = useNow(30_000)
  const footerDate = new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(footerNow))

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
      <div className="flex min-h-0 flex-1 flex-col" inert={modalOpen ? true : undefined}>
        <HudHeader
          presence={presence}
          onContact={openContact}
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
            onContact={openContact}
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
            onPlay={openPlayer}
            bgmActive={bgm.playing && bgm.source === 'discord'}
            bgmSkipped={bgm.skipped}
            onRetryBgm={retrySkippedBgm}
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

        <footer className="relative z-20 shrink-0">
          <MobileTabs
            tab={tab}
            setTab={setTab}
            hasMusic={Boolean(nowPlaying)}
            isLocked={isLocked}
          />
          <div className="hidden items-center justify-between gap-3 border-t border-white/[0.06] bg-[#05030c]/60 px-4 py-1.5 font-mono text-[9px] uppercase tracking-[0.14em] text-zinc-400 xl:flex">
            <span>single screen, no page scroll</span>
            <span>
              {footerDate} · {localTime(site.timezone, footerNow)} WIB
            </span>
          </div>
        </footer>

        <Tutorial
          key={revealed}
          revealed={revealed}
          active={entered && !tutorialDone && revealed > 0}
          onNext={nextTutorial}
          onSkip={finishTutorial}
        />
      </div>

      <AnimatePresence>
        {contactOpen ? <ContactModal onClose={closeContact} /> : null}
      </AnimatePresence>

      <AnimatePresence>
        {castoriceOpen ? <CastoriceViewer onClose={closeCastorice} /> : null}
      </AnimatePresence>

      <AnimatePresence>
        {playerTrack ? (
          <MusicPlayer track={playerTrack} onClose={closePlayer} />
        ) : null}
      </AnimatePresence>
    </motion.div>
  )
}
