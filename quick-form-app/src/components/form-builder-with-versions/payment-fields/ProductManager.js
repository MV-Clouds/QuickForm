import React, { useState, useEffect } from "react";
import {
  FaPlus,
  FaEdit,
  FaTrash,
  FaSpinner,
  FaInfoCircle,
} from "react-icons/fa";
import {
  fetchItems,
  createItem,
  updateItem,
  deleteItem,
  toggleItemStatus,
} from "./paypal/api/paypalApi";

const ProductManager = ({ selectedMerchantId, typeFilter = "product" }) => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState(null);

  const [form, setForm] = useState({
    type: typeFilter,
    name: "",
    merchantId: selectedMerchantId,
    price: "",
    defaultAmount: "",
    status: "enabled",
    description: "",
  });

  // Load items when merchant changes
  useEffect(() => {
    if (selectedMerchantId) {
      loadItems();
    }
  }, [selectedMerchantId, typeFilter]);

  // Update form merchantId when selectedMerchantId changes
  useEffect(() => {
    setForm((prev) => ({ ...prev, merchantId: selectedMerchantId }));
  }, [selectedMerchantId]);

  const loadItems = async () => {
    setLoading(true);
    setError("");
    try {
      const result = await fetchItems(selectedMerchantId);
      if (result.success) {
        const filteredItems = result.items.filter(
          (item) => item.type === typeFilter
        );
        setItems(filteredItems);
      } else {
        setError(result.error || "Failed to load items");
      }
    } catch (err) {
      setError("Failed to load items");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const itemData = {
        ...form,
        merchantId: selectedMerchantId,
      };

      let result;
      if (editingItem) {
        result = await updateItem({ ...itemData, id: editingItem.id });
      } else {
        result = await createItem(itemData);
      }

      if (result.success) {
        setSuccess(
          editingItem
            ? "Item updated successfully"
            : "Item created successfully"
        );
        setShowForm(false);
        setEditingItem(null);
        setForm({
          type: typeFilter,
          name: "",
          merchantId: selectedMerchantId,
          price: "",
          defaultAmount: "",
          status: "enabled",
          description: "",
        });
        loadItems();
      } else {
        setError(result.error || "Failed to save item");
      }
    } catch (err) {
      setError("Failed to save item");
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (item) => {
    setEditingItem(item);
    setForm({
      type: item.type,
      name: item.name || "",
      merchantId: item.merchantId || selectedMerchantId,
      price: item.price || "",
      defaultAmount: item.defaultAmount || "",
      status: item.status || "enabled",
      description: item.description || "",
    });
    setShowForm(true);
  };

  const handleDelete = async (item) => {
    if (!window.confirm(`Are you sure you want to delete "${item.name}"?`)) {
      return;
    }

    setLoading(true);
    setError("");
    try {
      const result = await deleteItem(item.id, selectedMerchantId, item.type);
      if (result.success) {
        setSuccess("Item deleted successfully");
        loadItems();
      } else {
        setError(result.error || "Failed to delete item");
      }
    } catch (err) {
      setError("Failed to delete item");
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async (item) => {
    setLoading(true);
    setError("");
    try {
      const newStatus = item.status === "enabled" ? "disabled" : "enabled";
      const result = await toggleItemStatus(
        item.id,
        selectedMerchantId,
        newStatus
      );
      if (result.success) {
        setSuccess(`Item ${newStatus} successfully`);
        loadItems();
      } else {
        setError(result.error || "Failed to update status");
      }
    } catch (err) {
      setError("Failed to update status");
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingItem(null);
    setForm({
      type: typeFilter,
      name: "",
      merchantId: selectedMerchantId,
      price: "",
      defaultAmount: "",
      status: "enabled",
      description: "",
    });
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
    <div className="product-manager">
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">
          Manage {typeFilter.charAt(0).toUpperCase() + typeFilter.slice(1)}s
        </h3>
        <button
          onClick={() => setShowForm(true)}
          className="inline-flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <FaPlus size={14} />
          Add {typeFilter.charAt(0).toUpperCase() + typeFilter.slice(1)}
        </button>
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
        <div className="mb-6 p-4 border border-gray-200 rounded-lg">
          <h4 className="text-md font-medium mb-4">
            {editingItem ? "Edit" : "Create"}{" "}
            {typeFilter.charAt(0).toUpperCase() + typeFilter.slice(1)}
          </h4>
          <form onSubmit={handleSubmit} className="space-y-4">
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

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Price/Amount *
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={form.price}
                  onChange={(e) => setForm({ ...form, price: e.target.value })}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Default Amount
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={form.defaultAmount}
                  onChange={(e) =>
                    setForm({ ...form, defaultAmount: e.target.value })
                  }
                  className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="flex gap-2">
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <FaSpinner className="animate-spin" />
                ) : editingItem ? (
                  "Update"
                ) : (
                  "Create"
                )}
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
        {loading && !showForm ? (
          <div className="flex items-center justify-center p-8">
            <FaSpinner className="animate-spin text-blue-600" />
            <span className="ml-2">Loading...</span>
          </div>
        ) : items.length === 0 ? (
          <div className="text-center p-8 text-gray-500">
            <p>No {typeFilter}s found</p>
          </div>
        ) : (
          items.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between p-3 border border-gray-200 rounded-lg"
            >
              <div className="flex-1">
                <h4 className="font-medium">{item.name}</h4>
                {item.description && (
                  <p className="text-sm text-gray-600">{item.description}</p>
                )}
                <p className="text-sm text-gray-500">
                  ${item.price}{" "}
                  {item.defaultAmount && `(Default: $${item.defaultAmount})`}
                </p>
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
    </div>
  );
};

export default ProductManager;
