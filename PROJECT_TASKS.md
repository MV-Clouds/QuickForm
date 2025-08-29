# QuickForm Payment Integration — Work Tracker

Owner: GitHub Copilot
Date: 2025-08-29
Branch: Yash-Merge-Code-22Aug-Update

## Scope

End-to-end audit and fixes for PayPal checkout, form-builder state/UX, publish view accuracy, and client+server validation flow.

## Checklist & Status

1. Backend (Lambda) — PayPal callouts

   - [x] Create Order (Orders v2) payload: use `payment_source.paypal.experience_context`, single `purchase_units`, items + breakdown, `invoice_id/custom_id`, approval link fallback.
   - [ ] Capture Order: robust error surfacing; keep return shape stable; prefer `payer-action` link if present.
   - [x] Subscriptions (v1): confirm `validatePlanId`, `start_time`, application_context fields (`brand_name`, `locale`, `shipping_preference`, `user_action`, `payment_method.payee_preferred`, `return_url`, `cancel_url`).
   - [ ] Subscriptions (v1): idempotency header usage, error envelope normalization.
   - [ ] Merchant capabilities: keep behaviour, unify error envelope.
   - [!] Remove/replace legacy storage paths (currently broken): `handle-cancel`, `list-transactions`, `list-subscriptions`, IPN code that references DynamoDB symbols.

2. Form Builder — UI/state

   - [x] Remove duplicate Currency selection (single source of truth).
   - [x] Disable Manage Products/Subscriptions until merchant is selected; clarify tooltip.
   - [ ] Ensure selections serialize into form config correctly.

3. Client-side validation

   - [ ] Required form fields block submission with inline errors.
   - [ ] Card fields validity check (Hosted Fields/SDK) before initiating payment.
   - [ ] Shipping/Billing toggles: mark fields required and block until valid.
   - [ ] Disable backend initiation on client invalid state.

4. Publish/Preview correctness

   - [ ] Published form renders configured payment settings (provider, account, currency, buttons).
   - [ ] Smoke test: required fields -> order -> approval -> capture -> success/errors visible.

5. Tests & docs
   - [ ] Minimal tests for payload building and validation rules.
   - [ ] Brief README/notes on payment setup and validation.

## Today’s Focus

- Start with 2) Form Builder UI/state: remove duplicated Currency selector and fix button/state wiring.

## Changes Made (chronological)

- 2025-08-29: Updated `lambda-functions/Paypal/paymentGatewayHandler.mjs` `initiateOrder()` to Orders v2-compliant payload and approval link fallback.
- 2025-08-29: Removed runtime currency callouts; `src/services/paypalCurrencyService.js` now proxies static list from `utils/paypalCurrencies` only.

## Next Actions

- Locate currency selectors in form-builder components and consolidate.
- Patch UI state so management buttons reflect current provider/account.
- Then move to client-side validation hardening.

## Notes

- Several legacy DynamoDB references remain; decide whether to remove or re-implement behind a feature flag.
