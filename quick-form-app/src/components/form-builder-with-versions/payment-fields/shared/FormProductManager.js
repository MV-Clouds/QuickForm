import React, { useState, useEffect } from "react";
import {
  FaPlus,
  FaEdit,
  FaTrash,
  FaSpinner,
  FaInfoCircle,
  FaDownload,
  FaSave,
  FaTimes,
} from "react-icons/fa";
import {
  fetchPaypalSubscriptions as syncPaypalSubscriptions,
  createItem as saveFormItems,
} from "../paypal/api/paypalApi";

/**
 * FormProductManager Component
 *
 * Manages products, subscriptions, and donations within form data
 * instead of syncing with external PayPal API.
 * Data is stored in the form's JSON structure and saved to DynamoDB.
 */
const FormProductManager = ({
  selectedField,
  onUpdateField,
  selectedMerchantId,
  typeFilter = "product",
  onClose,
}) => {
  // Get items from form field data instead of API
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [fetchingFromPayPal, setFetchingFromPayPal] = useState(false);

  const [form, setForm] = useState({
    id: "",
    type: typeFilter,
    name: "",
    description: "",
    price: "",
    currency: "USD",
    status: "enabled",
    // Subscription-specific fields
    frequency: "monthly",
    trialPeriod: "",
    // Donation-specific fields
    suggestedAmounts: "",
    allowCustomAmount: true,
    // Product-specific fields
    sku: "",
    inventory: "",
  });

  // Load items from form field data
  useEffect(() => {
    loadItemsFromFormData();
  }, [selectedField, typeFilter]);

  const loadItemsFromFormData = () => {
    if (!selectedField?.subFields?.formItems) {
      setItems([]);
      return;
    }

    const formItems = selectedField.subFields.formItems || {};
    const filteredItems = Object.values(formItems).filter(
      (item) => item.type === typeFilter
    );
    setItems(filteredItems);
  };

  const saveItemsToFormData = (updatedItems) => {
    const currentFormItems = selectedField?.subFields?.formItems || {};

    // Create a new formItems object with updated items
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

    // Update the field
    const updatedSubFields = {
      ...selectedField.subFields,
      formItems: newFormItems,
    };

    onUpdateField(selectedField.id, { subFields: updatedSubFields });
    setItems(updatedItems);
  };

  const generateId = () => {
    return `${typeFilter}_${Date.now()}_${Math.random()
      .toString(36)
      .substr(2, 9)}`;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const itemData = {
        ...form,
        id: editingItem ? editingItem.id : generateId(),
        createdAt: editingItem
          ? editingItem.createdAt
          : new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        merchantId: selectedMerchantId,
      };

      let updatedItems;
      if (editingItem) {
        updatedItems = items.map((item) =>
          item.id === editingItem.id ? itemData : item
        );
        setSuccess("Item updated successfully");
      } else {
        updatedItems = [...items, itemData];
        setSuccess("Item created successfully");
      }

      saveItemsToFormData(updatedItems);
      setShowForm(false);
      setEditingItem(null);
      resetForm();
    } catch (err) {
      setError("Failed to save item");
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (item) => {
    setEditingItem(item);
    setForm({
      id: item.id,
      type: item.type,
      name: item.name || "",
      description: item.description || "",
      price: item.price || "",
      currency: item.currency || "USD",
      status: item.status || "enabled",
      frequency: item.frequency || "monthly",
      trialPeriod: item.trialPeriod || "",
      suggestedAmounts: item.suggestedAmounts || "",
      allowCustomAmount: item.allowCustomAmount !== false,
      sku: item.sku || "",
      inventory: item.inventory || "",
    });
    setShowForm(true);
  };

  const handleDelete = (item) => {
    if (!window.confirm(`Are you sure you want to delete "${item.name}"?`)) {
      return;
    }

    const updatedItems = items.filter((i) => i.id !== item.id);
    saveItemsToFormData(updatedItems);
    setSuccess("Item deleted successfully");
  };

  const handleToggleStatus = (item) => {
    const newStatus = item.status === "enabled" ? "disabled" : "enabled";
    const updatedItems = items.map((i) =>
      i.id === item.id
        ? { ...i, status: newStatus, updatedAt: new Date().toISOString() }
        : i
    );
    saveItemsToFormData(updatedItems);
    setSuccess(`Item ${newStatus} successfully`);
  };

  const resetForm = () => {
    setForm({
      id: "",
      type: typeFilter,
      name: "",
      description: "",
      price: "",
      currency: "USD",
      status: "enabled",
      frequency: "monthly",
      trialPeriod: "",
      suggestedAmounts: "",
      allowCustomAmount: true,
      sku: "",
      inventory: "",
    });
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingItem(null);
    resetForm();
  };

  // Fetch subscriptions from PayPal and add to form data
  const handleFetchFromPayPal = async () => {
    if (!selectedMerchantId) {
      setError("Please select a merchant account first");
      return;
    }

    setFetchingFromPayPal(true);
    setError("");

    try {
      const result = await syncPaypalSubscriptions(selectedMerchantId);

      if (result.success && result.subscriptions) {
        const paypalItems = result.subscriptions.map((sub) => ({
          id: `paypal_${sub.id}`,
          type: typeFilter,
          name: sub.name || `PayPal ${typeFilter}`,
          description: sub.description || `Imported from PayPal`,
          price: sub.price || "0",
          currency: sub.currency || "USD",
          status: "enabled",
          paypalId: sub.id,
          frequency: sub.frequency || "monthly",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          merchantId: selectedMerchantId,
          source: "paypal",
        }));

        const updatedItems = [...items, ...paypalItems];
        saveItemsToFormData(updatedItems);
        setSuccess(
          `Successfully imported ${paypalItems.length} ${typeFilter}s from PayPal`
        );
      } else {
        setError(result.error || `Failed to fetch ${typeFilter}s from PayPal`);
      }
    } catch (err) {
      setError(`Error fetching ${typeFilter}s from PayPal: ${err.message}`);
    } finally {
      setFetchingFromPayPal(false);
    }
  };

  if (!selectedMerchantId) {
    return (
      <div className="p-4 text-center text-gray-500">
        <FaInfoCircle className="mx-auto mb-2" />
        <p>Please select a merchant account first</p>
      </div>
    );
  }

  return (
    <div className="form-product-manager">
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <div>
          <h3 className="text-lg font-semibold">
            Manage Form{" "}
            {typeFilter.charAt(0).toUpperCase() + typeFilter.slice(1)}s
          </h3>
          <p className="text-sm text-gray-600">
            These {typeFilter}s are stored with your form data
          </p>
        </div>
        <div className="flex gap-2">
          {typeFilter === "subscription" && (
            <button
              onClick={handleFetchFromPayPal}
              disabled={fetchingFromPayPal}
              className="inline-flex items-center gap-2 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
            >
              {fetchingFromPayPal ? (
                <FaSpinner className="animate-spin" size={14} />
              ) : (
                <FaDownload size={14} />
              )}
              Import from PayPal
            </button>
          )}
          <button
            onClick={() => setShowForm(true)}
            className="inline-flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <FaPlus size={14} />
            Add {typeFilter.charAt(0).toUpperCase() + typeFilter.slice(1)}
          </button>
        </div>
      </div>

      {/* Messages */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}
      {success && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-sm text-green-700">{success}</p>
        </div>
      )}

      {/* Form */}
      {showForm && (
        <div className="mb-6 p-4 border border-gray-200 rounded-lg bg-gray-50">
          <div className="flex justify-between items-center mb-4">
            <h4 className="text-md font-medium">
              {editingItem ? "Edit" : "Create"}{" "}
              {typeFilter.charAt(0).toUpperCase() + typeFilter.slice(1)}
            </h4>
            <button
              onClick={handleCancel}
              className="text-gray-500 hover:text-gray-700"
            >
              <FaTimes />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Name *
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Price *
                </label>
                <div className="flex">
                  <select
                    value={form.currency}
                    onChange={(e) =>
                      setForm({ ...form, currency: e.target.value })
                    }
                    className="px-3 py-2 border border-gray-300 rounded-l-lg bg-gray-50 text-sm"
                  >
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                    <option value="GBP">GBP</option>
                    <option value="CAD">CAD</option>
                  </select>
                  <input
                    type="number"
                    step="0.01"
                    value={form.price}
                    onChange={(e) =>
                      setForm({ ...form, price: e.target.value })
                    }
                    className="flex-1 p-2 border border-l-0 border-gray-300 rounded-r-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
                className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={3}
              />
            </div>

            {/* Subscription-specific fields */}
            {typeFilter === "subscription" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Billing Frequency
                  </label>
                  <select
                    value={form.frequency}
                    onChange={(e) =>
                      setForm({ ...form, frequency: e.target.value })
                    }
                    className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                    <option value="quarterly">Quarterly</option>
                    <option value="yearly">Yearly</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Trial Period (days)
                  </label>
                  <input
                    type="number"
                    value={form.trialPeriod}
                    onChange={(e) =>
                      setForm({ ...form, trialPeriod: e.target.value })
                    }
                    className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="0"
                  />
                </div>
              </div>
            )}

            {/* Donation-specific fields */}
            {typeFilter === "donation" && (
              <div>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Suggested Amounts (comma-separated)
                  </label>
                  <input
                    type="text"
                    value={form.suggestedAmounts}
                    onChange={(e) =>
                      setForm({ ...form, suggestedAmounts: e.target.value })
                    }
                    className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="10, 25, 50, 100"
                  />
                </div>
                <div>
                  <label className="inline-flex items-center">
                    <input
                      type="checkbox"
                      checked={form.allowCustomAmount}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          allowCustomAmount: e.target.checked,
                        })
                      }
                      className="mr-2"
                    />
                    <span className="text-sm text-gray-700">
                      Allow custom amount
                    </span>
                  </label>
                </div>
              </div>
            )}

            {/* Product-specific fields */}
            {typeFilter === "product" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    SKU
                  </label>
                  <input
                    type="text"
                    value={form.sku}
                    onChange={(e) => setForm({ ...form, sku: e.target.value })}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Optional"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Inventory
                  </label>
                  <input
                    type="number"
                    value={form.inventory}
                    onChange={(e) =>
                      setForm({ ...form, inventory: e.target.value })
                    }
                    className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Unlimited"
                  />
                </div>
              </div>
            )}

            <div className="flex gap-2 pt-4 border-t">
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {loading ? <FaSpinner className="animate-spin" /> : <FaSave />}
                {editingItem ? "Update" : "Create"}
              </button>
              <button
                type="button"
                onClick={handleCancel}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Items List */}
      <div className="space-y-2">
        {items.length === 0 ? (
          <div className="text-center p-8 text-gray-500 border-2 border-dashed border-gray-300 rounded-lg">
            <p>No {typeFilter}s found</p>
            <p className="text-sm">
              Create your first {typeFilter} to get started
            </p>
          </div>
        ) : (
          items.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50"
            >
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h4 className="font-medium">{item.name}</h4>
                  {item.source === "paypal" && (
                    <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded">
                      PayPal
                    </span>
                  )}
                </div>
                {item.description && (
                  <p className="text-sm text-gray-600">{item.description}</p>
                )}
                <div className="flex items-center gap-4 text-sm text-gray-500 mt-1">
                  <span>
                    {item.currency} {item.price}
                  </span>
                  {item.frequency && <span>{item.frequency}</span>}
                  {item.sku && <span>SKU: {item.sku}</span>}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`px-2 py-1 text-xs rounded-full ${
                    item.status === "enabled"
                      ? "bg-green-100 text-green-800"
                      : "bg-red-100 text-red-800"
                  }`}
                >
                  {item.status}
                </span>
                <button
                  onClick={() => handleEdit(item)}
                  className="p-1 text-blue-600 hover:text-blue-700"
                  title="Edit"
                >
                  <FaEdit size={14} />
                </button>
                <button
                  onClick={() => handleToggleStatus(item)}
                  className="p-1 text-orange-600 hover:text-orange-700"
                  title={`${item.status === "enabled" ? "Disable" : "Enable"}`}
                >
                  {item.status === "enabled" ? "Disable" : "Enable"}
                </button>
                <button
                  onClick={() => handleDelete(item)}
                  className="p-1 text-red-600 hover:text-red-700"
                  title="Delete"
                >
                  <FaTrash size={14} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Info */}
      <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="flex items-start gap-2">
          <FaInfoCircle className="text-blue-600 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-blue-800">
            <strong>Note:</strong> These {typeFilter}s are stored with your form
            data and will be available when users fill out this form. They are
            not synced with your PayPal account automatically.
          </div>
        </div>
      </div>
    </div>
  );
};

export default FormProductManager;
