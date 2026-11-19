import Decimal from 'decimal.js';
import { type GNF, roundGNF, sumGNF } from '../money';

export interface TripAmounts {
  transportRevenue: GNF;
  offloadCost: GNF;
  fuelCost: GNF;
  driverIncentive: GNF;
  otherCost: GNF;
}

export interface TripComputed {
  totalDirectCost: GNF;
  operatingProfit: GNF;
}

/** PRD §6.4: C_d = fuel + unloading + incentive + other; P_op = revenue − C_d. */
export function computeTrip(a: TripAmounts): TripComputed {
  const totalDirectCost = sumGNF([a.fuelCost, a.offloadCost, a.driverIncentive, a.otherCost]);
  return { totalDirectCost, operatingProfit: a.transportRevenue - totalDirectCost };
}

/** Fuel cost from litres × price per litre (OPS form helper). */
export function fuelCostFrom(litres: Decimal.Value, pricePerLitre: GNF): GNF {
  return roundGNF(new Decimal(litres).times(pricePerLitre));
}

/** 50 kg bags in a tonnage (20 bags per tonne by default). */
export function bagsFor(tonnage: Decimal.Value, bagKg = 50): number {
  return new Decimal(tonnage).times(1000).dividedBy(bagKg).toDecimalPlaces(0, Decimal.ROUND_HALF_UP).toNumber();
}

/** Round a tonnage to 2 decimals (CNV-07). */
export function roundTonnage(t: Decimal.Value): number {
  return new Decimal(t).toDecimalPlaces(2, Decimal.ROUND_HALF_UP).toNumber();
}
