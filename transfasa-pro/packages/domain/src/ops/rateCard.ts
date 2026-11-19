import Decimal from 'decimal.js';
import { type GNF, roundGNF } from '../money';
import type { Region } from './reference';

export type RateBasis = 'PER_TRIP' | 'PER_TONNE';

export interface RateCard {
  id: string;
  region: Region;
  destinationId: string;
  /** null = any cement */
  cementCode: string | null;
  /** null = any vehicle */
  vehicleId: string | null;
  basis: RateBasis;
  /** GNF per trip, or GNF per tonne when basis = PER_TONNE */
  revenueRate: GNF;
  stdFuel: GNF;
  stdOffload: GNF;
  stdIncentive: GNF;
  stdOther: GNF;
  /** ISO dates, inclusive; validTo null = open-ended */
  validFrom: string;
  validTo: string | null;
  active: boolean;
}

export interface RateQuery {
  region: string;
  destinationId: string;
  cementCode: string | null;
  vehicleId: string | null;
  tripDate: string;
}

/**
 * Most specific active card valid on the trip date (§6.3). A card that names a cement or vehicle
 * only matches that cement/vehicle; among matches, cards naming both beat one, which beat none;
 * ties go to the latest validFrom.
 */
export function matchRateCard(cards: readonly RateCard[], q: RateQuery): RateCard | null {
  let best: { card: RateCard; score: number } | null = null;
  for (const c of cards) {
    if (!c.active || c.region !== q.region || c.destinationId !== q.destinationId) continue;
    if (c.validFrom > q.tripDate || (c.validTo !== null && c.validTo < q.tripDate)) continue;
    if (c.cementCode !== null && c.cementCode !== q.cementCode) continue;
    if (c.vehicleId !== null && c.vehicleId !== q.vehicleId) continue;
    const score = (c.cementCode ? 2 : 0) + (c.vehicleId ? 1 : 0);
    if (!best || score > best.score || (score === best.score && c.validFrom > best.card.validFrom)) {
      best = { card: c, score };
    }
  }
  return best?.card ?? null;
}

/** Revenue for a trip under a card: fixed per trip, or rate × tonnage rounded to GNF. */
export function rateCardRevenue(card: Pick<RateCard, 'basis' | 'revenueRate'>, tonnage: Decimal.Value): GNF {
  return card.basis === 'PER_TRIP' ? card.revenueRate : roundGNF(new Decimal(card.revenueRate).times(tonnage));
}
