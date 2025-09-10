import React, { useState } from "react";
import { useGoogleReCaptcha } from "react-google-recaptcha-v3";
import CustomImageCaptcha from "./CustomImageCaptcha";
import "./CaptchaForm.css";

function CaptchaForm() {
  const { executeRecaptcha } = useGoogleReCaptcha();

  const [isSuspicious, setIsSuspicious] = useState(false);
  const [showCustomCaptcha, setShowCustomCaptcha] = useState(false);
  const [captchaType, setCaptchaType] = useState("math");
  const [captchaVerified, setCaptchaVerified] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    comment: "",
  });

  // Verify reCAPTCHA token by calling Lambda backend
  const verifyRecaptchaToken = async (token) => {
    console.log('Token ',token);
    
    const response = await fetch(
      "https://52g1hqp0f8.execute-api.us-east-1.amazonaws.com/recaptchaVerify",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      }
    );
    const result = await response.json();
    console.log(result);
    
    return result;
  };

  // Handle form field change
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // On Submit: execute recaptcha, verify score, show custom captcha if suspicious
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!executeRecaptcha) {
      return;
    }

    // Run reCAPTCHA with action 'form_submit'
    const token = await executeRecaptcha("form_submit");
    const result = await verifyRecaptchaToken(token);

    if (result.success && result.score > 0.5) {
      // Human detected
      setIsSuspicious(false);
      setShowCustomCaptcha(false);
      setCaptchaVerified(true);
      // proceed with form submission logic here if needed
    } else {
      // Bot suspected, show custom captcha
      setIsSuspicious(true);
      setShowCustomCaptcha(true);
      setCaptchaVerified(false);
    }
  };

  // Callback from custom captcha on successful verification
  const handleCustomCaptchaVerified = (valid) => {
    setCaptchaVerified(valid);
    if (valid) {
      alert("Custom Captcha passed. Form submitted!");
      setShowCustomCaptcha(false);
      setIsSuspicious(false);
      // proceed with form submission logic here if needed
    }
  };

  return (
    <form className="captcha-main-form" onSubmit={handleSubmit}>
      <div className="form-fields">
        <label>
          Name:
          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleChange}
            required
          />
        </label>

        <label>
          Comment:
          <textarea
            name="comment"
            value={formData.comment}
            onChange={handleChange}
            required
          />
        </label>
      </div>

      <div className="captcha-select-type">
        <label>
          <input
            type="radio"
            value="math"
            checked={captchaType === "math"}
            onChange={() => setCaptchaType("math")}
          />
          Math Image
        </label>
        <label>
          <input
            type="radio"
            value="color"
            checked={captchaType === "color"}
            onChange={() => setCaptchaType("color")}
          />
          Color Pick Image
        </label>
        <label>
          <input
            type="radio"
            value="crossword"
            checked={captchaType === "crossword"}
            onChange={() => setCaptchaType("crossword")}
          />
          Crossword Image
        </label>
      </div>

      {/* Show custom captcha only if suspicious */}
      {showCustomCaptcha && (
        <CustomImageCaptcha
          type={captchaType}
          onVerified={handleCustomCaptchaVerified}
        />
      )}

      <button
        className="captcha-main-submit"
        disabled={showCustomCaptcha && !captchaVerified}
        type="submit"
      >
        Submit
      </button>
    </form>
  );
}

export default CaptchaForm;
