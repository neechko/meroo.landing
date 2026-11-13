import * as THREE from 'three'
import { getGpuInfo } from './gpu'

/**
 * A real WebGL scene for the Castorice archive.
 *
 * The only character asset is the actual Castorice model in `public/castorice`:
 * the Sketchfab release by frey (CC-BY-4.0). It is skinned, textured and
 * ships with a library of single-frame facial poses plus a blink clip, which
 * are used here for visual-novel expressions. Motes, butterflies and the
 * ground ring stay procedural, but the figure is always the real model.
 *
 * The figure breathes, turns toward the pointer and can be dragged.
 */

const VIOLET = 0x8b5cf6
const CYAN = 0x67e8f9
const PINK = 0xf0abfc

const MODEL_URL = '/castorice/scene.gltf'
const MODEL_HEIGHT = 2.05
const BLINK_CLIP = 'Emo_Castorice_00_Ani_Blink'
const EXPRESSION_CLIPS = {
  neutral: 'Emo_Castorice_00_Ani_Default',
  gentle: 'Emo_Castorice_00_Ani_PhotoGraph_Gentle',
  shy: 'Emo_Castorice_00_Ani_PhotoGraph_Shy',
  trouble: 'Emo_Castorice_00_Ani_PhotoGraph_Trouble',
  surprise: 'Emo_Castorice_00_Ani_PhotoGraph_Surprise',
}

const CLIP_MANIFEST_URL = '/castorice/clips/manifest.json'

// The asset ships in a bind A-pose: all 97 clips animate face bones only, so
// the arms never move on their own. This single static preset folds both hands
// low in front of the waist — the calm, maid-like pose that reads best on her.
// There is deliberately no sway or gesture switching: the body holds one pose
// while only the head, breathing and face expressions keep her alive.
// Angles are degrees around each bone's local axes, calibrated on the real
// skeleton: +Y on the shoulder lowers the arm, +Z swings it forward, and +Y on
// the elbow folds the forearm in.
const BODY_POSES = {
  rest: {},
  idle: {
    L: { shoulder: [0, 26, 0], elbow: [0, 68, 50], wrist: [0, 0, 0], curl: 34 },
    R: { shoulder: [0, 26, 0], elbow: [0, 68, 50], wrist: [0, 0, 0], curl: 34 },
  },
}

const BONE_CHAINS = {
  L: { shoulder: 'Shoulder_L_0226', elbow: 'Elbow_L_0227', wrist: 'Wrist_L_0231' },
  R: { shoulder: 'Shoulder_R_0249', elbow: 'Elbow_R_0250', wrist: 'Wrist_R_0252' },
}

const FINGER_RE = /^(Index|Middle|Pinky|Ring|Thumb)Finger([123])_([LR])_/
// The outer knuckle moves most; the tip folds a little less so the hand reads
// as a soft clasp instead of a claw.
const FINGER_CURL = { 1: 0.9, 2: 1, 3: 0.75 }
const POSE_BLEND = 6
const DEG = Math.PI / 180

// The archive is decorative, not a benchmark. On a GT 720M or an integrated
// laptop GPU the scene still runs, just with a lower internal resolution and
// fewer secondary particles. `fps: 0` leaves the display's own refresh rate.
const QUALITY = {
  high: { dpr: 1.75, antialias: true, motes: 220, butterflies: 7, fps: 0 },
  medium: { dpr: 1.25, antialias: false, motes: 120, butterflies: 4, fps: 40 },
  low: { dpr: 1, antialias: false, motes: 64, butterflies: 3, fps: 30 },
}

function glow(color, opacity = 0.7) {
  return new THREE.MeshBasicMaterial({
    color,
    transparent: true,
    opacity,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
  })
}

