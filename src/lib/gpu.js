/**
 * Small, cached GPU probe.
 *
 * Browsers do not let a page choose a GPU directly, but they do honour
 * `powerPreference: 'high-performance'` when a WebGL context is created. This
 * module reads the unmasked renderer string (when the browser exposes it) and
 * turns it into a quality tier so the rest of the site can spend the GPU
 * budget it actually has.
 *
 * Tiers:
 *   high   → strong discrete GPU or Apple Silicon: full effects.
 *   medium → low-end discrete GPU (GT 720M, MX150…) or modern integrated:
 *            keep the look, trim pixel ratio and particle counts.
 *   low    → software rasterizer or very weak hardware: cheapest path.
 */

const SOFTWARE_RE = /swiftshader|llvmpipe|software|basic render|microsoft basic/i
const DISCRETE_RE =
  /nvidia|geforce|quadro|rtx|gtx|radeon|\brx\s?\d|arc\s?a\d|intel arc|apple m\d/i
const INTEGRATED_RE = /intel|uhd|hd graphics|iris|vega|mali|adreno|powervr|apple/i

let cached = null

function readRenderer() {
  if (typeof document === 'undefined') {
    return { name: '', vendor: '', software: false, available: false }
  }

  try {
    const canvas = document.createElement('canvas')
    const gl =
      canvas.getContext('webgl2', { failIfMajorPerformanceCaveat: false }) ||
      canvas.getContext('webgl', { failIfMajorPerformanceCaveat: false })
    if (!gl) return { name: '', vendor: '', software: true, available: false }

    const ext = gl.getExtension('WEBGL_debug_renderer_info')
    const name = ext ? String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) || '') : ''
    const vendor = ext ? String(gl.getParameter(ext.UNMASKED_VENDOR_WEBGL) || '') : ''

    // Release the probe context immediately; some drivers only allow a handful.
    gl.getExtension('WEBGL_lose_context')?.loseContext()

    return { name, vendor, software: SOFTWARE_RE.test(`${name} ${vendor}`), available: true }
  } catch {
    return { name: '', vendor: '', software: false, available: false }
  }
}

export function getGpuInfo() {
  if (cached) return cached

  const cores =
    typeof navigator !== 'undefined' ? navigator.hardwareConcurrency ?? 8 : 8
  const memory = typeof navigator !== 'undefined' ? navigator.deviceMemory ?? 8 : 8
  const { name, vendor, software, available } = readRenderer()
  const haystack = `${name} ${vendor}`.toLowerCase()

  const apple = /apple m\d/.test(haystack)
  // "Radeon Vega 8" is an APU, not a card, even though the name says Radeon.
  const radeonApu = /radeon.*vega|vega.*radeon/.test(haystack)
  const discrete = DISCRETE_RE.test(haystack) && !apple && !radeonApu
  const integrated = INTEGRATED_RE.test(haystack)
  const oldIntel = /hd graphics|uhd graphics/.test(haystack)

  let tier = 'medium'
  if (software || cores <= 2 || memory <= 2) {
    tier = 'low'
  } else if (apple && cores >= 6) {
    tier = 'high'
  } else if (discrete) {
    tier = cores >= 6 && memory >= 8 ? 'high' : 'medium'
  } else if (integrated && (cores <= 4 || memory <= 4 || oldIntel)) {
    tier = 'low'
  } else if (!available && cores <= 4) {
    tier = 'low'
  }

  cached = {
    name,
    vendor,
    available,
    software,
    discrete,
    integrated,
    cores,
    memory,
    tier,
    // The CSS "lite" profile removes backdrop blur and heavy compositing.
    // It is about the CPU/compositor as much as the GPU, so low-core laptops
    // keep it even when they have a small discrete card.
    lite: software || tier === 'low' || cores <= 4 || memory <= 4,
  }

  return cached
}

export function getGpuTier() {
  return getGpuInfo().tier
}

/** True when the page should drop expensive compositing effects. */
export function shouldUseLiteProfile() {
  return getGpuInfo().lite
}
