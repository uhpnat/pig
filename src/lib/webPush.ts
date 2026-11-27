import type { WebPushSubscription } from '@/domain/types'

/**
 * Fixed P-256 VAPID key pair for Piggy Duo Native Web Push (iOS 16.4+ Home Screen PWA & Android/Desktop).
 * Enables notifications that display the 🐷 Piggy Duo App Icon on the iPhone Lock Screen
 * and open directly into the standalone Piggy Duo Home Screen App when tapped (never opening Safari!).
 */
export const VAPID_PUBLIC_KEY =
  'BOakRShUMD1HEee_849SUxIk62nOyKwG5ox2mcKK1DDZQA-FlzwhkWqW63dHhInIZXYktULLIp-urIEYeSbFTjk'

const VAPID_PRIVATE_JWK: JsonWebKey = {
  kty: 'EC',
  crv: 'P-256',
  x: '5qRFKFQwPUcR57_zj1JTEiTrac7IrAbmjHaZworUMNk',
  y: 'QA-FlzwhkWqW63dHhInIZXYktULLIp-urIEYeSbFTjk',
  d: 'z49k8tjPUaIyZGpI92FBWMdAirIS9cRPqJTWS3TYcv0',
  ext: true,
}

const VAPID_SUBJECT = 'mailto:piggyduo@uhpnat.github.io'

function base64UrlToBytes(b64url: string): Uint8Array {
  const padding = '='.repeat((4 - (b64url.length % 4)) % 4)
  const b64 = (b64url + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(b64)
  const out = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i)
  return out
}

function bytesToBase64Url(bytes: Uint8Array): string {
  let bin = ''
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i])
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function bytesToBase64(bytes: Uint8Array): string {
  let bin = ''
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i])
  return btoa(bin)
}

function concatBytes(...arrays: Uint8Array[]): Uint8Array {
  const total = arrays.reduce((acc, a) => acc + a.length, 0)
  const out = new Uint8Array(total)
  let offset = 0
  for (const a of arrays) {
    out.set(a, offset)
    offset += a.length
  }
  return out
}

async function hmacSha256(keyBytes: Uint8Array, data: Uint8Array): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey(
    'raw',
    keyBytes as unknown as BufferSource,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const sig = await crypto.subtle.sign('HMAC', key, data as unknown as BufferSource)
  return new Uint8Array(sig)
}

async function hkdfExtractAndExpand(
  salt: Uint8Array,
  ikm: Uint8Array,
  info: Uint8Array,
  length: number,
): Promise<Uint8Array> {
  const prk = await hmacSha256(salt, ikm)
  const infoWithCounter = concatBytes(info, new Uint8Array([1]))
  const okm = await hmacSha256(prk, infoWithCounter)
  return okm.slice(0, length)
}

/**
 * Checks if the web app is currently running as an installed Home Screen App (Standalone mode)
 * rather than inside a mobile browser tab like Safari.
 */
export function isStandalonePwa(): boolean {
  if (typeof window === 'undefined') return false
  const nav = window.navigator as Navigator & { standalone?: boolean }
  return (
    nav.standalone === true ||
    window.matchMedia('(display-mode: standalone)').matches ||
    window.matchMedia('(display-mode: fullscreen)').matches
  )
}

/**
 * Ensures the Service Worker (`./sw.js`) is registered and active so notifications and background push work in both DEV and PROD.
 */
export async function ensureServiceWorkerReady(): Promise<ServiceWorkerRegistration | null> {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return null
  try {
    let reg = await navigator.serviceWorker.getRegistration()
    if (!reg) {
      reg = await navigator.serviceWorker.register('./sw.js', { updateViaCache: 'none' })
    }
    await navigator.serviceWorker.ready
    return reg
  } catch {
    return null
  }
}

/**
 * Schedules a local notification inside the Service Worker thread (`e.waitUntil`).
 * Unlike page `setTimeout` (which iOS freezes immediately when you swipe to the Home Screen or lock the phone),
 * `e.waitUntil` inside the Service Worker keeps the worker alive for the 4-second countdown so the notification
 * pops up on the iPhone Lock Screen with the 🐷 Piggy Duo logo!
 */
export async function scheduleServiceWorkerNotification(
  title: string,
  body: string,
  route = '/',
  delayMs = 4000,
): Promise<boolean> {
  if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return false
  try {
    const reg = await ensureServiceWorkerReady()
    const worker = reg?.active || reg?.waiting || reg?.installing || navigator.serviceWorker.controller
    if (worker) {
      worker.postMessage({
        type: 'SCHEDULE_NOTIFICATION',
        delayMs,
        title,
        body,
        route,
        tag: `piggy-test-${Date.now()}`,
      })
      return true
    }
  } catch {
    /* fallback below */
  }
  return false
}

/**
 * Subscribes the current device (e.g. iPhone Home Screen App) to Native Web Push via Apple APNs / FCM.
 * Returns the serializable `WebPushSubscription` to store in the member's profile so the partner's phone can push directly to it!
 */
