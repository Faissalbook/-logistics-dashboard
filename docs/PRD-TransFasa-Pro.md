# TransFasa Pro — Product Requirements Document

| | |
|---|---|
| **Produit / Product** | TransFasa Pro — Import & Fleet Operations Platform |
| **Entreprise / Company** | TransFasa Guinée, Conakry |
| **Version** | 1.0 (draft for build) |
| **Date** | 19/11/2026 |
| **Owner** | Faissal — Gérant / Manager |
| **Build mode** | Autonomous development with Claude Code (see §11) |
| **Currency** | Guinean Franc (GNF) for every stored and displayed financial value |

---

## 0. How to read this document

This PRD is written so that an autonomous coding agent can build the system phase by phase without guessing.

- **MUST / MUST NOT** are hard requirements. **SHOULD** is strongly preferred. **MAY** is optional.
- Every requirement has an ID (`IMP-xx`, `OPS-xx`, `SEC-xx`, …). Commits, tests and issues reference these IDs.
- Values marked **`[À CONFIRMER / TBC]`** are business facts the owner must supply or validate. The agent MUST NOT invent them; it seeds them as editable configuration with the placeholder flagged in the UI.
- Values marked **(illustratif / illustrative)** are worked examples used to define formulas and tests. They are not tariffs.

---

## 1. Context & Problem

TransFasa Guinée hauls bagged cement around the Conakry–Coyah–Dubréka corridor and grows its fleet by importing Chinese tractor heads and flatbed trailers. Today these two activities live in separate places:

- **Operations** run on the existing TransFasa app (`transfasa.web.app`): 369 trips logged in 2026, 13,850 t moved, 1,300,540,000 GNF revenue, 728,136,000 GNF net profit (snapshot 19/11/2026).
- **Procurement** (supplier quotes, inspections, shipping, customs, registration) runs on WhatsApp, spreadsheets and paper. Nobody can answer "what did this truck really cost us, landed in Conakry?" or "when does it pay itself back?"

**TransFasa Pro** unifies both into one system of record: a vehicle is created when it is sourced in China, accumulates its true landed cost through shipping, customs and registration, and then — on registration — becomes an active fleet asset whose every trip is measured against that cost.

### 1.1 Goals

| ID | Goal | Measure of success |
|---|---|---|
| G1 | Know the true landed cost of every imported unit before committing to buy | Landed-cost estimate produced in < 2 min from a supplier quote; final actual within ±3 % of estimate on 80 % of units |
| G2 | Never import a defective used unit | 100 % of used units have a completed, signed inspection before payment release |
| G3 | Shorten port-to-road time | Median days from vessel arrival to first revenue trip tracked and visible; target < 30 days |
| G4 | Real-time trip profitability | Net profit shown live while a trip is being entered; dashboards refresh < 5 s after save |
| G5 | Single fleet record | Zero re-keying of vehicle data between procurement and operations |
| G6 | Accountability | Every create/update/delete on financial or vehicle data is attributable to a user and timestamp |

### 1.2 Non-goals (v1)

- Full general-ledger accounting / payroll (export to the accountant instead).
- GPS telematics hardware integration (data model leaves room — §7.4).
- Customer-facing portal for cement buyers.
- Multi-currency reporting. Foreign currencies exist **only** as inputs to the landed-cost engine and are converted to GNF at a captured rate.

---

## 2. Users & Roles

| Role code | FR / EN | Who | Primary jobs |
|---|---|---|---|
| `OWNER` | Gérant / Owner | Faissal | Everything; approves purchases, tariffs, user accounts |
| `PROCUREMENT` | Achats / Procurement Officer | Buyer / agent in China | Supplier quotes, specs, inspection scheduling, purchase orders |
| `INSPECTOR` | Inspecteur / Inspector | Third-party or own mechanic in China | Fills used-unit inspection checklists with photos |
| `CUSTOMS` | Transitaire / Customs & Registration Agent | Clearing agent in Conakry | Shipping docs, customs declaration, registration steps |
| `FLEET_MANAGER` | Chef de parc / Fleet & Dispatch Manager | Ops lead | Trips, assignments, expenses, fleet status |
| `DRIVER` | Chauffeur / Driver | Each driver | Sees own assignments; submits trip proof (weighbridge ticket, delivery note) and fuel receipts |
| `ACCOUNTANT` | Comptable / Accountant | Internal or external | Read all financials, validate expenses, export |
| `VIEWER` | Observateur / Auditor-Viewer | Partner, investor, auditor | Read-only dashboards |

Users MAY hold several roles. Role assignment is an `OWNER`-only action and is audit-logged.

---

## 3. Conventions (apply everywhere)

| ID | Rule |
|---|---|
| CNV-01 | **Money**: stored as integer GNF (`bigint`), no decimals. Displayed as `2,500,000 GNF` (comma thousands, space, `GNF` suffix). Formatter: `` `${Math.round(n).toLocaleString('en-US')} GNF` ``. Never `fr-FR` (thin spaces), never `FG`. |
| CNV-02 | **Foreign amounts** (USD, CNY) are stored as integer minor units (cents/fen) plus ISO currency code, and only inside Module 1 cost lines. Each conversion stores the FX rate, rate source and rate date used. |
| CNV-03 | **Rounding**: compute in decimal (never JS float) and round half-up to whole GNF once per line item. Totals are sums of rounded lines. |
| CNV-04 | **Dates**: displayed `DD/MM/YYYY`; stored ISO `YYYY-MM-DD` (dates) or UTC ISO-8601 (timestamps); displayed in `Africa/Conakry` (UTC+0). Filenames use `YYYY-MM-DD`. |
| CNV-05 | **Language**: every user-facing label bilingual, French first: `Voyages / Trips`. Errors: `Champ requis (Required field)`. Code identifiers, DB columns and comments in English. |
| CNV-06 | **Place names**: `Conakry`, `Coyah`, `Dubréka` (with é). Files read/written as UTF-8; CSV exports with BOM. |
| CNV-07 | **Weights** in tonnes (t) with up to 2 decimals; dimensions in metres (m) with 2 decimals; volume in m³. |
| CNV-08 | **No placeholder data** in production paths. Empty states read e.g. `Aucun voyage / No trips yet`. |

---

## 4. System Overview

```
 MODULE 1 — IMPORT & SOURCING                          MODULE 2 — LOCAL OPERATIONS
 ┌──────────┐  ┌───────────┐  ┌──────────┐  ┌────────┐   ┌──────────────┐  ┌──────────┐
 │ Sourcing │→ │Inspection │→ │ Purchase │→ │Shipping│   │ Active Fleet │→ │  Trips   │
 │ (quotes, │  │ (used     │  │ & payment│  │ & port │   │  (vehicles,  │  │ Expenses │
 │  specs)  │  │  units)   │  │          │  │        │   │   drivers)   │  │ Profit   │
 └──────────┘  └───────────┘  └──────────┘  └───┬────┘   └──────▲───────┘  └────┬─────┘
                                                │               │               │
                                         ┌──────▼──────┐  ┌─────┴──────┐        │
                                         │ Customs &   │→ │ Registration│       │
                                         │ Landed Cost │  │  workflow   │       │
                                         └─────────────┘  └────────────┘        │
                                                │      (handoff event §7.2)     │
                                                └──── capitalised cost ─────────┴→ ROI / payback
 CROSS-CUTTING: RBAC · audit log · documents & photos · notifications · exports · config/tariffs
```

A single `vehicle` record travels through one lifecycle (§5.1). Module 1 and Module 2 are two views over the same vehicle entity, not two databases.

