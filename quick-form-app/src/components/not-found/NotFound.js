// NotFound.js
import React from "react";
import { useNavigate } from "react-router-dom";
import "./NotFound.css";

const NotFound = () => {
  const navigate = useNavigate();

  return (
    <div className="quickform-404-container">
      <div className="quickform-404-left">
        <div className="quickform-logo-not-found"><img src="/images/quickform-logo.png" alt="Quick Form Logo" /></div>
        <p className="quickform-404-title">404</p>
        <p className="quickform-404-subtitle">Page not found</p>
        <p className="quickform-404-desc">
          We can't seem to find the page you are looking for!
        </p>
        <div class="home-button-holder">
            <button
            className="login-button home-button"
            onClick={() => navigate("/home")}
            >
            Back to Home Page
            </button>
        </div>
      </div>
      <div className="quickform-404-illustration">
        <img src="/images/not-found.png" alt="Form Illustration" />
      </div>
    </div>
  );
};

export default NotFound;
