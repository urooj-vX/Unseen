'use client'

import { Canvas, useFrame } from '@react-three/fiber'
import { Sky, Stars, OrbitControls, Environment } from '@react-three/drei'
import { useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'

const discoveries = [
  { id: 0, title: 'The listening stone', copy: 'A stone holds the shape of every quiet thing that passed it.' },
  { id: 1, title: 'The leaning grove', copy: 'The trees bend toward a clearing that only appears when you slow down.' },
  { id: 2, title: 'The lantern pool', copy: 'Under the surface, a small light keeps time with your footsteps.' },
]

function Tree({ position, scale = 1, awakened = false }: { position: [number, number, number]; scale?: number; awakened?: boolean }) {
  return <group position={position} scale={scale}>
    <mesh position={[0, 1.35, 0]} castShadow><cylinderGeometry args={[0.12, 0.2, 2.7, 7]} /><meshStandardMaterial color="#3d3025" roughness={1} /></mesh>
    <mesh position={[0, 2.35, 0]} castShadow><coneGeometry args={[0.95, 1.75, 7]} /><meshStandardMaterial color={awakened ? '#789b62' : '#52664b'} roughness={1} /></mesh>
    <mesh position={[0.24, 2.82, 0.08]} castShadow><coneGeometry args={[0.63, 1.25, 7]} /><meshStandardMaterial color={awakened ? '#a6bd7c' : '#6f8054'} roughness={1} /></mesh>
    {awakened && <pointLight position={[0, 2.6, 0]} color="#dbe7a5" intensity={1.4} distance={3} />}
  </group>
}

function Rock({ position, color = '#717d72' }: { position: [number, number, number]; color?: string }) {
  return <mesh position={position} rotation={[0.1, 0.4, -0.1]} castShadow><dodecahedronGeometry args={[0.55, 0]} /><meshStandardMaterial color={color} roughness={0.9} /></mesh>
}

function FireflyField({ active }: { active: boolean }) {
  const ref = useRef<THREE.Points>(null)
  const positions = useMemo(() => {
    const values = new Float32Array(180 * 3)
    for (let i = 0; i < 180; i++) { values[i * 3] = (Math.random() - .5) * 18; values[i * 3 + 1] = Math.random() * 3.5 + .15; values[i * 3 + 2] = (Math.random() - .5) * 18 }
    return values
  }, [])
  useFrame(({ clock }) => { if (ref.current) ref.current.rotation.y = clock.getElapsedTime() * (active ? .035 : .012) })
  return <points ref={ref}><bufferGeometry><bufferAttribute attach="attributes-position" args={[positions, 3]} /></bufferGeometry><pointsMaterial color={active ? '#e9db8c' : '#c5b777'} size={active ? .07 : .035} transparent opacity={active ? .9 : .3} /></points>
}

function Player({ position, onMove }: { position: THREE.Vector3; onMove: (v: THREE.Vector3) => void }) {
  const ref = useRef<THREE.Group>(null)
  useFrame(() => { if (ref.current) ref.current.position.lerp(position, .18) })
  return <group ref={ref}>
    <mesh position={[0, .46, 0]} castShadow><coneGeometry args={[.22, .55, 6]} /><meshStandardMaterial color="#d77652" roughness={.8} /></mesh>
    <mesh position={[0, .82, 0]} castShadow><sphereGeometry args={[.14, 10, 8]} /><meshStandardMaterial color="#e8d6b4" /></mesh>
    <mesh position={[0, .12, 0]}><circleGeometry args={[.32, 20]} /><meshBasicMaterial color="#d5a16e" transparent opacity={.22} /></mesh>
  </group>
}

function Scene({ onDiscovery, found }: { onDiscovery: (id: number) => void; found: number[] }) {
  const [player, setPlayer] = useState(new THREE.Vector3(0, 0, 3.6))
  const keys = useRef<Record<string, boolean>>({})
  useEffect(() => { const down = (e: KeyboardEvent) => { keys.current[e.key.toLowerCase()] = true }; const up = (e: KeyboardEvent) => { keys.current[e.key.toLowerCase()] = false }; window.addEventListener('keydown', down); window.addEventListener('keyup', up); return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up) } }, [])
  useFrame((_, delta) => {
    const next = player.clone(); const speed = 2.4 * delta
    if (keys.current.w || keys.current.arrowup) next.z -= speed
    if (keys.current.s || keys.current.arrowdown) next.z += speed
    if (keys.current.a || keys.current.arrowleft) next.x -= speed
    if (keys.current.d || keys.current.arrowright) next.x += speed
    next.x = THREE.MathUtils.clamp(next.x, -7.4, 7.4); next.z = THREE.MathUtils.clamp(next.z, -7.4, 7.4)
    if (next.distanceTo(player) > .001) { setPlayer(next); onMove(next) }
  })
  return <>
    <color attach="background" args={['#b9c69d']} /><fog attach="fog" args={['#b9c69d', 7, 20]} />
    <ambientLight intensity={1.2} color="#fff4d8" /><directionalLight position={[-5, 9, 3]} intensity={2.2} color="#fff0c7" castShadow shadow-mapSize={[1024, 1024]} />
    <Sky distance={450000} sunPosition={[-3, 2, -5]} inclination={0.48} azimuth={0.25} /><Stars radius={40} depth={10} count={500} factor={1} saturation={0} fade speed={.3} />
    <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow><planeGeometry args={[22, 22, 32, 32]} /><meshStandardMaterial color="#657557" roughness={1} /></mesh>
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, .02, 0]}><planeGeometry args={[2.1, 22]} /><meshStandardMaterial color="#b7a477" roughness={1} /></mesh>
    {[[-6,0,-5],[-3,0,-6],[4,0,-5],[6,0,-2],[-6,0,1],[6,0,4],[-4,0,5],[3,0,6]].map((p, i) => <Tree key={i} position={p as [number,number,number]} scale={.8 + (i % 3) * .15} awakened={found.includes(1)} />)}
    <Rock position={[-2, .45, -2.5]} /><Rock position={[2, .4, -4]} color="#8a928a" /><Rock position={[3.4, .35, 2.5]} color="#7d8579" />
    <group position={[-2, 0, -2.5]} onClick={() => onDiscovery(0)}><mesh position={[0, .65, 0]}><icosahedronGeometry args={[.65, 1]} /><meshStandardMaterial color={found.includes(0) ? '#d9c78d' : '#64766b'} emissive={found.includes(0) ? '#b59d50' : '#000000'} emissiveIntensity={found.includes(0) ? 1.5 : 0} /></mesh></group>
    <group position={[2.6, 0, -4.2]} onClick={() => onDiscovery(1)}><mesh position={[0, .4, 0]}><torusGeometry args={[.45, .08, 8, 20]} /><meshStandardMaterial color={found.includes(1) ? '#c7df9c' : '#6f8054'} emissive={found.includes(1) ? '#7b9b5c' : '#000000'} emissiveIntensity={1} /></mesh></group>
    <group position={[3.5, 0, 2.8]} onClick={() => onDiscovery(2)}><mesh position={[0, .22, 0]}><cylinderGeometry args={[.75, .75, .12, 24]} /><meshStandardMaterial color="#53665a" emissive={found.includes(2) ? '#d7c770' : '#000000'} emissiveIntensity={found.includes(2) ? 1.8 : 0} /></mesh></group>
    <FireflyField active={found.length > 0} /><Player position={player} onMove={() => {}} />
    <OrbitControls enablePan={false} enableZoom={false} minPolarAngle={Math.PI / 3.2} maxPolarAngle={Math.PI / 2.1} target={[0, 0, 0]} />
  </>
}