---

## 5. Module 1 — Import & Sourcing

### 5.1 Vehicle lifecycle (state machine)

```
DRAFT → QUOTED → [INSPECTION_PENDING → INSPECTED_PASS | INSPECTED_FAIL] → APPROVED → PURCHASED
      → IN_PRODUCTION (new only) → AT_ORIGIN_PORT → IN_TRANSIT → AT_CONAKRY_PORT
      → CUSTOMS_CLEARING → CLEARED → REGISTRATION_IN_PROGRESS → REGISTERED
      → ACTIVE (fleet) ⇄ IN_MAINTENANCE ⇄ OUT_OF_SERVICE → DISPOSED
Any pre-PURCHASED state → CANCELLED
```

| ID | Requirement |
|---|---|
| IMP-01 | The vehicle status MUST only change through defined transitions; each transition checks role permission and preconditions, and writes a `vehicle_status_history` row + audit entry. |
| IMP-02 | `INSPECTION_PENDING` is mandatory for `condition = USED`; a used unit MUST NOT reach `APPROVED` without an `INSPECTED_PASS` (or `INSPECTED_FAIL` + `OWNER` override with written justification, audit-logged). |
| IMP-03 | `APPROVED` requires `OWNER` action and a landed-cost **estimate** (§5.5) attached. |
| IMP-04 | Tractor heads and trailers are both `vehicle` records (`vehicle_type = TRACTOR | TRAILER`); a tractor and a trailer MAY be purchased, shipped and costed together under one `import_lot`. |

### 5.2 Tractor head technical specifications

The system holds a **model catalogue** (editable by `OWNER`/`PROCUREMENT`) and a **unit spec sheet** per vehicle. Quotes are compared against the catalogue's target spec, and deviations are highlighted.

#### 5.2.1 Catalogue — seeded models

| Field | Shacman X3000 6×4 | Shacman F3000 6×4 | Sinotruk HOWO TX / A7 6×4 | Sinotruk HOWO 371 (legacy) 6×4 |
|---|---|---|---|---|
| Typical engine | Weichai WP12/WP13 | Weichai WP10/WP12 | Sinotruk MC11/MC13 | Sinotruk WD615.47 |
| Power range (hp) | 430–550 | 336–430 | 400–480 | 371 |
| Gearbox | Fast 12JSD/16JSD | Fast 12JSD | HW19710/HW25712 | HW19710 |
| Drive / axles | 6×4, 13 t hub-reduction rear | 6×4, 13 t | 6×4, HC16 | 6×4, HC16 |
| Emission level (Africa spec) | Euro II/III | Euro II | Euro II/III | Euro II |
| Fifth wheel | 90 mm (3.5″) | 90 mm | 90 mm | 90 mm |

> Values are typical market configurations used to pre-fill forms; the actual quote and unit plate data always win. `[À CONFIRMER / TBC]` preferred configuration per model.

#### 5.2.2 Spec sheet fields (per unit)

