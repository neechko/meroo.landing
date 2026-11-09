import * as THREE from 'three'

/**
 * A real WebGL scene for the Castorice archive.
 *
 * The figure is built from geometry rather than a flat image: a lathe-turned
 * gown, a small bust, hair strands, butterfly wings and drifting memory motes.
 * It idles, breathes, turns toward the pointer and can be dragged. If a
 * `public/castorice.glb` file exists it is loaded instead and its animations
 * are played, so a proper character model can be dropped in later without
 * touching this component.
 */

const VIOLET = 0x8b5cf6
const CYAN = 0x67e8f9
const PINK = 0xf0abfc
const HAIR = 0x241241
const FABRIC = 0x2a1a55
const SKIN = 0xf2e4ff

function standard(color, options = {}) {
  return new THREE.MeshStandardMaterial({
    color,
    roughness: 0.48,
    metalness: 0.18,
    ...options,
  })
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

function wingShape() {
  const shape = new THREE.Shape()
  shape.moveTo(0, 0)
  shape.bezierCurveTo(0.16, 0.34, 0.52, 0.54, 0.86, 0.34)
  shape.bezierCurveTo(1.02, 0.2, 0.96, -0.14, 0.66, -0.26)
  shape.bezierCurveTo(0.44, -0.34, 0.2, -0.2, 0, 0)
  return shape
}

function makeWing(material, scale = 1) {
  const geometry = new THREE.ShapeGeometry(wingShape(), 24)
  const mesh = new THREE.Mesh(geometry, material)
  mesh.scale.setScalar(scale)
  return mesh
}

function makeButterfly(accent) {
  const group = new THREE.Group()
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.012, 0.045, 4, 8), standard(0x1c1036, { roughness: 0.7 }))
  body.rotation.x = Math.PI / 2
  group.add(body)

  const material = glow(accent, 0.7)
  const left = makeWing(material, 0.075)
  left.scale.x = -0.075
  left.rotation.y = 0.35
  const right = makeWing(material, 0.075)
  right.rotation.y = -0.35
  group.add(left, right)
  group.userData.wings = [left, right]
  return group
}

