import React from "react";
import { formatCurrency } from "../utils/paymentHelpers";
import { FaCheck, FaShoppingCart, FaTag } from "react-icons/fa";

/**
 * Product Selection Component
 * Allows users to select from available products
 */
const ProductSelection = ({
  products = [],
  selectedProduct,
  onProductSelection,
  currency = "USD",
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

  return (
    <div className="mb-6">
      <h4 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
        <FaShoppingCart className="text-blue-600" />
        Select a Product
      </h4>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {products.map((product) => {
          const isSelected = selectedProduct?.id === product.id;

          return (
            <button
              key={product.id}
              onClick={() => onProductSelection(product)}
              className={`p-4 border-2 rounded-lg transition-all duration-200 text-left relative ${
                isSelected
                  ? "border-blue-500 bg-blue-50 shadow-md transform scale-105"
                  : "border-gray-200 hover:border-gray-300 hover:shadow-sm hover:bg-gray-50"
              }`}
            >
              {/* Discount badge */}
              {product.originalPrice &&
                product.originalPrice > product.price && (
                  <div className="absolute -top-2 -right-2 bg-red-500 text-white text-xs px-2 py-1 rounded-full">
                    <FaTag className="inline w-2 h-2 mr-1" />
                    {Math.round(
                      (1 - product.price / product.originalPrice) * 100
                    )}
                    % OFF
                  </div>
                )}

              <div className="flex justify-between items-start mb-2">
                <h5 className="font-medium text-gray-900 text-sm pr-2">
                  {product.name}
                </h5>
                {isSelected && (
                  <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
                    <FaCheck className="w-3 h-3 text-white" />
                  </div>
                )}
              </div>

              {product.description && (
                <p className="text-gray-600 text-xs mb-3 line-clamp-2">
                  {product.description}
                </p>
              )}

              <div className="flex justify-between items-center mb-3">
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

              {/* Stock status */}
              {product.stock !== undefined && (
                <div className="mb-3">
                  {product.stock > 0 ? (
                    <span className="text-xs text-green-600 bg-green-100 px-2 py-1 rounded">
                      {product.stock > 10
                        ? "In Stock"
                        : `${product.stock} left`}
                    </span>
                  ) : (
                    <span className="text-xs text-red-600 bg-red-100 px-2 py-1 rounded">
                      Out of Stock
                    </span>
                  )}
                </div>
              )}

              {product.features && product.features.length > 0 && (
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <ul className="text-xs text-gray-600 space-y-1">
                    {product.features.slice(0, 3).map((feature, index) => (
                      <li key={index} className="flex items-center gap-1">
                        <div className="w-1 h-1 bg-blue-400 rounded-full flex-shrink-0"></div>
                        <span className="truncate">{feature}</span>
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

      {selectedProduct && (
        <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <FaCheck className="text-green-600" />
            <span className="text-green-800 font-medium">
              Selected: {selectedProduct.name}
            </span>
          </div>
          <div className="flex justify-between items-center text-sm">
            <span className="text-green-700">
              Price: {formatCurrency(selectedProduct.price, currency)}
            </span>
            {selectedProduct.originalPrice &&
              selectedProduct.originalPrice > selectedProduct.price && (
                <span className="text-green-600 font-medium">
                  You save{" "}
                  {formatCurrency(
                    selectedProduct.originalPrice - selectedProduct.price,
                    currency
                  )}
                  !
                </span>
              )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductSelection;
