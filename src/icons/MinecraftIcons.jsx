/** Pixel-art Minecraft-style item icons (16×16 grid, crisp edges) */

const pixel = { shapeRendering: 'crispEdges' }

export function McSword({ size = 48, className = '' }) {
  return (
    <svg viewBox="0 0 16 16" width={size} height={size} className={className} {...pixel}>
      <rect x="9" y="0" width="1" height="1" fill="#ffffff" />
      <rect x="8" y="1" width="2" height="1" fill="#7ee8ff" />
      <rect x="7" y="2" width="3" height="1" fill="#55ffff" />
      <rect x="6" y="3" width="3" height="1" fill="#3dd4ee" />
      <rect x="5" y="4" width="3" height="1" fill="#2ec4d8" />
      <rect x="4" y="5" width="3" height="1" fill="#22b8cf" />
      <rect x="3" y="6" width="3" height="1" fill="#1aa8c0" />
      <rect x="2" y="7" width="2" height="1" fill="#0e9aaa" />
      <rect x="1" y="8" width="2" height="1" fill="#c8c8c8" />
      <rect x="0" y="9" width="2" height="1" fill="#a8a8a8" />
      <rect x="0" y="10" width="2" height="1" fill="#8b6914" />
      <rect x="1" y="11" width="2" height="1" fill="#6b4f10" />
      <rect x="2" y="12" width="1" height="1" fill="#5a4210" />
      <rect x="8" y="2" width="1" height="1" fill="#ffffff" />
      <rect x="7" y="3" width="1" height="1" fill="#a8f8ff" />
    </svg>
  )
}

export function McBow({ size = 48, className = '' }) {
  return (
    <svg viewBox="0 0 16 16" width={size} height={size} className={className} {...pixel}>
      <rect x="2" y="7" width="1" height="2" fill="#e8e8e8" />
      <rect x="3" y="5" width="1" height="1" fill="#f0f0f0" />
      <rect x="3" y="6" width="1" height="1" fill="#ffffff" />
      <rect x="3" y="9" width="1" height="1" fill="#ffffff" />
      <rect x="3" y="10" width="1" height="1" fill="#f0f0f0" />
      <rect x="4" y="4" width="1" height="1" fill="#a8843f" />
      <rect x="4" y="5" width="1" height="2" fill="#8b6914" />
      <rect x="4" y="9" width="1" height="2" fill="#8b6914" />
      <rect x="4" y="11" width="1" height="1" fill="#68440e" />
      <rect x="5" y="3" width="1" height="1" fill="#c4a060" />
      <rect x="5" y="4" width="1" height="1" fill="#a8843f" />
      <rect x="5" y="5" width="1" height="1" fill="#8b6914" />
      <rect x="5" y="9" width="1" height="1" fill="#8b6914" />
      <rect x="5" y="10" width="1" height="1" fill="#a8843f" />
      <rect x="5" y="11" width="1" height="1" fill="#68440e" />
      <rect x="6" y="2" width="1" height="1" fill="#c4a060" />
      <rect x="6" y="3" width="1" height="2" fill="#a8843f" />
      <rect x="6" y="10" width="1" height="2" fill="#a8843f" />
      <rect x="6" y="12" width="1" height="1" fill="#68440e" />
      <rect x="7" y="1" width="1" height="1" fill="#d4b878" />
      <rect x="7" y="2" width="1" height="1" fill="#c4a060" />
      <rect x="7" y="3" width="1" height="1" fill="#8b6914" />
      <rect x="7" y="11" width="1" height="1" fill="#8b6914" />
      <rect x="7" y="12" width="1" height="1" fill="#a8843f" />
      <rect x="7" y="13" width="1" height="1" fill="#68440e" />
      <rect x="8" y="2" width="1" height="1" fill="#a8843f" />
      <rect x="8" y="3" width="1" height="2" fill="#8b6914" />
      <rect x="8" y="10" width="1" height="2" fill="#8b6914" />
      <rect x="8" y="12" width="1" height="1" fill="#68440e" />
      <rect x="9" y="3" width="1" height="1" fill="#c4a060" />
      <rect x="9" y="4" width="1" height="1" fill="#a8843f" />
      <rect x="9" y="5" width="1" height="1" fill="#8b6914" />
      <rect x="9" y="9" width="1" height="1" fill="#8b6914" />
      <rect x="9" y="10" width="1" height="1" fill="#a8843f" />
      <rect x="9" y="11" width="1" height="1" fill="#68440e" />
      <rect x="10" y="4" width="1" height="1" fill="#a8843f" />
      <rect x="10" y="5" width="1" height="2" fill="#8b6914" />
      <rect x="10" y="9" width="1" height="2" fill="#8b6914" />
      <rect x="10" y="11" width="1" height="1" fill="#68440e" />
      <rect x="11" y="5" width="1" height="1" fill="#f0f0f0" />
      <rect x="11" y="6" width="1" height="1" fill="#ffffff" />
      <rect x="11" y="9" width="1" height="1" fill="#ffffff" />
      <rect x="11" y="10" width="1" height="1" fill="#f0f0f0" />
      <rect x="12" y="7" width="1" height="2" fill="#e8e8e8" />
    </svg>
  )
}

