# Merchant Capabilities Fixes

## ✅ **Issues Fixed**

### **1. Missing userId/formId Error:**

- **❌ Problem:** API was expecting userId/formId but lambda function only needs merchantId
- **✅ Fixed:** Updated `fetchMerchantCapabilities` to only send merchantId
- **✅ Enhanced:** Added proper response handling for capabilities data

### **2. Auto-Selected Merchant Not Triggering Capability Fetch:**

- **❌ Problem:** When first merchant was auto-selected, capabilities weren't fetched
- **✅ Fixed:** Added capability fetch when merchant is auto-selected
- **✅ Enhanced:** Added useEffect to fetch capabilities when selectedMerchantId changes

## 🔧 **Changes Made**

### **1. Updated paypalApi.js - fetchMerchantCapabilities:**

```javascript
// ✅ BEFORE: Raw response
export const fetchMerchantCapabilities = async (merchantId) => {
  return await apiRequest(/* ... */);
};

// ✅ AFTER: Proper response handling
export const fetchMerchantCapabilities = async (merchantId) => {
  const response = await apiRequest(
    API_ENDPOINTS.UNIFIED_PAYMENT_API,
    "POST",
    { action: "get-merchant-capabilities", merchantId }, // Only merchantId needed
    "Failed to fetch merchant capabilities"
  );

  return {
    ...response,
    capabilities: response.success ? response.capabilities || {} : {},
  };
};
```

### **2. Updated MerchantAccountSelector.js:**

#### **Fixed Function Name and API Call:**

```javascript
// ✅ BEFORE: Using initiatePayment (wrong)
const result = await initiatePayment({
  action: "get-merchant-capabilities",
  merchantId,
});

// ✅ AFTER: Using proper API function
const result = await fetchMerchantCapabilities(merchantId);
```

#### **Added Auto-Selection Capability Fetch:**

```javascript
// ✅ BEFORE: Only called onMerchantChange
if (!selectedMerchantId && result.accounts?.length > 0) {
  onMerchantChange(result.accounts[0].Merchant_ID__c);
}

// ✅ AFTER: Also fetches capabilities
if (!selectedMerchantId && result.accounts?.length > 0) {
  const firstMerchantId = result.accounts[0].Merchant_ID__c;
  onMerchantChange(firstMerchantId);
  // Also fetch capabilities for auto-selected merchant
  fetchCapabilities(firstMerchantId);
}
```

#### **Added useEffect for selectedMerchantId Changes:**

```javascript
// ✅ NEW: Fetch capabilities when selectedMerchantId changes
useEffect(() => {
  if (selectedMerchantId) {
    console.log(
      "🔍 selectedMerchantId changed, fetching capabilities:",
      selectedMerchantId
    );
    fetchCapabilities(selectedMerchantId);
  }
}, [selectedMerchantId]);
```

## 🎯 **Expected Behavior Now**

### **1. On First Load:**

1. **✅ Fetch merchant accounts**
2. **✅ Auto-select first merchant**
3. **✅ Automatically fetch capabilities for selected merchant**
4. **✅ Display capabilities in UI**

### **2. On Merchant Change:**

1. **✅ User selects different merchant**
2. **✅ Automatically fetch capabilities for new merchant**
3. **✅ Update capabilities display**

### **3. API Call Structure:**

```javascript
// ✅ Correct API call (no userId/formId needed)
{
  action: "get-merchant-capabilities",
  merchantId: "MERCHANT_ID_HERE"
}

// ✅ Expected response
{
  success: true,
  capabilities: {
    subscriptions: true,
    donations: true,
    venmo: false,
    googlePay: false,
    cards: true,
    payLater: false
  }
}
```

## 🚀 **Benefits**

### **1. No More Missing Parameter Errors:**

- **✅ Only sends required merchantId**
- **✅ No more userId/formId errors**
- **✅ Matches lambda function expectations**

### **2. Automatic Capability Loading:**

- **✅ Capabilities load on first merchant selection**
- **✅ Capabilities update when merchant changes**
- **✅ Better user experience with automatic loading**

### **3. Proper Error Handling:**

- **✅ Better error messages**
- **✅ Retry functionality**
- **✅ Loading states**

## 🎉 **Result**

Your MerchantAccountSelector should now:

- **✅ Load capabilities automatically when first merchant is selected**
- **✅ Update capabilities when merchant changes**
- **✅ Not throw userId/formId errors**
- **✅ Display proper capability information**

The merchant capabilities should now work correctly! 🎉
