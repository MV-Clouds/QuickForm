import React, { useEffect, useRef, useState } from "react";
import "./ProgressCaptcha.css";

// ************ CAPTCHA COMPONENTS ************

// 1. Canvas Random Text CAPTCHA, dynamic and verify
const CanvasTextCaptcha = ({ onVerify }) => {
  const canvasRef = useRef(null);
  const [captchaText, setCaptchaText] = useState("");

  useEffect(() => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const width = 150;
    const height = 60;
    canvas.width = width;
    canvas.height = height;

    const chars = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
    let text = "";
    for (let i = 0; i < 6; i++) {
      text += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setCaptchaText(text);

    ctx.clearRect(0, 0, width, height);

    // Make background gradient noise
    const grad = ctx.createLinearGradient(0, 0, width, height);
    grad.addColorStop(0, "#f0f0f0");
    grad.addColorStop(1, "#dcdcdc");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);

    for (let i = 0; i < 250; i++) {
      ctx.fillStyle = `rgba(${Math.floor(Math.random() * 255)},${Math.floor(
        Math.random() * 255
      )},${Math.floor(Math.random() * 255)},0.1)`;
      ctx.beginPath();
      ctx.arc(Math.random() * width, Math.random() * height, Math.random() * 2, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.font = "34px 'Comic Sans MS', cursive, Arial";
    ctx.textBaseline = "middle";
    ctx.textAlign = "center";

    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      const x = 20 + i * 24 + Math.sin(i) * 6;
      const y = height / 2 + Math.cos(i) * 6;

      ctx.save();
      ctx.translate(x, y);
      ctx.rotate((Math.random() * 40 - 20) * (Math.PI / 180));
      ctx.fillStyle = `hsl(${(i * 45 + 120) % 360}, 80%, 40%)`;
      ctx.shadowColor = "rgba(0,0,0,0.2)";
      ctx.shadowBlur = 2;
      ctx.fillText(char, 0, 0);
      ctx.restore();
    }
  }, []);

  const [input, setInput] = useState("");
  const [status, setStatus] = useState(null);

  const handleVerify = () => {
    if (input.toUpperCase() === captchaText) {
      setStatus("Correct!");
      onVerify(true);
    } else {
      setStatus("Incorrect. Try again.");
      onVerify(false);
    }
    setInput("");
  };

  return (
    <div className="captcha-verify enhanced" role="region">
      <canvas ref={canvasRef} width={150} height={60} className="captcha-canvas" aria-label="Canvas text captcha" />
      <input
        type="text"
        aria-label="Enter captcha text"
        value={input}
        placeholder="Enter CAPTCHA"
        onChange={(e) => setInput(e.target.value)}
        spellCheck={false}
        className="captcha-input"
      />
      <button onClick={handleVerify} aria-label="Verify captcha text" className="btn-verify">
        Verify
      </button>
      <div role="alert" aria-live="polite" className={`captcha-status ${status === "Correct!" ? "success" : "error"}`}>
        {status}
      </div>
    </div>
  );
};

// 2. Arithmetic CAPTCHA with colorful operator, dynamic problem, verify
const ArithmeticCaptcha = ({ onVerify }) => {
  const [problem, setProblem] = useState({ a: 0, b: 0, op: "+" });
  const [input, setInput] = useState("");
  const [status, setStatus] = useState(null);

  const operators = { "+": "Addition", "-": "Subtraction", "*": "Multiplication" };

  const generateProblem = () => {
    const ops = ["+", "-", "*"];
    const a = Math.floor(Math.random() * 15) + 1;
    const b = Math.floor(Math.random() * 15) + 1;
    const op = ops[Math.floor(Math.random() * ops.length)];
    setProblem({ a, b, op });
    setStatus(null);
    setInput("");
  };

  useEffect(() => generateProblem(), []);

  const calculate = () => {
    const { a, b, op } = problem;
    switch (op) {
      case "+": return a + b;
      case "-": return a - b;
      case "*": return a * b;
      default: return null;
    }
  };

  const handleVerify = (e) => {
    e.preventDefault();
    if (parseInt(input, 10) === calculate()) {
      setStatus("Correct!");
      onVerify(true);
      generateProblem();
    } else {
      setStatus("Incorrect. Try again.");
      onVerify(false);
    }
    setInput("");
  };

  return (
    <form className="captcha-arithmetic enhanced" onSubmit={handleVerify} role="region" aria-label={`Arithmetic captcha ${operators[problem.op]}`}>
      <label htmlFor="mathAnswer" className="arithmetic-label">
        Solve: <span className="a">{problem.a}</span> <span className={`op op-${problem.op}`}>{problem.op}</span> <span className="b">{problem.b}</span> = ?
      </label>
      <input
        id="mathAnswer"
        type="number"
        autoComplete="off"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        required
        aria-describedby="arithmeticStatus"
        spellCheck={false}
        className="captcha-input"
      />
      <button type="submit" className="btn-verify">Verify</button>
      <div id="arithmeticStatus" role="alert" aria-live="polite" className={`captcha-status ${status === "Correct!" ? "success" : "error"}`}>
        {status}
      </div>
    </form>
  );
};