| Group | Fields (type) | Rules |
|---|---|---|
| Identity | make (enum: `SHACMAN`, `SINOTRUK_HOWO`, other), model, variant, **VIN** (17 chars), engine serial, chassis number, year of manufacture, first-registration year in China (used), colour | VIN validated (17 chars, no I/O/Q, check-digit warning only — Chinese VINs don't always follow the US check digit) and **unique across the system** |
| Condition | `NEW` / `USED`; odometer km; engine hours | Used: odometer + hours required |
| Powertrain | engine model, rated power (hp), torque (N·m), emission standard, fuel tank (L), gearbox model, # gears, retarder (bool) | |
| Chassis | drive config (`4x2`,`6x4`,`6x6`), wheelbase (mm), front axle rating (t), rear axle rating (t), axle ratio, suspension type, frame section (mm), tyre size, # tyres | Rear axle rating ≥ 13 t for 6×4 cement haulage (warning otherwise) |
| Coupling | fifth-wheel size (50 mm/90 mm), fifth-wheel height (mm) | Must match the trailer kingpin (§5.4, IMP-24) |
| Cab | cab type, A/C (bool), sleepers | |
| Weights & dims | tare (t), GVW rating (t), GCW rating (t), length/width/height (m) | L/W/H required — they drive shipping cost (§5.5.2) |
| Commercial | supplier, quote reference, FOB price + currency, incoterm, warranty months, spare-parts kit included (bool + list) | |
| Documents | supplier quote, commercial invoice, packing list, Chinese export/deregistration certificate (used), photos | |

### 5.3 Mandatory inspection checklist — used units

| ID | Requirement |
|---|---|
| IMP-10 | Every used tractor or trailer MUST have an inspection created from the versioned **checklist template** in force; templates are editable by `OWNER` and versioned (old inspections keep their template version). |
| IMP-11 | Each item has: result (`PASS` / `MINOR` / `MAJOR` / `CRITICAL` / `N/A`), measured value where applicable, comment, ≥ 1 photo for any non-PASS result, and estimated repair cost (CNY or GNF). |
| IMP-12 | **Auto-verdict**: any `CRITICAL` → `FAIL`; ≥ 3 `MAJOR` → `FAIL`; otherwise `PASS` (thresholds configurable). Section scores and an overall 0–100 score are computed. |
| IMP-13 | The sum of estimated repair costs is pushed into the landed-cost estimate as a `REFURBISHMENT` line. |
| IMP-14 | Inspection is signed by the `INSPECTOR` (name, timestamp, geolocation if available) and becomes read-only; corrections create a new revision. |
| IMP-15 | Inspection works on a phone with a poor connection: photos queue locally and upload when online (§10.3). |

#### 5.3.1 Seed template — tractor head (v1)

**A. Moteur / Engine**
1. Cold start behaviour (starts < 5 s, no excessive smoke) — video required
2. Exhaust smoke colour at idle and under load (black/blue/white)
3. Oil leaks: head gasket, sump, turbo, front/rear crank seals
4. Blow-by at oil filler cap under load
5. Turbocharger: shaft play, oil in intake, whistle
6. Coolant: level, contamination (oil in coolant / coolant in oil), radiator condition
7. Oil sample: colour, metal particles, fuel dilution smell
8. Injection system: misfire, injector knock, fuel leaks
9. Belts, tensioners, water pump
10. ECU fault codes read with diagnostic tool (codes listed)
11. Engine hours vs odometer coherence
12. Compression / cylinder balance test (if tool available) — measured values

**B. Transmission & transmission line**
13. Clutch engagement point and slip test
14. Gear selection across all ranges, no jumping out of gear
15. Gearbox noise/leaks
16. Propeller shafts and U-joints play
17. Rear axles: differential noise, hub-reduction leaks, inter-axle lock function

**C. Châssis / Chassis**
18. Frame rails: cracks, welds, repairs, straightness (measured diagonal check)
19. Cross-members and rivets
20. Fifth wheel: wear, jaw lock, mounting bolts, plate cracks
21. Suspension: leaf springs (broken leaves), U-bolts, bushes, torque rods
22. Steering: free play, box leaks, tie-rod ends, kingpins
23. Corrosion level (none / surface / structural)
24. VIN and chassis number stamping legible and matching documents — **CRITICAL if mismatch**

**D. Hydraulique & pneumatique / Hydraulics & Air**
25. Power steering pump & hoses: leaks, noise, fluid condition
26. Hydraulic tipping/wet-kit PTO & pump (if fitted): pressure, leaks
27. Cab-tilt hydraulic pump and ram
28. Air compressor build-up time (0→8 bar, seconds — measured)
29. Air leaks (pressure drop over 5 min, engine off — measured)
30. Air dryer, tanks drained, water in system
31. Brakes: chambers, slack adjusters, lining/drum thickness (measured), park brake hold
32. Trailer air/electrical couplings (red/yellow lines, 7-pin)

**E. Électricité, cabine, pneus / Electrical, cab, tyres**
33. Batteries and alternator charging voltage (measured)
34. Lights, horn, wipers, dashboard warnings
35. Cab structure, seats, doors, glass, A/C
36. Tyres: tread depth each position (mm, measured), brand, DOT age, matching on axle
37. Wheel rims and studs
38. Spare wheel, tools, jack

**F. Documents**
39. Chinese registration / deregistration certificate matches VIN
40. No lien / mortgage note from seller (declaration uploaded)

#### 5.3.2 Seed template — used flatbed trailer (v1)

Main beams (cracks, camber, weld repairs), cross-members, deck plate thickness, kingpin wear (gauge), landing gear both legs, axles alignment, suspension (mechanical/bogie), brake chambers & drums, ABS (if fitted), tyres (all positions), twist-locks, side stake pockets & lashing points, lights & reflectors, air lines, VIN plate.

### 5.4 Flatbed trailers — structural requirements (40 t payload)

| ID | Requirement |
|---|---|
| IMP-20 | The trailer catalogue holds a **target specification**; each trailer quote is scored against it with each deviation flagged. Defaults below are editable `[À CONFIRMER / TBC]`. |
| IMP-21 | Rated payload ≥ 40 t with a **design safety factor ≥ 1.5** on the main beams (structural rating ≥ 60 t). Supplier MUST provide the beam calculation or a test certificate (document type `STRUCTURAL_CERT`); absence blocks `APPROVED`. |
| IMP-22 | **Legal axle-load check**: the system computes gross combination weight `GCW = tractor tare + trailer tare + payload` and per-axle-group load, compares them with the configured legal limits, and shows a warning on the quote, on approval, and on every trip whose payload exceeds the legal payload. Limits are configuration (`[À CONFIRMER / TBC]` — current ECOWAS/Guinean values). Example: 9.2 t tractor + 7.5 t trailer + 40 t = 56.7 t, which may exceed the regional GCW limit. |
| IMP-23 | Tare weight is captured and used both in IMP-22 and in shipping volume/weight (§5.5.2). |
| IMP-24 | Kingpin size MUST match the tractor fifth wheel (90 mm ↔ 3.5″ kingpin; 50 mm ↔ 2″); mismatch blocks pairing in the same lot. |

**Default target spec — 3-axle flatbed, 40 t**

| Item | Target |
|---|---|
| Length × width | 12.5–13.0 m × 2.5 m (40 ft container-compatible) |
| Main beams | I-section, Q345B (or better) high-tensile steel, beam height ≥ 500 mm, top flange ≥ 14 mm, bottom flange ≥ 16 mm, web ≥ 8 mm, submerged-arc welded |
| Cross-members | Channel or I-section at ≤ 600 mm spacing |
| Deck | 3–4 mm chequer plate, full length |
| Axles | 3 × 13 t (BPW / FUWA or equivalent), mechanical or bogie suspension |
| Tyres | 12 + 1 spare, 12R22.5 or 12.00R20 (match the tractor where possible) |
| Kingpin | 3.5″ (90 mm), bolt-in |
| Landing gear | 2-speed, ≥ 28 t static |
| Brakes | Dual-line air, WABCO valves or equivalent; ABS optional |
| Securing | 12 twist-locks, side stake pockets, ≥ 16 lashing rings per side |
| Lights | 24 V LED, side markers, rear underrun bar |
| Paint | Shot-blasted, primer + 2 coats |
| Tare | ≤ 8.0 t |

### 5.5 Landed Cost Engine

Computes, per vehicle (and per lot with allocation), the full cost to have the unit **registered and road-ready in Conakry**, in GNF.

#### 5.5.1 Cost structure

```
FOB price (supplier)                     [CNY or USD]
+ Inland China transport to port         [CNY/USD]
+ Export handling / port charges China   [CNY/USD]
+ Maritime freight (volumetric, §5.5.2)  [USD]
+ Marine insurance                       [USD]
= CIF Conakry (customs value)            → converted to GNF at captured FX rate
+ Customs duties & taxes (§5.5.3)        [GNF]
+ Port & terminal charges Conakry        [GNF]
+ Clearing agent (transitaire) fees      [GNF]
+ Inspection / refurbishment (§5.3)      [GNF or CNY]
+ Inland transfer port → yard            [GNF]
+ Registration & plates (§5.6)           [GNF]
+ First-year insurance, permits          [GNF]
+ Contingency (configurable %, estimates only)
= LANDED COST (GNF)
```

| ID | Requirement |
|---|---|
| IMP-30 | Each cost line has: category, description, amount, currency, FX rate (if not GNF), GNF amount, `ESTIMATE` / `ACTUAL` flag, supporting document, `is_capitalised` (bool), `is_recoverable_vat` (bool). |
| IMP-31 | Two figures are always visible side by side: **Estimate** (at approval) and **Actual** (from invoices/receipts), with variance in GNF and %. Variance > 5 % (configurable) highlighted. |
| IMP-32 | **FX**: rates are entered (or imported) per date and pair (`USD/GNF`, `CNY/GNF`) with source (`BCRG`, `bank`, `manual`). Customs value uses the rate in force on the declaration date; payments use the rate actually applied by the bank. Both stored. |
| IMP-33 | **Lot allocation**: shared costs of an `import_lot` (one bill of lading, one agent invoice) are allocated to vehicles by a selectable key — freight tons (default), CIF value, or equal split — with the remainder (rounding) on the highest-value unit so lines sum exactly. |
| IMP-34 | **Capitalised cost** = sum of lines with `is_capitalised = true` minus recoverable VAT (if company setting `vat_registered = true`). This figure is handed over to the fleet record (§7.2) and drives depreciation & payback. |
| IMP-35 | Quotes can be compared: for 2–5 candidate units the engine shows landed cost, cost per tonne of payload capacity, and estimated payback (§6.4) in one table. |
| IMP-36 | All formulas live in one pure, tested module (`packages/domain/landed-cost`), with no UI or DB dependency. |

#### 5.5.2 Volumetric maritime freight

Heavy vehicles ship Ro-Ro (or flat-rack). Carriers price per **freight ton (FT)** using the weight/measure (W/M) rule:

```
volume_m3      = length_m × width_m × height_m
freight_tons   = max(volume_m3 × volume_factor, gross_weight_t)     // volume_factor default 1.0 (1 m³ = 1 FT)
base_freight   = freight_tons × rate_per_FT (USD)
surcharges     = BAF + CAF% + THC origin + THC destination + documentation + war-risk/ISPS (each configurable: flat or %)
freight_total  = base_freight + surcharges
insurance      = insurance_rate × (FOB + freight_total) × insured_uplift    // default 0.5 %, uplift 1.10 [TBC]
```

Configurable per **route rate card**: origin port (`Tianjin`, `Qingdao`, `Shanghai`, `Guangzhou`, …) → `Conakry (Port Autonome de Conakry)`, carrier, mode (`RORO`, `FLAT_RACK`, `CONTAINER_40HC` for dismantled parts), validity dates, minimum charge. A unit carried on another unit (e.g. tractor on a trailer, "piggy-back") MAY use the combined dimensions.

#### 5.5.3 Customs duties & local tariffs

Guinea applies the ECOWAS Common External Tariff (CET) plus community and national levies on the CIF value. Because rates and categories change by finance law, **the system MUST NOT hard-code them**. It holds a versioned `tariff_schedule` with effective dates, `OWNER`-editable, each line:

| Field | Example (illustratif / illustrative — `[À CONFIRMER / TBC]` with transitaire) |
|---|---|
| HS code | `8701.21` road tractors for semi-trailers (diesel only); `8716.39` other trailers for goods |
| Droit de douane (DD) — CET rate % on CIF | 5 % / 10 % per HS category |
| Redevance statistique (RS) % on CIF | 1 % |
| Prélèvement communautaire CEDEAO (PC) % on CIF | 0.5 % |
| Prélèvement communautaire UA % on CIF | 0.2 % |
| Other levies (e.g. IT fee, BSC/cargo tracking) | flat GNF or % |
| TVA / VAT % | 18 % on (CIF + DD + RS + levies) |
| Age-based surcharge for used vehicles | rule: years since manufacture > N → extra % `[TBC]` |
| Exemption code | e.g. investment-code exemption: rate override + certificate required |

The engine computes:

```
customs_value_gnf = round(CIF_foreign × fx_rate_declaration)
each levy        = round(base × rate)               // base per line config
vat_base         = customs_value_gnf + Σ(non-VAT levies flagged "in VAT base")
VAT              = round(vat_base × vat_rate)
customs_total    = Σ levies + VAT
```

The **actual** customs figures come from the official declaration / liquidation (`quittance`) uploaded by `CUSTOMS`; the engine's estimate is then compared (IMP-31).

#### 5.5.4 Worked example (illustratif / illustrative — used as a unit test fixture)

Used Sinotruk HOWO 6×4 tractor, FOB 38,000 USD, dims 6.90 × 2.50 × 3.40 m, 9.2 t, Ro-Ro 45 USD/FT, insurance 0.5 %, rate 1 USD = 8,600 GNF.

| Line | Calculation | Amount |
|---|---|---|
| Volume | 6.90 × 2.50 × 3.40 | 58.65 m³ |
| Freight tons | max(58.65, 9.2) | 58.65 FT |
| Freight | 58.65 × 45 | 2,639.25 USD |
| Insurance | 0.5 % × (38,000 + 2,639.25) | 203.20 USD |
| **CIF** | | **40,842.45 USD** |
| Customs value | 40,842.45 × 8,600 | **351,245,038 GNF** |
| DD 5 % | | 17,562,252 GNF |
| RS 1 % | | 3,512,450 GNF |
| PC CEDEAO 0.5 % | | 1,756,225 GNF |
| PC UA 0.2 % | | 702,490 GNF |
| TVA 18 % | 18 % × (351,245,038 + 23,533,417) | 67,460,122 GNF |
| **Customs total** | | **90,993,539 GNF** |
| Port & terminal | | 4,500,000 GNF |
| Transitaire fees | | 3,000,000 GNF |
| Refurbishment (inspection) | | 1,500,000 GNF |
| Port → yard transfer | | 1,000,000 GNF |
| Registration & plates | | 3,500,000 GNF |
| Insurance year 1 | | 6,000,000 GNF |
| **Landed cost (VAT not recoverable)** | | **461,738,577 GNF** |
| **Capitalised cost (VAT recoverable)** | 461,738,577 − 67,460,122 | **394,278,455 GNF** |

### 5.6 Registration workflow — legalising vehicles in Guinea

Modelled as a **configurable checklist workflow** (`registration_workflow_template`), because procedures, offices and fees change. Each step has: owner role, required documents (upload), fee (GNF, receipt), SLA in days, status (`TODO` / `IN_PROGRESS` / `BLOCKED` / `DONE`), completion date, and blocking dependencies.

**Seed steps (v1) — `[À CONFIRMER / TBC]` with the transitaire and DNTT**

| # | Step (FR / EN) | Owner | Evidence | Depends on |
|---|---|---|---|---|
| R1 | Réception des documents d'embarquement / Shipping documents received (B/L, commercial invoice, packing list, export certificate) | CUSTOMS | Uploads | Vessel departure |
| R2 | Arrivée navire & manifeste / Vessel arrival & manifest at Port Autonome de Conakry | CUSTOMS | Arrival notice | R1 |
| R3 | Déclaration en douane via guichet unique / Customs declaration filed through the single window (GUCEG / SYDONIA) | CUSTOMS | Declaration number | R2 |
| R4 | Inspection / scanner & valeur / Physical inspection & valuation | CUSTOMS | Inspection report | R3 |
| R5 | Liquidation & paiement des droits / Duty assessment & payment | CUSTOMS, OWNER approves payment | Quittance (receipt) → actual customs lines (§5.5.3) | R4 |
| R6 | Bon à enlever & sortie port / Release order & port exit | CUSTOMS | BAE, port exit slip | R5 + port charges paid |
| R7 | Contrôle technique / Roadworthiness inspection | FLEET_MANAGER | Certificate, validity date | R6 |
| R8 | Assurance RC obligatoire / Mandatory third-party insurance | FLEET_MANAGER | Policy, expiry date | R6 |
| R9 | Immatriculation & carte grise (DNTT) / Registration & registration card | CUSTOMS | Carte grise scan, **plate number**, registration date | R5, R7, R8 |
| R10 | Plaques posées / Plates fitted | FLEET_MANAGER | Photo | R9 |
| R11 | Autorisation de transport / Commercial transport licence & vignette | FLEET_MANAGER | Licence, vignette, expiry dates | R9 |

| ID | Requirement |
|---|---|
| IMP-40 | `REGISTERED` status is reached only when all mandatory steps are `DONE`; the plate number entered in R9 is validated as unique system-wide. |
| IMP-41 | Fees paid in steps auto-create `ACTUAL` landed-cost lines (no double entry). |
| IMP-42 | Steps over SLA are flagged on the dashboard and notify `CUSTOMS` + `OWNER`. |
| IMP-43 | Every compliance document with an expiry date (insurance, contrôle technique, licence, vignette) creates a `compliance_item` that carries over to the fleet (§7.3). |

---

## 6. Module 2 — Local Operations

### 6.1 Reference data

**Fleet (live snapshot 19/11/2026, from the current app)**

| Plate | Type | Trips 2026 | Driver |
|---|---|---|---|
| BK2195 | Tractor | 175 | `[À CONFIRMER / TBC]` |
| BN0836 | Tractor | 91 | `[À CONFIRMER / TBC]` |
| AL8734 | Tractor | 103 | `[À CONFIRMER / TBC]` |

> Legacy plates `AL7834`, `AL8735` and placeholders like `TRK001` MUST be rejected on import and flagged for review.

**Regions & destinations** — trips are logged by *region* (origin/zone) and *destination* (delivery point):

| Region | Seed destinations (from live data) |
|---|---|
| Conakry | Sonfonia, Lambanyi, … |
| Coyah | Coyah-Centre, … |
| Dubréka | Dubréka Center, … |

Destinations are an editable list per region (`FLEET_MANAGER`), each with optional distance (km) from loading point `[À CONFIRMER / TBC]` and GPS point. The loading point(s) (cement plant/depot) are configurable `[À CONFIRMER / TBC]`.

**Cement types** — seeded from live data, editable list: `CIMI/42.5 R CPA`, `CIMII/AP42.5 N`. Import normalises case/spacing variants to these canonical values and flags unknowns.

### 6.2 Trip management (mirrors the current trip log)

The existing app's trip record is the baseline; TransFasa Pro keeps every field (for lossless migration) and adds the ones in **bold**.

| Field | FR / EN label | Type | Rules |
|---|---|---|---|
| `trip_date` | Date / Date | date | Required; not in the future (> today + 1 day) |
| `vehicle_id` | Camion / Truck | FK | Required; vehicle must be `ACTIVE` on that date |
| **`trailer_id`** | **Remorque / Trailer** | FK, nullable | Must be `ACTIVE`; kingpin match |
| **`driver_id`** | **Chauffeur / Driver** | FK | Auto-filled from the vehicle's current assignment; overridable |
| `region` | Région / Region | enum | Conakry, Coyah, Dubréka |
| `destination` | Destination / Destination | FK | Filtered by region |
| **`origin`** | **Origine / Loading point** | FK | Default loading point |
| `cement_type` | Type de ciment / Cement type | FK | Required |
| `tonnage` | Tonnage (t) | decimal(6,2) | > 0; warning if > legal payload (IMP-22) or > trailer rated payload |
| **`bags`** | **Sacs / Bags** | int | Optional; auto = tonnage × 20 for 50 kg bags (configurable) |
| `transport_revenue` | Revenu transport / Transport revenue | GNF | Required ≥ 0; **prefilled from rate card (§6.3)** |
| `offload_cost` | Déchargement / Unloading | GNF | ≥ 0 |
| `fuel_cost` | Carburant / Fuel | GNF | ≥ 0; **optional litres + price/L → cost computed** |
| **`driver_incentive`** | **Prime chauffeur / Driver incentive** | GNF | ≥ 0 (today folded into "other" — split on migration where identifiable) |
| `other_cost` | Autres frais / Other costs | GNF | ≥ 0 + free-text reason if > 0 |
| **`client_id`** | **Client / Client** | FK, nullable | For invoicing |
| **`delivery_note_no`, `weighbridge_ticket_no`** | **N° bon de livraison / N° ticket pesée** | text | |
| **`attachments`** | **Justificatifs / Proofs** | files | Photos of tickets/receipts |
| **`status`** | **Statut / Status** | enum | `PLANNED → IN_PROGRESS → DELIVERED → VALIDATED` (or `CANCELLED`) |
| `total_cost` | Coût total / Total cost | GNF | Computed, read-only |
| `profit` | Bénéfice / Profit | GNF | Computed, read-only |

| ID | Requirement |
|---|---|
| OPS-01 | **Single scrollable entry form** (no wizard). Profit recomputes on every keystroke; inline validation next to each field; no `alert()`. |
| OPS-02 | Selecting a truck auto-fills the driver and default trailer; selecting region + destination + cement auto-fills revenue, unloading and fuel from the rate card; all prefilled values are editable and the edit is visible (badge "modifié / edited"). |
| OPS-03 | **Duplicate trip** action (same truck/route/cement as a previous trip, today's date) — matches how most trips repeat daily. |
| OPS-04 | `DRIVER` can create `PLANNED`→`DELIVERED` updates for own trips (proof photos, fuel receipt), not edit amounts; `FLEET_MANAGER` validates (`VALIDATED`). Validated trips are locked; changes require `OWNER`/`ACCOUNTANT` with a reason (audit-logged). |
| OPS-05 | **Period close**: `ACCOUNTANT`/`OWNER` can close a month; closed-month trips and expenses become read-only. |
| OPS-06 | List view with filters (period, truck, driver, region, destination, cement, status), totals row, CSV/XLSX export (§9.3). |
| OPS-07 | Bulk import from the existing app/CSV with normalisation (plates, `Dubréka` accents, cement spellings, dates, GNF strings) and a review screen listing rejected rows. |

### 6.3 Rate cards

Per (region, destination, cement type optional, vehicle optional, valid-from/to): `revenue_per_trip` **or** `revenue_per_tonne`, standard unloading, standard fuel, standard incentive, standard other. Live data shows e.g. Coyah-Centre 40 t → 4,000,000 GNF revenue / 540,000 fuel / 600,000 unloading / 270,000 other; Sonfonia 35 t → 3,000,000 / 480,000 / 500,000 / 100,000. These are seeded **only after owner confirmation**.

### 6.4 Profitability engine (real-time, GNF)

Four levels, all in integer GNF:

```
Trip direct cost         C_d  = fuel + unloading + driver_incentive + other
Trip operating profit    P_op = transport_revenue − C_d                       ← "Bénéfice" in today's app
Allocated overhead       O_a  = Σ(general & truck expenses of the period) × allocation_share(trip)
Trip net profit          P_n  = P_op − O_a
Trip net after capital   P_c  = P_n − depreciation_share(trip)                 ← uses Module 1 capitalised cost
```

- **Allocation key** (setting): by tonnage (default), by trip count, or by revenue. Truck-specific expenses (repairs, tyres on BK2195) are allocated only to that truck's trips; general expenses (salaries not tied to a truck, office) across all trips.
- **Depreciation**: straight-line on capitalised cost (IMP-34) over `useful_life_months` (default 60 `[TBC]`) with residual value % (default 20 % `[TBC]`), allocated per trip within the month by the same key.
- **Derived KPIs**: net margin %, revenue/trip, profit/trip, tonnage/trip, GNF per tonne, GNF per km and per tonne-km (when distances are set), fuel cost % of revenue, trips per truck per month, utilisation (days with ≥ 1 trip ÷ available days).
- **Payback / ROI per vehicle**: cumulative `P_n` since `ACTIVE` vs capitalised cost → payback date (actual or projected from trailing 90-day average). Illustration: capitalised 394,278,455 GNF at BK2195's 2026 average operating profit of ~40,600,000 GNF/month → ~9.7 months before overhead.

| ID | Requirement |
|---|---|
| OPS-20 | `P_op` is shown live in the entry form; `P_n` and `P_c` are computed server-side and visible on trip detail, refreshed within 5 s of any expense/trip change in the period. |
| OPS-21 | All profitability math lives in one pure, tested module (`packages/domain/profit`). Client-side preview uses the same module; the server is the source of truth. |
| OPS-22 | Reconciliation: `Σ P_n` over a period = `Σ revenue − Σ direct costs − Σ expenses` exactly (rounding residue posted to the largest trip). Tested. |

### 6.5 Expenses

Types (seeded from live data): `Repair / Réparation`, `Tyres / Pneus`, `Insurance / Assurance`, `Taxes / Taxes`, `Salary / Salaire`, `Other / Autre`. Fields: date, type, amount (GNF), description, vehicle (nullable = general), attachment, entered by, validated by.

### 6.6 Dashboards

- **Opérations / Operations**: period KPIs (trips, tonnage, revenue, direct costs, operating profit, expenses, net profit, net margin) matching the current summary, by month, by truck, by region, by cement type, by driver.
- **Flotte / Fleet**: status board of every vehicle (lifecycle state), compliance expiries in the next 30 days, payback progress bar per vehicle.
- **Import / Import pipeline**: units by stage (Kanban by status), days in stage, estimate-vs-actual variance, cash committed vs paid.

---

## 7. Fleet database & Module 1 → Module 2 handoff

### 7.1 Principle

There is **one `vehicle` table**. "Active fleet" is a filtered view: `status IN (ACTIVE, IN_MAINTENANCE, OUT_OF_SERVICE)`.

### 7.2 Handoff event (`REGISTERED → ACTIVE`)

| ID | Requirement |
|---|---|
| FLT-01 | When registration completes, `FLEET_MANAGER` or `OWNER` runs **"Mettre en service / Commission vehicle"**: confirms plate, assigns a default driver and trailer (tractors), sets in-service date and starting odometer. |
| FLT-02 | The transition is **atomic** (one DB transaction): status → `ACTIVE`; capitalised cost frozen into `vehicle_financials` (depreciation schedule generated); compliance items copied with expiry reminders; vehicle becomes selectable in trip entry; audit + `vehicle.commissioned` domain event emitted. On any failure nothing changes. |
| FLT-03 | Idempotent: re-running commissioning on an `ACTIVE` vehicle is a no-op returning the existing state. |
| FLT-04 | Late actual cost lines (an invoice arriving after commissioning) are allowed; they adjust capitalised cost with a dated adjustment entry and re-generate future depreciation only (past periods untouched if closed). |
| FLT-05 | Existing trucks (BK2195, BN0836, AL8734) are created via a **legacy onboarding** path: status `ACTIVE`, landed cost optional (entered later as `ACTUAL` lines or a single "historical cost" line). |

### 7.3 Ongoing fleet tracking

Per vehicle: odometer log (from trips/fuel entries), maintenance plans (every N km or N days — oil change, tyres rotation), maintenance history (links to expenses), compliance items with expiry alerts (30/15/7 days), driver assignment history, status history, documents.

### 7.4 Future telematics hook

`vehicle_position` and `odometer_reading.source = GPS` reserved so a GPS provider can be added later without schema changes.

---

## 8. Data model (logical)

PostgreSQL-flavoured types shown; see §10 for the chosen platform. All tables include `id (uuid)`, `created_at`, `created_by`, `updated_at`, `updated_by`, `deleted_at` (soft delete) unless noted.

```
app_user(id, full_name, phone, email, locale, is_active)
role(code)                               -- OWNER, PROCUREMENT, INSPECTOR, CUSTOMS, FLEET_MANAGER, DRIVER, ACCOUNTANT, VIEWER
user_role(user_id, role_code)

supplier(id, name, country, city, contact, wechat, rating)
vehicle_model(id, make, model, variant, vehicle_type, default_spec jsonb)
import_lot(id, ref, supplier_id, incoterm, origin_port, bl_number, vessel, etd, eta, ata, status)
vehicle(id, vehicle_type, condition, make, model_id, vin UNIQUE, engine_no, chassis_no, year,
        plate UNIQUE NULL, status, import_lot_id NULL, spec jsonb, tare_t, length_m, width_m, height_m,
        rated_payload_t, fifth_wheel_mm NULL, kingpin_mm NULL, in_service_date, odometer_start_km)
vehicle_status_history(vehicle_id, from_status, to_status, at, by, reason)

inspection_template(id, vehicle_type, version, items jsonb, active)
inspection(id, vehicle_id, template_id, template_version, inspector_id, location, started_at, signed_at, verdict, score)
inspection_item(inspection_id, item_code, result, measured_value, comment, repair_cost_minor, currency)
attachment(id, owner_type, owner_id, kind, storage_path, mime, size, sha256, uploaded_by)

fx_rate(pair, rate_date, rate numeric(18,6), source)
freight_rate_card(id, origin_port, dest_port, carrier, mode, rate_per_ft_minor, currency, surcharges jsonb, valid_from, valid_to)
tariff_schedule(id, version, effective_from, effective_to, approved_by)
tariff_line(schedule_id, hs_code, levy_code, rate_pct, flat_gnf, base, in_vat_base, notes)
landed_cost_line(id, vehicle_id NULL, import_lot_id NULL, category, description, kind ESTIMATE|ACTUAL,
                 amount_minor, currency, fx_rate_id NULL, amount_gnf bigint, is_capitalised, is_recoverable_vat,
                 allocation_key NULL, attachment_id NULL)

registration_template(id, version, steps jsonb)
registration_case(id, vehicle_id, template_version, status)
registration_step(case_id, step_code, status, owner_role, fee_gnf, due_date, done_at, done_by, notes)
compliance_item(id, vehicle_id, kind, number, issued_at, expires_at, attachment_id)

vehicle_financials(vehicle_id, capitalised_cost_gnf, useful_life_months, residual_pct, frozen_at)
capital_adjustment(vehicle_id, amount_gnf, reason, effective_date)

driver(id, user_id NULL, full_name, phone, licence_no, licence_expiry, is_active)
vehicle_assignment(vehicle_id, driver_id, trailer_id NULL, from_date, to_date NULL)

region(code, name)                        -- Conakry, Coyah, Dubréka
destination(id, region_code, name, distance_km NULL, lat NULL, lng NULL, is_active)
loading_point(id, name, lat, lng)
cement_type(code, label, bag_kg)
client(id, name, phone, address)
rate_card(id, region_code, destination_id, cement_code NULL, vehicle_id NULL, revenue_per_trip_gnf NULL,
          revenue_per_t_gnf NULL, std_fuel_gnf, std_offload_gnf, std_incentive_gnf, std_other_gnf, valid_from, valid_to)

trip(id, trip_date, vehicle_id, trailer_id, driver_id, origin_id, region_code, destination_id, cement_code,
     tonnage numeric(6,2), bags, transport_revenue_gnf, offload_cost_gnf, fuel_cost_gnf, fuel_litres NULL,
     driver_incentive_gnf, other_cost_gnf, other_reason, client_id, delivery_note_no, weighbridge_ticket_no,
     status, legacy_id NULL,
     -- computed/persisted by server:
     total_direct_cost_gnf, operating_profit_gnf, allocated_overhead_gnf, depreciation_gnf, net_profit_gnf)
expense(id, expense_date, type, amount_gnf, description, vehicle_id NULL, attachment_id, validated_by)
period_close(period YYYY-MM, closed_at, closed_by)

audit_log(id bigserial, at, actor_id, actor_roles, action, entity, entity_id, before jsonb, after jsonb,
          ip, user_agent, request_id, prev_hash, hash)        -- append-only, no update/delete grants
domain_event(id, type, payload jsonb, at, processed_at)        -- outbox
setting(key, value jsonb)                                      -- vat_registered, allocation_key, thresholds, limits
```

Key constraints: `CHECK (amount_gnf >= 0)` on cost/revenue columns; `UNIQUE(vin)`; `UNIQUE(plate)` where not null; foreign keys enforced; `trip.vehicle_id` must reference a vehicle with `status IN (ACTIVE)` at insert (trigger/server check).

---

## 9. Cross-cutting requirements

### 9.1 Role-based access control

| Resource / action | OWNER | PROCUREMENT | INSPECTOR | CUSTOMS | FLEET_MGR | DRIVER | ACCOUNTANT | VIEWER |
|---|---|---|---|---|---|---|---|---|
| Suppliers, quotes, specs — create/edit | ✔ | ✔ | – | – | – | – | R | R |
| Inspection — fill & sign | ✔ | R | ✔ (assigned) | – | R | – | R | R |
| Approve purchase / override inspection | ✔ | – | – | – | – | – | – | – |
| Landed-cost estimate lines | ✔ | ✔ | – | ✔ | – | – | R | R |
| Landed-cost actual lines | ✔ | ✔ (China side) | – | ✔ (Guinea side) | – | – | ✔ validate | R |
| Tariffs, FX, freight rate cards | ✔ | R (freight ✔) | – | R | – | – | ✔ FX | R |
| Registration steps | ✔ | – | – | ✔ | ✔ (R7, R8, R10, R11) | – | R | R |
| Commission vehicle (handoff) | ✔ | – | – | – | ✔ | – | R | R |
| Trips — create/edit draft | ✔ | – | – | – | ✔ | own, limited (OPS-04) | R | R |
| Trips — validate / unlock | ✔ | – | – | – | validate | – | unlock | – |
| Expenses | ✔ | – | – | – | ✔ | own fuel receipts | ✔ validate | R |
| Rate cards, destinations, cement types | ✔ | – | – | – | ✔ | – | R | R |
| Period close | ✔ | – | – | – | – | – | ✔ | – |
| Users & roles, settings | ✔ | – | – | – | – | – | – | – |
| Audit log | ✔ | – | – | – | – | – | R | – |
| Dashboards & exports | ✔ | Module 1 | – | Module 1 | Module 2 | own trips | ✔ | R |

(R = read only; – = no access.)

| ID | Requirement |
|---|---|
| SEC-01 | Authorisation is enforced **server-side** (database rules/policies and API layer). UI hiding is cosmetic only. |
| SEC-02 | Row-level rules: `DRIVER` sees only own trips/assignments; `INSPECTOR` sees only inspections assigned to them. |
| SEC-03 | Authentication: phone (SMS OTP) or email + password; `OWNER` and `ACCOUNTANT` MUST use 2FA. Sessions expire after 12 h idle (configurable). |
| SEC-04 | Default-deny: a new endpoint or collection with no explicit rule is inaccessible. A test enumerates every endpoint × role and asserts the matrix above. |
| SEC-05 | Uploaded files: type whitelist (jpg, png, heic, pdf), 20 MB max, virus scan if the platform provides one, private storage with signed URLs expiring ≤ 15 min. |
| SEC-06 | Secrets only via environment/secret manager; never committed. |

### 9.2 Digital tracking logs (audit)

| ID | Requirement |
|---|---|
| AUD-01 | Every create/update/delete/status change on any business entity writes an `audit_log` row with before/after JSON, actor, roles, timestamp, request id. |
| AUD-02 | The log is append-only (no update/delete permission for any role, including `OWNER`) and **hash-chained** (`hash = sha256(prev_hash ‖ canonical_json(row))`); a nightly job verifies the chain and alerts on break. |
| AUD-03 | Each entity detail page has an "Historique / History" tab showing its changes in plain bilingual language ("Carburant modifié 480,000 → 540,000 GNF par X le 18/11/2026"). |
| AUD-04 | Login, failed login, role change, export and period close are logged. |
| AUD-05 | Retention ≥ 10 years `[TBC]`; exportable to CSV for auditors. |

### 9.3 Exports & documents

- XLSX export with sheets `Résumé / Summary`, `Voyages / Trips`, `Par camion / By Truck`, `Par itinéraire / By Route`, `Par ciment / By Cement`, `Charges / Expenses`; bold headers, frozen first row, totals row, dates as text `DD/MM/YYYY`, filenames `TransFasa_<Report>_<YYYY-MM-DD>.xlsx`.
- CSV with UTF-8 BOM.
- PDF: landed-cost sheet per vehicle, inspection report with photos, trip report, driver mission sheet (bordereau de mission), client invoice. Header `TransFasa Guinée`, bilingual, signature block.

### 9.4 Notifications

In-app + WhatsApp/SMS (provider pluggable, `[TBC]`): inspection submitted, purchase awaiting approval, vessel ETA in 3 days, registration step overdue, compliance expiry (30/15/7 days), maintenance due, trip awaiting validation, estimate-vs-actual variance > threshold.

### 9.5 Non-functional

| ID | Requirement |
|---|---|
| NFR-01 | Mobile-first; usable on a mid-range Android phone on 3G. First load < 3 s on 3G for the trip form (code-split). |
| NFR-02 | Offline-tolerant for trip entry and inspections: drafts saved locally, synced with conflict detection (server wins on validated records; user prompted otherwise). |
| NFR-03 | Availability 99.5 % monthly; daily automated backups, 30-day retention, quarterly restore test. |
| NFR-04 | p95 API latency < 500 ms for reads, < 1 s for writes at 10 concurrent users and 100,000 trips. |
| NFR-05 | Accessibility: WCAG 2.1 AA contrast, 44 px touch targets. |
| NFR-06 | i18n framework in place (FR/EN bilingual labels now, single-language toggle later). |

---

## 10. System architecture

### 10.1 Recommended stack

The current TransFasa app runs on Firebase (`transfasa.web.app`). To migrate its 369 trips and 81 expenses losslessly and keep one hosting account, **v1 stays on Google Firebase**, with business logic isolated so a move to PostgreSQL later is a data-layer swap.

| Layer | Choice | Why |
|---|---|---|
| Front-end | React 18 + TypeScript + Vite, Tailwind CSS, React Router, TanStack Query, React Hook Form + Zod, `lucide-react`, `recharts` | Matches current skills/stack; typed forms |
| Back-end | Firebase Cloud Functions (Node 20, TypeScript) — HTTPS callable functions for every write that touches money or status | Server-side source of truth for calculations and transitions |
| Database | Cloud Firestore (collections mirroring §8) **or** Cloud SQL PostgreSQL if relational reporting becomes heavy — decision gate at end of Phase 2 | Continuity with production |
| Auth | Firebase Auth (phone OTP + email), roles as **custom claims** + `user_roles` collection | Native RBAC hook for rules |
| Authorisation | Firestore Security Rules (read paths) + function-level guards (all writes) | SEC-01 |
| Files | Cloud Storage with rules + signed URLs | SEC-05 |
| Money math | `decimal.js` in a shared `packages/domain` used by client preview and functions | CNV-03 |
| Exports | `exceljs` (XLSX), `pdf-lib`/`@react-pdf/renderer` (PDF) in functions | |
| Offline | Firestore offline persistence + IndexedDB draft queue for photos | NFR-02 |
| Testing | Vitest (unit), Firebase Emulator Suite (rules + functions integration), Playwright (E2E, mobile viewport) | |
| CI/CD | GitHub Actions: lint → typecheck → unit → emulator tests → build → deploy preview channel on PR → deploy prod on `main` tag | |

**Firestore note**: money fields stored as integers (GNF fits in JS safe-integer range); foreign minor units as integers; FX rates as strings parsed by `decimal.js`. Aggregates (period totals, per-truck) maintained by functions into `stats/` documents for fast dashboards, recomputable from source with an admin job.

### 10.2 Repository layout (monorepo)

```
transfasa-pro/
├─ CLAUDE.md                      # agent operating rules (§11.2)
├─ docs/PRD-TransFasa-Pro.md      # this file
├─ apps/web/                      # React app (routes: /import, /fleet, /trips, /expenses, /reports, /admin)
├─ functions/                     # Cloud Functions (API, triggers, scheduled jobs)
├─ packages/domain/               # pure TS: money, fx, landed-cost, freight, customs, profit, state machines, validation (Zod)
├─ packages/i18n/                 # FR/EN label dictionary
├─ firestore.rules, storage.rules, firestore.indexes.json
├─ seed/                          # reference data (regions, destinations, cement types, templates) — no fake transactions
├─ scripts/migrate-legacy.ts      # import from current app
└─ e2e/                           # Playwright
```

### 10.3 Key flows (server)

- `commissionVehicle(vehicleId, plate, driverId, trailerId, inServiceDate, odometer)` — FLT-02 transaction.
- `transitionVehicle(vehicleId, toStatus, reason)` — state-machine guard (IMP-01).
- `computeLandedCost(vehicleId | lotId, mode=ESTIMATE|ACTUAL)` — pure domain + persistence.
- `saveTrip(trip)` — validate, compute `P_op`, persist, enqueue period recompute of `O_a`, depreciation, `P_n`.
- `closePeriod(YYYY-MM)` — final allocation + lock.
- Scheduled: nightly audit-chain verification, compliance/maintenance reminders, stats recompute check.

### 10.4 Deployment

Environments: `dev` (emulators, local), `staging` (Firebase preview channels per PR), `prod`. Infrastructure is declared in repo (`firebase.json`, rules, indexes). Everything deployable by one command (`npm run deploy:<env>`) so an agent running in a Claude Code cloud session can build, test against emulators and deploy to a preview channel; production deploy requires a human-approved tag.

---

## 11. Build plan for autonomous development (Claude Code)

### 11.1 Phases & acceptance criteria

Each phase ends with green CI, a demo note in `docs/CHANGELOG.md`, and a stop for owner review.

| Phase | Scope | Done when |
|---|---|---|
| **P0 — Foundation** | Monorepo, TS configs, lint, CI, Firebase emulators, auth, roles/claims, RBAC test harness (SEC-04), audit log + hash chain, i18n, GNF/date formatters, design shell (mobile nav) | Login works for each role in emulator; RBAC matrix test passes; audit row written for a sample entity; formatters unit-tested against CNV-01/04 |
| **P1 — Operations parity** | Reference data, vehicles (legacy onboarding FLT-05), drivers & assignments, trip form (OPS-01..04), expenses, rate cards, dashboard parity with current app, legacy migration script | Migrated totals equal the current app exactly: 369 trips, 13,850 t, 1,300,540,000 GNF revenue, 728,136,000 GNF net profit (as of snapshot; re-run on cut-over) |
| **P2 — Profitability** | Allocation, depreciation hooks, `P_n`/`P_c`, KPIs, period close, XLSX/PDF exports | OPS-22 reconciliation test passes on migrated data; exports open in Excel with correct accents, dates and totals |
| **P3 — Import & sourcing** | Suppliers, model catalogue, spec sheets, inspections (templates, mobile capture, offline photos), lifecycle state machine, approvals | A used unit cannot be approved without an inspection; auto-verdict tests pass |
| **P4 — Landed cost** | FX, freight rate cards, tariff schedules, cost lines, lot allocation, estimate vs actual, comparison view | Worked example §5.5.4 reproduced to the franc as a unit test; allocation sums exactly |
| **P5 — Registration & handoff** | Registration workflow, compliance items, commissioning transaction, payback dashboard | End-to-end E2E: quote → inspection → approve → ship → clear → register → commission → log trip → payback shows |
| **P6 — Hardening** | Notifications, offline sync polish, performance (NFR-04), backups, security review | NFR targets met in load test; security review findings resolved |

### 11.2 `CLAUDE.md` rules for the coding agent (copy into repo root)

```md
# TransFasa Pro — agent rules
- Source of truth: docs/PRD-TransFasa-Pro.md. Reference requirement IDs in commit messages.
- Work one phase at a time (PRD §11.1). Stop at the end of each phase and summarise; do not start the next phase unprompted.
- Money: integer GNF only; use packages/domain/money. Never use JS floats for money. Format `1,234,567 GNF`.
- Dates: display DD/MM/YYYY, store ISO. Labels bilingual FR / EN. Keep `Dubréka` accented; files UTF-8.
- Never invent trucks, drivers, distances, tariffs or prices. Use seed/ values; anything marked [TBC] stays a flagged, editable setting.
- All business math goes in packages/domain with unit tests; UI and functions import it, never re-implement it.
- Every write that touches money or status goes through a Cloud Function with a role guard and an audit entry.
- Add a test for every requirement ID you implement; the RBAC matrix test must stay green.
- Ask before: adding a dependency not listed in PRD §10.1, changing the data model in §8, deleting data or migrations, deploying to prod, touching firestore.rules permissions beyond the matrix.
- Run `npm run lint && npm run typecheck && npm test` before every commit.
```

### 11.3 Definition of done (every feature)

1. Requirement IDs covered and listed in the PR.
2. Unit tests for domain logic; emulator tests for rules/functions; E2E for the happy path at 375 px.
3. Bilingual labels, GNF/date formats verified.
4. Audit entries produced for every mutation.
5. No `[TBC]` value silently hard-coded.

---

## 12. Data migration from the current app

1. Export trips and expenses via the existing TransFasa connector/API.
2. Map fields: `truck→vehicle_id`, `cement→cement_code`, `region`, `dest→destination_id` (create missing destinations), `transport`, `offload`, `fuel_cost`, `other`, legacy `id → legacy_id`.
3. Normalise plates (`BK 2195 → BK2195`), place names (`Dubreka → Dubréka`), cement spellings; reject off-fleet plates to a review list.
4. Recompute `total_cost`/`profit` and compare with the legacy values; list mismatches.
5. Import with `status = VALIDATED`, months before cut-over closed.
6. Verify totals per month/truck/region against the legacy summary (P1 acceptance).
7. Run both systems in parallel for 2 weeks, then freeze the old app read-only.

---

## 13. Risks

| Risk | Impact | Mitigation |
|---|---|---|
| Customs rates/procedures change | Wrong estimates | Versioned tariff schedule + registration templates, owner-editable; actuals always override |
| GNF volatility vs USD/CNY | Landed cost drifts between quote and payment | FX captured per line; sensitivity view (±5 %, ±10 % FX) on estimates |
| Overloading (40 t vs legal limits) | Fines, axle damage, insurance void | IMP-22 warnings on quote and on every trip |
| Poor connectivity at port/quarry | Lost entries | Offline drafts and queued uploads (NFR-02) |
| Inspection fraud / seller swaps unit | Buying a different truck | VIN/chassis photo match is CRITICAL item; geotagged, signed inspection |
| Single developer/agent bus factor | Stalled maintenance | Domain logic isolated and tested; PRD + CLAUDE.md kept current |

---

## 14. Open questions for the owner (`[À CONFIRMER / TBC]`)

1. Driver names and phone numbers for BK2195, BN0836, AL8734 — and is AL8734 still active (no truck expenses recorded in 2026)?
2. Loading point(s): which plant/depot do trips start from? Distances (km) to each destination?
3. Rate card: are revenue amounts per trip or per tonne? Confirm current values per destination.
4. Driver incentive: separate amount per trip, or included in "autres frais" today?
5. Is TransFasa VAT-registered (can it recover import VAT)?
6. Current customs rates and levies for HS 8701.21 / 8716.39 and any age limit/surcharge for used trucks — from the transitaire's latest liquidation.
7. Preferred models and engine power for the next purchases (Shacman X3000 vs HOWO TX), new vs used budget ceiling.
8. Depreciation policy: useful life and residual value.
9. Who will hold each role (procurement agent in China, inspector, transitaire) and do they need app accounts?
10. Notification channel: WhatsApp Business API, SMS, or in-app only for v1?

---

## 15. Glossary

| Term | Meaning |
|---|---|
| BAE | Bon à enlever — customs release order |
| B/L | Bill of lading |
| CET / TEC | ECOWAS Common External Tariff |
| CIF | Cost, Insurance, Freight — customs value basis |
| DNTT | Direction Nationale des Transports Terrestres (vehicle registration authority) |
| FOB | Free On Board — supplier price at Chinese port |
| FT / W/M | Freight ton / weight-or-measure rule |
| GUCEG | Guichet Unique du Commerce Extérieur de Guinée |
| Quittance | Official receipt of duties paid |
| Ro-Ro | Roll-on/roll-off vessel |
| Transitaire | Licensed customs clearing agent |
