import { useReducer, useCallback, useEffect, useMemo } from "react";

// Action types
const ACTIONS = {
  INITIALIZE_STATE: "INITIALIZE_STATE",
  UPDATE_MERCHANT: "UPDATE_MERCHANT",
  UPDATE_PAYMENT_TYPE: "UPDATE_PAYMENT_TYPE",
  UPDATE_AMOUNT_CONFIG: "UPDATE_AMOUNT_CONFIG",
  UPDATE_PAYMENT_METHODS: "UPDATE_PAYMENT_METHODS",
  UPDATE_BEHAVIOR: "UPDATE_BEHAVIOR",
  UPDATE_CAPABILITIES: "UPDATE_CAPABILITIES",
  UPDATE_ACCOUNT_STATUS: "UPDATE_ACCOUNT_STATUS",
  RESET_STATE: "RESET_STATE",
  SYNC_FROM_SUBFIELDS: "SYNC_FROM_SUBFIELDS",
};

// Initial state
const initialState = {
  // Merchant configuration
  selectedMerchantId: "",
  capabilities: null,
  accountStatus: null,
  statusLoading: false,
  merchantDataLoaded: false,

  // Payment configuration
  paymentType: "product_wise",

  // Amount configuration
  amount: {
    type: "fixed",
    value: 0,
    currency: "USD",
    minAmount: "",
    maxAmount: "",
  },

  // Payment methods
  paymentMethods: {
    paypal: true,
    cards: true,
    venmo: false,
    googlePay: false,
  },

  // Behavior settings
  behavior: {
    collectBillingAddress: false,
    collectShippingAddress: false,
  },

  // UI state
  activeTab: "account",
  expandedSections: {
    account: true,
    paymentMethods: true,
    behavior: false,
  },

  // Metadata
  isInitialized: false,
  lastUpdated: null,
  isDirty: false,
};

// State reducer
function paymentFieldReducer(state, action) {
  switch (action.type) {
    case ACTIONS.INITIALIZE_STATE:
      return {
        ...state,
        ...action.payload,
        isInitialized: true,
        lastUpdated: new Date().toISOString(),
        isDirty: false,
      };

    case ACTIONS.UPDATE_MERCHANT:
      return {
        ...state,
        selectedMerchantId: action.payload.merchantId,
        capabilities: action.payload.capabilities || state.capabilities,
        accountStatus: action.payload.accountStatus || state.accountStatus,
        merchantDataLoaded: true,
        lastUpdated: new Date().toISOString(),
        isDirty: true,
      };

    case ACTIONS.UPDATE_PAYMENT_TYPE:
      return {
        ...state,
        paymentType: action.payload,
        lastUpdated: new Date().toISOString(),
        isDirty: true,
      };

    case ACTIONS.UPDATE_AMOUNT_CONFIG:
      return {
        ...state,
        amount: {
          ...state.amount,
          ...action.payload,
        },
        lastUpdated: new Date().toISOString(),
        isDirty: true,
      };

    case ACTIONS.UPDATE_PAYMENT_METHODS:
      return {
        ...state,
        paymentMethods: {
          ...state.paymentMethods,
          ...action.payload,
        },
        lastUpdated: new Date().toISOString(),
        isDirty: true,
      };

    case ACTIONS.UPDATE_BEHAVIOR:
      return {
        ...state,
        behavior: {
          ...state.behavior,
          ...action.payload,
        },
        lastUpdated: new Date().toISOString(),
        isDirty: true,
      };

    case ACTIONS.UPDATE_CAPABILITIES:
      return {
        ...state,
        capabilities: action.payload,
        lastUpdated: new Date().toISOString(),
      };

    case ACTIONS.UPDATE_ACCOUNT_STATUS:
      return {
        ...state,
        accountStatus: action.payload.status,
        statusLoading: action.payload.loading || false,
        lastUpdated: new Date().toISOString(),
      };

    case ACTIONS.SYNC_FROM_SUBFIELDS:
      const { subFields } = action.payload;
      return {
        ...state,
        selectedMerchantId:
          subFields.merchantAccountId ||
          subFields.merchantId ||
          state.selectedMerchantId,
        paymentType: subFields.paymentType || state.paymentType,
        amount: {
          type: subFields.amount?.type || state.amount.type,
          value: subFields.amount?.value || state.amount.value,
          currency: subFields.amount?.currency || state.amount.currency,
          minAmount: subFields.amount?.minAmount || state.amount.minAmount,
          maxAmount: subFields.amount?.maxAmount || state.amount.maxAmount,
        },
        paymentMethods: {
          paypal: subFields.paymentMethods?.paypal !== false,
          cards: subFields.paymentMethods?.cards !== false,
          venmo: subFields.paymentMethods?.venmo || false,
          googlePay: subFields.paymentMethods?.googlePay || false,
        },
        behavior: {
          collectBillingAddress:
            subFields.behavior?.collectBillingAddress || false,
          collectShippingAddress:
            subFields.behavior?.collectShippingAddress || false,
        },
        isInitialized: true,
        lastUpdated: new Date().toISOString(),
        isDirty: false,
      };

    case ACTIONS.RESET_STATE:
      return {
        ...initialState,
        activeTab: state.activeTab, // Preserve UI state
        expandedSections: state.expandedSections,
      };

    default:
      return state;
  }
}