// 3. Drag & Drop CAPTCHA with glowing drop border and reset button
const DragDropCaptcha = ({ onVerify }) => {
  const [dragOver, setDragOver] = useState(false);
  const [dropped, setDropped] = useState(false);

  const onDragStart = (e) => {
    e.dataTransfer.setData("text/plain", "circle");
  };

  const onDrop = (e) => {
    e.preventDefault();
    const data = e.dataTransfer.getData("text");
    if (data === "circle") {
      setDropped(true);
      onVerify(true);
    } else onVerify(false);
    setDragOver(false);
  };

  const onDragOver = (e) => {
    e.preventDefault();
    setDragOver(true);
  };

  const reset = () => {
    setDropped(false);
    onVerify(false);
  };

  return (
    <div className="captcha-dragdrop enhanced" role="region">
      <p>Drag the glowing circle into the glowing target box</p>
      <div className="drag-container">
        <div
          className={`drag-target ${dragOver ? "dragover" : ""} ${dropped ? "dropped" : ""}`}
          onDrop={onDrop}
          onDragOver={onDragOver}
          aria-label="Drop target"
          aria-dropeffect="move"
          role="region"
        >
          {dropped ? <span className="drop-confirm">✔</span> : "Drop here"}
        </div>
        <div
          draggable={!dropped}
          onDragStart={onDragStart}
          className={`draggable-circle ${dropped ? "hidden" : ""}`}
          role="button"
          aria-grabbed={!dropped}
          tabIndex={0}
          aria-label="Draggable glowing circle"
        />
      </div>
      {dropped && (
        <button onClick={reset} className="btn-reset" aria-label="Reset drag and drop captcha">
          Reset
        </button>
      )}
    </div>
  );
};

// 4. Slider to unlock CAPTCHA with dynamic unlock percent & smooth gradient fill
const SliderCaptcha = ({ onVerify }) => {
  // dynamic unlock point between 85% to 100%
  const [unlockPoint] = useState(85 + Math.floor(Math.random() * 16));
  const [value, setValue] = useState(0);
  const [unlocked, setUnlocked] = useState(false);

  const onChange = (e) => {
    const val = parseInt(e.target.value);
    setValue(val);
    if (val >= unlockPoint) {
      setUnlocked(true);
      onVerify(true);
    } else {
      if (unlocked) onVerify(false);
      setUnlocked(false);
    }
  };

  return (
    <div className="captcha-slider enhanced" role="region" aria-label="Slider captcha unlock">
      <p>Slide to unlock (Reach {unlockPoint}%)</p>
      <input
        type="range"
        min="0"
        max="100"
        value={value}
        onChange={onChange}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={value}
        aria-label="Slide captcha unlock"
        className="slider"
      />
      <div className={`slider-status ${unlocked ? "unlocked" : ""}`}>
        {unlocked ? `Unlocked ✔` : `${value}%`}
      </div>
    </div>
  );
};

// 5. Image selection CAPTCHA - pick matching image from 4 options (static images)
const imageOptions = [
  "/images/image1-captcha.jpg", // tree (low quality)
  "/images/image2-captcha.jpg", // book (low quality)
  "/images/image3-captcha.jpg", // landscape (low quality)
  "/images/image4-captcha.jpg", // mountains (low quality)
];

