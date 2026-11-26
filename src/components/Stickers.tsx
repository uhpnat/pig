import type { SVGProps } from 'react'

type StickerProps = SVGProps<SVGSVGElement> & { size?: number }

/** Glossy 3D Gold Money Bag Sticker (for CouplePage & JournalPage) */
export function MoneyBagSticker({ size = 48, ...p }: StickerProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" aria-hidden {...p}>
      <defs>
        <radialGradient id="mb-body" cx="35%" cy="30%" r="70%">
          <stop offset="0%" stopColor="#FFF3B0" />
          <stop offset="45%" stopColor="#FACC15" />
          <stop offset="100%" stopColor="#D97706" />
        </radialGradient>
        <linearGradient id="mb-ribbon" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#FF7597" />
          <stop offset="100%" stopColor="#E11D48" />
        </linearGradient>
      </defs>
      <ellipse cx="32" cy="57" rx="18" ry="4" fill="#92400E" opacity="0.2" />
      <path
        d="M23 13C21 9 25 6 28 8C30 6 34 6 36 8C39 6 43 9 41 13L38 19H26L23 13Z"
        fill="url(#mb-body)"
      />
      <path
        d="M20 22C13 28 11 38 13 47C15 53 22 56 32 56C42 56 49 53 51 47C53 38 51 28 44 22H20Z"
        fill="url(#mb-body)"
      />
      <ellipse cx="24" cy="32" rx="6" ry="10" transform="rotate(-18 24 32)" fill="#FFFFFF" opacity="0.45" />
      <rect x="22" y="18" width="20" height="6" rx="3" fill="url(#mb-ribbon)" />
      <path d="M36 21L44 17L42 25L36 21Z" fill="url(#mb-ribbon)" />
      <text
        x="32"
        y="45"
        textAnchor="middle"
        fontSize="19"
        fontWeight="900"
        fontFamily="Nunito, system-ui, sans-serif"
        fill="#B45309"
      >
        ₫
      </text>
    </svg>
  )
}

/** Glossy 3D Golden Trophy Sticker (for HomePage Goal Card) */
export function TrophySticker({ size = 46, ...p }: StickerProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" aria-hidden {...p}>
      <defs>
        <linearGradient id="tr-cup" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FEF08A" />
          <stop offset="50%" stopColor="#FACC15" />
          <stop offset="100%" stopColor="#D97706" />
        </linearGradient>
        <linearGradient id="tr-base" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#F59E0B" />
          <stop offset="100%" stopColor="#B45309" />
        </linearGradient>
      </defs>
      <ellipse cx="32" cy="58" rx="16" ry="3.5" fill="#92400E" opacity="0.22" />
      <path
        d="M18 16H12C9.8 16 8 17.8 8 20V23C8 29 12.5 34 18.5 34.8"
        stroke="#F59E0B"
        strokeWidth="4.5"
        strokeLinecap="round"
      />
      <path
        d="M46 16H52C54.2 16 56 17.8 56 20V23C56 29 51.5 34 45.5 34.8"
        stroke="#F59E0B"
        strokeWidth="4.5"
        strokeLinecap="round"
      />
      <path
        d="M17 11C17 9.3 18.3 8 20 8H44C45.7 8 47 9.3 47 11V25C47 33.3 40.3 40 32 40C23.7 40 17 33.3 17 25V11Z"
        fill="url(#tr-cup)"
      />
      <ellipse cx="24" cy="21" rx="3.5" ry="8" fill="#FFFFFF" opacity="0.5" />
      <rect x="28" y="39" width="8" height="10" rx="2" fill="url(#tr-base)" />
      <rect x="20" y="48" width="24" height="7" rx="3.5" fill="url(#tr-base)" />
      <path
        d="M32 16L33.9 20.1L38.4 20.6L35 23.6L35.9 28L32 25.8L28.1 28L29 23.6L25.6 20.6L30.1 20.1L32 16Z"
        fill="#FFFFFF"
        opacity="0.85"
      />
    </svg>
  )
}

/** Glossy 3D Gift Box Sticker (for Progress Bar & Challenges) */
export function GiftBoxSticker({ size = 40, ...p }: StickerProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" aria-hidden {...p}>
      <defs>
        <linearGradient id="gb-box" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FDE047" />
          <stop offset="100%" stopColor="#F59E0B" />
        </linearGradient>
        <linearGradient id="gb-rib" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#FF6B95" />
          <stop offset="100%" stopColor="#E11D48" />
        </linearGradient>
      </defs>
      <ellipse cx="32" cy="58" rx="18" ry="3.5" fill="#92400E" opacity="0.2" />
      <rect x="12" y="26" width="40" height="29" rx="6" fill="url(#gb-box)" />
      <rect x="9" y="18" width="46" height="10" rx="4" fill="url(#gb-box)" />
      <rect x="28" y="18" width="8" height="37" fill="url(#gb-rib)" />
      <rect x="12" y="37" width="40" height="7" fill="url(#gb-rib)" />
      <path
        d="M32 18C26 10 18 11 19 16C20 20 28 19 32 18ZM32 18C38 10 46 11 45 16C44 20 36 19 32 18Z"
        fill="url(#gb-rib)"
        stroke="#E11D48"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <rect x="15" y="21" width="10" height="3" rx="1.5" fill="#FFFFFF" opacity="0.55" />
    </svg>
  )
}

