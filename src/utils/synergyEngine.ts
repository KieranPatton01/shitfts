import { DayKey, DayShiftData, DayAlignment, SynergyResult, SynergyTier } from '../types';
import { DAY_KEYS } from './isoWeek';

function getWakingOverlapHours(shiftA?: DayShiftData, shiftB?: DayShiftData): { hours: number; tier: SynergyTier } {
  if (!shiftA || !shiftB) {
    return { hours: 0, tier: 'pending' };
  }

  const { status: a } = shiftA;
  const { status: b } = shiftB;

  // Both Free: Full waking day overlap
  if (a === 'free' && b === 'free') {
    return { hours: 14, tier: 'golden' };
  }

  // Blackout if either is busy with personal/solitary commitments
  if (a === 'busy' || b === 'busy') {
    return { hours: 0, tier: 'blackout' };
  }

  // One is Free, other is Work or College
  if ((a === 'free' && (b === 'work' || b === 'college')) || (b === 'free' && (a === 'work' || a === 'college'))) {
    // Free evening together after shift
    return { hours: 6, tier: 'evening' };
  }

  // Both Work or College
  if ((a === 'work' || a === 'college') && (b === 'work' || b === 'college')) {
    // Check if custom hours or presets indicate offset
    const textA = (shiftA.customHours || '').toLowerCase();
    const textB = (shiftB.customHours || '').toLowerCase();

    const isLateA = textA.includes('late') || textA.includes('night') || textA.includes('8:') || textA.includes('9:');
    const isLateB = textB.includes('late') || textB.includes('night') || textB.includes('8:') || textB.includes('9:');

    if (isLateA !== isLateB) {
      return { hours: 1, tier: 'offset' };
    }

    // Both daytime shifts -> evening dinner & relaxation overlap
    return { hours: 5, tier: 'evening' };
  }

  return { hours: 2, tier: 'offset' };
}

export function computeSynergy(
  scheduleA?: Record<DayKey, DayShiftData>,
  scheduleB?: Record<DayKey, DayShiftData>,
  nameA: string = 'Partner 1',
  nameB: string = 'Partner 2'
): SynergyResult {
  const dayAlignments: Record<DayKey, DayAlignment> = {} as any;
  const goldenDays: DayKey[] = [];
  let totalOverlapHours = 0;
  let oppositeDaysCount = 0;

  for (const dayKey of DAY_KEYS) {
    const shiftA = scheduleA ? scheduleA[dayKey] : undefined;
    const shiftB = scheduleB ? scheduleB[dayKey] : undefined;

    const { hours, tier } = getWakingOverlapHours(shiftA, shiftB);
    totalOverlapHours += hours;

    if (tier === 'golden') {
      goldenDays.push(dayKey);
    } else if (tier === 'offset') {
      oppositeDaysCount++;
    }

    const date = shiftA?.date || shiftB?.date || '';

    // Wholesome labels
    let title = 'Pending Update';
    let description = 'Awaiting partner inputs to calculate compatibility.';
    let badgeLabel = 'Pending';

    // Witty labels (Stitch "Toxic Codependency / Misery Index" style)
    let wittyTitle = 'Schrödinger’s Schedule';
    let wittyDescription = 'Neither of you have committed. The excuses remain quantum.';
    let wittyBadge = 'Ghosting';

    if (tier === 'golden') {
      title = 'Midweek Oasis · Both Free!';
      description = `Both ${nameA} and ${nameB} are 100% off. Perfect for an adventure or cozy day in.`;
      badgeLabel = 'Full Day Free';

      wittyTitle = 'Trapped Together';
      wittyDescription = 'Zero excuses to cancel. Good luck pretending to enjoy looking at your phones in silence.';
      wittyBadge = 'No Escape';
    } else if (tier === 'evening') {
      title = 'Evening Alignment';
      description = `Both finished by evening (from ~5:30 PM). Great window for dinner together.`;
      badgeLabel = 'Evening Free';

      wittyTitle = 'Dinner Negotiation';
      wittyDescription = 'Mutual exhaustion meets "I don\'t mind, what do you want to eat?" for 90 minutes.';
      wittyBadge = 'Evening Overlap';
    } else if (tier === 'offset') {
      title = 'Offset Schedules';
      description = 'Misaligned shifts today. Ships passing in the night, leave a cute note!';
      badgeLabel = 'Offset';

      wittyTitle = 'Ships Passing in the Night';
      wittyDescription = 'Opposite schedules. Pure marital bliss without having to share the remote.';
      wittyBadge = 'Pure Bliss';
    } else if (tier === 'blackout') {
      title = 'Busy / Solo Day';
      description = 'One or both have personal commitments or study deadlines.';
      badgeLabel = 'Committed';

      wittyTitle = 'Solitary Confinement';
      wittyDescription = 'Gym, chores, or pre-emptive excuses to avoid social interaction.';
      wittyBadge = 'Blackout';
    }

    dayAlignments[dayKey] = {
      dayKey,
      date,
      tier,
      title,
      description,
      badgeLabel,
      mutualHours: hours,
      wittyTitle,
      wittyDescription,
      wittyBadge
    };
  }

  // Summary generation
  const goldenCount = goldenDays.length;
  let summaryText = '';
  if (goldenCount >= 3) {
    summaryText = `Incredible week! You & ${nameB} share ${totalOverlapHours} hours of free time across ${goldenCount} Golden Windows!`;
  } else if (goldenCount >= 1) {
    summaryText = `You & ${nameB} have ${goldenCount} Golden Window and ${totalOverlapHours} hours of mutual free time this week.`;
  } else if (totalOverlapHours > 15) {
    summaryText = `Evenings are your sanctuary this week with ${totalOverlapHours} hours of shared twilight freedom.`;
  } else {
    summaryText = `A busy week for both of you (${totalOverlapHours} shared hours). Protect those mini moments!`;
  }

  // Witty summary generation
  const wittyHeadline = goldenCount >= 2 
    ? `${totalOverlapHours} Hours Trapped Together` 
    : `Misery Index: ${oppositeDaysCount} Days Apart`;

  const wittySummary = goldenCount >= 2
    ? `You somehow managed to share ${goldenCount} whole days. Start preparing your passive-aggressive sigh repertoire now.`
    : `Only ${totalOverlapHours} hours of overlap. Cherish the silence or fire a reminder to sync up!`;

  return {
    goldenDays,
    goldenCount,
    mutualHours: totalOverlapHours,
    oppositeDaysCount,
    alignmentScore: Math.min(100, Math.round((totalOverlapHours / 70) * 100)),
    dayAlignments,
    summaryText,
    wittyHeadline,
    wittySummary,
    wittyOverlapLabel: 'suffocation',
    wittyOppositeLabel: 'pure bliss',
    wittyExcusesLeft: goldenCount > 0 ? '0 left' : 'Unlimited'
  };
}
