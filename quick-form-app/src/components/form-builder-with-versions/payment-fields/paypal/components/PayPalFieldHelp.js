import React, { useState } from "react";
import {
  FaQuestionCircle,
  FaInfoCircle,
  FaExclamationTriangle,
  FaCheckCircle,
  FaTimes,
  FaChevronDown,
  FaChevronRight,
  FaExternalLinkAlt,
} from "react-icons/fa";

/**
 * PayPalFieldHelp Component
 *
 * Comprehensive help and documentation system for PayPal payment field configuration
 * Includes tooltips, help modals, troubleshooting guides, and contextual help
 */

// Help content data structure
const helpContent = {
  merchantAccount: {
    title: "Merchant Account Setup",
    description: "Connect your PayPal business account to accept payments",
    content: [
      {
        type: "step",
        title: "Step 1: Create PayPal Business Account",
        content:
          "Visit PayPal.com and create a business account if you don't have one already.",
        link: "https://www.paypal.com/us/business",
      },
      {
        type: "step",
        title: "Step 2: Complete Account Verification",
        content:
          "Verify your business information and bank account details in your PayPal dashboard.",
      },
      {
        type: "step",
        title: "Step 3: Connect Account",
        content:
          "Click 'Add Account' in the merchant account section and follow the onboarding process.",
      },
    ],
    troubleshooting: [
      {
        issue: "Account connection fails",
        solution:
          "Ensure your PayPal account is verified and has business status. Check that you're using the correct login credentials.",
      },
      {
        issue: "Limited payment methods available",
        solution:
          "Some payment methods require additional verification. Contact PayPal support to enable advanced features.",
      },
    ],
  },
  paymentTypes: {
    title: "Payment Types",
    description: "Choose the right payment type for your needs",
    content: [
      {
        type: "option",
        title: "One-time Payment",
        content:
          "Single payment for products or services. Best for: e-commerce, donations, service payments.",
        pros: [
          "Simple setup",
          "Immediate payment",
          "No recurring billing complexity",
        ],
        cons: ["Manual for repeat purchases"],
      },
      {
        type: "option",
        title: "Subscription",
        content:
          "Recurring payments at regular intervals. Best for: memberships, SaaS, recurring services.",
        pros: [
          "Automated recurring billing",
          "Predictable revenue",
          "Customer retention",
        ],
        cons: [
          "Requires subscription plan setup",
          "More complex cancellation handling",
        ],
      },
      {
        type: "option",
        title: "Donation",
        content:
          "Flexible payment amounts for charitable giving. Best for: nonprofits, fundraising, tips.",
        pros: [
          "Flexible amounts",
          "Donor-friendly interface",
          "Tax-deductible options",
        ],
        cons: [
          "Variable revenue",
          "Requires nonprofit verification for tax benefits",
        ],
      },
    ],
  },
  amountConfiguration: {
    title: "Amount Configuration",
    description: "Set up how payment amounts are determined",
    content: [
      {
        type: "option",
        title: "Fixed Amount",
        content: "Set a specific amount that all users will pay.",
        example: "Product price: $29.99",
      },
      {
        type: "option",
        title: "Variable Amount",
        content: "Allow amounts within a specified range.",
        example: "Donation: $10 - $1000",
      },
      {
        type: "option",
        title: "Custom Amount",
        content: "Users enter their own amount with optional limits.",
        example: "Pay what you want: minimum $5",
      },
      {
        type: "option",
        title: "Product Based",
        content: "Amount determined by selected product from your catalog.",
        example: "Choose from: Basic ($10), Pro ($25), Enterprise ($50)",
      },
    ],
  },
  paymentMethods: {
    title: "Payment Methods",
    description: "Configure which payment options to offer customers",
    content: [
      {
        type: "method",
        title: "PayPal",
        content: "PayPal account payments - always available",
        availability: "Always available",
      },
      {
        type: "method",
        title: "Credit/Debit Cards",
        content: "Direct card payments without PayPal account",
        availability: "Available with verified business account",
      },
      {
        type: "method",
        title: "Venmo",
        content: "Popular mobile payment method in the US",
        availability: "US merchants only, requires approval",
      },
      {
        type: "method",
        title: "Google Pay",
        content: "Google's digital wallet service",
        availability: "Requires merchant approval",
      },
    ],
  },
  troubleshooting: {
    title: "Common Issues & Solutions",
    description: "Resolve common PayPal integration problems",
    content: [
      {
        type: "issue",
        title: "Payment field shows 'Not Supported'",
        symptoms: ["Field appears grayed out", "Error message displayed"],
        causes: [
          "Merchant account not connected",
          "Invalid field configuration",
        ],
        solutions: [
          "Check merchant account connection status",
          "Verify PayPal account is business type",
          "Refresh account capabilities",
          "Contact support if issue persists",
        ],
      },
      {
        type: "issue",
        title: "Payments fail during checkout",
        symptoms: [
          "Users can't complete payment",
          "Error during PayPal redirect",
        ],
        causes: [
          "Account limitations",
          "Insufficient permissions",
          "API configuration issues",
        ],
        solutions: [
          "Check PayPal account status and limitations",
          "Verify webhook endpoints are configured",
          "Test with different payment methods",
          "Review PayPal developer console for errors",
        ],
      },
      {
        type: "issue",
        title: "Missing payment methods",
        symptoms: [
          "Expected payment options not showing",
          "Limited checkout options",
        ],
        causes: [
          "Account not approved for advanced features",
          "Geographic restrictions",
        ],
        solutions: [
          "Complete PayPal business verification",
          "Apply for advanced payment features",
          "Check supported countries/regions",
          "Contact PayPal merchant support",
        ],
      },
    ],
  },
};