function buildFigure() {
  const root = new THREE.Group()

  // ── Gown ──────────────────────────────────────────────────────────
  const profile = [
    [0, 0],
    [0.5, 0.015],
    [0.47, 0.12],
    [0.4, 0.38],
    [0.33, 0.66],
    [0.27, 0.9],
    [0.235, 1.08],
    [0.25, 1.18],
    [0.225, 1.26],
  ].map(([x, y]) => new THREE.Vector2(x, y))

  const gown = new THREE.Mesh(
    new THREE.LatheGeometry(profile, 72),
    standard(FABRIC, {
      emissive: 0x3b1a7a,
      emissiveIntensity: 0.34,
      metalness: 0.4,
      roughness: 0.42,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.96,
    }),
  )
  root.add(gown)

  const gownWire = new THREE.Mesh(
    new THREE.LatheGeometry(profile, 48),
    new THREE.MeshBasicMaterial({
      color: VIOLET,
      wireframe: true,
      transparent: true,
      opacity: 0.075,
      depthWrite: false,
    }),
  )
  gownWire.scale.setScalar(1.025)
  root.add(gownWire)

  // ── Torso and neck ────────────────────────────────────────────────
  const torso = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.155, 0.18, 8, 20),
    standard(0x321c63, { emissive: 0x4c1d95, emissiveIntensity: 0.24, roughness: 0.4 }),
  )
  torso.position.y = 1.38
  torso.scale.z = 0.78
  root.add(torso)

  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.07, 0.13, 16), standard(SKIN, { roughness: 0.62 }))
  neck.position.y = 1.64
  root.add(neck)

  // ── Arms ──────────────────────────────────────────────────────────
  const sleeve = standard(0x2d1858, { emissive: 0x4c1d95, emissiveIntensity: 0.2, roughness: 0.5 })
  const skin = standard(SKIN, { roughness: 0.62 })

  const arm = (side) => {
    const upper = new THREE.Mesh(new THREE.CapsuleGeometry(0.043, 0.2, 4, 12), sleeve)
    upper.position.set(side * 0.21, 1.38, 0.01)
    upper.rotation.z = side * 0.2

    const lower = new THREE.Mesh(new THREE.CapsuleGeometry(0.037, 0.19, 4, 12), sleeve)
    lower.position.set(side * 0.25, 1.18, 0.06)
    lower.rotation.z = side * 0.42
    lower.rotation.x = -0.12

    const hand = new THREE.Mesh(new THREE.SphereGeometry(0.048, 16, 12), skin)
    hand.position.set(side * 0.285, 1.03, 0.1)
    hand.scale.set(0.82, 1.1, 0.7)

    root.add(upper, lower, hand)
    return hand
  }

  arm(-1)
  const rightHand = arm(1)
  rightHand.position.set(0.13, 1.12, 0.2)

  // ── Head ──────────────────────────────────────────────────────────
  const head = new THREE.Group()
  head.position.set(0, 1.82, 0)
  root.add(head)

  const face = new THREE.Mesh(new THREE.SphereGeometry(0.18, 32, 24), skin)
  face.scale.set(1, 1.07, 0.94)
  head.add(face)

  const hairCap = new THREE.Mesh(
    new THREE.SphereGeometry(0.196, 32, 24),
    standard(HAIR, { emissive: 0x3b1a7a, emissiveIntensity: 0.18, roughness: 0.55 }),
  )
  hairCap.position.set(0, 0.022, -0.05)
  hairCap.scale.set(1.03, 1.06, 0.99)
  head.add(hairCap)

  const eyeMaterial = new THREE.MeshStandardMaterial({
    color: 0x1a0d2e,
    emissive: CYAN,
    emissiveIntensity: 0.55,
    roughness: 0.25,
  })
  const eye = (side) => {
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(0.021, 12, 10), eyeMaterial)
    mesh.position.set(side * 0.062, 0.025, 0.166)
    mesh.scale.set(1.2, 1.5, 0.42)
    head.add(mesh)
    const glint = new THREE.Mesh(new THREE.SphereGeometry(0.0055, 8, 6), glow(0xffffff, 0.9))
    glint.position.set(side * 0.056, 0.034, 0.181)
    head.add(glint)
  }
  eye(-1)
  eye(1)

  const mouth = new THREE.Mesh(
    new THREE.BoxGeometry(0.042, 0.0035, 0.004),
    new THREE.MeshBasicMaterial({ color: 0xb98ccf, transparent: true, opacity: 0.75 }),
  )
  mouth.position.set(0, -0.052, 0.169)
  head.add(mouth)

  // Long hair strands down the back and along the sides.
  const hairMaterial = standard(HAIR, { emissive: 0x2c125c, emissiveIntensity: 0.16, roughness: 0.5 })
  const strand = (points, radius = 0.032) => {
    const curve = new THREE.CatmullRomCurve3(points.map(([x, y, z]) => new THREE.Vector3(x, y, z)))
    const mesh = new THREE.Mesh(new THREE.TubeGeometry(curve, 24, radius, 6, false), hairMaterial)
    head.add(mesh)
  }
  strand(
    [
      [-0.12, 0.1, -0.1],
      [-0.19, -0.2, -0.16],
      [-0.17, -0.48, -0.2],
      [-0.1, -0.72, -0.22],
    ],
    0.036,
  )
  strand(
    [
      [0.12, 0.1, -0.1],
      [0.19, -0.2, -0.16],
      [0.17, -0.48, -0.2],
      [0.1, -0.72, -0.22],
    ],
    0.036,
  )
  strand(
    [
      [0, 0.12, -0.11],
      [0, -0.24, -0.2],
      [0, -0.52, -0.24],
      [0, -0.78, -0.25],
    ],
    0.034,
  )
  strand(
    [
      [-0.15, 0.02, 0.03],
      [-0.2, -0.2, 0.04],
      [-0.18, -0.42, 0.02],
    ],
    0.024,
  )
  strand(
    [
      [0.15, 0.02, 0.03],
      [0.2, -0.2, 0.04],
      [0.18, -0.42, 0.02],
    ],
    0.024,
  )

  // ── Halo and ornament ─────────────────────────────────────────────
  const halo = new THREE.Mesh(new THREE.TorusGeometry(0.27, 0.0035, 8, 72), glow(CYAN, 0.42))
  halo.rotation.x = Math.PI / 2
  halo.position.y = 0.14
  head.add(halo)

  const crown = new THREE.Mesh(new THREE.OctahedronGeometry(0.028, 0), glow(PINK, 0.95))
  crown.position.set(0, 0.2, 0.02)
  head.add(crown)

  const hairButterfly = makeButterfly(CYAN)
  hairButterfly.scale.setScalar(1.7)
  hairButterfly.position.set(-0.18, 0.12, 0.02)
  hairButterfly.rotation.z = -0.5
  head.add(hairButterfly)

  // ── Wings ─────────────────────────────────────────────────────────
  const wingGroup = new THREE.Group()
  wingGroup.position.set(0, 1.45, -0.17)
  root.add(wingGroup)

  const outerWing = glow(VIOLET, 0.3)
  const innerWing = glow(CYAN, 0.18)

  const rightWing = new THREE.Group()
  const rightOuter = makeWing(outerWing, 1.12)
  rightOuter.rotation.y = -0.42
  const rightInner = makeWing(innerWing, 0.82)
  rightInner.rotation.y = -0.42
  rightInner.position.z = 0.012
  rightWing.add(rightOuter, rightInner)

  const leftWing = new THREE.Group()
  const leftOuter = makeWing(outerWing, 1.12)
  leftOuter.scale.x = -1.12
  leftOuter.rotation.y = 0.42
  const leftInner = makeWing(innerWing, 0.82)
  leftInner.scale.x = -0.82
  leftInner.rotation.y = 0.42
  leftInner.position.z = 0.012
  leftWing.add(leftOuter, leftInner)

  wingGroup.add(leftWing, rightWing)

  // Thin veins so the wings read as wings, not flat cards.
  const veinMaterial = new THREE.LineBasicMaterial({ color: CYAN, transparent: true, opacity: 0.25 })
  const veins = (side) => {
    const geometry = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, 0.02),
      new THREE.Vector3(side * 0.7, 0.22, 0.02),
      new THREE.Vector3(side * 0.45, -0.12, 0.02),
      new THREE.Vector3(0, 0, 0.02),
    ])
    const line = new THREE.Line(geometry, veinMaterial)
    line.rotation.y = side * 0.42
    wingGroup.add(line)
  }
  veins(1)
  veins(-1)

  return { root, head, wingGroup, leftWing, rightWing, hairButterfly }
}

