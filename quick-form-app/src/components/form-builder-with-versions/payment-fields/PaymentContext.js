import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
} from "react";

/**
 * PaymentContext - Provides userId and formId to all payment components
 *
 * This context ensures all payment API calls have the required parameters
 * for the new form data architecture.
 */

const PaymentContext = createContext();

export const usePaymentContext = () => {
  const context = useContext(PaymentContext);
  if (!context) {
    throw new Error("usePaymentContext must be used within a PaymentProvider");
  }
  return context;
};

export const PaymentProvider = ({ children, userId, formId }) => {
  const [paymentContext, setPaymentContext] = useState({
    userId: userId || "default-user",
    formId: formId || "default-form",
  });

  const previousValuesRef = useRef({ userId: null, formId: null });

  // NEW: Local payment data state
  const [paymentData, setPaymentData] = useState({
    subscriptionPlans: [],
    donationPlans: [],
    products: [],
    transactions: [],
  });

  // Update context when props change
  useEffect(() => {
    console.log("🔍 PaymentContext: useEffect triggered", {
      userId,
      formId,
      previousUserId: previousValuesRef.current.userId,
      previousFormId: previousValuesRef.current.formId,
      timestamp: new Date().toISOString(),
    });

    if (
      userId &&
      formId &&
      (userId !== previousValuesRef.current.userId ||
        formId !== previousValuesRef.current.formId)
    ) {
      console.log("🔍 PaymentContext: Setting payment context", {
        userId,
        formId,
      });
      previousValuesRef.current = { userId, formId };
      setPaymentContext({
        userId,
        formId,
      });
    } else {
      console.log(
        "🔍 PaymentContext: Skipping context update - same values or missing data"
      );
    }
  }, [userId, formId]); // Fixed: Remove circular dependency

  // Enhanced API request function that automatically includes context
  const makePaymentApiRequest = async (
    endpoint,
    method,
    payload,
    errorMessage
  ) => {
    const enhancedPayload = {
      userId: paymentContext.userId,
      formId: paymentContext.formId,
      ...payload,
    };

    try {
      console.log(`🚀 Payment API Request: ${method} ${endpoint}`, {
        payload: enhancedPayload,
        timestamp: new Date().toISOString(),
      });

      const res = await fetch(endpoint, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(enhancedPayload),
      });

      console.log(`📡 API Response Status: ${res.status} ${res.statusText}`);

      let data;
      try {
        data = await res.json();
        console.log(`📦 API Response Data:`, data);
      } catch (parseError) {
        console.error("❌ Failed to parse response as JSON:", parseError);
        throw new Error("Invalid JSON response from server");
      }

      if (!res.ok) {
        console.error(`❌ API Error (${res.status}):`, {
          status: res.status,
          statusText: res.statusText,
          data: data,
          endpoint,
          payload: enhancedPayload,
        });
        throw new Error(
          data.error ||
            data.message ||
            `API Error: ${res.status} ${res.statusText}`
        );
      }

      // NEW: Handle payment data updates from backend responses
      if (data.success && data.updateType) {
        handlePaymentDataUpdate(data);
      }

      return { success: true, ...data };
    } catch (e) {
      console.error(`❌ ${errorMessage}:`, {
        error: e.message,
        stack: e.stack,
        endpoint,
        payload: enhancedPayload,
        timestamp: new Date().toISOString(),
      });

      // Handle different types of errors
      if (e.name === "TypeError" && e.message.includes("fetch")) {
        return {
          success: false,
          error: "Network error - please check your connection",
          isNetworkError: true,
        };
      }

      if (e.name === "SyntaxError") {
        return {
          success: false,
          error: "Invalid response from server",
          isNetworkError: false,
        };
      }

      return {
        success: false,
        error: e.message || errorMessage,
        isNetworkError: false,
      };
    }
  };

  // NEW: Handle payment data updates from backend responses
  const handlePaymentDataUpdate = (responseData) => {
    console.log("🔄 Handling payment data update:", responseData.updateType);

    setPaymentData((prevData) => {
      const newData = { ...prevData };

      switch (responseData.updateType) {
        case "add-subscription-plan":
          if (responseData.subscriptionPlan) {
            newData.subscriptionPlans = [
              ...prevData.subscriptionPlans,
              responseData.subscriptionPlan,
            ];
            console.log("✅ Added subscription plan to local state");
          }
          break;

        case "add-donation-plan":
          if (responseData.donationPlan) {
            newData.donationPlans = [
              ...prevData.donationPlans,
              responseData.donationPlan,
            ];
            console.log("✅ Added donation plan to local state");
          }
          break;

        case "add-product":
          if (responseData.product) {
            newData.products = [...prevData.products, responseData.product];
            console.log("✅ Added product to local state");
          }
          break;

        case "add-transaction":
          if (responseData.transaction) {
            newData.transactions = [
              ...prevData.transactions,
              responseData.transaction,
            ];
            console.log("✅ Added transaction to local state");
          }
          break;

        default:
          console.log("⚠️ Unknown update type:", responseData.updateType);
      }

      return newData;
    });
  };

  // NEW: Save form with all payment data
  const saveFormWithPayments = async (additionalFormData = {}) => {
    try {
      console.log("💾 Saving form with payment data...");

      // Combine payment data with additional form data
      const completeFormData = {
        ...additionalFormData,
        subscriptionPlans: paymentData.subscriptionPlans,
        donationPlans: paymentData.donationPlans,
        products: paymentData.products,
        transactions: paymentData.transactions,
        lastUpdated: new Date().toISOString(),
      };

      const result = await makePaymentApiRequest(
        "/api/payment-gateway", // Use the appropriate endpoint
        "POST",
        {
          action: "save-form-with-payments",
          formData: completeFormData,
        },
        "Failed to save form with payment data"
      );

      if (result.success) {
        console.log("✅ Form saved successfully with payment data");
      }

      return result;
    } catch (error) {
      console.error("❌ Error saving form with payments:", error);
      return {
        success: false,
        error: error.message || "Failed to save form",
      };
    }
  };

  // NEW: Load payment data from form
  const loadPaymentData = async (merchantId = "default-merchant") => {
    try {
      console.log("📥 Loading payment data from form...");

      const result = await makePaymentApiRequest(
        "/api/payment-gateway", // Use the appropriate endpoint
        "POST",
        {
          action: "list-items",
          merchantId: merchantId,
        },
        "Failed to load payment data"
      );

      if (result.success && result.items) {
        // Organize items by type
        const subscriptionPlans = result.items.filter(
          (item) => item.type === "subscription"
        );
        const donationPlans = result.items.filter(
          (item) => item.type === "donation"
        );
        const products = result.items.filter((item) => item.type === "product");

        setPaymentData({
          subscriptionPlans,
          donationPlans,
          products,
          transactions: paymentData.transactions, // Keep existing transactions
        });

        console.log("✅ Payment data loaded successfully");
      }

      return result;
    } catch (error) {
      console.error("❌ Error loading payment data:", error);
      return {
        success: false,
        error: error.message || "Failed to load payment data",
      };
    }
  };

  const contextValue = {
    userId: paymentContext.userId,
    formId: paymentContext.formId,
    setPaymentContext,
    makePaymentApiRequest,
    // NEW: Payment data management
    paymentData,
    setPaymentData,
    handlePaymentDataUpdate,
    saveFormWithPayments,
    loadPaymentData,
  };

  return (
    <PaymentContext.Provider value={contextValue}>
      {children}
    </PaymentContext.Provider>
  );
};

export default PaymentContext;
