import { AnimatePresence, motion, useScroll, useSpring } from 'framer-motion'
import { Menu, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { discordProfileUrl, site } from '../config'
import { useActiveSection } from '../lib/hooks'
import { DiscordIcon, GithubIcon } from './icons'
import { StatusDot } from './ui'

const LINKS = [
  { id: 'home', label: 'Home' },
  { id: 'now', label: 'Now' },
  { id: 'about', label: 'About' },
  { id: 'off-clock', label: 'Off Clock' },
  { id: 'projects', label: 'Projects' },
  { id: 'contact', label: 'Contact' },
]

const SECTION_IDS = LINKS.map((link) => link.id)

export default function Navbar({ status = 'offline' }) {
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)
  const active = useActiveSection(SECTION_IDS)
  const { scrollYProgress } = useScroll()
  const scaleX = useSpring(scrollYProgress, { stiffness: 140, damping: 30, mass: 0.3 })

  const profileHref = discordProfileUrl ?? site.socials.github
  const ProfileIcon = discordProfileUrl ? DiscordIcon : GithubIcon
  const profileLabel = discordProfileUrl ? 'Discord' : 'GitHub'

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [open])

  return (
    <>
      <motion.div
        style={{ scaleX }}
        className="fixed inset-x-0 top-0 z-[60] h-[2px] origin-left bg-gradient-to-r from-violet-500 via-fuchsia-400 to-cyan-300"
      />

      <header
        className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${scrolled
            ? 'border-b border-white/[0.06] bg-[#06040f]/75 backdrop-blur-2xl'
            : 'border-b border-transparent bg-transparent'
          }`}
      >
        <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-5 sm:h-[72px] sm:px-8">
          <a href="#home" className="group flex items-center gap-2.5" aria-label={`${site.name} home`}>
            <span className="relative grid h-9 w-9 place-items-center overflow-hidden rounded-xl bg-gradient-to-br from-violet-500 via-fuchsia-500 to-indigo-600 font-display text-lg font-bold text-white shadow-[0_8px_24px_-8px_rgba(168,85,247,0.9)] ring-1 ring-white/20">
              <img
                src="/profile.jpg"
                alt="Logo"
                className="h-full w-full object-cover"
              />
            </span>
            <span className="font-display text-[17px] font-semibold tracking-tight text-white">
              {site.displayName}
              <span className="text-fuchsia-400">__</span>
            </span>
          </a>

          <div className="hidden items-center gap-0.5 rounded-full border border-white/[0.07] bg-white/[0.025] p-1 backdrop-blur lg:flex">
            {LINKS.map((link) => {
              const isActive = active === link.id
              return (
                <a
                  key={link.id}
                  href={`#${link.id}`}
                  className={`relative rounded-full px-3 py-1.5 text-[13px] font-medium transition-colors duration-200 ${isActive ? 'text-white' : 'text-zinc-400 hover:text-zinc-100'
                    }`}
                >
                  {isActive ? (
                    <motion.span
                      layoutId="nav-pill"
                      className="absolute inset-0 rounded-full bg-white/[0.08] ring-1 ring-white/10"
                      transition={{ type: 'spring', stiffness: 320, damping: 30 }}
                    />
                  ) : null}
                  <span className="relative">{link.label}</span>
                </a>
              )
            })}
          </div>

          <div className="flex items-center gap-2">
            <a
              href={profileHref}
              target="_blank"
              rel="noreferrer"
              className="group hidden items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-[13px] font-semibold text-zinc-200 transition-all duration-300 hover:border-indigo-400/40 hover:bg-indigo-500/10 hover:text-white sm:inline-flex"
            >
              <span className="relative">
                <ProfileIcon className="h-4 w-4 text-indigo-300 transition-transform duration-300 group-hover:-rotate-6" />
              </span>
              {profileLabel}
              {discordProfileUrl ? <StatusDot status={status} pulse={false} className="h-2 w-2" /> : null}
            </a>

            <button
              type="button"
              onClick={() => setOpen((value) => !value)}
              className="grid h-10 w-10 place-items-center rounded-xl border border-white/10 bg-white/[0.04] text-zinc-200 transition hover:bg-white/[0.08] lg:hidden"
              aria-label={open ? 'Close menu' : 'Open menu'}
              aria-expanded={open}
            >
              {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </nav>
      </header>

      <AnimatePresence>
        {open ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-[#06040f]/95 backdrop-blur-2xl lg:hidden"
          >
            <div className="flex h-full flex-col px-6 pb-10 pt-24">
              <div className="space-y-1.5">
                {LINKS.map((link, index) => (
                  <motion.a
                    key={link.id}
                    href={`#${link.id}`}
                    onClick={() => setOpen(false)}
                    initial={{ opacity: 0, x: -16 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.05 + index * 0.05 }}
                    className={`flex items-center justify-between rounded-2xl border px-5 py-4 font-display text-lg font-medium transition ${active === link.id
                        ? 'border-violet-400/30 bg-violet-500/10 text-white'
                        : 'border-white/[0.06] bg-white/[0.02] text-zinc-300'
                      }`}
                  >
                    {link.label}
                    <span className="text-xs text-zinc-600">0{index + 1}</span>
                  </motion.a>
                ))}
              </div>

              <a
                href={profileHref}
                target="_blank"
                rel="noreferrer"
                className="mt-auto inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-violet-600 to-fuchsia-600 px-5 py-3.5 text-sm font-semibold text-white shadow-lg shadow-fuchsia-900/40"
              >
                <ProfileIcon className="h-4 w-4" /> Open {profileLabel} profile
              </a>
              <p className="mt-4 text-center text-xs text-zinc-600">
                {site.name} · {site.location}
              </p>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  )
}