// A wing texture drawn once per butterfly. The old flat ShapeGeometry read as
// a glowing triangle: no shape, no shading, no veins. This draws a proper
// two-lobed wing with a base-to-tip gradient, a bright rim, soft veins and a
// little bloom, then maps it onto a plane that can actually flap.
function makeWingTexture(accent) {
  const size = 256
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')

  const base = new THREE.Color(accent)
  const light = base.clone().lerp(new THREE.Color(0xffffff), 0.62)
  const deep = base.clone().multiplyScalar(0.42)
  const rgb = (color) =>
    `${Math.round(color.r * 255)}, ${Math.round(color.g * 255)}, ${Math.round(color.b * 255)}`

  const wing = new Path2D()
  wing.moveTo(28, 128)
  wing.bezierCurveTo(58, 44, 146, 22, 202, 50)
  wing.bezierCurveTo(228, 64, 226, 98, 190, 116)
  wing.bezierCurveTo(174, 124, 162, 126, 150, 128)
  wing.bezierCurveTo(196, 142, 220, 168, 204, 196)
  wing.bezierCurveTo(188, 224, 134, 226, 94, 204)
  wing.bezierCurveTo(62, 186, 42, 158, 28, 128)
  wing.closePath()

  // Dark edge first: it separates the wing from the bright character behind
  // it, so the silhouette stays readable instead of dissolving into the glow.
  ctx.save()
  ctx.strokeStyle = `rgba(${rgb(deep)}, 0.9)`
  ctx.lineWidth = 7
  ctx.stroke(wing)
  ctx.restore()

  // Soft outer bloom, kept inside the canvas so the wing tip is never clipped.
  ctx.save()
  ctx.shadowColor = `rgba(${rgb(base)}, 0.85)`
  ctx.shadowBlur = 14
  const fill = ctx.createLinearGradient(28, 150, 226, 104)
  fill.addColorStop(0, `rgba(${rgb(deep)}, 0.98)`)
  fill.addColorStop(0.34, `rgba(${rgb(base)}, 0.96)`)
  fill.addColorStop(0.78, `rgba(${rgb(light)}, 0.94)`)
  fill.addColorStop(1, 'rgba(255, 255, 255, 0.8)')
  ctx.fillStyle = fill
  ctx.fill(wing)
  ctx.restore()

  // Bright rim so the wing catches the light at small sizes.
  ctx.save()
  ctx.strokeStyle = `rgba(${rgb(light)}, 0.75)`
  ctx.lineWidth = 2.2
  ctx.shadowColor = `rgba(${rgb(base)}, 0.8)`
  ctx.shadowBlur = 8
  ctx.stroke(wing)
  ctx.restore()

  // Veins fanning out from the wing root.
  ctx.save()
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.22)'
  ctx.lineWidth = 1.2
  for (let index = 0; index < 4; index += 1) {
    const spread = index * 16
    ctx.beginPath()
    ctx.moveTo(34, 128)
    ctx.quadraticCurveTo(120, 86 + spread, 196, 74 + spread * 1.4)
    ctx.stroke()
  }
  ctx.restore()

  // Light pooling at the wing base.
  const inner = ctx.createRadialGradient(36, 128, 2, 36, 128, 88)
  inner.addColorStop(0, 'rgba(255, 255, 255, 0.38)')
  inner.addColorStop(1, 'rgba(255, 255, 255, 0)')
  ctx.fillStyle = inner
  ctx.fill(wing)

  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.anisotropy = 4
  return texture
}

function makeWing(texture) {
  const geometry = new THREE.PlaneGeometry(1, 1)
  // Move the pivot to the body so the wing grows out of the thorax instead of
  // spinning around its own centre.
  geometry.translate(0.5, 0, 0)
  const material = new THREE.MeshBasicMaterial({
    map: texture,
    transparent: true,
    opacity: 0.97,
    depthWrite: false,
    side: THREE.DoubleSide,
    toneMapped: false,
  })
  const mesh = new THREE.Mesh(geometry, material)
  mesh.scale.setScalar(0.13)
  return mesh
}

function makeButterfly(accent) {
  const group = new THREE.Group()
  // Yaw first, then roll around the body's own axis — a natural bank.
  group.rotation.order = 'YXZ'

  const bodyMaterial = new THREE.MeshStandardMaterial({
    color: 0x241340,
    roughness: 0.55,
    metalness: 0.2,
    emissive: accent,
    emissiveIntensity: 0.28,
  })
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.011, 0.05, 4, 8), bodyMaterial)
  group.add(body)

  // Both wings share one texture per butterfly; drawing it twice would only
  // double the canvas work for the same pixels.
  const wingTexture = makeWingTexture(accent)

  // Each wing hangs off its own pivot so the beat stays symmetric. The wings
  // live in the XY plane and the whole butterfly turns to face the camera, so
  // the silhouette is always readable instead of showing up edge-on.
  const makeSide = (side) => {
    const pivot = new THREE.Group()
    pivot.scale.x = side
    pivot.userData.side = side
    pivot.add(makeWing(wingTexture))
    group.add(pivot)
    return pivot
  }
  const left = makeSide(-1)
  const right = makeSide(1)

  const antennaMaterial = new THREE.LineBasicMaterial({
    color: accent,
    transparent: true,
    opacity: 0.55,
  })
  ;[-1, 1].forEach((side) => {
    const geometry = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0.038, 0),
      new THREE.Vector3(side * 0.028, 0.086, 0.006),
    ])
    group.add(new THREE.Line(geometry, antennaMaterial))
  })

  group.userData.wings = [left, right]
  return group
}