export function McLavaBucket({ size = 48, className = '' }) {
  return (
    <svg viewBox="0 0 16 16" width={size} height={size} className={className} {...pixel}>
      <rect x="4" y="2" width="8" height="1" fill="#ffcc00" />
      <rect x="3" y="3" width="10" height="1" fill="#ff9100" />
      <rect x="3" y="4" width="2" height="1" fill="#ff5500" />
      <rect x="3" y="4" width="10" height="1" fill="#ff7700" />
      <rect x="4" y="5" width="8" height="1" fill="#ffaa00" />
      <rect x="5" y="6" width="6" height="1" fill="#ffcc00" />
      <rect x="5" y="7" width="1" height="1" fill="#ff6600" />
      <rect x="6" y="7" width="4" height="1" fill="#ff8800" />
      <rect x="10" y="7" width="1" height="1" fill="#ff4400" />
      <rect x="3" y="8" width="1" height="4" fill="#9a9a9a" />
      <rect x="12" y="8" width="1" height="4" fill="#6b6b6b" />
      <rect x="4" y="8" width="8" height="1" fill="#b0b0b0" />
      <rect x="4" y="9" width="8" height="1" fill="#a0a0a0" />
      <rect x="4" y="10" width="8" height="1" fill="#909090" />
      <rect x="4" y="11" width="8" height="1" fill="#808080" />
      <rect x="4" y="12" width="8" height="1" fill="#707070" />
      <rect x="5" y="13" width="6" height="1" fill="#606060" />
      <rect x="6" y="14" width="4" height="1" fill="#505050" />
      <rect x="5" y="4" width="1" height="1" fill="#ffff66" />
      <rect x="9" y="5" width="1" height="1" fill="#ff3300" />
    </svg>
  )
}

export function McCobweb({ size = 48, className = '' }) {
  return (
    <svg viewBox="0 0 16 16" width={size} height={size} className={className} {...pixel}>
      <rect x="7" y="0" width="2" height="1" fill="#f8f8f8" />
      <rect x="0" y="7" width="1" height="2" fill="#f8f8f8" />
      <rect x="15" y="7" width="1" height="2" fill="#e8e8e8" />
      <rect x="7" y="15" width="2" height="1" fill="#e8e8e8" />
      <rect x="2" y="2" width="1" height="1" fill="#ffffff" />
      <rect x="13" y="2" width="1" height="1" fill="#f0f0f0" />
      <rect x="2" y="13" width="1" height="1" fill="#f0f0f0" />
      <rect x="13" y="13" width="1" height="1" fill="#e8e8e8" />
      <rect x="4" y="1" width="1" height="1" fill="#ffffff" />
      <rect x="11" y="1" width="1" height="1" fill="#f8f8f8" />
      <rect x="1" y="4" width="1" height="1" fill="#ffffff" />
      <rect x="14" y="4" width="1" height="1" fill="#f0f0f0" />
      <rect x="1" y="11" width="1" height="1" fill="#f0f0f0" />
      <rect x="14" y="11" width="1" height="1" fill="#e8e8e8" />
      <rect x="4" y="14" width="1" height="1" fill="#f8f8f8" />
      <rect x="11" y="14" width="1" height="1" fill="#e8e8e8" />
      <rect x="3" y="3" width="10" height="1" fill="#ffffff" opacity="0.9" />
      <rect x="3" y="12" width="10" height="1" fill="#e8e8e8" opacity="0.85" />
      <rect x="3" y="4" width="1" height="8" fill="#ffffff" opacity="0.9" />
      <rect x="12" y="4" width="1" height="8" fill="#f0f0f0" opacity="0.85" />
      <rect x="5" y="5" width="6" height="1" fill="#ffffff" />
      <rect x="5" y="10" width="6" height="1" fill="#e8e8e8" />
      <rect x="5" y="6" width="1" height="4" fill="#f8f8f8" />
      <rect x="10" y="6" width="1" height="4" fill="#f0f0f0" />
      <rect x="6" y="7" width="4" height="2" fill="#ffffff" />
      <rect x="7" y="7" width="2" height="2" fill="#f8f8f8" />
    </svg>
  )
}

