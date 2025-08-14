# PayPal Payment Field - Developer Documentation

## Overview

This document provides comprehensive technical documentation for developers working with the PayPal payment field integration in the form builder system.

## Architecture Overview

### Component Hierarchy

```
PaymentFieldEditor (Router)
└── PayPalFieldEditorTabs (Main Interface)
    ├── MerchantAccountSelector (Account Management)
    ├── FormProductManager (Product/Subscription Management)
    ├── PayPalFieldHelp (Help System)
    └── Various Configuration Components
```

### Data Flow

```
Form Builder → PaymentFieldEditor → PayPalFieldEditorTabs → Field JSON → DynamoDB
                                                        ↓
                                                   PayPal APIs
```

## Component API Reference

### PaymentFieldEditor

**Purpose**: Routes payment fields to appropriate gateway editors

**Props**:

```typescript
interface PaymentFieldEditorProps {
  selectedField: FormField;
  onUpdateField: (fieldId: string, updates: object) => void;
  className?: string;
}
```

**Usage**:

```javascript
<PaymentFieldEditor
  selectedField={selectedField}
  onUpdateField={handleFieldUpdate}
  className="mb-4"
/>
```

### PayPalFieldEditorTabs

**Purpose**: Main PayPal configuration interface with tabbed layout

**Props**:

```typescript
interface PayPalFieldEditorTabsProps {
  selectedField: FormField;
  onUpdateField: (fieldId: string, updates: object) => void;
  className?: string;
}
```

**State Management**:

```javascript
// Tab and UI state
const [activeTab, setActiveTab] = useState("account");
const [expandedSections, setExpandedSections] = useState({
  account: true,
  paymentMethods: true,
  behavior: false,
});

// PayPal configuration state
const [selectedMerchantId, setSelectedMerchantId] = useState("");
const [paymentType, setPaymentType] = useState("one_time");
const [capabilities, setCapabilities] = useState(null);
const [accountStatus, setAccountStatus] = useState(null);
```

### MerchantAccountSelector

**Purpose**: Handles PayPal merchant account selection and onboarding

**Props**:

```typescript
interface MerchantAccountSelectorProps {
  selectedMerchantId: string;
  onMerchantChange: (merchantId: string) => void;
  onCapabilitiesChange?: (capabilities: object) => void;
  disabled?: boolean;
  className?: string;
}
```

**API Integration**:

```javascript
// Fetch merchant accounts
const fetchOnboardedAccounts = async () => {
  const response = await apiRequest(
    API_ENDPOINTS.PAYMENT_ONBOARDING_HANDLER_API,
    "POST",
    { action: "list-accounts" },
    "Failed to fetch merchant accounts"
  );
  return response;
};
```

### FormProductManager

**Purpose**: Manages products, subscriptions, and donations within form data

**Props**:

```typescript
interface FormProductManagerProps {
  selectedField: FormField;
  onUpdateField: (fieldId: string, updates: object) => void;
  selectedMerchantId: string;
  typeFilter: "product" | "subscription" | "donation";
  onClose: () => void;
}
```

**Data Structure**:

```javascript
// Form items stored in field JSON
const formItems = {
  product_1: {
    id: "product_1",
    type: "product",
    name: "Premium Plan",
    price: "29.99",
    currency: "USD",
    description: "Premium subscription plan",
    sku: "PREM-001",
    status: "enabled",
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
    merchantId: "merchant-123",
  },
};
```

## Data Structures

### Form Field JSON Structure

