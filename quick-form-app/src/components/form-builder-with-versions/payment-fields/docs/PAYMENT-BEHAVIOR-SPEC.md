## Payment behavior spec (Form Builder and Public Form Viewer)

This document defines how payment features work end-to-end, with a secure credential model using Salesforce custom setting record IDs. It covers data model, UX behavior, API actions, and storage rules for subscriptions, products, one-time/custom amounts, and donations.

### Goals

- Use `merchantAccountId` (Salesforce record ID) everywhere in configuration. Never store raw PayPal `merchantId` in field configs.
- Resolve the actual PayPal `merchantId` on demand via a secure credentials API before any operation that requires it.
- Provide clear UX rules for editing/creating/importing subscriptions, managing products, and configuring donation/payment types.
- Ensure consistent runtime behavior in the public form: validation, method gating, button rendering, and payment capture.

### Data model

- Field JSON stores under `field.subFields`:
  - `gateway`: "paypal" (future: stripe, razorpay, square)
  - `merchantAccountId`: Salesforce record ID for the merchant credentials
  - `paymentType`: one of ["subscription", "donation", "donation_button", "custom_amount", "product_wise"]
  - `amount`: { type: "static" | "variable" | "product", value?: number, currency: string, minAmount?: number, maxAmount?: number, suggestedAmounts?: number[] }
  - `subscriptionConfig`: see Subscription behavior
  - `paymentMethods`: { paypal?: boolean, cards?: boolean, venmo?: boolean, googlePay?: boolean }
  - `behavior`: { collectBillingAddress?: boolean, collectShippingAddress?: boolean, isRequired?: boolean }
  - `donationButtonId` (only if `paymentType === "donation_button"`)

Notes:

- `merchantId` (PayPal) is derived only at runtime from credentials; it must not be stored in field JSON.

### Credential resolution (required before API calls)

- Frontend resolves credentials with `merchantAccountId` using `API_ENDPOINTS.MERCHANT_CREDENTIALS/<recordId>`.
  - Expected response: { success: true, credentials: { provider, merchantId, clientId, clientSecret, environment, isActive }, metadata: { ... } }
  - If the field still contains a legacy `merchantId`, the system will fallback, but new fields must save `merchantAccountId`.
- Locations that must resolve credentials when they only have `merchantAccountId`:
  - Form Builder plan/product creation/update (pre-save processors)
  - Public Form runtime provider (`PayPalPaymentProvider`) before initiate/capture
  - Merchant capability checks

### Form Builder behavior (authoring-time)

1. Merchant selection

- `MerchantAccountSelector` lists accounts from unified API (`list-accounts`).
- On selection, store `selectedAccount.Id` as `subFields.merchantAccountId`. Do not store `Merchant_ID__c` in the field.
- Components may resolve credentials on-demand (e.g., to fetch capabilities or existing PayPal plans), but should not persist raw credentials.

2. Subscription behavior

- Editing constraints
  - Only a subset of PayPal plan fields are updatable. Allowed updates: description, failure thresholds (where supported). Most plan changes (price, frequency, tiers) require creating a new plan.
  - UI must reflect this: when a plan is linked, show an Edit panel for the allowed fields; for disallowed changes, show a Create New Plan path.
- Create vs Update flow
  - If `subscriptionConfig.useExistingPlan === true` and `selectedExistingPlan` is set, link that plan to the field. No plan creation occurs.
  - Else, create a new plan via unified API (`create-subscription-plan`). Store only the plan reference in the form save response context; do not store raw PayPal IDs inside field config beyond what’s needed in processing results.
- Import from PayPal
  - Provide an "Import subscriptions" dialog that lists available plans for the resolved merchant (pagination if needed) and allows multi-select or single-select import. Do not auto-import all.
  - After selection, set `useExistingPlan = true` and `selectedExistingPlan` to the chosen PayPal plan ID.
- Tiered pricing
  - Support `subscriptionConfig.tieredPricing = { enabled, tiers: [{ startingQuantity, endingQuantity|null, price }] }`.
  - When tiers are enabled, set PayPal pricing model to TIERED (builder will translate to provider payload during creation).

3. Product management

- Provide CRUD UI for products when `paymentType === "product_wise"` or when products are referenced elsewhere.
- Actions:
  - Create: `create-product`
  - Update: `update-product`
  - Delete: `delete-product`
  - List: `list-items` with `type=product`
- Product fields: name, description, price, currency, stock(optional), sku(optional).
- Store only form configuration references needed to render runtime UI; do not store PayPal secrets.

4. Custom amount and donation

- Custom amount
  - Static: `amount.type = "static"` and `amount.value` is required. No end-user input is shown at runtime.
  - Variable: `amount.type = "variable"`; show an amount input with validation against `minAmount`/`maxAmount`.
