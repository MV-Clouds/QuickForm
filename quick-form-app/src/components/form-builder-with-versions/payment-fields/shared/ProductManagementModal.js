import React, { useState, useEffect } from "react";
import {
  FaTimes,
  FaPlus,
  FaEdit,
  FaTrash,
  FaSpinner,
  FaSave,
  FaInfoCircle,
} from "react-icons/fa";

/**
 * ProductManagementModal Component
 *
 * Modal for managing products in product-wise payment fields
 * Products are stored in form data, not synced with external APIs
 */
const ProductManagementModal = ({
  isOpen,
  onClose,
  selectedField,
  onUpdateField,
  selectedMerchantId,
}) => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Form states
  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [form, setForm] = useState({
    id: "",
    name: "",
    description: "",
    price: "",
    currency: "USD",
    status: "enabled",
    sku: "",
    category: "",
  });

  // Get products from field data
  useEffect(() => {
    if (isOpen && selectedField) {
      loadProducts();
    }
  }, [isOpen, selectedField]);

  const loadProducts = () => {
    const fieldProducts = selectedField?.subFields?.products || [];
    setProducts(fieldProducts);
    console.log("📦 Loaded products:", fieldProducts);
  };

  const resetForm = () => {
    setForm({
      id: "",
      name: "",
      description: "",
      price: "",
      currency: "USD",
      status: "enabled",
      sku: "",
      category: "",
    });
    setEditingProduct(null);
    setError("");
  };

  const handleCreateNew = () => {
    resetForm();
    setShowForm(true);
  };

  const handleEdit = (product) => {
    setForm({
      id: product.id,
      name: product.name || "",
      description: product.description || "",
      price: product.price?.toString() || "",
      currency: product.currency || "USD",
      status: product.status || "enabled",
      sku: product.sku || "",
      category: product.category || "",
    });
    setEditingProduct(product);
    setShowForm(true);
  };

  const handleDelete = (productId) => {
    if (!window.confirm("Are you sure you want to delete this product?")) {
      return;
    }

    const updatedProducts = products.filter(
      (product) => product.id !== productId
    );

    updateFieldProducts(updatedProducts);
    setSuccess("Product deleted successfully");
  };

  const handleSave = () => {
    // Validate form
    if (!form.name.trim()) {
      setError("Product name is required");
      return;
    }

    if (!form.price || parseFloat(form.price) < 0) {
      setError("Valid price is required");
      return;
    }

    const productData = {
      id: editingProduct ? editingProduct.id : `product-${Date.now()}`,
      name: form.name.trim(),
      description: form.description.trim(),
      price: parseFloat(form.price),
      currency: form.currency,
      status: form.status,
      sku: form.sku.trim(),
      category: form.category.trim(),
      createdAt: editingProduct
        ? editingProduct.createdAt
        : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    let updatedProducts;

    if (editingProduct) {
      // Update existing
      updatedProducts = products.map((product) =>
        product.id === editingProduct.id ? productData : product
      );
      setSuccess("Product updated successfully");
    } else {
      // Add new
      updatedProducts = [...products, productData];
      setSuccess("Product created successfully");
    }

    updateFieldProducts(updatedProducts);
    setShowForm(false);
    resetForm();
  };

  const updateFieldProducts = (updatedProducts) => {
    setProducts(updatedProducts);

    // Update the field data
    const updatedSubFields = {
      ...selectedField.subFields,
      products: updatedProducts,
    };

    onUpdateField(selectedField.id, { subFields: updatedSubFields });
  };

  const handleFormChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setError(""); // Clear error when user types
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999]">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            Product Management
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <FaTimes size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          {/* Status Messages */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}

          {success && (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-green-700 text-sm">{success}</p>
            </div>
          )}

          {!showForm ? (
            <>
              {/* Action Buttons */}
              <div className="flex gap-3 mb-6">
                <button
                  onClick={handleCreateNew}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <FaPlus size={14} />
                  Create New Product
                </button>
              </div>

              {/* Products List */}
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <FaSpinner className="animate-spin mr-2" />
                  <span>Loading products...</span>
                </div>
              ) : products.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <FaInfoCircle className="mx-auto mb-4 text-4xl" />
                  <p className="mb-4">No products configured yet.</p>
                  <p className="text-sm">
                    Create products to use in your product-wise payment form.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {products.map((product) => (
                    <div
                      key={product.id}
                      className="border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="font-medium text-gray-900">
                              {product.name}
                            </h3>
                            <span
                              className={`px-2 py-1 text-xs rounded-full ${
                                product.status === "enabled"
                                  ? "bg-green-100 text-green-800"
                                  : "bg-gray-100 text-gray-800"
                              }`}
                            >
                              {product.status}
                            </span>
                          </div>

                          {product.description && (
                            <p className="text-sm text-gray-600 mb-2">
                              {product.description}
                            </p>
                          )}

                          <div className="flex items-center gap-4 text-sm text-gray-500">
                            <span className="font-medium text-blue-600">
                              {product.currency} {product.price}
                            </span>
                            {product.sku && <span>SKU: {product.sku}</span>}
                            {product.category && (
                              <span>Category: {product.category}</span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleEdit(product)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Edit product"
                          >
                            <FaEdit size={14} />
                          </button>

                          <button
                            onClick={() => handleDelete(product.id)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Delete product"
                          >
                            <FaTrash size={14} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            /* Product Form */
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-800">
                  {editingProduct ? "Edit Product" : "Create New Product"}
                </h3>
                <button
                  onClick={() => {
                    setShowForm(false);
                    resetForm();
                  }}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <FaTimes size={16} />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Product Name *
                  </label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => handleFormChange("name", e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter product name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Price *
                  </label>
                  <div className="flex gap-2">
                    <select
                      value={form.currency}
                      onChange={(e) =>
                        handleFormChange("currency", e.target.value)
                      }
                      className="px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="USD">USD</option>
                      <option value="EUR">EUR</option>
                      <option value="GBP">GBP</option>
                      <option value="CAD">CAD</option>
                      <option value="AUD">AUD</option>
                    </select>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={form.price}
                      onChange={(e) =>
                        handleFormChange("price", e.target.value)
                      }
                      className="flex-1 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="0.00"
                    />
                  </div>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description
                  </label>
                  <textarea
                    value={form.description}
                    onChange={(e) =>
                      handleFormChange("description", e.target.value)
                    }
                    rows={3}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter product description"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    SKU
                  </label>
                  <input
                    type="text"
                    value={form.sku}
                    onChange={(e) => handleFormChange("sku", e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Product SKU"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Category
                  </label>
                  <input
                    type="text"
                    value={form.category}
                    onChange={(e) =>
                      handleFormChange("category", e.target.value)
                    }
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Product category"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Status
                  </label>
                  <select
                    value={form.status}
                    onChange={(e) => handleFormChange("status", e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="enabled">Enabled</option>
                    <option value="disabled">Disabled</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-6 border-t border-gray-200">
                <button
                  onClick={() => {
                    setShowForm(false);
                    resetForm();
                  }}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                >
                  Cancel
                </button>

                <button
                  onClick={handleSave}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <FaSave size={14} />
                  {editingProduct ? "Update Product" : "Create Product"}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {!showForm && (
          <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
            >
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProductManagementModal;