const ImageCaptcha = ({ onVerify }) => {
  const [targetIdx, setTargetIdx] = useState(0);
  const [selectedIdx, setSelectedIdx] = useState(null);

  useEffect(() => {
    setTargetIdx(Math.floor(Math.random() * imageOptions.length));
    setSelectedIdx(null);
  }, []);

  const handleSelect = (idx) => {
    setSelectedIdx(idx);
    onVerify(idx === targetIdx);
  };

  return (
    <div className="captcha-image-select enhanced" aria-label="Select matching image captcha" role="region">
      <p>Select the image that matches the one shown below</p>
      <img src={imageOptions[targetIdx]} alt="captcha target" className="captcha-target-image" width={90} height={70} />
      <div className="image-options-grid" style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: "18px", marginTop: "15px"}}>
        {imageOptions.map((url, idx) => (
          <img
            key={idx}
            src={url}
            alt={`captcha option ${idx + 1}`}
            className={`image-option ${selectedIdx === idx ? "selected" : ""}`}
            style={{
              width: "90px",
              height: "70px",
              borderRadius: "10px",
              boxShadow: selectedIdx === idx ? "0 0 8px #4caf50" : "0 0 4px #aaa",
              cursor: "pointer",
              border: selectedIdx === idx ? "3px solid #4caf50" : "2px solid #ddd",
            }}
            onClick={() => handleSelect(idx)}
            tabIndex={0}
          />
        ))}
      </div>
      {selectedIdx !== null && (
        <p className={`captcha-status ${selectedIdx === targetIdx ? "success" : "error"}`}>
          {selectedIdx === targetIdx ? "Correct!" : "Wrong image. Try again."}
        </p>
      )}
    </div>
  );
};

// 6. Dynamic Color Grid CAPTCHA with neon green target and vibrant palette
const ColorGridCaptcha = ({ onVerify }) => {
  const colorsPool = [
    "#f44336",
    "#4caf50",
    "#2196f3",
    "#ffeb3b",
    "#9c27b0",
    "#009688",
    "#e91e63",
    "#ff5722",
  ];
  const [gridColors, setGridColors] = useState([]);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    let colors = [];
    while (colors.length < 6) {
      const c = colorsPool[Math.floor(Math.random() * colorsPool.length)];
      if (!colors.includes(c)) colors.push(c);
    }
    if (!colors.includes("#4caf50")) colors[0] = "#4caf50";
    setGridColors(colors);
    setSelected(null);
  }, []);

  const [targetColor, setTargetColor] = useState("#4caf50");

  useEffect(() => {
   let colors = [];
   while (colors.length < 6) {
     const c = colorsPool[Math.floor(Math.random() * colorsPool.length)];
     if (!colors.includes(c)) colors.push(c);
   }
   const randomColor = colors[Math.floor(Math.random() * colors.length)];
   setTargetColor(randomColor);
   setGridColors(colors);
   setSelected(null);
  }, []);

  const correctIndex = gridColors.findIndex((c) => c === targetColor);

  const handleSelect = (idx) => {
    setSelected(idx);
    onVerify(idx === correctIndex);
  };

  return (
    <div className="captcha-color-grid enhanced" aria-label="Select the color captcha" role="region">
    <p>Select the color: <span style={{color:targetColor, fontWeight:"700"}}>{targetColor.toUpperCase()}</span></p>
      <div className="color-grid color-grid-large">
        {gridColors.map((color, idx) => (
          <div
            key={idx}
            onClick={() => handleSelect(idx)}
            className={`color-square ${selected === idx ? "selected" : ""}`}
            role="button"
            tabIndex={0}
            aria-pressed={selected === idx}
            aria-label={`Select color square ${color}`}
            style={{ backgroundColor: color }}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") handleSelect(idx);
            }}
          />
        ))}
      </div>
      {selected !== null && (
        <p className={`captcha-result ${selected === correctIndex ? "success" : "error"}`}>
          {selected === correctIndex ? "Correct!" : "Wrong, try again."}
        </p>
      )}
    </div>
  );
};

