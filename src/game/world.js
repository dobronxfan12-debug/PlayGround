// The 3D honey island: camera, hive, pipeline, jar, bees and themed scenery.
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js'
import { BEE_TYPES, ZONE_BY_ID } from './data.js'
import { Bee, buildBeeSpecs } from './world-bees.js'
import { createZoneEnvironment } from './world-env.js'
import { JarVisual, JAR_POS } from './jar.js'
import { glowTexture, zoneVisual, clamp, rand } from './world-visuals.js'
import { BurstSystem, FullSparkles, HoneyStream, SmokePuffs } from './world-fx.js'

const ISLAND_RADIUS = 5.45

export class HoneyWorld {
  constructor(canvas, opts = {}) {
    this.canvas = canvas
    this.onJarTap = opts.onJarTap || (() => {})
    this.isCoarse = window.matchMedia('(pointer: coarse)').matches
    this.entry = new THREE.Vector3(-2.45, 0, 0.05)
    this.hiveEntry = new THREE.Vector3(-2.2, 0.85, 1.2)
    this.jarTop = new THREE.Vector3(JAR_POS.x, 2.7, JAR_POS.z)
    this.spout = new THREE.Vector3(JAR_POS.x, 3.72, JAR_POS.z)
    this.flowerPoints = []
    this.zoneGroups = new Map()
    this.zoneEnv = null
    this.zone = null
    this.visual = zoneVisual('meadow')
    this.bees = []
    this.beeSignature = ''
    this.bursts = null
    this.time = 0
    this.tapStart = null
    this.pointers = new Set()

    this.initRenderer()
    this.initScene()
    this.initLights()
    this.initSky()
    this.buildIsland()
    this.buildHive()
    this.buildPipe()
    this.buildJar()
    this.initControls()
    this.initPointer()
    this.resize()
  }

