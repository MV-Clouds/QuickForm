import React, { useRef, useEffect, useState } from "react";
import "./CustomImageCaptcha.css";

/**
 * Renders the required image captcha on a <canvas>
 */
function CustomImageCaptcha({ type, onVerified }) {
  const canvasRef = useRef(null);
  const [solution, setSolution] = useState("");
  const [valid, setValid] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Challenge setup
  useEffect(() => {
    if (type === "math") {
      const num1 = Math.floor(Math.random() * 90) + 10;
      const num2 = Math.floor(Math.random() * 90) + 10;
      setSolution(String(num1 + num2));
      // Draw image
      const ctx = canvasRef.current.getContext("2d");
      ctx.clearRect(0, 0, 200, 70);
      ctx.fillStyle = "#fff";
      ctx.fillRect(0, 0, 200, 70);
      ctx.font = "bold 32px Arial";
      ctx.fillStyle = "#222";
      ctx.fillText(`${num1} + ${num2} = ?`, 35, 45);
      // Add noise
      for (let i = 0; i < 70; i++) {
        ctx.fillStyle = `rgba(${Math.random()*255},${Math.random()*255},${Math.random()*255},.5)`;
        ctx.fillRect(Math.random()*200, Math.random()*70, Math.random()*3, Math.random()*3);
      }
    }
    else if (type === "color") {
      // Pick a color randomly
      const colors = ["red", "blue", "green", "orange", "purple", "teal"];
      const col = colors[Math.floor(Math.random()*colors.length)];
      setSolution(col);
      const ctx = canvasRef.current.getContext("2d");
      ctx.clearRect(0, 0, 200, 70);
      ctx.fillStyle = "#fff";
      ctx.fillRect(0, 0, 200, 70);
      ctx.font = "bold 30px Arial";
      ctx.fillStyle = "#333";
      ctx.fillText("Name this color", 20, 30);
      // Draw color block with noise
      ctx.fillStyle = col;
      ctx.fillRect(70, 40, 60, 25);
      for (let i = 0; i < 50; i++) {
        ctx.fillStyle = `rgba(${Math.random()*255},${Math.random()*255},${Math.random()*255},.45)`;
        ctx.fillRect(Math.random()*200, Math.random()*70, Math.random()*2, Math.random()*2);
      }
    }
    else if (type === "crossword") {
      setSolution("cat"); // Example: require recognizing the word formed; expand for more challenge
      const ctx = canvasRef.current.getContext("2d");
      ctx.clearRect(0, 0, 200, 70);
      ctx.fillStyle = "#fff";
      ctx.fillRect(0, 0, 200, 70);
      ctx.font = "bold 30px Verdana";
      ctx.fillStyle = "#444";
      ctx.fillText("C _ T", 65, 45);
      // Add crossword-style grid and noise
      ctx.strokeStyle = "#aaa";
      ctx.beginPath();
      ctx.moveTo(65,55);ctx.lineTo(95,55); // underline for missing letter
      ctx.stroke();
      for (let i = 0; i < 30; i++) {
        ctx.fillRect(Math.random()*200, Math.random()*70, Math.random()*2, Math.random()*2);
      }
    }
    // On every challenge rerender:
    setValid(false);
    setErrorMsg("");
    onVerified(false);
    // eslint-disable-next-line
  }, [type, onVerified]);

  function handleVerify(e) {
    e.preventDefault();
    let userAnswer = document.getElementById("captcha-img-answer").value.trim().toLowerCase();
    let isOk = userAnswer === solution.toLowerCase();
    setValid(isOk);
    onVerified(isOk);
    setErrorMsg(isOk ? "" : "Incorrect, try again.");
  }

  return (
    <div className="img-captcha-wrap">
      <canvas className="img-captcha-canvas" ref={canvasRef} width={200} height={70}></canvas>
      <form className="img-captcha-input-form" onSubmit={handleVerify}>
        <input id="captcha-img-answer" className="img-captcha-input" type="text" autoComplete="off" required />
        <button className="img-captcha-btn" type="submit">Verify</button>
      </form>
      {valid && <div className="img-captcha-success">Success!</div>}
      {!valid && errorMsg && <div className="img-captcha-error">{errorMsg}</div>}
    </div>
  );
}

export default CustomImageCaptcha;
