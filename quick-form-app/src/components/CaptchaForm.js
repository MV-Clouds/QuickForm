import React, { useState, useEffect } from "react";
import { useGoogleReCaptcha } from "react-google-recaptcha-v3";
import CustomImageCaptcha from "./CustomImageCaptcha";
import "./CaptchaForm.css";

function CaptchaForm() {
  const { executeRecaptcha } = useGoogleReCaptcha();

  const [isSuspicious, setIsSuspicious] = useState(false);
  const [showCustomCaptcha, setShowCustomCaptcha] = useState(false);
  const [captchaType, setCaptchaType] = useState("math");
  const [captchaVerified, setCaptchaVerified] = useState(false);

  // Run captcha automatically when component loads
  useEffect(() => {
    const runCaptcha = async () => {
      if (!executeRecaptcha) return; // hook not ready yet

      const token = await executeRecaptcha("page_load");
      console.log("reCAPTCHA token (page_load):", token);

      const result = await verifyRecaptchaToken(token);
      console.log("reCAPTCHA verification result:", result);

      if (result.success && result.score > 0.5) {
        setIsSuspicious(false);
        setShowCustomCaptcha(false);
        setCaptchaVerified(true);
      } else {
        setIsSuspicious(true);
        setShowCustomCaptcha(true);
        setCaptchaVerified(false);
      }
    };

    runCaptcha();
  }, [executeRecaptcha]); // run once when available

  // Token verification (⚠️ testing only – secret in frontend)
    const verifyRecaptchaToken = async (token) => {
    const response = await fetch("https://52g1hqp0f8.execute-api.us-east-1.amazonaws.com/recaptchaVerify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
    });

    const result = await response.json();
    console.log("Lambda verification result:", result);
    return result;
    };

  function handleCustomCaptchaVerified(valid) {
    setCaptchaVerified(valid);
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (captchaVerified) {
      alert("Form submitted. Human verified!");
    } else {
      alert("Please solve captcha first.");
    }
  }

  return (
    <form className="captcha-main-form" onSubmit={handleSubmit}>
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

      {/* If Google thinks suspicious → show custom captcha */}
      {showCustomCaptcha && (
        <CustomImageCaptcha
          type={captchaType}
          onVerified={handleCustomCaptchaVerified}
        />
      )}

      <button
        className="captcha-main-submit"
        disabled={!captchaVerified}
        type="submit"
      >
        Submit
      </button>
    </form>
  );
}

export default CaptchaForm;