/**
 * Custom hook for managing payment field state
 * Provides centralized state management with proper persistence and synchronization
 */
export function usePaymentFieldState(subFields, onUpdateField, fieldId) {
  const [state, dispatch] = useReducer(paymentFieldReducer, initialState);

  // Initialize state from subFields on mount
  useEffect(() => {
    if (subFields && !state.isInitialized) {
      console.log(
        "🔄 Initializing payment field state from subFields:",
        subFields
      );
      dispatch({
        type: ACTIONS.SYNC_FROM_SUBFIELDS,
        payload: { subFields },
      });
    }
  }, [subFields, state.isInitialized]);

  // Sync state changes back to parent component
  const syncToParent = useCallback(
    (updates) => {
      if (onUpdateField && fieldId && state.isDirty) {
        console.log("💾 Syncing state to parent:", updates);
        onUpdateField(fieldId, { subFields: updates });

        // Mark as clean after sync
        dispatch({
          type: ACTIONS.SYNC_FROM_SUBFIELDS,
          payload: { subFields: updates },
        });
      }
    },
    [onUpdateField, fieldId, state.isDirty]
  );

  // Generate subFields object from current state
  const currentSubFields = useMemo(
    () => ({
      merchantId: state.selectedMerchantId, // Legacy support
      merchantAccountId: state.selectedMerchantId, // New approach
      paymentType: state.paymentType,
      amount: state.amount,
      paymentMethods: state.paymentMethods,
      behavior: state.behavior,
    }),
    [state]
  );

  // Auto-sync to parent when state changes
  useEffect(() => {
    if (state.isDirty && state.isInitialized) {
      const timeoutId = setTimeout(() => {
        syncToParent(currentSubFields);
      }, 500); // Debounce updates

      return () => clearTimeout(timeoutId);
    }
  }, [state.isDirty, state.isInitialized, syncToParent, currentSubFields]);

  // Action creators
  const actions = useMemo(
    () => ({
      updateMerchant: (
        merchantId,
        capabilities = null,
        accountStatus = null
      ) => {
        dispatch({
          type: ACTIONS.UPDATE_MERCHANT,
          payload: { merchantId, capabilities, accountStatus },
        });
      },

      updatePaymentType: (paymentType) => {
        dispatch({
          type: ACTIONS.UPDATE_PAYMENT_TYPE,
          payload: paymentType,
        });
      },

      updateAmountConfig: (amountConfig) => {
        dispatch({
          type: ACTIONS.UPDATE_AMOUNT_CONFIG,
          payload: amountConfig,
        });
      },

      updatePaymentMethods: (paymentMethods) => {
        dispatch({
          type: ACTIONS.UPDATE_PAYMENT_METHODS,
          payload: paymentMethods,
        });
      },

      updateBehavior: (behavior) => {
        dispatch({
          type: ACTIONS.UPDATE_BEHAVIOR,
          payload: behavior,
        });
      },

      updateCapabilities: (capabilities) => {
        dispatch({
          type: ACTIONS.UPDATE_CAPABILITIES,
          payload: capabilities,
        });
      },

      updateAccountStatus: (status, loading = false) => {
        dispatch({
          type: ACTIONS.UPDATE_ACCOUNT_STATUS,
          payload: { status, loading },
        });
      },

      syncFromSubFields: (subFields) => {
        dispatch({
          type: ACTIONS.SYNC_FROM_SUBFIELDS,
          payload: { subFields },
        });
      },

      resetState: () => {
        dispatch({ type: ACTIONS.RESET_STATE });
      },
    }),
    []
  );

  return {
    state,
    actions,
    currentSubFields,
    isInitialized: state.isInitialized,
    isDirty: state.isDirty,
    lastUpdated: state.lastUpdated,
  };
}

export default usePaymentFieldState;