function buildMotes(count = 220) {
  const positions = new Float32Array(count * 3)
  for (let index = 0; index < count; index += 1) {
    const angle = Math.random() * Math.PI * 2
    const radius = 0.35 + Math.random() * 1.15
    positions[index * 3] = Math.cos(angle) * radius
    positions[index * 3 + 1] = Math.random() * 2.5
    positions[index * 3 + 2] = Math.sin(angle) * radius
  }

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  const material = new THREE.PointsMaterial({
    color: 0xc4b5fd,
    size: 0.018,
    sizeAttenuation: true,
    transparent: true,
    opacity: 0.78,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  })
  return new THREE.Points(geometry, material)
}

function buildGround() {
  const group = new THREE.Group()

  const disc = new THREE.Mesh(
    new THREE.CircleGeometry(1.55, 72),
    new THREE.MeshBasicMaterial({ color: 0x120a28, transparent: true, opacity: 0.68 }),
  )
  disc.rotation.x = -Math.PI / 2
  disc.position.y = -0.012
  group.add(disc)

  const ringMaterial = glow(VIOLET, 0.4)
  const ringCyan = glow(CYAN, 0.3)
  ;[
    [0.62, ringMaterial],
    [1.02, ringCyan],
    [1.46, ringMaterial],
  ].forEach(([radius, material]) => {
    const ring = new THREE.Mesh(new THREE.RingGeometry(radius, radius + 0.006, 96), material)
    ring.rotation.x = -Math.PI / 2
    ring.position.y = 0.002
    group.add(ring)
  })

  const arc = new THREE.Mesh(new THREE.TorusGeometry(1.2, 0.004, 6, 96, Math.PI * 1.35), glow(PINK, 0.4))
  arc.rotation.x = -Math.PI / 2
  arc.rotation.z = 0.4
  arc.position.y = 0.012
  group.add(arc)

  return group
}