export default function UnseenWorld() {
  const [started, setStarted] = useState(false); const [paused, setPaused] = useState(false); const [journal, setJournal] = useState(false); const [found, setFound] = useState<number[]>([]); const [active, setActive] = useState<number | null>(null)
  const discover = (id: number) => { if (!found.includes(id)) { setFound([...found, id]); setActive(id) } }
  return <main className="unseen-shell">
    <div className="world-canvas"><Canvas shadows camera={{ position: [0, 7.5, 9], fov: 48 }} dpr={[1, 1.5]}><Scene onDiscovery={discover} found={found} /></Canvas></div>
    {!started && <section className="title-screen"><div className="title-mark">UNSEEN<span>◌</span></div><p className="title-kicker">a field guide for paying attention</p><p className="title-copy">The world is full of small things<br />waiting to be noticed.</p><button className="enter-button" onClick={() => setStarted(true)}>ENTER THE WORLD <span>↗</span></button><button className="quiet-button" onClick={() => setJournal(true)}>what is unseen?</button><div className="title-footer"><span>01 / 03</span><span>move slowly · look closely</span></div></section>}
    {started && <><header className="world-hud"><button className="wordmark" onClick={() => setStarted(false)}>UNSEEN</button><div className="hud-center"><span className="eyebrow">EXPEDITION 01</span><span className="progress-dots">{[0,1,2].map(i => <i key={i} className={found.includes(i) ? 'found' : ''} />)}</span></div><div className="hud-actions"><button onClick={() => setJournal(true)}>JOURNAL <span>{found.length}/3</span></button><button onClick={() => setPaused(!paused)}>{paused ? 'RESUME' : 'PAUSE'}</button></div></header><div className="control-hint"><span className="keycap">W</span><span className="keycap">A</span><span className="keycap">S</span><span className="keycap">D</span><span>to wander</span></div>{active !== null && <div className="discovery-card"><span className="card-index">DISCOVERY 0{active + 1}</span><h2>{discoveries[active].title}</h2><p>{discoveries[active].copy}</p><button onClick={() => setActive(null)}>CONTINUE <span>→</span></button></div>}{found.length === 3 && <div className="completion"><span>EXPEDITION COMPLETE</span><h2>You noticed what was<br />already here.</h2><button onClick={() => setJournal(true)}>OPEN JOURNAL →</button></div>}</>}
    {journal && <div className="journal-overlay"><button className="close-button" onClick={() => setJournal(false)}>×</button><span className="eyebrow">FIELD NOTES / 01</span><h1>Keep looking.</h1><p>UNSEEN is a small invitation to step away from the screen and bring your attention back to the place you are in.</p><div className="journal-note"><span>THE NEXT OBSERVATION</span><strong>Find one thing that is moving<br />without making a sound.</strong><em>Go outside. Look for 60 seconds.</em></div><button className="enter-button" onClick={() => { setJournal(false); setStarted(true) }}>RETURN TO WORLD <span>↗</span></button></div>}
    {paused && started && <div className="pause-overlay"><span className="eyebrow">PAUSED</span><h2>The world will wait.</h2><button className="enter-button" onClick={() => setPaused(false)}>CONTINUE <span>↗</span></button></div>}
  </main>
}

export { discoveries }
