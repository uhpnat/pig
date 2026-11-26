import boy from '@/assets/img/boy.jpg'
import girl from '@/assets/img/girl.jpg'
import ob from '@/assets/img/ob.jpg'
import glob from '@/assets/img/glob.jpg'
import chal from '@/assets/img/chal.jpg'
import duo from '@/assets/img/duo.jpg'
import hero from '@/assets/img/hero.jpg'

export const IMG = { boy, girl, ob, glob, chal, duo, hero } as const
export type ImgKey = keyof typeof IMG

export const AVATAR_PRESETS = ['img:boy', 'img:girl', '🧑', '👩', '👨', '🧒', '🐻', '🐱', '🦊', '🐰']
