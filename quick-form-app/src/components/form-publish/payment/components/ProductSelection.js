import React from "react";
import { formatCurrency } from "../utils/paymentHelpers";
import { FaCheck, FaShoppingCart, FaTag } from "react-icons/fa";

/**
 * Product Selection Component
 * Allows users to select multiple products and shows total price
 */
const ProductSelection = ({
  products = [],
  selectedProducts = [], // Changed from selectedProduct to selectedProducts array
  onProductSelection,
  currency = "USD",
  allowMultiple = true, // New prop to control single vs multiple selection
}) => {
  if (!products || products.length === 0) {
    return (
      <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
        <div className="flex items-center gap-2">
          <FaShoppingCart className="text-yellow-600" />
          <p className="text-yellow-800 text-sm font-medium">
            No products available for selection.
          </p>
        </div>
        <p className="text-yellow-700 text-xs mt-1">
          Please configure products in the form builder or contact support.
        </p>
      </div>
    );
  }

  // Handle product selection/deselection
  const handleProductClick = (product) => {
    console.log("Product clicked:", product);
    console.log("allow : ", allowMultiple);
    if (!allowMultiple) {
      // Single selection mode
      onProductSelection(product);
      return;
    }


    // Multiple selection mode - ensure selectedProducts is an array
    const currentSelection = Array.isArray(selectedProducts) ? selectedProducts : [];
    const isSelected = currentSelection.some((p) => p.id === product.id);
    let newSelection;

    if (isSelected) {
      // Remove product from selection
      newSelection = currentSelection.filter((p) => p.id !== product.id);
    } else {
      // Add product to selection
      newSelection = [...currentSelection, product];
    }

    onProductSelection(newSelection);
  };

  // Calculate total price for selected products
  const calculateTotal = () => {
    if (Array.isArray(selectedProducts)) {
      return selectedProducts.reduce(
        (total, product) => total + (product.price || 0),
        0
      );
    } else {
      return selectedProducts?.price || 0;
    }
  };

  const totalPrice = calculateTotal();
  const hasSelection = Array.isArray(selectedProducts)
    ? selectedProducts.length > 0
    : !!selectedProducts;

  return (
    <div className="mb-6">
      <h4 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
        <FaShoppingCart className="text-blue-600" />
        {allowMultiple ? "Select Products" : "Select a Product"}
      </h4>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {products.map((product) => {
          const isSelected = Array.isArray(selectedProducts)
            ? selectedProducts.some((p) => p.id === product.id)
            : selectedProducts?.id === product.id;

          return (
            <button
            // type="button"
              key={product.id}
              onClick={() => handleProductClick(product)}
              className={`p-4 border-2 rounded-lg transition-all duration-200 text-left relative ${
                isSelected
                  ? "border-blue-500 bg-blue-50 shadow-md transform scale-105"
                  : "border-gray-200 hover:border-gray-300 hover:shadow-sm hover:bg-gray-50"
              }`}
            >
              {/* Selection indicator */}
              {isSelected && (
                <div className="absolute top-2 right-2">
                  <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                    <FaCheck className="w-3 h-3 text-white" />
                  </div>
                </div>
              )}

              {/* Discount badge */}
              {product.originalPrice &&
                product.originalPrice > product.price && (
                  <div className="absolute -top-2 -right-2 bg-red-500 text-white text-xs px-2 py-1 rounded-full">
                    Save{" "}
                    {Math.round(
                      ((product.originalPrice - product.price) /
                        product.originalPrice) *
                        100
                    )}
                    %
                  </div>
                )}

              {/* Product name */}
              <h5 className="font-medium text-gray-900 mb-2 pr-8">
                {product.name}
              </h5>

              {/* Product description */}
              {product.description && (
                <p className="text-gray-600 text-sm mb-3 line-clamp-2">
                  {product.description}
                </p>
              )}

              {/* Price */}
              <div className="mb-3">
                <div className="flex items-baseline gap-2">
                  <span className="text-lg font-bold text-gray-900">
                    {formatCurrency(product.price, currency)}
                  </span>
                  {product.originalPrice &&
                    product.originalPrice > product.price && (
                      <span className="text-sm text-gray-500 line-through">
                        {formatCurrency(product.originalPrice, currency)}
                      </span>
                    )}
                </div>
                {product.originalPrice &&
                  product.originalPrice > product.price && (
                    <div className="text-xs text-green-600 font-medium">
                      Save{" "}
                      {formatCurrency(
                        product.originalPrice - product.price,
                        currency
                      )}
                    </div>
                  )}
              </div>

              {/* Features */}
              {product.features && product.features.length > 0 && (
                <div className="mb-3">
                  <ul className="text-xs text-gray-600 space-y-1">
                    {product.features.slice(0, 3).map((feature, index) => (
                      <li key={index} className="flex items-center gap-1">
                        <FaTag className="w-2 h-2 text-blue-500 flex-shrink-0" />
                        {feature}
                      </li>
                    ))}
                    {product.features.length > 3 && (
                      <li className="text-gray-500 italic text-xs">
                        +{product.features.length - 3} more features
                      </li>
                    )}
                  </ul>
                </div>
              )}

              {/* Category */}
              {product.category && (
                <div className="mt-2">
                  <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                    {product.category}
                  </span>
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Selection summary */}
      {hasSelection && (
        <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <FaCheck className="text-green-600" />
            <span className="text-green-800 font-medium">
              {Array.isArray(selectedProducts)
                ? `Selected ${selectedProducts.length} product${
                    selectedProducts.length !== 1 ? "s" : ""
                  }`
                : `Selected: ${selectedProducts.name}`}
            </span>
          </div>

          {Array.isArray(selectedProducts) ? (
            <div className="space-y-2">
              {/* List selected products */}
              <div className="text-sm text-green-700">
                {selectedProducts.map((product) => (
                  <div
                    key={product.id}
                    className="flex justify-between items-center"
                  >
                    <span>{product.name}</span>
                    <span>{formatCurrency(product.price, currency)}</span>
                  </div>
                ))}
              </div>

              {/* Total price */}
              <div className="flex justify-between items-center pt-2 border-t border-green-300">
                <span className="font-medium text-green-800">Total:</span>
                <span className="font-bold text-green-800 text-lg">
                  {formatCurrency(totalPrice, currency)}
                </span>
              </div>
            </div>
          ) : (
            <div className="flex justify-between items-center text-sm">
              <span className="text-green-700">
                Price: {formatCurrency(selectedProducts.price, currency)}
              </span>
              {selectedProducts.originalPrice &&
                selectedProducts.originalPrice > selectedProducts.price && (
                  <span className="text-green-600 font-medium">
                    You save{" "}
                    {formatCurrency(
                      selectedProducts.originalPrice - selectedProducts.price,
                      currency
                    )}
                    !
                  </span>
                )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ProductSelection;
