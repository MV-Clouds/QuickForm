import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Select, Button, Input } from 'antd';
import './login.css'; // Import your CSS styles

const { Option } = Select;

const Login = () => {
  const [org, setOrg] = useState('Pick an option'); // Store selected Salesforce org
  const [isButtonDisabled, setIsButtonDisabled] = useState(true); // Track login button state
  const [customUrl, setCustomUrl] = useState(''); // Store custom URL
  const navigate = useNavigate(); // React Router navigation
  let popup = null; // Reference to popup window
  const allFeatures = [
    { title: 'Lightning Fast', desc: 'Create and deploy forms in minutes, not hours.', icon: 'flash_icon.svg' },
    { title: 'Deep Integration', desc: 'Native Salesforce connectivity for real-time data sync.', icon: 'deep_integration_icon.svg' },
    { title: 'Customizable', desc: 'Tailor forms to your exact needs with powerful design tools.', icon: 'customizable_icon.svg' },
    { title: 'Secure & Reliable', desc: 'Enterprise-grade security to protect your valuable data.', icon: 'secure_icon.svg' },
    { title: 'No-Code Forms', desc: 'No coding required! Simply click, drag-drop: turning complexity into simplicity effortlessly!', icon: 'flash_icon.svg' },
    { title: 'Boost Productivity', desc: 'Auto-magically fill your Salesforce objects with every form submission.', icon: 'deep_integration_icon.svg' },
    { title: 'Limitless Design Possibilities', desc: 'Make your forms an extension of your brand with just a few clicks.', icon: 'customizable_icon.svg' },
    { title: 'Submission Alerts', desc: 'Get instant email alerts and optional PDF attachments when your forms are filled out.', icon: 'secure_icon.svg' },
    { title: 'Hassle-free Publish', desc: 'An uncomplicated process with several options to publish forms.', icon: 'flash_icon.svg' },
  ];

  const [displayedFeatures, setDisplayedFeatures] = useState([]);
  const [isLoginProgress, setIsLoginProgress] = useState(false);

  const validateCustomUrl = (url) => {
    if (!url) return false;
    const trimmedUrl = url.trim();
    return (
       trimmedUrl.startsWith('https://') &&
      trimmedUrl.endsWith('.my.salesforce.com') &&
      trimmedUrl.length > '.my.salesforce.com'.length
    );
  };

  // Check if already logged in on mount
  useEffect(() => {
    // sessionStorage.setItem('isLoggedIn', 'true');
    // sessionStorage.setItem('userId', '005gL000002qyRxQAI'); // Clear userId
    // sessionStorage.setItem('instanceUrl', 'https://orgfarm-53dd64db2b-dev-ed.develop.my.salesforce.com'); // Clear instanceUrl
    const shuffleArray = (array) => {
      const shuffled = [...array];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      return shuffled.slice(0, 4); // Return first 4 items
    };

    setDisplayedFeatures(shuffleArray(allFeatures));
    const isLoggedIn = sessionStorage.getItem('isLoggedIn') === 'true'; // Check login flag
    if (isLoggedIn) {
      navigate('/guest'); // Redirect to home if already logged in
    }

    // Add message event listener
    const handleMessage = (event) => {
      if (event.origin === 'https://d2bri1qui9cr5s.cloudfront.net/') {
        if (event.data.type === 'login_error') {
          if (popup && !popup.closed) {
            popup.close(); // Close popup on error
          }
        }
      }
      if (event.origin === 'https://vm6pandneg.execute-api.us-east-1.amazonaws.com') {
        if (event.data.type === 'login_success') {
          if (popup && !popup.closed) {
            popup.close(); // Close popup on success
          }
          sessionStorage.removeItem('org'); // Clear stored org
          sessionStorage.setItem('isLoggedIn', 'true'); // Set login flag
          sessionStorage.setItem('userId', event.data.userId); // Store userId
          sessionStorage.setItem('instanceUrl', event.data.instanceUrl); // Store instanceUrl
          navigate('/guest'); // Redirect to home
        }
        else if (event.data.type === 'setup_required') {
          if (popup && !popup.closed) {
            popup.close(); // Close popup
          }
          navigate('/setup'); // Redirect to setup page
        } else if (event.data === 'login_failed') {
          alert('Login failed. Please try again.'); // Show error
        }
      }
      setIsLoginProgress(false);
    };

    window.addEventListener('message', handleMessage); // Add event listener

    // Clean up event listener on unmount
    return () => {
      window.removeEventListener('message', handleMessage); // Remove event listener
    };
  }, [navigate]);

  useEffect(() => {
    let isValid = false;
    if (org !== 'Pick an option') {
      if (org === 'custom') {
        isValid = validateCustomUrl(customUrl);
      } else {
        isValid = true;
      }
    }
    setIsButtonDisabled(!isValid);
  }, [org, customUrl]);

  const handleOrgChange = (value) => {
    if(isLoginProgress) return;
    setOrg(value); // Update state
    if (value !== 'custom') {
      setCustomUrl(''); // Clear custom URL if not custom
    }
    setIsButtonDisabled(!value); // Enable button if org selected
  };

  const openPopup = () => {
    setIsLoginProgress(true);
    if (org === 'Pick an option' || (org === 'custom' && !validateCustomUrl(customUrl))) return; // Do nothing if org not selected
    let effectiveOrg = org;
    if (org === 'custom') {
      effectiveOrg = customUrl.trim();
    }
    let base = 'https://d2bri1qui9cr5s.cloudfront.net/auth/login'; // Base login URL
    const isLoggedIn = sessionStorage.getItem('isLoggedIn') === 'true'; // Check login status

    if (isLoggedIn) {
      base += '.html'; // Append .html if already logged in
    }

    const loginUrl = `${base}?org=${encodeURIComponent(effectiveOrg)}`; // Construct full login URL
    sessionStorage.setItem('org', effectiveOrg); // Store selected org

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
                {displayedFeatures.map((feature, index) => (
                  <div key={index} className="feature">
                    <div className="icon-wrapper">
                      <img src={`/images/${feature.icon}`} alt={`${feature.title} Icon`} className="feature-icon" />
                    </div>
                    <p className="feature-title">{feature.title}</p>
                    <p className="feature-description">{feature.desc}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="footer">
              <p className="footer-text">© 2025, made with ♥ by MV Clouds.</p>
            </div>
          </div>
          <div className="right-container">
            <div className="quickform-logo"><img src="/images/quickform-logo.png" alt="QuickForm Logo" className="logo" /></div>
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
                        disabled={isLoginProgress}
                      >
                        <Option value="production">Production (login.salesforce.com)</Option>
                        <Option value="sandbox">Sandbox (test.salesforce.com)</Option>
                        <Option value="custom">Custom Domain</Option>
                      </Select>
                    </motion.div>
                  </AnimatePresence>
                </div>
                <AnimatePresence>
                  {org === 'custom' && (
                    <motion.div
                      key="custom-input"
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.3 }}
                      style={{ marginTop: '16px' }}
                    >
                      <label htmlFor="custom-url" className="label">
                        Enter Custom Domain URL
                      </label>
                      <Input
                        id="custom-url"
                        value={customUrl}
                        onChange={(e) => setCustomUrl(e.target.value)}
                        placeholder="yourdomain.my.salesforce.com"
                        style={{ width: '100%' }}
                        className=''
                        disabled={isLoginProgress}
                      />
                    </motion.div>
                  )}
                </AnimatePresence>
                <button
                  id="login-button"
                  onClick={openPopup}
                  disabled={isButtonDisabled || isLoginProgress}
                  className={`login-button ${isButtonDisabled || isLoginProgress ? 'disabled' : ''}`}
                >
                  <svg className="gate-logo"  width="20" height="19" viewBox="0 0 20 19" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M1.60059 9.16661H13.3612M13.3612 9.16661L10.421 6.64648M13.3612 9.16661L10.421 11.6867" stroke="white" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                  <path d="M7.48169 4.9673C7.49177 3.14021 7.57325 2.15064 8.21841 1.50549C8.9568 0.76709 10.1446 0.76709 12.5203 0.76709H13.3603C15.7368 0.76709 16.9246 0.76709 17.663 1.50549C18.4006 2.24304 18.4006 3.4317 18.4006 5.80734V12.5277C18.4006 14.9033 18.4006 16.092 17.663 16.8295C16.9238 17.5679 15.7368 17.5679 13.3603 17.5679H12.5203C10.1446 17.5679 8.9568 17.5679 8.21841 16.8295C7.57325 16.1844 7.49177 15.1948 7.48169 13.3677" stroke="white" stroke-width="1.5" stroke-linecap="round"/>
                </svg>

                     Login to QuickForm
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