import { z } from 'zod';
import { parseDisplayDate } from '../dates';
import { EXPENSE_TYPES, REGIONS, TRIP_STATUSES, VEHICLE_STATUSES, VEHICLE_TYPES, cleanLabel, normalisePlate } from './reference';

/**
 * Input validation shared by the web form (inline errors) and Cloud Functions (source of truth).
 * Messages are bilingual, French first (CNV-05).
 */
const M = {
  required: 'Champ requis (Required field)',
  date: 'Date invalide, format JJ/MM/AAAA (Invalid date, DD/MM/YYYY)',
  future: 'Date dans le futur (Date in the future)',
  gnf: 'Montant entier en GNF, ≥ 0 (Whole GNF amount, ≥ 0)',
  positive: 'Doit être supérieur à 0 (Must be greater than 0)',
  tonnage: 'Tonnage entre 0,01 et 100 t (Tonnage between 0.01 and 100 t)',
  otherReason: 'Motif requis pour les autres frais (Reason required for other costs)',
  plate: 'Immatriculation invalide (Invalid plate)',
  region: 'Région inconnue (Unknown region)',
  dateOrder: 'La date de fin précède la date de début (End date before start date)',
};

const trimmed = (max = 200) => z.string().transform(cleanLabel).pipe(z.string().max(max));
const requiredText = (max = 200) => trimmed(max).pipe(z.string().min(1, M.required));
const optionalText = (max = 200) =>
  z
    .union([z.string(), z.null(), z.undefined()])
    .transform((v) => (v == null ? null : cleanLabel(v) || null))
    .pipe(z.string().max(max).nullable());
const id = z.string().min(1, M.required).max(128);
const optionalId = z
  .union([z.string(), z.null(), z.undefined()])
  .transform((v) => (v ? v : null))
  .pipe(z.string().max(128).nullable());

export const gnfSchema = z.number({ invalid_type_error: M.gnf, required_error: M.gnf }).int(M.gnf).min(0, M.gnf).max(1e13, M.gnf);

/** Accepts ISO or DD/MM/YYYY, outputs ISO. */
export const isoDateSchema = z
  .string({ required_error: M.required })
  .transform((s, ctx) => {
    const iso = parseDisplayDate(s);
    if (!iso) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: M.date });
      return z.NEVER;
    }
    return iso;
  });

export const regionSchema = z.enum(REGIONS, { errorMap: () => ({ message: M.region }) });

/** today + 1 day tolerance (PRD §6.2) — injected for testability. */
export const notInFuture = (todayIso: string) => (iso: string) => {
  const limit = new Date(`${todayIso}T00:00:00Z`);
  limit.setUTCDate(limit.getUTCDate() + 1);
  return iso <= limit.toISOString().slice(0, 10);
};

export const tripInputSchema = (todayIso: string) =>
  z
    .object({
      tripDate: isoDateSchema.refine(notInFuture(todayIso), M.future),
      vehicleId: id,
      trailerId: optionalId,
      driverId: optionalId,
      region: regionSchema,
      destinationId: id,
      cementCode: id,
      tonnage: z.number({ invalid_type_error: M.tonnage }).gt(0, M.tonnage).max(100, M.tonnage)
        .refine((t) => Math.round(t * 100) === Number((t * 100).toFixed(6)), M.tonnage),
      bags: z.number().int().min(0).nullable().default(null),
      transportRevenue: gnfSchema,
      offloadCost: gnfSchema,
      fuelCost: gnfSchema,
      fuelLitres: z.number().min(0).max(2000).nullable().default(null),
      driverIncentive: gnfSchema.default(0),
      otherCost: gnfSchema,
      otherReason: optionalText(300),
      deliveryNoteNo: optionalText(60),
      weighbridgeTicketNo: optionalText(60),
      rateCardId: optionalId,
      status: z.enum(['PLANNED', 'DELIVERED']).default('DELIVERED'),
    })
    .superRefine((t, ctx) => {
      if (t.otherCost > 0 && !t.otherReason)
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['otherReason'], message: M.otherReason });
    });
export type TripInput = z.infer<ReturnType<typeof tripInputSchema>>;

export const tripStatusSchema = z.enum(TRIP_STATUSES);

export const expenseInputSchema = (todayIso: string) =>
  z.object({
    expenseDate: isoDateSchema.refine(notInFuture(todayIso), M.future),
    type: z.enum(EXPENSE_TYPES),
    amount: gnfSchema.refine((n) => n > 0, M.positive),
    description: requiredText(300),
    vehicleId: optionalId,
  });
export type ExpenseInput = z.infer<ReturnType<typeof expenseInputSchema>>;

export const vehicleInputSchema = z.object({
  type: z.enum(VEHICLE_TYPES),
  plate: z
    .string()
    .transform(normalisePlate)
    .pipe(z.string().min(4, M.plate).max(12, M.plate)),
  make: optionalText(60),
  model: optionalText(60),
  vin: optionalText(17),
  year: z.number().int().min(1980).max(2100).nullable().default(null),
  status: z.enum(VEHICLE_STATUSES).default('ACTIVE'),
  inServiceDate: isoDateSchema.nullable().default(null),
  ratedPayloadT: z.number().gt(0).max(100).nullable().default(null),
  notes: optionalText(500),
});
export type VehicleInput = z.infer<typeof vehicleInputSchema>;

export const driverInputSchema = z.object({
  fullName: requiredText(120),
  phone: optionalText(30),
  licenceNo: optionalText(40),
  licenceExpiry: isoDateSchema.nullable().default(null),
  userId: optionalId,
  active: z.boolean().default(true),
});
export type DriverInput = z.infer<typeof driverInputSchema>;

export const assignmentInputSchema = z.object({
  vehicleId: id,
  driverId: optionalId,
  trailerId: optionalId,
  fromDate: isoDateSchema,
});
export type AssignmentInput = z.infer<typeof assignmentInputSchema>;

export const destinationInputSchema = z.object({
  region: regionSchema,
  name: requiredText(80),
  distanceKm: z.number().gt(0).max(2000).nullable().default(null),
  active: z.boolean().default(true),
});
export type DestinationInput = z.infer<typeof destinationInputSchema>;

export const cementTypeInputSchema = z.object({
  label: requiredText(60),
  bagKg: z.number().int().min(1).max(100).default(50),
  active: z.boolean().default(true),
});
export type CementTypeInput = z.infer<typeof cementTypeInputSchema>;

export const rateCardInputSchema = z
  .object({
    region: regionSchema,
    destinationId: id,
    cementCode: optionalId,
    vehicleId: optionalId,
    basis: z.enum(['PER_TRIP', 'PER_TONNE']),
    revenueRate: gnfSchema.refine((n) => n > 0, M.positive),
    stdFuel: gnfSchema,
    stdOffload: gnfSchema,
    stdIncentive: gnfSchema,
    stdOther: gnfSchema,
    validFrom: isoDateSchema,
    validTo: isoDateSchema.nullable().default(null),
    active: z.boolean().default(true),
  })
  .refine((r) => r.validTo === null || r.validTo >= r.validFrom, { path: ['validTo'], message: M.dateOrder });
export type RateCardInput = z.infer<typeof rateCardInputSchema>;

/** Flatten a ZodError into { field: firstMessage } for inline form errors. */
export function fieldErrors(err: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of err.issues) {
    const key = issue.path.join('.') || '_form';
    out[key] ??= issue.message;
  }
  return out;
}