export function McShield({ size = 48, className = '' }) {
  return (
    <svg viewBox="0 0 16 16" width={size} height={size} className={className} {...pixel}>
      <rect x="5" y="0" width="6" height="1" fill="#8b4513" />
      <rect x="4" y="1" width="8" height="1" fill="#a0522d" />
      <rect x="3" y="2" width="10" height="1" fill="#cd853f" />
      <rect x="3" y="3" width="10" height="1" fill="#8b4513" />
      <rect x="2" y="4" width="12" height="1" fill="#a0522d" />
      <rect x="2" y="5" width="3" height="1" fill="#ffffff" />
      <rect x="5" y="5" width="6" height="1" fill="#c41e3a" />
      <rect x="11" y="5" width="3" height="1" fill="#ffffff" />
      <rect x="2" y="6" width="2" height="1" fill="#f0f0f0" />
      <rect x="4" y="6" width="2" height="1" fill="#ffffff" />
      <rect x="6" y="6" width="4" height="1" fill="#e03050" />
      <rect x="10" y="6" width="2" height="1" fill="#ffffff" />
      <rect x="12" y="6" width="2" height="1" fill="#f0f0f0" />
      <rect x="2" y="7" width="1" height="1" fill="#e8e8e8" />
      <rect x="3" y="7" width="2" height="1" fill="#ffffff" />
      <rect x="5" y="7" width="6" height="1" fill="#c41e3a" />
      <rect x="11" y="7" width="2" height="1" fill="#ffffff" />
      <rect x="13" y="7" width="1" height="1" fill="#e8e8e8" />
      <rect x="3" y="8" width="10" height="1" fill="#8b4513" />
      <rect x="4" y="9" width="8" height="1" fill="#a0522d" />
      <rect x="5" y="10" width="6" height="1" fill="#8b4513" />
      <rect x="6" y="11" width="4" height="1" fill="#6b3410" />
      <rect x="7" y="12" width="2" height="1" fill="#5a2d0c" />
      <rect x="7" y="5" width="2" height="3" fill="#ffffff" />
      <rect x="6" y="6" width="4" height="1" fill="#f8f8f8" />
    </svg>
  )
}

export function McDiamond({ size = 48, className = '' }) {
  return (
    <svg viewBox="0 0 16 16" width={size} height={size} className={className} {...pixel}>
      <rect x="7" y="1" width="2" height="1" fill="#b8fff8" />
      <rect x="6" y="2" width="4" height="1" fill="#7fffe8" />
      <rect x="5" y="3" width="6" height="1" fill="#4fffe1" />
      <rect x="4" y="4" width="8" height="1" fill="#3ee8d4" />
      <rect x="3" y="5" width="10" height="1" fill="#2ed4c4" />
      <rect x="3" y="6" width="2" height="1" fill="#5affee" />
      <rect x="5" y="6" width="6" height="1" fill="#1ab8a8" />
      <rect x="11" y="6" width="2" height="1" fill="#5affee" />
      <rect x="4" y="7" width="2" height="1" fill="#7fffe8" />
      <rect x="6" y="7" width="4" height="1" fill="#0e9a8a" />
      <rect x="10" y="7" width="2" height="1" fill="#7fffe8" />
      <rect x="5" y="8" width="2" height="1" fill="#4fffe1" />
      <rect x="7" y="8" width="2" height="1" fill="#1a8a7a" />
      <rect x="9" y="8" width="2" height="1" fill="#4fffe1" />
      <rect x="6" y="9" width="4" height="1" fill="#2ec4b8" />
      <rect x="7" y="10" width="2" height="1" fill="#1a7a6e" />
      <rect x="7" y="2" width="1" height="1" fill="#ffffff" />
      <rect x="8" y="4" width="1" height="1" fill="#a8fff4" />
      <rect x="5" y="7" width="1" height="1" fill="#c8fff8" />
    </svg>
  )
}