```javascript
{
  id: "field-1",
  type: "paypal_payment",
  label: "Payment Information",
  gateway: "paypal",
  subFields: {
    // Gateway identification
    gateway: "paypal",

    // Merchant configuration
    merchantId: "merchant-123",

    // Payment type configuration
    paymentType: "one_time", // "one_time" | "subscription" | "donation"

    // Amount configuration
    amount: {
      type: "fixed", // "fixed" | "variable" | "custom" | "product_based" | "subscription_based" | "donation_based"
      value: 29.99,
      currency: "USD",
      minAmount: "5.00",
      maxAmount: "1000.00",
      suggestedAmounts: "10,25,50,100",
      productId: "product_1"
    },

    // Payment methods configuration
    paymentMethods: {
      paypal: true,
      cards: true,
      venmo: false,
      googlePay: false
    },

    // Field behavior settings
    behavior: {
      collectBillingAddress: false,
      collectShippingAddress: false
    },

    // Form-specific items (products, subscriptions, donations)
    formItems: {
      "product_1": { /* Product object */ },
      "subscription_1": { /* Subscription object */ },
      "donation_1": { /* Donation object */ }
    },

    // Subscription-specific configuration
    subscription: {
      planId: "subscription_1",
      frequency: "monthly",
      trialPeriod: "7"
    },

    // Donation-specific configuration
    donation: {
      id: "donation_1",
      suggestedAmounts: [10, 25, 50, 100],
      allowCustomAmount: true
    }
  }
}
```

### API Response Structures

**Merchant Accounts Response**:

```javascript
{
  success: true,
  accounts: [
    {
      Id: "account-id",
      Name: "Business Name",
      Merchant_ID__c: "merchant-123",
      Merchant_Tracking_ID__c: "tracking-456",
      Payment_Provider__c: "PayPal",
      Status__c: "Active"
    }
  ],
  hasAccounts: true
}
```

**Capabilities Response**:

```javascript
{
  success: true,
  capabilities: {
    subscriptions: true,
    donations: true,
    venmo: true,
    googlePay: false,
    cards: true,
    payLater: false
  }
}
```

## API Integration

### PayPal API Endpoints

**Base Configuration**:

```javascript
import { API_ENDPOINTS } from "../../../config";

// API endpoints used
const endpoints = {
  PAYMENT_ONBOARDING_HANDLER_API: API_ENDPOINTS.PAYMENT_ONBOARDING_HANDLER_API,
  PAYMENT_API: API_ENDPOINTS.PAYMENT_API,
  PRODUCT_API: API_ENDPOINTS.PRODUCT_API,
};
```

**Common API Actions**:

1. **List Merchant Accounts**:

```javascript
const response = await apiRequest(
  API_ENDPOINTS.PAYMENT_ONBOARDING_HANDLER_API,
  "POST",
  { action: "list-accounts" },
  "Failed to fetch merchant accounts"
);
```

2. **Get Merchant Capabilities**:

```javascript
const response = await initiatePayment({
  action: "get-merchant-capabilities",
  merchantId: selectedMerchantId,
});
```

3. **Fetch Products/Subscriptions**:

```javascript
const response = await fetchItems(merchantId);
```

4. **Import PayPal Subscriptions**:

```javascript
const response = await syncPaypalSubscriptions(merchantId);
```

### Error Handling

**API Request Handler**:

```javascript
export const apiRequest = async (endpoint, method, payload, errorMessage) => {
  try {
    const res = await fetch(endpoint, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || data.message || `API Error: ${res.status}`);
    }

    return { success: true, ...data };
  } catch (e) {
    return {
      success: false,
      error: e.message || errorMessage,
      isNetworkError: e.name === "TypeError" && e.message.includes("fetch"),
    };
  }
};
```

## State Management

### Field Updates

**Update Pattern**:

```javascript
const updateField = (updates) => {
  const updatedSubFields = {
    ...selectedField.subFields,
    ...updates,
  };
  onUpdateField(selectedField.id, { subFields: updatedSubFields });
};

// Usage examples
updateField({ merchantId: "new-merchant-id" });
updateField({
  amount: {
    ...selectedField.subFields.amount,
    type: "variable",
  },
});
```

### Form Items Management

**Adding Items**:

```javascript
const saveItemsToFormData = (updatedItems) => {
  const currentFormItems = selectedField?.subFields?.formItems || {};
  const newFormItems = { ...currentFormItems };

  // Remove old items of this type
  Object.keys(newFormItems).forEach((key) => {
    if (newFormItems[key].type === typeFilter) {
      delete newFormItems[key];
    }
  });

  // Add updated items
  updatedItems.forEach((item) => {
    newFormItems[item.id] = item;
  });

  updateField({ formItems: newFormItems });
};
```

