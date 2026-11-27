import { useCallback } from 'react'
import { vnd } from '@/domain/format'
import type { Contribution } from '@/domain/types'
import { beep, haptic } from '@/lib/fx'
import { useJourney, useStore } from './useStore'

interface ConfirmOptions {
  onFullyConfirmed?: () => void
  withSoundAndHaptic?: boolean
}

/**
 * Shared 2-person cross-confirmation mutation hook used across HomePage, RevealPage, and JournalPage.
 * Handles milestone detection, celebration confetti, sound/haptics, and consistent Vietnamese feedback toasts.
 */
export function useConfirmContribution(options?: ConfirmOptions) {
  const j = useJourney()
  const { state, repo, run, toast, celebrate, myMemberId, partnerMember } = useStore()

  const confirm = useCallback(
    async (c: Contribution) => {
      const beforeMilestones = state.milestonesReached.length
      const out = await run(repo.confirmContribution(c.id, myMemberId))
      if (!out) return null

      if (options?.withSoundAndHaptic) {
        haptic(state.settings, 35)
      }

      const updated = out.contributions.find((x) => x.id === c.id)
      const ownerName = j.members[c.member].name
      const otherName = partnerMember?.name ?? j.members[c.member === 'a' ? 'b' : 'a'].name

      if (updated?.status === 'confirmed') {
        options?.onFullyConfirmed?.()
        celebrate(['🪙', '✨', '🎉', '💗'])
        if (options?.withSoundAndHaptic) beep(state.settings, 'win')
        toast(`Đã duyệt hoàn tất (2/2)! Khoản ${vnd(c.amount)} của ${ownerName} đã vào heo đất! 🐷🎉`)
      } else if (c.member === myMemberId) {
        toast(`Đã báo nạp ${vnd(c.amount)} (1/2)! Chờ ${otherName} xác nhận chéo nhé ⏳`)
      } else {
        toast(`Đã xác nhận cho ${otherName} (1/2)! ⏳`)
      }

      if (out.milestonesReached.length > beforeMilestones) {
        celebrate(['🎉', '🎆', '✨', '🪙'])
      }

      return out
    },
    [state.milestonesReached.length, state.settings, run, repo, myMemberId, j.members, partnerMember?.name, options, celebrate, toast],
  )

  return confirm
}