/** Glossy 3D Coin Stack Sticker (for Challenges & Journal) */
export function CoinStackSticker({ size = 44, ...p }: StickerProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" aria-hidden {...p}>
      <defs>
        <linearGradient id="cs-gold" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#FEF08A" />
          <stop offset="50%" stopColor="#FACC15" />
          <stop offset="100%" stopColor="#D97706" />
        </linearGradient>
      </defs>
      <ellipse cx="32" cy="56" rx="19" ry="4" fill="#92400E" opacity="0.2" />
      {[44, 35, 26, 17].map((y, idx) => (
        <g key={y} transform={`translate(${idx % 2 === 0 ? 0 : 2}, 0)`}>
          <path d={`M14 ${y}V${y + 6}C14 ${y + 9.5} 22 ${y + 12} 32 ${y + 12}C42 ${y + 12} 50 ${y + 9.5} 50 ${y + 6}V${y}H14Z`} fill="#D97706" />
          <ellipse cx="32" cy={y} rx="18" ry="6.5" fill="url(#cs-gold)" stroke="#FEF9C3" strokeWidth="1.2" />
          <ellipse cx="26" cy={y - 1.5} rx="6" ry="2" fill="#FFFFFF" opacity="0.45" />
        </g>
      ))}
    </svg>
  )
}

/** Glossy 3D Star Sticker (for Milestones in Journal) */
export function StarSticker({ size = 44, ...p }: StickerProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" aria-hidden {...p}>
      <defs>
        <linearGradient id="st-grad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#FFF59D" />
          <stop offset="50%" stopColor="#FACC15" />
          <stop offset="100%" stopColor="#EA580C" />
        </linearGradient>
      </defs>
      <path
        d="M32 7L38.9 21.3L54.7 23.5L43.2 34.6L46 50.3L32 42.8L18 50.3L20.8 34.6L9.3 23.5L25.1 21.3L32 7Z"
        fill="url(#st-grad)"
        stroke="#FEF08A"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <ellipse cx="27" cy="24" rx="4" ry="2.2" transform="rotate(-25 27 24)" fill="#FFFFFF" opacity="0.65" />
    </svg>
  )
}

/** Glossy 3D Party Popper Sticker (for Celebration Cards) */
export function PartySticker({ size = 42, ...p }: StickerProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" aria-hidden {...p}>
      <defs>
        <linearGradient id="pp-cone" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#FDE047" />
          <stop offset="50%" stopColor="#F59E0B" />
          <stop offset="100%" stopColor="#E11D48" />
        </linearGradient>
      </defs>
      <path d="M12 52L24 22L42 40L12 52Z" fill="url(#pp-cone)" stroke="#FFFFFF" strokeWidth="2" strokeLinejoin="round" />
      <circle cx="38" cy="16" r="3.5" fill="#FF3B6B" />
      <circle cx="50" cy="24" r="3" fill="#38BDF8" />
      <circle cx="46" cy="12" r="2.5" fill="#A855F7" />
      <path d="M32 24C36 18 42 18 46 20" stroke="#F59E0B" strokeWidth="3" strokeLinecap="round" />
      <path d="M38 30C44 28 48 31 52 35" stroke="#EC4899" strokeWidth="3" strokeLinecap="round" />
      <path d="M26 18C26 12 30 9 34 8" stroke="#3B82F6" strokeWidth="3" strokeLinecap="round" />
    </svg>
  )
}

/** Glossy 3D Target Bullseye Sticker (for Goal & Plan menu) */
export function TargetSticker({ size = 40, ...p }: StickerProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" aria-hidden {...p}>
      <circle cx="32" cy="32" r="24" fill="#FEE2E2" />
      <circle cx="32" cy="32" r="19" fill="#EF4444" />
      <circle cx="32" cy="32" r="13" fill="#FFFFFF" />
      <circle cx="32" cy="32" r="7.5" fill="#EF4444" />
      <circle cx="26" cy="24" r="3" fill="#FFFFFF" opacity="0.55" />
    </svg>
  )
}