## Testing

### Unit Testing

**Test Structure**:

```javascript
describe("PayPalFieldEditorTabs", () => {
  const mockField = {
    id: "field-1",
    type: "paypal_payment",
    subFields: {
      /* field configuration */
    },
  };

  const mockOnUpdateField = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("renders PayPal field editor with tabs", () => {
    render(
      <PayPalFieldEditorTabs
        selectedField={mockField}
        onUpdateField={mockOnUpdateField}
      />
    );
    // Test assertions
  });
});
```

**Mocking Dependencies**:

```javascript
// Mock API calls
jest.mock("./paypalApi", () => ({
  initiatePayment: jest.fn(() =>
    Promise.resolve({
      success: true,
      capabilities: { subscriptions: true },
    })
  ),
  fetchItems: jest.fn(() =>
    Promise.resolve({
      success: true,
      items: [],
    })
  ),
}));

// Mock components
jest.mock("./MerchantAccountSelector", () => {
  return function MockMerchantAccountSelector({ onMerchantChange }) {
    return (
      <div data-testid="merchant-account-selector">
        <button onClick={() => onMerchantChange("test-merchant")}>
          Select Merchant
        </button>
      </div>
    );
  };
});
```

### Integration Testing

**Form Builder Integration**:

```javascript
test("integrates with form builder field updates", () => {
  const mockOnUpdateField = jest.fn();

  render(
    <PayPalFieldEditorTabs
      selectedField={mockField}
      onUpdateField={mockOnUpdateField}
    />
  );

  // Simulate user interaction
  fireEvent.change(screen.getByDisplayValue("One-time Payment"), {
    target: { value: "subscription" },
  });

  // Verify field update
  expect(mockOnUpdateField).toHaveBeenCalledWith("field-1", {
    subFields: expect.objectContaining({
      paymentType: "subscription",
    }),
  });
});
```

## Performance Considerations

### Optimization Strategies

1. **Lazy Loading**:

```javascript
// Lazy load heavy components
const FormProductManager = lazy(() => import("./FormProductManager"));

// Use Suspense for loading states
<Suspense fallback={<LoadingSpinner />}>
  <FormProductManager {...props} />
</Suspense>;
```

2. **Memoization**:

```javascript
// Memoize expensive calculations
const formItems = useMemo(() => {
  const items = selectedField?.subFields?.formItems || {};
  return Object.values(items).filter((item) => item.type === typeFilter);
}, [selectedField?.subFields?.formItems, typeFilter]);

// Memoize callback functions
const handleMerchantChange = useCallback(
  (merchantId) => {
    setSelectedMerchantId(merchantId);
    updateField({ merchantId });
  },
  [updateField]
);
```

3. **Debounced API Calls**:

```javascript
// Debounce status checks
const debouncedStatusCheck = useMemo(
  () => debounce(checkAccountStatus, 1000),
  [checkAccountStatus]
);
```

### Bundle Size Optimization

**Code Splitting**:

```javascript
// Split by payment gateway
const PayPalFieldEditor = lazy(() => import("./PayPalFieldEditor"));
const StripeFieldEditor = lazy(() => import("./StripeFieldEditor"));

// Dynamic imports based on gateway
const loadGatewayEditor = (gateway) => {
  switch (gateway) {
    case "paypal":
      return import("./PayPalFieldEditor");
    case "stripe":
      return import("./StripeFieldEditor");
    default:
      return Promise.resolve(null);
  }
};
```

## Security Considerations

### Data Protection

1. **No Sensitive Data Storage**:

```javascript
// Never store sensitive payment data
const sanitizedField = {
  ...field,
  // Remove any sensitive data before storage
  subFields: {
    ...field.subFields,
    // Only store configuration, not payment details
  },
};
```

2. **API Security**:

