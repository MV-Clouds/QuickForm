# Payment Field Editor Architecture

## Overview

The Payment Field Editor follows a scalable, modular architecture that supports multiple payment gateways through a unified interface. This design makes it easy to add new payment gateways without modifying existing code.

## Architecture Diagram

```
FieldEditor.js
└── PaymentFieldEditor.js (Gateway Router)
    ├── PayPalFieldEditor.js ✅
    ├── StripeFieldEditor.js (Future)
    ├── RazorpayFieldEditor.js (Future)
    └── SquareFieldEditor.js (Future)
```

## Component Hierarchy

### 1. **FieldEditor.js** (Main Form Field Editor)

- **Role:** General field editing for all field types
- **Payment Integration:** Imports and uses `PaymentFieldEditor`
- **Responsibility:** Determines when to show payment field configuration

### 2. **PaymentFieldEditor.js** (Gateway Router)

- **Role:** Routes to appropriate payment gateway editor
- **Responsibility:**
  - Detect payment gateway from field configuration
  - Route to specific gateway editor
  - Handle unsupported gateways gracefully
  - Provide utility functions for payment field management

### 3. **PayPalFieldEditor.js** (PayPal-Specific Editor)

- **Role:** Complete PayPal payment field configuration
- **Responsibility:**
  - PayPal-specific UI and state management
  - Merchant account integration
  - PayPal payment types and methods
  - Product/subscription/donation management

### 4. **Future Gateway Editors**

- **StripeFieldEditor.js** - Stripe payment configuration
- **RazorpayFieldEditor.js** - Razorpay payment configuration
- **SquareFieldEditor.js** - Square payment configuration

## Gateway Detection Logic

The `PaymentFieldEditor` uses a priority-based system to determine which gateway editor to render:

```javascript
// Priority Order:
1. field.subFields.gateway (highest priority)
2. field.gateway
3. Inferred from field.type (paypal_payment → paypal)
4. Default fallback (unknown)
```

### Examples:

```javascript
// Example 1: Explicit gateway in subFields
{
  id: "field-1",
  type: "payment",
  subFields: { gateway: "paypal" }  // ← PayPal editor
}

// Example 2: Gateway in field property
{
  id: "field-2",
  type: "payment",
  gateway: "stripe"  // ← Stripe editor (when implemented)
}

// Example 3: Inferred from type
{
  id: "field-3",
  type: "paypal_payment"  // ← PayPal editor
}
```

## Adding New Payment Gateways

### Step 1: Create Gateway Editor Component

```javascript
// StripeFieldEditor.js
import React, { useState } from "react";

const StripeFieldEditor = ({ selectedField, onUpdateField, className }) => {
  // Stripe-specific state and logic
  return <div className={className}>{/* Stripe configuration UI */}</div>;
};

export default StripeFieldEditor;
```

### Step 2: Update PaymentFieldEditor Router

```javascript
// PaymentFieldEditor.js
import StripeFieldEditor from "./StripeFieldEditor";

// Add case in switch statement
case "stripe":
  return (
    <StripeFieldEditor
      selectedField={selectedField}
      onUpdateField={onUpdateField}
      className={className}
    />
  );
```

### Step 3: Update Available Gateways List

```javascript
// Update getAvailablePaymentGateways()
{
  id: "stripe",
  name: "Stripe",
  description: "Accept credit cards and digital payments worldwide",
  supported: true, // ← Change to true
  icon: "stripe",
}
```

## Interface Contract

All payment gateway editors must follow this interface:

```typescript
interface PaymentGatewayEditor {
  selectedField: FormField;
  onUpdateField: (fieldId: string, updates: object) => void;
  className?: string;
}
```

## Field Configuration Structure

### Standard Payment Field Structure:

```javascript
{
  id: "field-id",
  type: "paypal_payment", // or "stripe_payment", etc.
  label: "Payment Information",
  gateway: "paypal", // Gateway identifier
  subFields: {
    gateway: "paypal", // Takes priority over field.gateway
    // Gateway-specific configuration
    merchantId: "...",
    paymentType: "one_time",
    amount: { type: "fixed", value: 10, currency: "USD" },
    paymentMethods: { paypal: true, cards: true },
    behavior: { collectBillingAddress: false }
  }
}
```

## Benefits of This Architecture

### 1. **Scalability**

- Easy to add new payment gateways
- No modification of existing code required
- Clean separation of concerns

### 2. **Maintainability**

- Each gateway has its own dedicated editor
- Gateway-specific logic is isolated
- Easy to test individual gateways

### 3. **Flexibility**

- Support for multiple gateways in same form
- Gateway-specific features and configurations
- Graceful handling of unsupported gateways

### 4. **Developer Experience**

- Clear structure for adding new gateways
- Consistent interface across all gateways
- Comprehensive utility functions

## Utility Functions

### `getAvailablePaymentGateways()`

Returns list of all payment gateways with support status:

```javascript
const gateways = getAvailablePaymentGateways();
// Returns: [{ id: "paypal", name: "PayPal", supported: true, ... }]
```

### `createPaymentField(gateway, fieldId)`

Creates a new payment field with proper structure:

```javascript
const field = createPaymentField("paypal", "field-123");
// Returns properly structured payment field
```

## Error Handling

### Unsupported Gateways

When a gateway is not yet implemented, the router shows a user-friendly fallback:

- Clear error message
- List of supported gateways
- Information about upcoming gateways
- Maintains form functionality

### Invalid Configurations

- Graceful degradation for malformed field data
- Default values for missing configuration
- Clear error messages for developers

## Testing Strategy

### Unit Tests

- **PaymentFieldEditor.test.js**: Router logic and gateway detection
- **PayPalFieldEditor.test.js**: PayPal-specific functionality
- **[Gateway]FieldEditor.test.js**: Each gateway editor

### Integration Tests

- Full payment field configuration flow
- Gateway switching scenarios
- Form save/load with payment fields

## Future Enhancements

### 1. **Dynamic Gateway Loading**

```javascript
// Lazy load gateway editors
const PayPalEditor = lazy(() => import("./PayPalFieldEditor"));
```

### 2. **Gateway Plugins**

```javascript
// Plugin-based architecture
registerPaymentGateway("custom", CustomGatewayEditor);
```

### 3. **Gateway Capabilities**

```javascript
// Gateway-specific capabilities
const capabilities = getGatewayCapabilities("paypal");
// Returns: { subscriptions: true, donations: true, ... }
```

## Migration Guide

### From Direct PayPal Import

**Before:**

```javascript
import PayPalFieldEditor from "./payment-fields/PayPalFieldEditor";
```

**After:**

```javascript
import PaymentFieldEditor from "./payment-fields/PaymentFieldEditor";
```

### Field Type Updates

No changes required - existing `paypal_payment` fields work automatically.

## Success Metrics

✅ **Modularity**: Each gateway is self-contained
✅ **Scalability**: Easy to add new gateways  
✅ **Maintainability**: Clear separation of concerns
✅ **Testability**: Comprehensive test coverage
✅ **User Experience**: Graceful error handling
✅ **Developer Experience**: Clear architecture and utilities

---

This architecture provides a solid foundation for supporting multiple payment gateways while maintaining clean, maintainable code.