export function McPotion({ size = 48, className = '' }) {
  return (
    <svg viewBox="0 0 16 16" width={size} height={size} className={className} {...pixel}>
      <rect x="6" y="0" width="4" height="1" fill="#c8e8ff" />
      <rect x="5" y="1" width="6" height="1" fill="#a8d8f8" />
      <rect x="6" y="2" width="4" height="1" fill="#88c8f0" />
      <rect x="5" y="3" width="1" height="1" fill="#d0e8ff" />
      <rect x="6" y="3" width="4" height="1" fill="#ff88cc" />
      <rect x="10" y="3" width="1" height="1" fill="#b0d0f0" />
      <rect x="4" y="4" width="1" height="2" fill="#e0f0ff" />
      <rect x="11" y="4" width="1" height="2" fill="#90b8e0" />
      <rect x="5" y="4" width="6" height="1" fill="#ff55aa" />
      <rect x="5" y="5" width="6" height="1" fill="#ff3388" />
      <rect x="5" y="6" width="6" height="1" fill="#ff66bb" />
      <rect x="5" y="7" width="6" height="1" fill="#ff4499" />
      <rect x="5" y="8" width="6" height="1" fill="#ee2288" />
      <rect x="5" y="9" width="6" height="1" fill="#dd1177" />
      <rect x="6" y="10" width="4" height="1" fill="#cc0066" />
      <rect x="6" y="11" width="4" height="1" fill="#b80055" />
      <rect x="7" y="12" width="2" height="1" fill="#a00044" />
      <rect x="7" y="2" width="2" height="1" fill="#ffc0e0" />
      <rect x="6" y="5" width="1" height="1" fill="#ffaadd" />
      <rect x="9" y="7" width="1" height="1" fill="#ff88cc" />
    </svg>
  )
}

export function McCrown({ size = 48, className = '' }) {
  return (
    <svg viewBox="0 0 16 16" width={size} height={size} className={className} {...pixel}>
      <rect x="1" y="10" width="14" height="2" fill="#7c3aed" />
      <rect x="1" y="12" width="14" height="1" fill="#5b21b6" />
      <rect x="2" y="8" width="2" height="2" fill="#c4b5fd" />
      <rect x="7" y="6" width="2" height="4" fill="#e9d5ff" />
      <rect x="12" y="8" width="2" height="2" fill="#c4b5fd" />
      <rect x="0" y="6" width="2" height="4" fill="#a78bfa" />
      <rect x="14" y="6" width="2" height="4" fill="#a78bfa" />
      <rect x="1" y="5" width="1" height="1" fill="#f5f3ff" />
      <rect x="7" y="4" width="2" height="1" fill="#ffffff" />
      <rect x="14" y="5" width="1" height="1" fill="#f5f3ff" />
      <rect x="3" y="9" width="1" height="1" fill="#ffd700" />
      <rect x="7" y="8" width="2" height="1" fill="#ffd700" />
      <rect x="12" y="9" width="1" height="1" fill="#ffd700" />
      <rect x="0" y="9" width="1" height="1" fill="#ffd700" />
      <rect x="15" y="9" width="1" height="1" fill="#ffd700" />
    </svg>
  )
}

export const MINECRAFT_ICONS = {
  sword: McSword,
  bow: McBow,
  bucket: McLavaBucket,
  web: McCobweb,
  shield: McShield,
  diamond: McDiamond,
  potion: McPotion,
}