```javascript
// Validate API responses
const validateApiResponse = (response) => {
  if (!response || typeof response !== "object") {
    throw new Error("Invalid API response");
  }

  if (!response.success && !response.error) {
    throw new Error("Malformed API response");
  }

  return response;
};
```

### Input Validation

```javascript
// Validate merchant ID format
const validateMerchantId = (merchantId) => {
  if (!merchantId || typeof merchantId !== "string") {
    return false;
  }

  // PayPal merchant ID pattern
  return /^[A-Z0-9]{13}$/.test(merchantId);
};

// Validate amount values
const validateAmount = (amount) => {
  const numAmount = parseFloat(amount);
  return !isNaN(numAmount) && numAmount >= 0 && numAmount <= 999999.99;
};
```

## Extending the System

### Adding New Payment Gateways

1. **Create Gateway Editor**:

```javascript
// StripeFieldEditor.js
const StripeFieldEditor = ({ selectedField, onUpdateField, className }) => {
  // Stripe-specific implementation
  return <div className={className}>{/* Stripe configuration UI */}</div>;
};
```

2. **Update Payment Router**:

```javascript
// PaymentFieldEditor.js
case "stripe":
  return (
    <StripeFieldEditor
      selectedField={selectedField}
      onUpdateField={onUpdateField}
      className={className}
    />
  );
```

3. **Update Gateway Detection**:

```javascript
// Add to getPaymentGateway function
if (field.type === "stripe_payment") {
  return "stripe";
}
```

### Adding New Configuration Options

1. **Update Field Structure**:

```javascript
// Add new configuration to subFields
const newConfigOption = {
  ...selectedField.subFields,
  newFeature: {
    enabled: false,
    settings: {},
  },
};
```

2. **Create UI Component**:

```javascript
const NewFeatureConfig = ({ value, onChange }) => {
  return <div className="new-feature-config">{/* Configuration UI */}</div>;
};
```

3. **Integrate with Main Editor**:

```javascript
// Add to appropriate tab in PayPalFieldEditorTabs
{
  activeTab === "advanced" && (
    <NewFeatureConfig
      value={selectedField.subFields.newFeature}
      onChange={(value) => updateField({ newFeature: value })}
    />
  );
}
```

## Troubleshooting

### Common Development Issues

1. **Component Not Rendering**:

   - Check field type detection in `isPaymentField()`
   - Verify gateway detection in `getPaymentGateway()`
   - Ensure proper props are passed

2. **API Calls Failing**:

   - Verify API endpoints configuration
   - Check network connectivity
   - Validate request payload format

3. **State Updates Not Working**:
   - Ensure `onUpdateField` callback is properly connected
   - Check field ID matches
   - Verify state update structure

### Debugging Tools

**Console Logging**:

```javascript
// Enable debug logging
const DEBUG = process.env.NODE_ENV === "development";

const debugLog = (message, data) => {
  if (DEBUG) {
    console.log(`[PayPal Field Debug] ${message}`, data);
  }
};
```

**React DevTools**:

- Use React DevTools to inspect component state
- Monitor prop changes and re-renders
- Check context values and hook states

## Migration Guide

### Upgrading from Previous Versions

1. **Field Structure Changes**:

```javascript
// Old structure
const oldField = {
  paypalConfig: {
    /* old config */
  },
};

// New structure
const newField = {
  subFields: {
    gateway: "paypal",
    /* new config structure */
  },
};
```

2. **API Changes**:

```javascript
// Update API calls to use new endpoints
// Update response handling for new data structures
```

3. **Component Updates**:

```javascript
// Update component imports
// Update prop interfaces
// Update event handlers
```

## Support and Resources

### Internal Resources

- Component source code and tests
- API documentation
- Integration examples

### External Resources

- PayPal Developer Documentation
- PayPal Business API Reference
- PayPal Webhooks Guide

### Getting Help

- Check existing tests for usage examples
- Review component documentation
- Consult PayPal developer resources
- Contact development team for specific issues

---

_This documentation is maintained by the development team and updated with each release._