export function createCastoriceScene(
  canvas,
  { reduced = false, onTalk, onModelReady, onModelError } = {},
) {
  const gpu = getGpuInfo()
  const quality = QUALITY[gpu.tier] ?? QUALITY.medium
  canvas.dataset.gpuTier = gpu.tier

  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: quality.antialias,
    alpha: true,
    powerPreference: 'high-performance',
  })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, quality.dpr))
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.08

  const scene = new THREE.Scene()
  scene.fog = new THREE.FogExp2(0x070411, 0.09)

  // Framing switches to a portrait crop once the real model is in place.
  let framing = { y: 1.4, z: 4.5, look: 1.2 }

  const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 40)
  camera.position.set(0, framing.y, framing.z)

  scene.add(new THREE.AmbientLight(0x7a63c8, 1.35))

  const key = new THREE.DirectionalLight(0xd8c7ff, 2.4)
  key.position.set(2.2, 4.2, 3.4)
  scene.add(key)

  const cyanLight = new THREE.PointLight(CYAN, 5.5, 7, 1.8)
  cyanLight.position.set(-2.1, 2.1, 2.2)
  scene.add(cyanLight)

  const pinkLight = new THREE.PointLight(PINK, 4.5, 7, 1.8)
  pinkLight.position.set(2.2, 1.2, -0.8)
  scene.add(pinkLight)

  const character = new THREE.Group()
  scene.add(character)

  const ground = buildGround()
  scene.add(ground)

  const motes = buildMotes(quality.motes)
  scene.add(motes)

  const butterflies = []
  const butterflyColors = [VIOLET, CYAN, PINK, 0xa78bfa, 0x7dd3fc]
  for (let index = 0; index < quality.butterflies; index += 1) {
    const butterfly = makeButterfly(butterflyColors[index % butterflyColors.length])
    // Slight size variety gives the swarm some depth without extra geometry.
    butterfly.scale.setScalar(0.84 + (index % 3) * 0.13)
    const radius = 0.62 + (index % 4) * 0.2
    butterfly.userData.orbit = {
      radius,
      speed: 0.16 + index * 0.035,
      phase: index * 1.4,
      baseY: 1.05 + (index % 5) * 0.22,
      tilt: (index % 2 ? 1 : -1) * 0.18,
    }
    scene.add(butterfly)
    butterflies.push(butterfly)
  }

  let disposed = false
  let modelMixer = null
  let activeExpression = null
  let blinkAction = null
  let nextBlinkAt = 3
  let pendingExpression = 'gentle'
  let idlePose = null
  let poseRig = null
  let poseName = 'idle'
  let bodyAction = null
  let bodyLoop = false
  const bodyClips = new Map()
  const clipTimeouts = new Set()
  const poseEuler = new THREE.Euler()
  const poseQuat = new THREE.Quaternion()
  const poseTarget = new THREE.Quaternion()
  const clipByName = new Map()
  const expressionTimeouts = new Set()

  const state = {
    pointerX: 0,
    pointerY: 0,
    pointerTargetX: 0,
    pointerTargetY: 0,
    pointerActive: false,
    pointerEase: 0,
    targetX: 0,
    targetY: 0,
    dragging: false,
    dragX: 0,
    dragY: 0,
    orbitX: 0,
    orbitY: 0,
    moved: 0,
    lastX: 0,
    lastY: 0,
    talkPulse: 0,
  }

  const resetPointer = () => {
    state.pointerActive = false
    state.pointerTargetX = 0
    state.pointerTargetY = 0
  }

  const measure = () => {
    const width = canvas.clientWidth
    const height = canvas.clientHeight
    if (!width || !height) return
    renderer.setSize(width, height, false)
    camera.aspect = width / height
    camera.updateProjectionMatrix()
  }

  const onPointerDown = (event) => {
    state.dragging = true
    state.dragX = event.clientX
    state.dragY = event.clientY
    state.lastX = event.clientX
    state.lastY = event.clientY
    state.moved = 0
    try {
      canvas.setPointerCapture?.(event.pointerId)
    } catch {
      // Synthetic events (tests, assistive tools) have no active pointer.
    }
  }

  const onPointerMove = (event) => {
    const rect = canvas.getBoundingClientRect()
    if (rect.width && rect.height) {
      state.pointerTargetX = ((event.clientX - rect.left) / rect.width) * 2 - 1
      state.pointerTargetY = ((event.clientY - rect.top) / rect.height) * 2 - 1
      state.pointerActive = true
    }

    if (!state.dragging) return
    const dx = event.clientX - state.lastX
    const dy = event.clientY - state.lastY
    state.lastX = event.clientX
    state.lastY = event.clientY
    state.moved += Math.abs(dx) + Math.abs(dy)
    state.orbitY = THREE.MathUtils.clamp(state.orbitY + dx * 0.006, -1.1, 1.1)
    state.orbitX = THREE.MathUtils.clamp(state.orbitX + dy * 0.004, -0.28, 0.28)
  }

  const onPointerUp = (event) => {
    if (!state.dragging) return
    state.dragging = false
    try {
      canvas.releasePointerCapture?.(event.pointerId)
    } catch {
      // The pointer may already be released (or never captured).
    }
    if (state.moved < 7) {
      state.talkPulse = 1
      onTalk?.()
    }
  }

  const onPointerLeave = () => {
    resetPointer()
    state.dragging = false
  }

  const onKeyDown = (event) => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return
    const direction = event.key === 'ArrowRight' ? 1 : -1
    state.orbitY = THREE.MathUtils.clamp(state.orbitY + direction * 0.16, -1.1, 1.1)
  }

  canvas.addEventListener('pointerdown', onPointerDown)
  canvas.addEventListener('pointermove', onPointerMove)
  canvas.addEventListener('pointerup', onPointerUp)
  canvas.addEventListener('pointercancel', onPointerLeave)
  canvas.addEventListener('pointerleave', onPointerLeave)
  window.addEventListener('keydown', onKeyDown)

  const resizeObserver = new ResizeObserver(measure)
  resizeObserver.observe(canvas)
  measure()

  // ── Real model ──────────────────────────────────────────────────────
  // The face poses in this asset are single-frame clips. Switching between
  // them (and blinking on top) is what makes her read as alive instead of a
  // statue. Nothing here plays all 97 clips at once.
  const applyExpression = (mood, fade = 0.3) => {
    if (!modelMixer) {
      pendingExpression = mood
      return
    }
    const clip = clipByName.get(EXPRESSION_CLIPS[mood] ?? EXPRESSION_CLIPS.gentle)
    if (!clip) return

    const next = modelMixer.clipAction(clip)
    if (next === activeExpression) return

    next.reset()
    next.setLoop(THREE.LoopOnce, 1)
    next.clampWhenFinished = true
    next.setEffectiveTimeScale(1)
    next.setEffectiveWeight(1)
    next.play()
    if (fade > 0) next.fadeIn(fade)

    const previous = activeExpression
    activeExpression = next

    if (previous) {
      previous.fadeOut(fade)
      if (fade > 0) {
        const id = window.setTimeout(() => {
          expressionTimeouts.delete(id)
          if (previous !== activeExpression) previous.stop()
        }, fade * 1000 + 80)
        expressionTimeouts.add(id)
      } else {
        previous.stop()
      }
    }
  }

  const triggerBlink = () => {
    if (!modelMixer) return
    const clip = clipByName.get(BLINK_CLIP)
    if (!clip) return
    blinkAction?.stop()
    blinkAction = modelMixer.clipAction(clip)
    blinkAction.reset()
    blinkAction.setLoop(THREE.LoopOnce, 1)
    blinkAction.clampWhenFinished = true
    // Higher weight than the idle expression so the lids actually meet.
    blinkAction.setEffectiveWeight(3)
    blinkAction.play()
  }

  // ── Body posing ─────────────────────────────────────────────────────
  const capturePoseRig = (model) => {
    const rig = { arms: { L: {}, R: {} }, fingers: [] }
    for (const side of ['L', 'R']) {
      for (const part of ['shoulder', 'elbow', 'wrist']) {
        const bone = model.getObjectByName(BONE_CHAINS[side][part])
        rig.arms[side][part] = bone ? { bone, rest: bone.quaternion.clone() } : null
      }
    }
    model.traverse((child) => {
      if (!child.isBone) return
      const match = FINGER_RE.exec(child.name)
      if (!match) return
      rig.fingers.push({
        bone: child,
        rest: child.quaternion.clone(),
        side: match[3],
        scale: FINGER_CURL[Number(match[2])] ?? 1,
      })
    })
    return rig
  }

  const aimBone = (entry, angles, blend) => {
    if (!entry) return
    const [x = 0, y = 0, z = 0] = angles ?? []
    poseEuler.set(x * DEG, y * DEG, z * DEG, 'XYZ')
    poseTarget.copy(entry.rest).multiply(poseQuat.setFromEuler(poseEuler))
    entry.bone.quaternion.slerp(poseTarget, blend)
  }

  // Damped slerp toward the static pose preset. Because it starts from wherever
  // the bone currently is, taking over from a finished external clip is smooth
  // too. No sine drift is layered on: the arms hold the pose and only the head,
  // breathing and expressions move.
  const applyBodyPose = (delta) => {
    if (!poseRig) return
    const blend = 1 - Math.exp(-delta * POSE_BLEND)
    const offsets = BODY_POSES[poseName] ?? {}

    for (const side of ['L', 'R']) {
      const cfg = offsets[side]
      const arm = poseRig.arms[side]
      if (!cfg) {
        aimBone(arm.shoulder, null, blend)
        aimBone(arm.elbow, null, blend)
        aimBone(arm.wrist, null, blend)
        continue
      }
      aimBone(arm.shoulder, cfg.shoulder, blend)
      aimBone(arm.elbow, cfg.elbow, blend)
      aimBone(arm.wrist, cfg.wrist, blend)
    }

    for (const finger of poseRig.fingers) {
      const cfg = offsets[finger.side]
      if (!cfg) {
        aimBone(finger, null, blend)
        continue
      }
      aimBone(finger, [0, cfg.curl * finger.scale, 0], blend)
    }
  }

  const stopBodyClip = (fade = 0.35) => {
    if (!bodyAction) return
    const previous = bodyAction
    bodyAction = null
    bodyLoop = false
    previous.fadeOut(fade)
    const id = window.setTimeout(() => {
      clipTimeouts.delete(id)
      previous.stop()
    }, fade * 1000 + 120)
    clipTimeouts.add(id)
    canvas.dataset.bodyClip = ''
  }

  const playClip = (name) => {
    const entry = bodyClips.get(name)
    if (!entry || !modelMixer) return false
    if (bodyAction?.getClip() === entry.clip) {
      bodyAction.reset().play()
      return true
    }
    stopBodyClip(entry.fade)
    const action = modelMixer.clipAction(entry.clip)
    action.reset()
    action.setLoop(entry.loop ? THREE.LoopRepeat : THREE.LoopOnce, entry.loop ? Infinity : 1)
    action.clampWhenFinished = !entry.loop
    action.setEffectiveTimeScale(1)
    action.setEffectiveWeight(1)
    action.fadeIn(entry.fade).play()
    bodyAction = action
    bodyLoop = Boolean(entry.loop)
    canvas.dataset.bodyClip = name
    return true
  }

  const setPose = (name = 'idle') => {
    const next = BODY_POSES[name] ? name : 'idle'
    const same = next === poseName
    poseName = next
    // An authored clip with the same name wins over the procedural preset.
    // Dropping `idle.glb` into the clips folder upgrades the idle without
    // touching this file. Re-selecting the same pose replays a finished clip
    // but leaves a looping one alone.
    if (bodyClips.has(next)) {
      if (!same || !bodyAction) playClip(next)
      return
    }
    if (same) return
    stopBodyClip()
  }

  // Optional authored body animation. The manifest is empty by default, so
  // this quietly does nothing until a clip is dropped in.
  const loadBodyClips = async () => {
    try {
      const base = new URL(CLIP_MANIFEST_URL, window.location.href)
      const response = await fetch(base, { cache: 'no-cache' })
      if (!response.ok) {
        canvas.dataset.bodyClips = 'none'
        return
      }
      const manifest = await response.json()
      const entries = Array.isArray(manifest?.clips) ? manifest.clips : []
      if (!entries.length) {
        canvas.dataset.bodyClips = 'none'
        return
      }

      const { GLTFLoader } = await import('three/examples/jsm/loaders/GLTFLoader.js')
      const loader = new GLTFLoader()
      for (const entry of entries) {
        if (!entry?.name || !entry?.file || disposed) continue
        try {
          const gltf = await loader.loadAsync(new URL(entry.file, base).href)
          const clip = entry.clip
            ? gltf.animations.find((candidate) => candidate.name === entry.clip)
            : gltf.animations[0]
          if (!clip) {
            console.warn('[castorice] no animation in body clip', entry.file)
            continue
          }
          // Only the keyframes are used; the rig comes from the archive model.
          gltf.scene.traverse((child) => {
            child.geometry?.dispose()
            const materials = Array.isArray(child.material) ? child.material : [child.material]
            materials.forEach((material) => {
              if (!material) return
              Object.values(material).forEach((value) => {
                if (value?.isTexture) value.dispose()
              })
              material.dispose()
            })
          })
          clipByName.set(entry.name, clip)
          bodyClips.set(entry.name, {
            clip,
            loop: entry.loop !== false,
            fade: Number.isFinite(entry.fade) ? entry.fade : 0.35,
          })
        } catch (error) {
          console.warn('[castorice] body clip failed to load', entry.file, error)
        }
      }
      canvas.dataset.bodyClips = String(bodyClips.size)
      if (bodyClips.has(poseName)) playClip(poseName)
    } catch {
      canvas.dataset.bodyClips = 'none'
    }
  }

  // Sketchfab exports the figure Z-up. After the root conversion it usually
  // faces the camera, but eye bones are a reliable way to check instead of
  // guessing. If the eyes point away, turn the whole model around.
  const detectFacing = (model) => {
    const head = model.getObjectByName('Head_M_074')
    const eye = model.getObjectByName('eye_L_0163') ?? model.getObjectByName('eye_R_0175')
    if (!head || !eye) return 0
    const headPos = head.getWorldPosition(new THREE.Vector3())
    const eyePos = eye.getWorldPosition(new THREE.Vector3())
    return eyePos.z < headPos.z ? Math.PI : 0
  }

  const loadModel = async () => {
    try {
      const { GLTFLoader } = await import('three/examples/jsm/loaders/GLTFLoader.js')
      const loader = new GLTFLoader()
      const gltf = await loader.loadAsync(MODEL_URL)
      if (disposed) {
        gltf.scene.traverse((child) => {
          child.geometry?.dispose()
          const materials = Array.isArray(child.material) ? child.material : [child.material]
          materials.forEach((material) => material?.dispose())
        })
        return
      }

      const model = gltf.scene
      const holder = new THREE.Group()
      holder.add(model)
      holder.rotation.y = detectFacing(model)
      holder.updateMatrixWorld(true)

      const box = new THREE.Box3().setFromObject(model)
      const size = box.getSize(new THREE.Vector3())
      const center = box.getCenter(new THREE.Vector3())
      const scale = MODEL_HEIGHT / Math.max(size.y, 0.001)
      holder.scale.setScalar(scale)
      holder.position.set(-center.x * scale, -box.min.y * scale, -center.z * scale)

      model.traverse((child) => {
        if (!child.isMesh) return
        child.frustumCulled = false
        const materials = Array.isArray(child.material) ? child.material : [child.material]
        materials.forEach((material) => {
          if (!material) return
          // The source is unlit toon art; keep its own colours instead of
          // letting ACES tone mapping wash the character out.
          material.toneMapped = false
          if (/fire/i.test(material.name || '')) {
            // Fire cards are painted on black. Additive blending hides the
            // black and lets the flame glow over the dress.
            material.transparent = true
            material.blending = THREE.AdditiveBlending
            material.depthWrite = false
          } else if (/trans/i.test(material.name || '')) {
            material.transparent = true
            material.opacity = 0.55
            material.depthWrite = false
          }
        })
      })

      character.add(holder)
      framing = { y: 1.52, z: 3.05, look: 1.44 }

      modelMixer = new THREE.AnimationMixer(model)
      gltf.animations.forEach((clip) => clipByName.set(clip.name, clip))

      // The expression clips only animate face bones, so a very small idle on
      // the head/neck/spine can sit on top without fighting the performance.
      const capture = (name) => {
        const bone = model.getObjectByName(name)
        return bone ? { bone, base: bone.rotation.clone() } : null
      }
      idlePose = {
        head: capture('Head_M_074'),
        neck: capture('Neck_M_073'),
        spine: capture('Spine1_M_060'),
      }
      poseRig = capturePoseRig(model)
      loadBodyClips()

      modelMixer.addEventListener('finished', (event) => {
        if (event.action === blinkAction) {
          blinkAction.stop()
          blinkAction = null
        }
        if (event.action === bodyAction && !bodyLoop) {
          bodyAction = null
          canvas.dataset.bodyClip = ''
        }
      })
      applyExpression(pendingExpression, 0)
      nextBlinkAt = 3 + Math.random() * 3

      canvas.dataset.model = 'loaded'
      canvas.castoriceDebug = {
        model,
        holder,
        mixer: modelMixer,
        camera,
        character,
        scene,
        renderer,
        size: size.toArray(),
        scale,
        getExpression: () => activeExpression?._clip?.name ?? null,
        isBlinking: () => Boolean(blinkAction),
        getPose: () => poseName,
        getPointer: () => ({
          x: state.pointerX,
          y: state.pointerY,
          targetX: state.pointerTargetX,
          targetY: state.pointerTargetY,
          ease: state.pointerEase,
          active: state.pointerActive,
        }),
        setPose,
        playClip,
        getBodyClips: () => [...bodyClips.keys()],
      }
      onModelReady?.()
    } catch (error) {
      canvas.dataset.model = 'failed'
      console.warn('[castorice] model failed to load', error)
      onModelError?.(error)
    }
  }
  loadModel()

  const timer = new THREE.Timer()
  timer.connect(document)

  const frameStep = quality.fps ? 1 / quality.fps : 0
  let accumulator = 0

  const animate = () => {
    if (disposed) return
    // rAF already pauses in a hidden tab; this also covers minimized windows
    // and keeps the scene from burning GPU time behind the archive.
    if (document.hidden) return

    timer.update()
    const delta = Math.min(timer.getDelta(), 0.1)

    if (frameStep) {
      accumulator += delta
      if (accumulator < frameStep) return
      accumulator = Math.min(accumulator - frameStep, frameStep)
    }

    const t = reduced ? 0 : timer.getElapsed()

    if (modelMixer) {
      if (t > nextBlinkAt) {
        triggerBlink()
        nextBlinkAt = t + 2.8 + Math.random() * 3.6
      }
      modelMixer.update(delta)
      if (blinkAction && !blinkAction.isRunning()) {
        blinkAction.stop()
        blinkAction = null
      }
    }

    // Authored body clips own the arm bones while they play; otherwise the
    // procedural preset eases the arms into their gesture.
    if (!bodyAction) applyBodyPose(delta)

    // Pointer feedback eases in and out instead of snapping. A first hover
    // ramps the response up over ~0.4s, and leaving lets the figure settle
    // back to rest instead of freezing mid-turn.
    const follow = reduced ? 1 : 1 - Math.exp(-delta * 7)
    const envelope = reduced ? 1 : 1 - Math.exp(-delta * 5.5)
    state.pointerEase += ((state.pointerActive ? 1 : 0) - state.pointerEase) * envelope
    state.pointerX += (state.pointerTargetX - state.pointerX) * follow
    state.pointerY += (state.pointerTargetY - state.pointerY) * follow

    const pointerX = reduced ? 0 : state.pointerX * state.pointerEase
    const pointerY = reduced ? 0 : state.pointerY * state.pointerEase
    state.talkPulse = Math.max(0, state.talkPulse - delta * 2.2)
    const talk = reduced ? 0 : state.talkPulse

    const turn = reduced ? 1 : 1 - Math.exp(-delta * 4.6)
    state.targetX += (state.orbitX + pointerY * 0.06 - state.targetX) * turn
    state.targetY += (state.orbitY + pointerX * 0.24 - state.targetY) * turn

    // A quiet idle layered on top of the face poses: breathing through the
    // spine and a slow turn of the head toward the pointer. The expression
    // clips only touch face bones, so this does not fight them.
    if (idlePose) {
      const breathe = reduced ? 0 : Math.sin(t * 0.9) * 0.012
      if (idlePose.spine) {
        idlePose.spine.bone.rotation.x = idlePose.spine.base.x + breathe
      }
      if (idlePose.neck) {
        idlePose.neck.bone.rotation.y =
          idlePose.neck.base.y + (reduced ? 0 : Math.sin(t * 0.43) * 0.024) + pointerX * 0.035
        idlePose.neck.bone.rotation.x =
          idlePose.neck.base.x + (reduced ? 0 : Math.sin(t * 0.57) * 0.008) - pointerY * 0.015
      }
      if (idlePose.head) {
        idlePose.head.bone.rotation.z =
          idlePose.head.base.z + (reduced ? 0 : Math.sin(t * 0.31) * 0.012) + talk * 0.02
      }
    }

    character.rotation.x = state.targetX
    character.rotation.y = state.targetY
    character.position.y = reduced ? 0 : Math.sin(t * 1.05) * 0.014

    butterflies.forEach((butterfly) => {
      const orbit = butterfly.userData.orbit
      const angle = t * orbit.speed + orbit.phase
      butterfly.position.set(
        Math.cos(angle) * orbit.radius,
        orbit.baseY + Math.sin(t * 1.25 + orbit.phase) * 0.12,
        Math.sin(angle) * orbit.radius,
      )
      // The wings live in the XY plane, so the butterfly turns to face the
      // camera. Without this it would show up edge-on and read as a sliver.
      const yaw = Math.atan2(
        camera.position.x - butterfly.position.x,
        camera.position.z - butterfly.position.z,
      )
      butterfly.rotation.y = yaw + (reduced ? 0 : Math.sin(t * 0.9 + orbit.phase) * 0.22)
      // Small bank into the orbit, kept subtle so the wings stay symmetrical.
      butterfly.rotation.z = orbit.tilt * 0.35 + (reduced ? 0 : Math.sin(t * 2.4 + orbit.phase) * 0.1)

      const flap = reduced ? 0.55 : 0.55 + Math.sin(t * 6.5 + orbit.phase) * 0.4
      butterfly.userData.wings.forEach((pivot) => {
        pivot.rotation.z = pivot.userData.side * flap
      })
    })

    motes.rotation.y = reduced ? 0 : t * 0.035
    motes.material.opacity = reduced ? 0.7 : 0.62 + Math.sin(t * 0.8) * 0.14
    ground.rotation.y = reduced ? 0 : t * 0.02

    const camEase = reduced ? 1 : 1 - Math.exp(-delta * 3.2)
    camera.position.x += (pointerX * 0.1 - camera.position.x) * camEase
    camera.position.y += (framing.y - pointerY * 0.05 - camera.position.y) * camEase
    camera.position.z += (framing.z - camera.position.z) * 0.05
    camera.lookAt(0, framing.look, 0)

    renderer.render(scene, camera)
  }

  renderer.setAnimationLoop(animate)

  const dispose = () => {
    disposed = true
    renderer.setAnimationLoop(null)
    timer.disconnect()
    resizeObserver.disconnect()
    canvas.removeEventListener('pointerdown', onPointerDown)
    canvas.removeEventListener('pointermove', onPointerMove)
    canvas.removeEventListener('pointerup', onPointerUp)
    canvas.removeEventListener('pointercancel', onPointerLeave)
    canvas.removeEventListener('pointerleave', onPointerLeave)
    window.removeEventListener('keydown', onKeyDown)

    expressionTimeouts.forEach((id) => window.clearTimeout(id))
    expressionTimeouts.clear()
    clipTimeouts.forEach((id) => window.clearTimeout(id))
    clipTimeouts.clear()
    bodyClips.clear()
    delete canvas.castoriceDebug

    scene.traverse((child) => {
      if (child.geometry) child.geometry.dispose()
      if (child.material) {
        const materials = Array.isArray(child.material) ? child.material : [child.material]
        materials.forEach((material) => {
          Object.values(material).forEach((value) => {
            if (value && value.isTexture) value.dispose()
          })
          material.dispose()
        })
      }
    })
    modelMixer?.stopAllAction()
    renderer.dispose()
    renderer.forceContextLoss?.()
  }

  return {
    dispose,
    setExpression: applyExpression,
    setPose,
    playClip,
    getPose: () => poseName,
  }
}