export async function subscribeNativeWebPush(): Promise<WebPushSubscription | null> {
  if (typeof window === 'undefined' || typeof Notification === 'undefined') return null
  if (Notification.permission !== 'granted') return null
  try {
    const reg = await ensureServiceWorkerReady()
    if (!reg || !('pushManager' in reg)) return null

    let sub = await reg.pushManager.getSubscription()
    if (!sub) {
      const appServerKey = base64UrlToBytes(VAPID_PUBLIC_KEY)
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: appServerKey as unknown as BufferSource,
      })
    }
    const json = sub.toJSON()
    if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) return null
    return {
      endpoint: json.endpoint,
      keys: {
        p256dh: json.keys.p256dh,
        auth: json.keys.auth,
      },
      updatedAt: new Date().toISOString(),
    }
  } catch {
    return null
  }
}

export interface EncryptedWebPushRequest {
  endpoint: string
  headers: Record<string, string>
  bodyBase64: string
}

/**
 * Pure WebCrypto RFC 8291 (`aes128gcm`) + RFC 8292 (VAPID ES256) Web Push encryptor.
 * Produces an encrypted binary payload and VAPID Authorization header ready to be forwarded
 * to Apple Web Push (`https://web.push.apple.com/...`) or FCM (`https://fcm.googleapis.com/...`).
 */
export async function buildEncryptedWebPush(
  sub: WebPushSubscription,
  payload: { title: string; body: string; route?: string },
): Promise<EncryptedWebPushRequest | null> {
  if (typeof crypto === 'undefined' || !crypto.subtle) return null
  try {
    const enc = new TextEncoder()
    const url = new URL(sub.endpoint)
    const aud = `${url.protocol}//${url.host}`
    const exp = Math.floor(Date.now() / 1000) + 12 * 3600

    // 1. Sign VAPID JWT (ES256)
    const jwtHeader = bytesToBase64Url(enc.encode(JSON.stringify({ typ: 'JWT', alg: 'ES256' })))
    const jwtClaims = bytesToBase64Url(enc.encode(JSON.stringify({ aud, exp, sub: VAPID_SUBJECT })))
    const unsignedToken = `${jwtHeader}.${jwtClaims}`
    const vapidSignKey = await crypto.subtle.importKey(
      'jwk',
      VAPID_PRIVATE_JWK,
      { name: 'ECDSA', namedCurve: 'P-256' },
      false,
      ['sign'],
    )
    const jwtSig = await crypto.subtle.sign(
      { name: 'ECDSA', hash: 'SHA-256' },
      vapidSignKey,
      enc.encode(unsignedToken) as unknown as BufferSource,
    )
    const jwt = `${unsignedToken}.${bytesToBase64Url(new Uint8Array(jwtSig))}`

    // 2. RFC 8291 ECDH + HKDF-SHA-256 + AES-128-GCM encryption (`aes128gcm`)
    const uaPublicBytes = base64UrlToBytes(sub.keys.p256dh)
    const authSecret = base64UrlToBytes(sub.keys.auth)

    const uaPublicKey = await crypto.subtle.importKey(
      'raw',
      uaPublicBytes as unknown as BufferSource,
      { name: 'ECDH', namedCurve: 'P-256' },
      true,
      [],
    )
    const asKeyPair = await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits'])
    const asPublicRaw = new Uint8Array(await crypto.subtle.exportKey('raw', asKeyPair.publicKey))
    const sharedSecret = new Uint8Array(
      await crypto.subtle.deriveBits({ name: 'ECDH', public: uaPublicKey }, asKeyPair.privateKey, 256),
    )

    const keyInfo = concatBytes(enc.encode('WebPush: info\0'), uaPublicBytes, asPublicRaw)
    const ikm = await hkdfExtractAndExpand(authSecret, sharedSecret, keyInfo, 32)

    const salt = crypto.getRandomValues(new Uint8Array(16))
    const cek = await hkdfExtractAndExpand(salt, ikm, enc.encode('Content-Encoding: aes128gcm\0'), 16)
    const nonce = await hkdfExtractAndExpand(salt, ikm, enc.encode('Content-Encoding: nonce\0'), 12)

    const plaintext = enc.encode(JSON.stringify(payload))
    const paddedPlaintext = concatBytes(plaintext, new Uint8Array([2])) // RFC 8291 record delimiter 0x02

    const aesKey = await crypto.subtle.importKey(
      'raw',
      cek as unknown as BufferSource,
      { name: 'AES-GCM' },
      false,
      ['encrypt'],
    )
    const ciphertext = new Uint8Array(
      await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv: nonce as unknown as BufferSource },
        aesKey,
        paddedPlaintext as unknown as BufferSource,
      ),
    )

    // RFC 8291 aes128gcm header: salt (16) || rs (4, big-endian 4096) || idlen (1, 65) || keyid (65, asPublicRaw)
    const header = new Uint8Array(16 + 4 + 1 + asPublicRaw.length)
    header.set(salt, 0)
    new DataView(header.buffer).setUint32(16, 4096, false)
    header[20] = asPublicRaw.length
    header.set(asPublicRaw, 21)

    const bodyBytes = concatBytes(header, ciphertext)

    return {
      endpoint: sub.endpoint,
      headers: {
        Authorization: `vapid t=${jwt}, k=${VAPID_PUBLIC_KEY}`,
        'Content-Encoding': 'aes128gcm',
        'Content-Type': 'application/octet-stream',
        TTL: '86400',
        Urgency: 'high',
      },
      bodyBase64: bytesToBase64(bodyBytes),
    }
  } catch {
    return null
  }
}
