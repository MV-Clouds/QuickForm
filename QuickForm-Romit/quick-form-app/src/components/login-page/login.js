import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Select, Button } from 'antd';
import './login.css'; // Import your CSS styles

const { Option } = Select;

const Login = () => {
  const [org, setOrg] = useState('Pick an option'); // Store selected Salesforce org
  const [isButtonDisabled, setIsButtonDisabled] = useState(true); // Track login button state
  const navigate = useNavigate(); // React Router navigation
  let popup = null; // Reference to popup window

  // Check if already logged in on mount
  useEffect(() => {
    sessionStorage.setItem('isLoggedIn', 'true');
    sessionStorage.setItem('userId', '005gL000002qyRxQAI'); // Clear userId
    sessionStorage.setItem('instanceUrl', 'https://orgfarm-53dd64db2b-dev-ed.develop.my.salesforce.com'); // Clear instanceUrl
    const isLoggedIn = sessionStorage.getItem('isLoggedIn') === 'true'; // Check login flag
    if (isLoggedIn) {
      navigate('/guest'); // Redirect to home if already logged in
    }

    // Add message event listener
    const handleMessage = (event) => {
      if (event.origin === 'https://d2gg09yhu3xa1a.cloudfront.net') {
        if (event.data.type === 'login_error') {
          if (popup && !popup.closed) {
            popup.close(); // Close popup on error
          }
        }
      }
      if (event.origin === 'https://ew2pvgsa59.execute-api.us-east-1.amazonaws.com') {
        if (event.data.type === 'login_success') {
          if (popup && !popup.closed) {
            popup.close(); // Close popup on success
          }
          sessionStorage.removeItem('org'); // Clear stored org
          sessionStorage.setItem('isLoggedIn', 'true'); // Set login flag
          sessionStorage.setItem('userId', event.data.userId); // Store userId
          sessionStorage.setItem('instanceUrl', event.data.instanceUrl); // Store instanceUrl
          navigate('/guest'); // Redirect to home
        } else if (event.data === 'login_failed') {
          alert('Login failed. Please try again.'); // Show error
        }
      }
    };

    window.addEventListener('message', handleMessage); // Add event listener

    // Clean up event listener on unmount
    return () => {
      window.removeEventListener('message', handleMessage); // Remove event listener
    };
  }, [navigate]);

  const handleOrgChange = (value) => {
    setOrg(value); // Update state
    setIsButtonDisabled(!value); // Enable button if org selected
  };

  const openPopup = () => {
    if (!org) return; // Do nothing if org not selected

    let base = 'https://d2gg09yhu3xa1a.cloudfront.net/auth/login'; // Base login URL
    const isLoggedIn = sessionStorage.getItem('isLoggedIn') === 'true'; // Check login status

    if (isLoggedIn) {
      base += '.html'; // Append .html if already logged in
    }

    const loginUrl = `${base}?org=${org}`; // Construct full login URL
    sessionStorage.setItem('org', org); // Store selected org

    const width = 600, height = 700; // Popup dimensions
    const left = window.screenX + (window.innerWidth - width) / 2; // Center horizontally
    const top = window.screenY + (window.innerHeight - height) / 2; // Center vertically

    const popupWindow = window.open(
      loginUrl,
      'SalesforceLogin',
      `width=${width},height=${height},left=${left},top=${top},status=no,toolbar=no,menubar=no`
    ); // Open popup window

    if (!popupWindow) {
      alert('Popup was blocked. Please allow popups for this site.'); // Show error if popup blocked
      return;
    }

    popup = popupWindow; // Store popup reference

    if (isLoggedIn) {
      if (popup && !popup.closed) {
        popup.close(); // Close popup immediately if already logged in
      }
      navigate('/guest'); // Redirect to home
    }
  };

  // Animation variants for page load
  const pageVariants = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } }
  };

  // Animation variants for dropdown
  const dropdownVariants = {
    hidden: { opacity: 0, scale: 0.95 },
    visible: { opacity: 1, scale: 1, transition: { duration: 0.3, ease: 'easeOut' } },
    focus: { 
      boxShadow: '0 0 0 2px #3b82f6',
      transition: { duration: 0.2 }
    }
  };

  return (
    <div className="min-h-screen bg-white font-sans">
      <motion.div
        className="login-page flex"
        variants={pageVariants}
        initial="initial"
        animate="animate"
      >
        <div className="content-container flex w-full">
          <div className="left-container">
            <div className="features-section">
              <p className="main-title">Streamline Your Workflow<br />with <span className="quickform-text">QuickForm</span></p>
              <div className="subtitle-div">
                <p className="subtitle">
                  Seamlessly integrate with Salesforce and manage your data with unparalleled efficiency. Focus on what matters most.
                </p>
              </div>
              <div className="features-container">
                <div className="feature">
                  <div className="icon-wrapper">
                    <img src="/images/flash_icon.svg" alt="Lightning Icon" className="feature-icon" />
                  </div>
                  <p className="feature-title">Lightning Fast</p>
                  <p className="feature-description">
                    Create and deploy forms in minutes, not hours.
                  </p>
                </div>
                <div className="feature">
                  <div className="icon-wrapper">
                    <img src="/images/deep_integration_icon.svg" alt="Camera Icon" className="feature-icon" />
                  </div>
                  <p className="feature-title">Deep Integration</p>
                  <p className="feature-description">
                    Native Salesforce connectivity for real-time data sync.
                  </p>
                </div>
                <div className="feature">
                  <div className="icon-wrapper">
                    <img src="/images/customizable_icon.svg" alt="Gear Icon" className="feature-icon" />
                  </div>
                  <p className="feature-title">Customizable</p>
                  <p className="feature-description">
                    Tailor forms to your exact needs with powerful design tools.
                  </p>
                </div>
                <div className="feature">
                  <div className="icon-wrapper">
                    <img src="/images/secure_icon.svg" alt="Shield Icon" className="feature-icon" />
                  </div>
                  <p className="feature-title">Secure & Reliable</p>
                  <p className="feature-description">
                    Enterprise-grade security to protect your valuable data.
                  </p>
                </div>
              </div>
            </div>
            <div className="footer">
              <p className="footer-text">© 2025, made with ♥ by MVCouds a better web.</p>
            </div>
          </div>
          <div className="right-container">
            <div className="quickform-logo"><img src="/images/quickform-logo.svg" alt="QuickForm Logo" className="logo" /></div>
            <div className="login-container">
              <img
                src="https://login.salesforce.com/img/logo214.svg"
                alt="Salesforce"
                className="login-image"
              />
              <h2 className="login-text">Login with Salesforce</h2>
              <div className="login-form">
                <div className="dropdown-container">
                  <label htmlFor="org-select" className="label">
                    Choose Salesforce Org
                  </label>
                  <AnimatePresence>
                    <motion.div
                      variants={dropdownVariants}
                      initial="hidden"
                      animate="visible"
                      whileFocus="focus"
                    >
                      <Select
                        id="org-select"
                        value={org}
                        onChange={handleOrgChange}
                        placeholder = "Pick an option"
                        style={{ width: '100%' }}
                        className="dropdown"
                      >
                        <Option value="production">Production (login.salesforce.com)</Option>
                        <Option value="sandbox">Sandbox (test.salesforce.com)</Option>
                      </Select>
                    </motion.div>
                  </AnimatePresence>
                </div>
                <button
                  id="login-button"
                  onClick={openPopup}
                  disabled={isButtonDisabled}
                  className={`login-button ${isButtonDisabled ? 'disabled' : ''}`}
                >
                  <img src="/images/login_gate.svg" alt="Login logo" className="gate-logo"/> Login with Salesforce
                </button>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default Login;