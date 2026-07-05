export {
  NEW_MILESTONE_FEE_THRESHOLD_USD,
  NEW_MILESTONE_PLATFORM_FEE_USD,
  ORIGINAL_MILESTONE_PLATFORM_FEE_USD,
  calculateEscrowMilestonePlatformFee,
  sumFundedNewMilestoneAmount,
} from '@/lib/milestones/platformFees';

import { NEW_MILESTONE_FEE_THRESHOLD_USD, NEW_MILESTONE_PLATFORM_FEE_USD } from '@/lib/milestones/platformFees';

export function calculateNewMilestonePlatformFee(params: {
  isNewMilestone: boolean;
  newMilestonesTotalUsd: number;
  feeAlreadyCharged: boolean;
}) {
  if (!params.isNewMilestone) return 0;
  if (params.feeAlreadyCharged) return 0;
  if (params.newMilestonesTotalUsd >= NEW_MILESTONE_FEE_THRESHOLD_USD) {
    return NEW_MILESTONE_PLATFORM_FEE_USD;
  }
  return 0;
}