const CirclesStepProgress = ({ steps = 4, current = 3 }) => (
    <div className="progress-circles-bar">
      {Array.from({ length: steps }).map((_, idx) => (
        <div key={idx} className="step-circle-group">
          <div className={`step-circle ${idx < current ? "done" : ""} ${idx === current ? "active" : ""}`}>
            {idx < current ? <span>&#10003;</span> : ""}
          </div>
          {idx < steps - 1 && <div className={`step-line ${idx < current - 1 ? "filled" : ""}`}></div>}
        </div>
      ))}
    </div>
  );

  const ArrowStepsProgress = ({ 
    steps = ["Step 1", "Step 2", "Step 3"], 
    current = 2,
    completedColor = "#3f51b5",
    activeColor = "#a9c7fa",
    defaultColor = "#f1f5fc"
  }) => {
    return (
      <div className="progress-arrow-bar">
        {steps.map((step, idx) => (
          <div 
            key={idx} 
            className={`arrow-step ${idx < current ? "completed" : ""} ${idx === current ? "active" : ""}`}
            style={{
              '--completed-color': completedColor,
              '--active-color': activeColor,
              '--default-color': defaultColor
            }}
          >
            {step}
            {idx < steps.length - 1 && <div className="arrow-divider"></div>}
          </div>
        ))}
      </div>
    );
  };

  const SquareStepsProgress = ({
    steps = ["Step 1", "Step 2", "Step 3"],
    current = 2, // 1-based index (so 2 means step 2 active)
  }) => (
    <div className="progress-square-bar">
      {steps.map((step, idx) => (
        <div key={idx} className="square-step-block">
          <div
            className={[
              "square-step",
              idx + 1 < current ? "completed" : "",
              idx + 1 === current ? "active" : "",
            ].join(" ")}
          >
            {idx + 1}
          </div>
          <div className="step-label">{step}</div>
          {idx < steps.length - 1 && (
            <div
              className={[
                "square-line",
                idx + 1 < current ? "filled" : "",
              ].join(" ")}
            />
          )}
        </div>
      ))}
    </div>
  );

// ************ MAIN COMPONENT ************

const ProgressCaptcha = () => {
  const [verifyResults, setVerifyResults] = useState(Array(8).fill(null));

  const updateVerify = (idx, result) => {
    setVerifyResults((prev) => {
      const arr = [...prev];
      arr[idx] = result;
      return arr;
    });
  };

  return (
    <div className="container-unique">

      <h1>Interactive & Dynamic CAPTCHA Challenges</h1>
      <div className="grid-captchas">
        <CanvasTextCaptcha onVerify={(r) => updateVerify(0, r)} />
        <ArithmeticCaptcha onVerify={(r) => updateVerify(1, r)} />
        <DragDropCaptcha onVerify={(r) => updateVerify(2, r)} />
        <SliderCaptcha onVerify={(r) => updateVerify(3, r)} />
        <ImageCaptcha onVerify={(r) => updateVerify(4, r)} />
        <ColorGridCaptcha onVerify={(r) => updateVerify(5, r)} />
      </div>
      {/* Progress Indicators */}
      <div className="progress-section">
        {/* 1. Pagination style */}
        <div className="pagination-progress">
          <span className="progress-label">Page 1 of 3</span>
        </div>
        {/* 2. Simple progress bar (percent) */}
        <div className="bar-progress">
          <div className="bar-bg">
            <div className="bar-fill" style={{width: "50%"}} />
          </div>
          <span className="bar-percent-text">50%</span>
        </div>
        {/* 3. Spinner with percent */}
        <div className="circle-spinner-progress">
          <div className="circle-spinner">
            <div className="spinner-text">75%</div>
            <svg width="60" height="60" viewBox="0 0 60 60">
              <circle cx="30" cy="30" r="24" className="circle-bg" />
              <circle
                cx="30"
                cy="30"
                r="24"
                className="circle-foreground"
                style={{
                  strokeDasharray: 2 * Math.PI * 24,
                  strokeDashoffset: (1 - 0.75) * 2 * Math.PI * 24
                }}
              />
            </svg>
          </div>
        </div>
           <CirclesStepProgress steps={4} current={3} />
          <ArrowStepsProgress steps={["Step 1", "Step 2", "Step 3"]} current={2} />
          <SquareStepsProgress steps={["Step 1", "Step 2", "Step 3"]} current={2} />
        
      </div>
    </div>
  );
};

export default ProgressCaptcha;