// Tooltip component for inline help
export const HelpTooltip = ({ content, title, placement = "top" }) => {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <div className="relative inline-block">
      <button
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
        onClick={() => setIsVisible(!isVisible)}
        className="text-gray-400 hover:text-gray-600 ml-1"
        type="button"
      >
        <FaQuestionCircle size={14} />
      </button>

      {isVisible && (
        <div
          className={`absolute z-50 w-64 p-3 bg-gray-900 text-white text-sm rounded-lg shadow-lg ${
            placement === "top" ? "bottom-full mb-2" : "top-full mt-2"
          } left-1/2 transform -translate-x-1/2`}
        >
          {title && <div className="font-semibold mb-1">{title}</div>}
          <div>{content}</div>
          <div
            className={`absolute w-2 h-2 bg-gray-900 transform rotate-45 ${
              placement === "top" ? "top-full -mt-1" : "bottom-full -mb-1"
            } left-1/2 -translate-x-1/2`}
          ></div>
        </div>
      )}
    </div>
  );
};

// Help section component
const HelpSection = ({ section, isExpanded, onToggle }) => {
  const data = helpContent[section];

  return (
    <div className="border border-gray-200 rounded-lg mb-4">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50"
      >
        <div className="flex items-center gap-3">
          <FaInfoCircle className="text-blue-600" />
          <div>
            <h3 className="font-medium text-gray-900">{data.title}</h3>
            <p className="text-sm text-gray-600">{data.description}</p>
          </div>
        </div>
        {isExpanded ? <FaChevronDown /> : <FaChevronRight />}
      </button>

      {isExpanded && (
        <div className="px-4 pb-4 border-t border-gray-100">
          <div className="mt-4 space-y-4">
            {data.content.map((item, index) => (
              <div key={index} className="bg-gray-50 p-3 rounded-lg">
                {item.type === "step" && (
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">
                      {item.title}
                    </h4>
                    <p className="text-sm text-gray-700 mb-2">{item.content}</p>
                    {item.link && (
                      <a
                        href={item.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700"
                      >
                        Learn more <FaExternalLinkAlt size={12} />
                      </a>
                    )}
                  </div>
                )}

                {item.type === "option" && (
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">
                      {item.title}
                    </h4>
                    <p className="text-sm text-gray-700 mb-2">{item.content}</p>
                    {item.example && (
                      <div className="text-xs text-gray-600 bg-white p-2 rounded border">
                        <strong>Example:</strong> {item.example}
                      </div>
                    )}
                    {item.pros && (
                      <div className="mt-2">
                        <div className="text-xs font-medium text-green-700 mb-1">
                          Pros:
                        </div>
                        <ul className="text-xs text-green-600 list-disc list-inside">
                          {item.pros.map((pro, i) => (
                            <li key={i}>{pro}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {item.cons && (
                      <div className="mt-2">
                        <div className="text-xs font-medium text-red-700 mb-1">
                          Cons:
                        </div>
                        <ul className="text-xs text-red-600 list-disc list-inside">
                          {item.cons.map((con, i) => (
                            <li key={i}>{con}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}

                {item.type === "method" && (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium text-gray-900">
                        {item.title}
                      </h4>
                      <span className="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded">
                        {item.availability}
                      </span>
                    </div>
                    <p className="text-sm text-gray-700">{item.content}</p>
                  </div>
                )}

                {item.type === "issue" && (
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2 flex items-center gap-2">
                      <FaExclamationTriangle className="text-yellow-600" />
                      {item.title}
                    </h4>

                    <div className="mb-3">
                      <div className="text-xs font-medium text-gray-700 mb-1">
                        Symptoms:
                      </div>
                      <ul className="text-xs text-gray-600 list-disc list-inside">
                        {item.symptoms.map((symptom, i) => (
                          <li key={i}>{symptom}</li>
                        ))}
                      </ul>
                    </div>

                    <div className="mb-3">
                      <div className="text-xs font-medium text-gray-700 mb-1">
                        Possible Causes:
                      </div>
                      <ul className="text-xs text-gray-600 list-disc list-inside">
                        {item.causes.map((cause, i) => (
                          <li key={i}>{cause}</li>
                        ))}
                      </ul>
                    </div>

                    <div>
                      <div className="text-xs font-medium text-green-700 mb-1">
                        Solutions:
                      </div>
                      <ul className="text-xs text-green-600 list-disc list-inside">
                        {item.solutions.map((solution, i) => (
                          <li key={i}>{solution}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}
              </div>
            ))}

            {data.troubleshooting && (
              <div className="mt-4">
                <h4 className="font-medium text-gray-900 mb-2 flex items-center gap-2">
                  <FaExclamationTriangle className="text-yellow-600" />
                  Troubleshooting
                </h4>
                <div className="space-y-2">
                  {data.troubleshooting.map((item, index) => (
                    <div
                      key={index}
                      className="bg-yellow-50 border border-yellow-200 p-3 rounded"
                    >
                      <div className="font-medium text-yellow-800 text-sm mb-1">
                        {item.issue}
                      </div>
                      <div className="text-sm text-yellow-700">
                        {item.solution}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// Main help modal component
const PayPalFieldHelp = ({ isOpen, onClose, initialSection = null }) => {
  const [expandedSections, setExpandedSections] = useState(
    initialSection ? { [initialSection]: true } : {}
  );

  const toggleSection = (section) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg max-w-4xl w-full m-4 max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex justify-between items-center p-6 border-b">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              PayPal Payment Field Help
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Complete guide to configuring PayPal payment fields
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl font-bold w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100"
          >
            <FaTimes />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-4">
            {Object.keys(helpContent).map((section) => (
              <HelpSection
                key={section}
                section={section}
                isExpanded={expandedSections[section]}
                onToggle={() => toggleSection(section)}
              />
            ))}
          </div>

          {/* Quick Links */}
          <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h3 className="font-medium text-blue-900 mb-3 flex items-center gap-2">
              <FaInfoCircle />
              Additional Resources
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <a
                href="https://developer.paypal.com/docs/"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm text-blue-700 hover:text-blue-800"
              >
                <FaExternalLinkAlt size={12} />
                PayPal Developer Documentation
              </a>
              <a
                href="https://www.paypal.com/us/business/accept-payments"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm text-blue-700 hover:text-blue-800"
              >
                <FaExternalLinkAlt size={12} />
                PayPal Business Solutions
              </a>
              <a
                href="https://www.paypal.com/us/smarthelp/contact-us"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm text-blue-700 hover:text-blue-800"
              >
                <FaExternalLinkAlt size={12} />
                PayPal Support Center
              </a>
              <a
                href="https://www.paypal.com/us/business/fees"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm text-blue-700 hover:text-blue-800"
              >
                <FaExternalLinkAlt size={12} />
                PayPal Fees & Pricing
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Context-aware help button
export const ContextualHelp = ({ section, className = "" }) => {
  const [showHelp, setShowHelp] = useState(false);

  return (
    <>
      <button
        onClick={() => setShowHelp(true)}
        className={`inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 ${className}`}
        type="button"
      >
        <FaQuestionCircle size={14} />
        Help
      </button>

      <PayPalFieldHelp
        isOpen={showHelp}
        onClose={() => setShowHelp(false)}
        initialSection={section}
      />
    </>
  );
};

export default PayPalFieldHelp;
