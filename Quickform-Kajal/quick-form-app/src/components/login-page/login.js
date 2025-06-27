import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const Login = () => {
  const [org, setOrg] = useState(''); // Store selected Salesforce org
  const [isButtonDisabled, setIsButtonDisabled] = useState(true); // Track login button state
  const navigate = useNavigate(); // React Router navigation
  let popup = null; // Reference to popup window

  // Check if already logged in on mount
  useEffect(() => {
    const isLoggedIn = sessionStorage.getItem('isLoggedIn') === 'true'; // Check login flag
    if (isLoggedIn) {
      navigate('/home'); // Redirect to home if already logged in
    }

    // Add message event listener
    const handleMessage = (event) => {
      console.log('---Handle message call---');
      
      if (event.origin === 'https://d2gg09yhu3xa1a.cloudfront.net') {
        if (event.data.type === 'login_error') {
          console.log('------here one---------');
          
          if (popup && !popup.closed) {
            popup.close(); // Close popup on error
          }
        }
      }
      if (event.origin === 'https://ew2pvgsa59.execute-api.us-east-1.amazonaws.com') {
        if (event.data.type === 'login_success') {
          console.log('------here two---------');
          if (popup && !popup.closed) {
            popup.close(); // Close popup on success
          }
          sessionStorage.removeItem('org'); // Clear stored org
          sessionStorage.setItem('isLoggedIn', 'true'); // Set login flag
          sessionStorage.setItem('userId', event.data.userId); // Store userId
          sessionStorage.setItem('instanceUrl', event.data.instanceUrl); // Store instanceUrl
          navigate('/home'); // Redirect to home
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

  const handleOrgChange = (e) => {
    const selectedOrg = e.target.value; // Get selected org
    setOrg(selectedOrg); // Update state
    setIsButtonDisabled(!selectedOrg); // Enable button if org selected
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
      console.log('------here three---------');
      if (popup && !popup.closed) {
        popup.close(); // Close popup immediately if already logged in
      }
      navigate('/home'); // Redirect to home
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-lg w-full max-w-sm">
        <div className="flex justify-center mb-6">
          <img
            src="https://login.salesforce.com/img/logo214.svg"
            alt="Salesforce"
            style={{ height: '60px' }} // Logo size
          />
        </div>
        <h2 className="text-2xl font-bold text-center mb-6">Login with Salesforce</h2>
        <div className="mb-4">
          <label htmlFor="org-select" className="block text-sm font-medium text-gray-700 mb-2">
            Choose Salesforce Org
          </label>
          <select
            id="org-select"
            value={org}
            onChange={handleOrgChange}
            className="w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">-- Select --</option> {/* Placeholder option */}
            <option value="production">Production (login.salesforce.com)</option>
            <option value="sandbox">Sandbox (test.salesforce.com)</option>
          </select>
        </div>
        <button
          id="login-button"
          onClick={openPopup}
          disabled={isButtonDisabled} // Disable if no org selected
          className={`w-full py-3 rounded-lg font-medium transition-colors ${
            isButtonDisabled
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed' // Disabled styling
              : 'bg-blue-600 text-white hover:bg-blue-700' // Enabled styling
          }`}
        >
          Login with Salesforce
        </button>
      </div>
    </div>
  );
};

export default Login;