- Donations
  - `paymentType = "donation"`: same amount rules as above. Optional recurring options via donation plan helper (see runtime section).
  - `paymentType = "donation_button"`: require `donationButtonId`; show PayPal Donate button at runtime without amount input.

5. Required field handling

- `behavior.isRequired` gates form submission at runtime. The payment provider must only render actionable buttons on the final page and after form validation passes (and amount input, if any, is valid).

6. Storage rules on form save

- Persist the field JSON with `merchantAccountId` and configuration described above.
- Any provider IDs created (e.g., planId, productId) belong to processing results and/or backend storage tied to the form version; they should not be embedded into the static field config unless necessary for a specific runtime behavior (e.g., `selectedExistingPlan`).

### Public Form Viewer behavior (runtime)

1. Credential resolution and capabilities

- Resolve credentials by `merchantAccountId` → derive `merchantId` for PayPal SDK and unified API calls.
- Fetch merchant capabilities via `get-merchant-capabilities` to enable Venmo, cards, Google Pay, etc.

2. Page gating and validation

- Payment UI elements are previews until the final page.
- On the final page: if variable amounts apply, show validated amount input; only then enable payment method selection and buttons.

3. Method selection and buttons

- Available methods = intersection of field `paymentMethods` and fetched merchant capabilities.
- Only render the chosen method’s button/components once amount inputs are valid and form validation passes.

4. Payment actions

- Create order/subscribe: call unified API with `merchantId` (derived from credentials), `paymentType`, `itemNumber`, return/cancel URLs, amount/products/plan as applicable.
- Capture: on approval, call `capture-payment` and surface `transactionId`, `amount`, `currency` back to the form for submission.
- Donation button path: render Donate SDK button with `donationButtonId` and forward completion event to unified API via `handle-donation-complete`.

5. Error handling

- Show actionable errors for:
  - Missing/invalid credentials (`merchantAccountId` not resolvable, account inactive)
  - Unsupported payment types/actions
  - Amount validation failures
  - Network/API errors from unified API or PayPal SDK

### Unified API actions (must be supported)

- Onboarding & accounts
  - `check-name`, `generate-onboarding-url`, `store-onboarding`, `complete-onboarding`, `get-merchant-status`, `list-accounts`
- Products
  - `create-product`, `update-product`, `delete-product`, `list-items`, `get-item`
- Subscriptions / plans
  - `create-subscription-plan`, `update-plan`, `delete-plan`, `list-plans`, `list-paypal-subscriptions`, `sync-paypal-subscriptions`
- Runtime payments
  - `get-merchant-capabilities`, `initiate-payment`, `capture-payment`, `get-subscription-status`, `handle-cancel`, `list-transactions`, `handle-donation-complete`
- Form-integrated helpers (optional)
  - `create-product-for-form`, `create-subscription-for-form`, `create-donation-for-form`

If an action returns "type not allowed" or similar, ensure the router (`index.mjs` or `enhanced-index.mjs`) includes that action in the correct group and that the underlying handler implements it.

### Editing rules summary (subscriptions)

- Allowed inline edits: description, failure thresholds (provider-limited).
- Disallowed inline edits (require new plan): price, currency, frequency, interval, tiers, trial.
- Import dialog must list available plans and allow selection; linking a selected plan sets `useExistingPlan = true` with `selectedExistingPlan`.

### Validation matrix (runtime)

- Amount rules
  - Static amount: no input; validate presence of `amount.value`.
  - Variable amount: numeric > 0; enforce min/max if provided.
- Required payment field
  - On final page only; payment attempt must block if form validation fails.
- Donation button
  - Requires `donationButtonId`.

### Migration notes

- New fields: store `merchantAccountId` only.
- Legacy fields: if `merchantId` exists and `merchantAccountId` is absent, runtime will fallback to legacy merchantId to avoid breaking existing forms. Builder UIs should prompt migration when possible.
- Ensure `API_ENDPOINTS.MERCHANT_CREDENTIALS` is configured to your API Gateway route that returns secure credentials for a record ID.

### Implementation checklist

- Builder
  - [ ] `MerchantAccountSelector` sets `merchantAccountId` on selection
  - [ ] Subscription editor honors allowed edits and create-new rules
  - [ ] Import dialog allows selection of plans to link
  - [ ] Tiered pricing wizard maps to provider payload
  - [ ] Product manager implements CRUD via unified API
  - [ ] Donation config supports static input location and variable input rules
- Runtime
  - [ ] Resolve creds by `merchantAccountId` before API/SDK use
  - [ ] Enforce final-page gating and validation
  - [ ] Render methods based on capabilities and field config
  - [ ] Use unified API for initiate/capture/status/capabilities
  - [ ] Donation button flow wired via `handle-donation-complete`

