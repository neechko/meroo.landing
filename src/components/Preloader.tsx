import { motion } from 'framer-motion'

/**
 * The first ten seconds are intentionally almost empty: a dark room, a dim
 * wordmark and one slow water line rising through the letters of `meroo__`.
 * No ripples, no counters, no navigation, no copy.
 */
export default function Preloader() {
  return (
    <motion.div
      className="preloader"
      role="status"
      aria-label="Opening the meroo universe"
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.7, ease: 'easeInOut' }}
    >
      <div className="preloader-lockup">
        <span className="preloader-word">
          <span className="preloader-logo">meroo__</span>
          <span className="preloader-water" aria-hidden="true">
            <span className="preloader-water-text">meroo__</span>
            <span className="preloader-water-drops">meroo__</span>
          </span>
          <span className="preloader-line" aria-hidden="true">
            meroo__
          </span>
        </span>
        <span className="preloader-sub">universe</span>
      </div>

      <span className="sr-only">Loading</span>
    </motion.div>
  )
}