  initRenderer() {
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance',
      preserveDrawingBuffer: true,
    })
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, this.isCoarse ? 1.85 : 2))
    this.renderer.outputColorSpace = THREE.SRGBColorSpace
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping
    this.renderer.toneMappingExposure = 1.02
    this.renderer.shadowMap.enabled = true
    this.renderer.shadowMap.type = THREE.PCFShadowMap
    this.renderer.setClearColor(0xcfeaff, 1)
    this.maxAnisotropy = this.renderer.capabilities.getMaxAnisotropy()
  }

  initScene() {
    this.scene = new THREE.Scene()
    this.scene.fog = new THREE.Fog(0xcfeaff, 26, 62)
    this.camera = new THREE.PerspectiveCamera(42, 1, 0.1, 120)

    try {
      const pmrem = new THREE.PMREMGenerator(this.renderer)
      const envScene = new RoomEnvironment()
      this.scene.environment = pmrem.fromScene(envScene, 0.04).texture
      this.scene.environmentIntensity = 0.52
      envScene.traverse((o) => {
        if (o.isMesh) {
          o.geometry?.dispose?.()
          o.material?.dispose?.()
        }
      })
      pmrem.dispose()
    } catch {
      // Environment reflections are optional.
    }
  }

  initLights() {
    this.hemi = new THREE.HemisphereLight(0xfff1cf, 0x648f4b, 1.3)
    this.scene.add(this.hemi)

    this.sun = new THREE.DirectionalLight(0xffe3a3, 2.3)
    this.sun.position.set(6.5, 11, 7.5)
    this.sun.castShadow = true
    this.sun.shadow.mapSize.set(this.isCoarse ? 1024 : 2048, this.isCoarse ? 1024 : 2048)
    this.sun.shadow.camera.near = 1
    this.sun.shadow.camera.far = 34
    this.sun.shadow.camera.left = -8.5
    this.sun.shadow.camera.right = 8.5
    this.sun.shadow.camera.top = 9
    this.sun.shadow.camera.bottom = -6
    this.sun.shadow.bias = -0.0006
    this.sun.shadow.normalBias = 0.03
    this.scene.add(this.sun)

    this.fill = new THREE.DirectionalLight(0xbfe1ff, 0.55)
    this.fill.position.set(-7, 5, -6)
    this.scene.add(this.fill)

    this.jarLight = new THREE.PointLight(0xffb52e, 2.2, 7, 2)
    this.jarLight.position.set(JAR_POS.x, 1.35, JAR_POS.z + 0.4)
    this.scene.add(this.jarLight)
  }

  initSky() {
    const uniforms = {
      topColor: { value: new THREE.Color(0x8fd7ff) },
      bottomColor: { value: new THREE.Color(0xdff4ff) },
      offset: { value: 8 },
      exponent: { value: 0.72 },
    }
    this.skyUniforms = uniforms
    const skyGeo = new THREE.SphereGeometry(72, 32, 20)
    const skyMat = new THREE.ShaderMaterial({
      uniforms,
      vertexShader: `
        varying vec3 vWorld;
        void main() {
          vec4 world = modelMatrix * vec4(position, 1.0);
          vWorld = world.xyz;
          gl_Position = projectionMatrix * viewMatrix * world;
        }
      `,
      fragmentShader: `
        uniform vec3 topColor;
        uniform vec3 bottomColor;
        uniform float offset;
        uniform float exponent;
        varying vec3 vWorld;
        void main() {
          float h = normalize(vWorld + vec3(0.0, offset, 0.0)).y;
          float f = pow(max(h, 0.0), exponent);
          gl_FragColor = vec4(mix(bottomColor, topColor, f), 1.0);
        }
      `,
      side: THREE.BackSide,
      depthWrite: false,
      fog: false,
    })
    this.scene.add(new THREE.Mesh(skyGeo, skyMat))

    this.sunSpriteMat = new THREE.SpriteMaterial({
      map: glowTexture(),
      color: 0xffedb0,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      fog: false,
    })
    this.sunSprite = new THREE.Sprite(this.sunSpriteMat)
    this.sunSprite.position.set(-19, 21, -30)
    this.sunSprite.scale.set(18, 18, 1)
    this.scene.add(this.sunSprite)

    this.sunCoreMat = new THREE.SpriteMaterial({
      map: glowTexture(),
      color: 0xffffff,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      fog: false,
    })
    this.sunCore = new THREE.Sprite(this.sunCoreMat)
    this.sunCore.position.copy(this.sunSprite.position)
    this.sunCore.scale.set(5.5, 5.5, 1)
    this.scene.add(this.sunCore)

    // Stars, shown in crystal and frost zones.
    const starPos = new Float32Array(460 * 3)
    for (let i = 0; i < 460; i++) {
      const a = rand(0, Math.PI * 2)
      const y = rand(0.06, 1)
      const r = 52
      const ring = Math.sqrt(1 - y * y)
      starPos[i * 3] = Math.cos(a) * ring * r
      starPos[i * 3 + 1] = y * r
      starPos[i * 3 + 2] = Math.sin(a) * ring * r
    }
    const starGeo = new THREE.BufferGeometry()
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3))
    this.starMat = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 0.32,
      transparent: true,
      opacity: 0.8,
      depthWrite: false,
      fog: false,
      sizeAttenuation: true,
    })
    this.stars = new THREE.Points(starGeo, this.starMat)
    this.stars.visible = false
    this.scene.add(this.stars)

    // Drifting clouds.
    this.cloudMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1, metalness: 0, transparent: true, opacity: 0.92 })
    this.clouds = []
    const cloudDefs = [
      [-16, 3.1, -18, 0.72],
      [-6.5, 4.1, -18, 0.6],
      [-19, 5.6, -28, 0.95],
      [-2, 5.2, -8, 0.5],
      [0.5, 5.9, -21, 0.82],
    ]
    for (const [x, y, z, scale] of cloudDefs) {
      const g = new THREE.Group()
      const blobs = [
        [0, 0, 0, 2.35],
        [1.45, -0.22, 0.08, 1.65],
        [-1.55, -0.28, 0.04, 1.55],
        [0.55, 0.68, -0.18, 1.6],
      ]
      for (const [bx, by, bz, s] of blobs) {
        const blob = new THREE.Mesh(new THREE.SphereGeometry(1, 9, 7), this.cloudMat)
        blob.position.set(bx, by, bz)
        blob.scale.set(s, s * 0.62, s)
        g.add(blob)
      }
      g.position.set(x, y, z)
      g.scale.setScalar(scale)
      g.userData.baseX = x
      g.userData.baseY = y
      g.userData.speed = rand(0.04, 0.09)
      g.userData.phase = rand(0, Math.PI * 2)
      g.userData.drift = rand(1.2, 2.4)
      this.scene.add(g)
      this.clouds.push(g)
    }
  }

  buildIsland() {
    this.groundMat = new THREE.MeshStandardMaterial({ color: 0x79bf51, roughness: 0.92, flatShading: false })
    this.edgeMat = new THREE.MeshStandardMaterial({ color: 0x5b9b3d, roughness: 0.94 })
    this.rockMat = new THREE.MeshStandardMaterial({ color: 0x9a7650, roughness: 0.98, flatShading: true })
    this.rimMat = new THREE.MeshStandardMaterial({ color: 0x9c774d, roughness: 0.9, flatShading: true })

    const topGeo = new THREE.CylinderGeometry(ISLAND_RADIUS, 5.2, 0.72, 64)
    this.groundTop = new THREE.Mesh(topGeo, [this.edgeMat, this.groundMat, this.groundMat])
    this.groundTop.position.y = -0.36
    this.groundTop.receiveShadow = true
    this.scene.add(this.groundTop)

    const underGeo = new THREE.ConeGeometry(5.18, 3.6, 64, 1, true)
    this.under = new THREE.Mesh(underGeo, this.rockMat)
    this.under.rotation.x = Math.PI
    this.under.position.y = -2.5
    this.under.receiveShadow = true
    this.scene.add(this.under)

    const rim = new THREE.Mesh(new THREE.TorusGeometry(ISLAND_RADIUS - 0.02, 0.11, 8, 64), this.rimMat)
    rim.rotation.x = Math.PI / 2
    rim.position.y = 0.01
    rim.castShadow = false
    this.scene.add(rim)

    // Rocks clinging to the underside.
    for (let i = 0; i < 11; i++) {
      const a = rand(0, Math.PI * 2)
      const r = rand(2.7, 4.9)
      const rock = new THREE.Mesh(new THREE.IcosahedronGeometry(rand(0.3, 0.9), 0), this.rockMat)
      rock.position.set(Math.cos(a) * r, rand(-2.4, -0.9), Math.sin(a) * r)
      rock.rotation.set(rand(0, 2), rand(0, 2), rand(0, 2))
      rock.scale.set(1, rand(0.7, 1.4), 1)
      this.scene.add(rock)
    }

    // A friendly stepping-stone path between the hive and jar.
    const stoneMat = new THREE.MeshStandardMaterial({ color: 0xd9c9a3, roughness: 0.9, flatShading: true })
    const path = [
      [-1.4, 1.25, 0.38],
      [-0.65, 1.35, 0.32],
      [0.05, 1.28, 0.3],
      [0.7, 1.1, 0.27],
      [1.15, 0.95, 0.24],
    ]
    for (const [x, z, s] of path) {
      const stone = new THREE.Mesh(new THREE.CylinderGeometry(s, s * 1.1, 0.06, 9), stoneMat)
      stone.position.set(x, 0.025, z)
      stone.rotation.y = rand(0, Math.PI)
      stone.receiveShadow = true
      this.scene.add(stone)
    }

    // Shared grass tufts at the base.
    const tuftMat = new THREE.MeshStandardMaterial({ color: 0x4f9b3d, roughness: 0.95 })
    for (let i = 0; i < 14; i++) {
      const a = rand(0, Math.PI * 2)
      const r = rand(1.4, 4.9)
      const x = Math.cos(a) * r
      const z = Math.sin(a) * r
      if (Math.hypot(x - JAR_POS.x, z - JAR_POS.z) < 1.4) continue
      if (Math.hypot(x + 2.45, z) < 1.25) continue
      for (let j = 0; j < 3; j++) {
        const blade = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.32, 4), tuftMat)
        blade.position.set(x + rand(-0.08, 0.08), 0.16, z + rand(-0.08, 0.08))
        blade.rotation.z = rand(-0.35, 0.35)
        blade.castShadow = false
        this.scene.add(blade)
      }
    }
  }

  buildHive() {
    const hive = new THREE.Group()
    hive.position.copy(this.entry)
    hive.rotation.y = 0.16
    this.scene.add(hive)

    const straw = new THREE.MeshStandardMaterial({ color: 0xe7bb6e, roughness: 0.82, flatShading: true })
    const strawAlt = new THREE.MeshStandardMaterial({ color: 0xd9a74f, roughness: 0.85, flatShading: true })
    const strawDark = new THREE.MeshStandardMaterial({ color: 0xb27e35, roughness: 0.85, flatShading: true })
    const wood = new THREE.MeshStandardMaterial({ color: 0x8e5d32, roughness: 0.8 })
    const dark = new THREE.MeshStandardMaterial({ color: 0x2a1a10, roughness: 0.65 })

    const stand = new THREE.Mesh(new THREE.CylinderGeometry(0.98, 1.08, 0.14, 18), wood)
    stand.position.y = 0.07
    stand.castShadow = true
    stand.receiveShadow = true
    hive.add(stand)
    for (const side of [-1, 1]) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.3, 0.16), wood)
      leg.position.set(side * 0.75, 0.2, 0.45)
      leg.castShadow = true
      hive.add(leg)
    }

    const layers = [
      [0.98, 0.42, 1.0],
      [0.94, 0.8, 0.96],
      [0.82, 1.16, 0.84],
      [0.66, 1.48, 0.68],
      [0.46, 1.74, 0.48],
    ]
    const sphereGeo = new THREE.SphereGeometry(1, 18, 12)
    layers.forEach(([r, y, sx], i) => {
      const lobe = new THREE.Mesh(sphereGeo, i % 2 ? strawAlt : straw)
      lobe.position.y = y
      lobe.scale.set(sx, r * 0.46, sx)
      lobe.castShadow = true
      lobe.receiveShadow = true
      hive.add(lobe)
      const band = new THREE.Mesh(new THREE.TorusGeometry(sx * 0.93, 0.028, 5, 28), strawDark)
      band.position.y = y + r * 0.12
      band.rotation.x = Math.PI / 2
      band.castShadow = false
      hive.add(band)
    })

    const knob = new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 8), strawDark)
    knob.position.y = 2.02
    hive.add(knob)

    // Entrance + landing board.
    const entrance = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.26, 0.12, 18), dark)
    entrance.rotation.x = Math.PI / 2
    entrance.position.set(0, 0.52, 0.92)
    hive.add(entrance)
    const landing = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.07, 0.4), wood)
    landing.position.set(0, 0.3, 1.02)
    landing.castShadow = true
    hive.add(landing)
    for (const side of [-1, 1]) {
      const rail = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.16, 0.32), wood)
      rail.position.set(side * 0.41, 0.36, 1.02)
      hive.add(rail)
    }

    // A honey drip by the doorway.
    const drip = new THREE.Mesh(
      new THREE.SphereGeometry(0.065, 8, 6),
      new THREE.MeshStandardMaterial({ color: 0xf2a51b, roughness: 0.2, emissive: 0xd47a00, emissiveIntensity: 0.3 }),
    )
    drip.position.set(0.27, 0.28, 1.05)
    drip.scale.set(1, 1.5, 1)
    hive.add(drip)

    // Some decorative bees clinging to the hive.
    for (const [x, y, z] of [
      [-0.55, 1.05, 0.78],
      [0.52, 1.3, 0.63],
      [0.16, 1.8, 0.5],
    ]) {
      const body = new THREE.Mesh(new THREE.SphereGeometry(0.075, 8, 6), new THREE.MeshStandardMaterial({ color: 0xf6b733, roughness: 0.5 }))
      body.position.set(x, y, z)
      body.scale.set(1, 0.85, 1.45)
      body.rotation.y = rand(-0.8, 0.8)
      hive.add(body)
      const stripe = new THREE.Mesh(new THREE.TorusGeometry(0.062, 0.015, 5, 8), dark)
      stripe.position.set(x, y, z)
      stripe.rotation.y = body.rotation.y
      hive.add(stripe)
    }

    this.hive = hive
    this.smoke = new SmokePuffs(this.scene, new THREE.Vector3(-2.3, 2.25, 0.1), 5)
  }

  buildPipe() {
    const woodMat = new THREE.MeshStandardMaterial({ color: 0x9a6638, roughness: 0.72, metalness: 0.04 })
    const darkWoodMat = new THREE.MeshStandardMaterial({ color: 0x6f4522, roughness: 0.8 })
    const brassMat = new THREE.MeshStandardMaterial({ color: 0xd9a53a, roughness: 0.28, metalness: 0.8 })

    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-2.45, 1.92, 0.05),
      new THREE.Vector3(-2.45, 3.02, 0.05),
      new THREE.Vector3(-1.35, 3.62, 0.28),
      new THREE.Vector3(0.1, 3.91, 0.62),
      new THREE.Vector3(JAR_POS.x, 3.9, JAR_POS.z),
      new THREE.Vector3(JAR_POS.x, 3.78, JAR_POS.z),
    ])
    const tube = new THREE.Mesh(new THREE.TubeGeometry(curve, 96, 0.135, 10, false), woodMat)
    tube.castShadow = true
    tube.receiveShadow = true
    this.scene.add(tube)
    this.pipeCurve = curve

    // Collars along the pipe.
    for (const t of [0.05, 0.42, 0.72, 0.94]) {
      const p = curve.getPointAt(t)
      const collar = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.035, 6, 14), darkWoodMat)
      collar.position.copy(p)
      collar.rotation.x = Math.PI / 2
      collar.rotation.y = 0.2
      this.scene.add(collar)
    }

    // Brass nozzle.
    const nozzle = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.24, 0.26, 12), brassMat)
    nozzle.position.set(JAR_POS.x, 3.72, JAR_POS.z)
    nozzle.castShadow = true
    this.scene.add(nozzle)
    const lip = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.035, 6, 16), brassMat)
    lip.position.set(JAR_POS.x, 3.6, JAR_POS.z)
    lip.rotation.x = Math.PI / 2
    this.scene.add(lip)

    // Support post under the pipe bend.
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 3.3, 8), darkWoodMat)
    post.position.set(-1.35, 1.65, 0.28)
    post.castShadow = true
    this.scene.add(post)
    const foot = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.32, 0.12, 10), darkWoodMat)
    foot.position.set(-1.35, 0.06, 0.28)
    this.scene.add(foot)
  }

  buildJar() {
    this.jar = new JarVisual()
    this.scene.add(this.jar.group)
    this.fullSparkles = new FullSparkles(this.jar.group)
    this.stream = new HoneyStream(this.scene, this.spout)
    this.bursts = new BurstSystem(this.scene)
  }

  ensureZone(zoneId) {
    if (this.zoneGroups.has(zoneId)) return this.zoneGroups.get(zoneId)
    const zone = ZONE_BY_ID[zoneId] || ZONE_BY_ID.meadow
    const env = createZoneEnvironment(zone, zoneVisual(zone.id))
    env.group.visible = false
    this.scene.add(env.group)
    this.zoneGroups.set(zoneId, env)
    return env
  }

  setZone(zoneId, state) {
    const zone = ZONE_BY_ID[zoneId] || ZONE_BY_ID.meadow
    const vis = zoneVisual(zone.id)
    this.zone = zone
    this.visual = vis

    for (const [id, env] of this.zoneGroups) env.group.visible = id === zone.id
    const env = this.ensureZone(zone.id)
    env.group.visible = true
    this.zoneEnv = env
    this.flowerPoints = env.flowerPoints

    // Ground and atmosphere palette.
    this.groundMat.color.setHex(vis.ground)
    this.edgeMat.color.setHex(vis.groundEdge)
    this.rockMat.color.setHex(vis.rock)
    this.rimMat.color.setHex(vis.rim)
    this.hemi.color.setHex(vis.hemi)
    this.hemi.groundColor.setHex(vis.hemiGround)
    this.hemi.intensity = vis.ambientLight
    this.sun.color.setHex(vis.sun)
    this.sunSpriteMat.color.setHex(vis.sunSprite)
    this.sunCoreMat.color.setHex(vis.sunSprite)
    this.fill.color.setHex(vis.sun)
    this.fill.intensity = 0.45
    this.cloudMat.color.setHex(vis.cloud)
    this.scene.fog.color.setHex(vis.fog)
    this.renderer.setClearColor(vis.fog, 1)
    this.skyUniforms.topColor.value.setStyle(zone.sky[0])
    this.skyUniforms.bottomColor.value.setStyle(zone.sky[1])
    this.stars.visible = !!vis.stars
    this.starMat.opacity = zone.id === 'crystal' ? 0.95 : 0.75
    this.sunSprite.visible = zone.id !== 'crystal'
    this.sunCore.visible = zone.id !== 'crystal'

    this.jar.setZone(zone, vis)
    this.stream.setHoneyColor(vis.honeyLight)
    this.jarLight.color.setHex(vis.honeyLight)

    if (state) this.syncBees(state)
  }

  syncBees(state) {
    if (!this.zone) return
    const sig = `${this.zone.id}|${BEE_TYPES.map((t) => state.bees[t.id] || 0).join(',')}`
    if (sig === this.beeSignature && this.bees.length) return
    for (const bee of this.bees) bee.dispose()
    this.bees = []
    const specs = buildBeeSpecs(state, this.zone)
    specs.forEach((spec, i) => {
      const bee = new Bee(this, spec.type, !!spec.native, i)
      bee.group.position.x += rand(-0.2, 0.2)
      this.scene.add(bee.group)
      this.bees.push(bee)
    })
    this.beeSignature = sig
  }

  refreshFonts() {
    if (!this.zone) return
    this.jar.setZone(this.zone, this.visual)
  }

  initControls() {
    this.controls = new OrbitControls(this.camera, this.canvas)
    this.controls.target.set(0.1, 2.15, 0)
    this.controls.enableDamping = true
    this.controls.dampingFactor = 0.08
    this.controls.enablePan = false
    this.controls.rotateSpeed = 0.45
    this.controls.zoomSpeed = 0.7
    this.controls.minPolarAngle = 0.62
    this.controls.maxPolarAngle = 1.33
    this.controls.minAzimuthAngle = 0.18
    this.controls.maxAzimuthAngle = 1.15
    this.controls.touches = { ONE: THREE.TOUCH.ROTATE, TWO: THREE.TOUCH.DOLLY_PAN }
    this.controls.addEventListener('start', () => {
      this.userInteracted = true
    })
  }

  setCameraForAspect(category) {
    const aspect = window.innerWidth / window.innerHeight
    let dist = 15.3
    if (aspect < 0.72) dist = 20.2
    else if (aspect < 1.0) dist = 18.0
    else if (aspect < 1.45) dist = 16.2
    const dir = new THREE.Vector3(0.62, 0.5, 0.94).normalize()
    const target = new THREE.Vector3(0.05, 2.12, 0)
    this.controls.target.copy(target)
    this.camera.position.copy(target).addScaledVector(dir, dist)
    this.controls.minDistance = dist * 0.72
    this.controls.maxDistance = dist * 1.45
    this.controls.update()
    this.cameraCategory = category
  }

  initPointer() {
    this.raycaster = new THREE.Raycaster()
    this.pointer = new THREE.Vector2()
    this.canvas.addEventListener('pointerdown', (e) => {
      this.pointers.add(e.pointerId)
      if (this.pointers.size > 1) {
        this.tapStart = null
        return
      }
      this.tapStart = { x: e.clientX, y: e.clientY, t: performance.now(), id: e.pointerId }
    })
    const cancel = (e) => {
      this.pointers.delete(e.pointerId)
      if (this.pointers.size === 0) this.tapStart = null
    }
    this.canvas.addEventListener('pointercancel', cancel)
    this.canvas.addEventListener('pointerup', (e) => {
      this.pointers.delete(e.pointerId)
      const start = this.tapStart
      this.tapStart = null
      if (!start || start.id !== e.pointerId) return
      const moved = Math.hypot(e.clientX - start.x, e.clientY - start.y)
      if (moved > 12 || performance.now() - start.t > 700) return
      this.tryJarTap(e.clientX, e.clientY)
    })
  }

  tryJarTap(clientX, clientY) {
    const rect = this.canvas.getBoundingClientRect()
    this.pointer.x = ((clientX - rect.left) / rect.width) * 2 - 1
    this.pointer.y = -((clientY - rect.top) / rect.height) * 2 + 1
    this.raycaster.setFromCamera(this.pointer, this.camera)
    const hits = this.raycaster.intersectObject(this.jar.group, true)
    if (hits.length > 0) this.onJarTap()
  }

  spawnCollectBurst() {
    if (!this.visual) return
    const pos = new THREE.Vector3(JAR_POS.x, 1.8, JAR_POS.z + 0.4)
    this.bursts.spawn(pos, this.visual.honeyLight, 26, { coins: 5, power: 1.05 })
    this.jar.collectBounce()
  }

  spawnBeeBurst() {
    this.bursts.spawn(new THREE.Vector3(-2.3, 1.4, 1.1), 0xffd35e, 12, { power: 0.7 })
  }

  spawnUpgradeBurst(position = new THREE.Vector3(-2.2, 2.2, 0.3)) {
    this.bursts.spawn(position, 0xffe58a, 16, { power: 0.85 })
  }

  resize() {
    const w = window.innerWidth
    const h = window.innerHeight
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, this.isCoarse ? 1.85 : 2))
    this.renderer.setSize(w, h, false)
    this.camera.aspect = w / h
    this.camera.updateProjectionMatrix()
    const aspect = w / h
    const category = aspect < 0.72 ? 'portrait' : aspect < 1.0 ? 'tall' : aspect < 1.45 ? 'square' : 'wide'
    if (!this.cameraCategory || this.cameraCategory !== category) this.setCameraForAspect(category)
  }

  update(dt, state, stats) {
    this.time += dt
    const t = this.time
    this.controls.update()

    if (this.zoneEnv) {
      this.zoneEnv.updateParticles(dt, t)
      this.zoneEnv.updateBobbers(dt, t)
    }
    for (const cloud of this.clouds) {
      const u = cloud.userData
      cloud.position.x = u.baseX + Math.sin(t * u.speed + u.phase) * u.drift
      cloud.position.y = u.baseY + Math.sin(t * u.speed * 0.7 + u.phase * 1.6) * 0.18
    }
    if (this.stars.visible) this.stars.rotation.y += dt * 0.008
    this.smoke.update(dt, t)

    const fillTarget = stats.capacity > 0 ? state.jar / stats.capacity : 0
    this.jar.update(dt, t, fillTarget, stats.rate)
    const active = stats.rate > 0 && !this.jar.full
    this.stream.update(dt, t, active, this.jar.surfaceWorldY(), this.jar.full)
    this.fullSparkles.update(dt, t, this.jar.full)

    for (const bee of this.bees) bee.update(dt, t, this.bees)
    this.bursts.update(dt)

    this.jarLight.intensity = 1.7 + this.jar.fill * 1.6 + Math.sin(t * 2.2) * 0.18
    this.sunSprite.material.opacity = 0.8 + Math.sin(t * 0.6) * 0.08
    this.sunCore.material.opacity = 0.82 + Math.sin(t * 0.9) * 0.1
  }

  render() {
    this.renderer.render(this.scene, this.camera)
  }
}