function buildMotes() {
  const count = 220
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

export function createCastoriceScene(canvas, { reduced = false, onTalk } = {}) {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: true,
    powerPreference: 'high-performance',
  })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75))
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.08

  const scene = new THREE.Scene()
  scene.fog = new THREE.FogExp2(0x070411, 0.09)

  const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 40)
  camera.position.set(0, 1.4, 4.5)

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

  const procedural = new THREE.Group()
  const figure = buildFigure()
  procedural.add(figure.root)
  character.add(procedural)

  const ground = buildGround()
  scene.add(ground)

  const motes = buildMotes()
  scene.add(motes)

  const butterflies = []
  const butterflyColors = [VIOLET, CYAN, PINK, 0xa78bfa, 0x7dd3fc]
  for (let index = 0; index < 7; index += 1) {
    const butterfly = makeButterfly(butterflyColors[index % butterflyColors.length])
    const radius = 0.55 + (index % 4) * 0.18
    butterfly.userData.orbit = {
      radius,
      speed: 0.16 + index * 0.035,
      phase: index * 1.4,
      baseY: 1.0 + (index % 5) * 0.24,
      tilt: (index % 2 ? 1 : -1) * 0.18,
    }
    scene.add(butterfly)
    butterflies.push(butterfly)
  }

  let disposed = false
  let mixer = null

  const state = {
    pointerX: 0,
    pointerY: 0,
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
  }

  const resetPointer = () => {
    state.pointerX = 0
    state.pointerY = 0
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
    canvas.setPointerCapture?.(event.pointerId)
  }

  const onPointerMove = (event) => {
    const rect = canvas.getBoundingClientRect()
    if (rect.width && rect.height) {
      state.pointerX = ((event.clientX - rect.left) / rect.width) * 2 - 1
      state.pointerY = ((event.clientY - rect.top) / rect.height) * 2 - 1
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
    canvas.releasePointerCapture?.(event.pointerId)
    if (state.moved < 7) onTalk?.()
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

  // Optional drop-in model. A missing file is ignored quietly.
  const tryLoadModel = async () => {
    try {
      const response = await fetch('/castorice.glb', { method: 'HEAD' })
      if (!response.ok) return
      const type = response.headers.get('content-type') || ''
      if (!/gltf|octet-stream|model/i.test(type)) return

      const { GLTFLoader } = await import('three/examples/jsm/loaders/GLTFLoader.js')
      const loader = new GLTFLoader()
      loader.load(
        '/castorice.glb',
        (gltf) => {
          if (disposed) return
          const model = gltf.scene
          const box = new THREE.Box3().setFromObject(model)
          const size = box.getSize(new THREE.Vector3())
          const center = box.getCenter(new THREE.Vector3())
          const scale = 2.05 / Math.max(size.y, 0.001)
          model.scale.setScalar(scale)
          model.position.set(-center.x * scale, -box.min.y * scale, -center.z * scale)
          model.traverse((child) => {
            if (child.isMesh) child.frustumCulled = false
          })
          character.add(model)
          procedural.visible = false

          if (gltf.animations?.length) {
            mixer = new THREE.AnimationMixer(model)
            gltf.animations.forEach((clip) => mixer.clipAction(clip).play())
          }
        },
        undefined,
        () => {
          // The procedural figure stays in place when the file cannot be read.
        },
      )
    } catch {
      // No model, no problem.
    }
  }
  tryLoadModel()

  const timer = new THREE.Timer()
  timer.connect(document)

  const animate = () => {
    if (disposed) return
    timer.update()
    const delta = timer.getDelta()
    mixer?.update(delta)

    const t = reduced ? 0 : timer.getElapsed()
    const pointerX = reduced ? 0 : state.pointerX
    const pointerY = reduced ? 0 : state.pointerY

    state.targetX += (state.orbitX + pointerY * 0.06 - state.targetX) * 0.075
    state.targetY += (state.orbitY + pointerX * 0.24 - state.targetY) * 0.075

    character.rotation.x = state.targetX
    character.rotation.y = state.targetY
    character.position.y = reduced ? 0 : Math.sin(t * 1.05) * 0.014

    figure.head.rotation.y = pointerX * 0.16 + Math.sin(t * 0.6) * 0.02
    figure.head.rotation.x = -pointerY * 0.09 + Math.sin(t * 0.85) * 0.012
    figure.head.rotation.z = Math.sin(t * 0.5) * 0.018

    const flap = reduced ? 0.42 : 0.42 + Math.sin(t * 2.1) * 0.13
    figure.leftWing.rotation.y = flap
    figure.rightWing.rotation.y = -flap
    figure.wingGroup.rotation.z = reduced ? 0 : Math.sin(t * 0.7) * 0.035

    figure.hairButterfly.rotation.z = -0.5 + (reduced ? 0 : Math.sin(t * 1.8) * 0.16)
    figure.hairButterfly.rotation.y = reduced ? 0 : Math.sin(t * 1.1) * 0.25

    butterflies.forEach((butterfly) => {
      const orbit = butterfly.userData.orbit
      const angle = t * orbit.speed + orbit.phase
      butterfly.position.set(
        Math.cos(angle) * orbit.radius,
        orbit.baseY + Math.sin(t * 1.25 + orbit.phase) * 0.12,
        Math.sin(angle) * orbit.radius,
      )
      butterfly.rotation.y = -angle + Math.PI / 2
      butterfly.rotation.z = orbit.tilt + Math.sin(t * 2.4 + orbit.phase) * 0.18
      const [left, right] = butterfly.userData.wings
      const beat = reduced ? 0.35 : 0.35 + Math.sin(t * 5 + orbit.phase) * 0.3
      left.rotation.y = beat
      right.rotation.y = -beat
    })

    motes.rotation.y = reduced ? 0 : t * 0.035
    motes.material.opacity = reduced ? 0.7 : 0.62 + Math.sin(t * 0.8) * 0.14
    ground.rotation.y = reduced ? 0 : t * 0.02

    camera.position.x += (pointerX * 0.12 - camera.position.x) * 0.05
    camera.position.y += (1.4 - pointerY * 0.06 - camera.position.y) * 0.05
    camera.lookAt(0, 1.2, 0)

    renderer.render(scene, camera)
  }

  renderer.setAnimationLoop(animate)

  return () => {
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

    scene.traverse((child) => {
      if (child.geometry) child.geometry.dispose()
      if (child.material) {
        const materials = Array.isArray(child.material) ? child.material : [child.material]
        materials.forEach((material) => material.dispose())
      }
    })
    mixer?.stopAllAction()
    renderer.dispose()
    renderer.forceContextLoss?.()
  }
}
