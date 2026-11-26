import boy from '@/assets/img/boy.jpg'
import girl from '@/assets/img/girl.jpg'
import ob from '@/assets/img/ob.jpg'
import glob from '@/assets/img/glob.jpg'
import chal from '@/assets/img/chal.jpg'
import duo from '@/assets/img/duo.jpg'
import hero from '@/assets/img/hero.jpg'
import big from '@/assets/img/big.jpg'
import t0 from '@/assets/img/t0.jpg'
import t1 from '@/assets/img/t1.jpg'
import t2 from '@/assets/img/t2.jpg'
import t3 from '@/assets/img/t3.jpg'

export const IMG = { boy, girl, ob, glob, chal, duo, hero, big, t0, t1, t2, t3 } as const
export type ImgKey = keyof typeof IMG

export const AVATAR_PRESETS = ['img:boy', 'img:girl', '🧑', '👩', '👨', '🧒', '🐻', '🐱', '🦊', '🐰']
