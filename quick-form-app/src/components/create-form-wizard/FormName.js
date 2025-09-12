import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import './FormName.css'
import { motion, AnimatePresence } from 'framer-motion';
import Loader from '../Loader';
import { Select, Button, Input, Space } from 'antd';
import ReCAPTCHA from "react-google-recaptcha";

const { Option } = Select;


// 1. Canvas Random Text CAPTCHA, dynamic and verify
const CanvasTextCaptcha = ({ onVerify, onGenerate }) => {
  const canvasRef = useRef(null);
  const [captchaText, setCaptchaText] = useState("");

  const generateCaptcha = () => {
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
  };

  useEffect(() => {
    generateCaptcha();
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

  const handleGenerate = () => {
    generateCaptcha();
    setInput("");
    setStatus(null);
    onGenerate();
  };

  return (
    <div className="captcha-verify enhanced" role="region">
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
        <canvas ref={canvasRef} width={150} height={60} className="captcha-canvas" aria-label="Canvas text captcha" />
        <button onClick={handleGenerate} className="btn-generate" aria-label="Generate new captcha">
          ↻
        </button>
      </div>
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
const ArithmeticCaptcha = ({ onVerify, onGenerate }) => {
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
    onGenerate();
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
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
        <label htmlFor="mathAnswer" className="arithmetic-label">
          Solve: <span className="a">{problem.a}</span> <span className={`op op-${problem.op}`}>{problem.op}</span> <span className="b">{problem.b}</span> = ?
        </label>
        <button onClick={generateProblem} className="btn-generate" aria-label="Generate new problem">
          ↻
        </button>
      </div>
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
const SliderCaptcha = ({ onVerify, onGenerate }) => {
  // dynamic unlock point between 85% to 100%
  const [unlockPoint, setUnlockPoint] = useState(85 + Math.floor(Math.random() * 16));
  const [value, setValue] = useState(0);
  const [unlocked, setUnlocked] = useState(false);

  const generateNewSlider = () => {
    setUnlockPoint(85 + Math.floor(Math.random() * 16));
    setValue(0);
    setUnlocked(false);
    onVerify(false);
    onGenerate();
  };

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
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
        <p>Slide to unlock (Reach {unlockPoint}%)</p>
        <button onClick={generateNewSlider} className="btn-generate" aria-label="Generate new slider">
          ↻
        </button>
      </div>
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

// 6. Dynamic Color Grid CAPTCHA with neon green target and vibrant palette
const ColorGridCaptcha = ({ onVerify, onGenerate }) => {
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
  const [targetColor, setTargetColor] = useState("#4caf50");

  const generateColorGrid = () => {
    let colors = [];
    while (colors.length < 6) {
      const c = colorsPool[Math.floor(Math.random() * colorsPool.length)];
      if (!colors.includes(c)) colors.push(c);
    }
    const randomColor = colors[Math.floor(Math.random() * colors.length)];
    setTargetColor(randomColor);
    setGridColors(colors);
    setSelected(null);
    onVerify(false);
    onGenerate();
  };

  useEffect(() => {
    generateColorGrid();
  }, []);

  const correctIndex = gridColors.findIndex((c) => c === targetColor);

  const handleSelect = (idx) => {
    setSelected(idx);
    onVerify(idx === correctIndex);
  };

  return (
    <div className="captcha-color-grid enhanced" aria-label="Select the color captcha" role="region">
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
        <p>Select the color: <span style={{color:targetColor, fontWeight:"700"}}>{targetColor.toUpperCase()}</span></p>
        <button onClick={generateColorGrid} className="btn-generate" aria-label="Generate new color grid">
          ↻
        </button>
      </div>
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

// Google reCAPTCHA component
const GoogleRecaptcha = ({ onVerify, onGenerate }) => {
  const recaptchaRef = useRef(null);
  
  const resetRecaptcha = () => {
    if (recaptchaRef.current) {
      recaptchaRef.current.reset();
      onVerify(false);
      onGenerate();
    }
  };

  return (
    <div className="captcha-google enhanced" role="region">
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
        <p>Complete the Google reCAPTCHA</p>
        <button onClick={resetRecaptcha} className="btn-generate" aria-label="Reset reCAPTCHA">
          ↻
        </button>
      </div>
      <ReCAPTCHA
        sitekey="6LfkJMYrAAAAANTDVpmNDqgYNYMjQCtAeaiLEJuv"
        onChange={(value) => onVerify(value !== null)}
        onExpired={() => onVerify(false)}
        onErrored={() => onVerify(false)}
        ref={recaptchaRef}
      />
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

  // 1. Simple Progress Bar Component
 const SimpleProgressBar = ({ percent = 0, height = 20, bgColor = "#e0e0e0", fillColor = "#4caf50" }) => {
  return (
    <div className="simple-progress-bar">
      <div className="bar-bg" style={{ height: `${height}px`, backgroundColor: bgColor }}>
        <div 
          className="bar-fill" 
          style={{ 
            width: `${percent}%`, 
            backgroundColor: fillColor,
            height: `${height}px`
          }} 
        />
      </div>
      <span className="bar-percent-text">{percent}%</span>
    </div>
  );
};

// 2. Circular Progress Component
const CircularProgress = ({ 
  percent = 0, 
  size = 60, 
  strokeWidth = 4, 
  bgColor = "#e0e0e0", 
  fillColor = "#4caf50" 
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percent / 100) * circumference;

  return (
    <div className="circular-progress">
      <div className="circle-spinner">
        <div className="spinner-text">{percent}%</div>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <circle 
            cx={size / 2} 
            cy={size / 2} 
            r={radius} 
            className="circle-bg" 
            stroke={bgColor}
            strokeWidth={strokeWidth}
            fill="none"
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            className="circle-foreground"
            stroke={fillColor}
            strokeWidth={strokeWidth}
            fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
        </svg>
      </div>
    </div>
  );
};

// 3. Pagination Progress Component
const PaginationProgress = ({ current = 1, total = 3, textColor = "#333" }) => {
  return (
    <div className="pagination-progress" style={{ color: textColor }}>
      <span className="progress-label">Page {current} of {total}</span>
    </div>
  );
};

  
const captchaComponents = {
  'Canvas Text': CanvasTextCaptcha,
  'Arithmetic': ArithmeticCaptcha,
  'Drag & Drop': DragDropCaptcha,
  'Slider': SliderCaptcha,
  'Color Grid': ColorGridCaptcha,
  'Google reCAPTCHA': GoogleRecaptcha,
};

const progressBarComponents = {
  'Simple Progress Bar': SimpleProgressBar,
  'Circular Progress': CircularProgress,
  'Pagination Progress': PaginationProgress,
  'Circles Steps': CirclesStepProgress,
  'Arrow Steps': ArrowStepsProgress,
  'Square Steps': SquareStepsProgress,
};

const FormName = ({ onClose, onSubmit, fields = [], objectInfo = [] }) => {
  const initialName = fields.find(f => f.id === 'name')?.defaultValue || '';
  const initialDescription = fields.find(f => f.id === 'description')?.defaultValue || '';
  const [formName, setFormName] = useState(initialName);
  const [formDescription, setFormDescription] = useState(initialDescription); // New state for description
  const [formNameError, setFormNameError] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const navigate = useNavigate();
  useEffect(() => {
    setFormName(initialName);
    setFormDescription(initialDescription);
  }, [initialName, initialDescription]);
  // New states for Captcha & Progress bar selections
  const [captchaType, setCaptchaType] = useState('Canvas Text');
  const [progressType, setProgressType] = useState('Circles Steps');

  // For CAPTCHA interaction
  const [captchaGenerateKey, setCaptchaGenerateKey] = useState(0); // to force new captcha instance
  const [captchaInput, setCaptchaInput] = useState('');
  const [captchaVerifyStatus, setCaptchaVerifyStatus] = useState(null);
  const captchaVerifyResult = useRef(null);

  // Handler for CAPTCHA verify button click
  const handleCaptchaVerify = () => {
    if (captchaVerifyResult.current !== null) {
      if (captchaVerifyResult.current) setCaptchaVerifyStatus('Correct!');
      else setCaptchaVerifyStatus('Incorrect. Try again.');
    } else {
      setCaptchaVerifyStatus('Please generate and enter captcha to verify');
    }
  };

  // Handler for CAPTCHA Generate button click (force re-render with new key)
  const handleCaptchaGenerate = () => {
    setCaptchaInput('');
    setCaptchaVerifyStatus(null);
    setCaptchaGenerateKey(prev => prev + 1);
    captchaVerifyResult.current = null;
  };

  // Callback passed to captcha to update verification result
  const onCaptchaVerify = (result) => {
    captchaVerifyResult.current = result;
  };

  // Select the captcha and progress components dynamically
  const SelectedCaptchaComponent = captchaComponents[captchaType];
  const SelectedProgressComponent = progressBarComponents[progressType];

  const typeMapping = {
    string: ['shorttext'],
    textarea: ['longtext'],
    phone: ['phone'],
    date: ['date'],
    datetime: ['datetime'],
    time: ['time'],
    picklist: ['dropdown'],
    multipicklist: ['dropdown'],
    percent: ['number'],
    double: ['number'],
    currency: ['price'],
    email: ['email'],
    url: ['link'],
    number: ['number'],
    boolean: ['checkbox'],
  };

  const getDefaultValidation = (fieldType) => {
    const field = fieldType.toLowerCase().replace(/\s+/g, '');
    const validations = {
      shorttext: {
        pattern: '^.{1,255}$',
        description: 'Maximum 255 characters allowed.',
      },
      longtext: {
        pattern: '^.{1,1000}$',
        description: 'Maximum 1000 characters allowed.',
      },
      phone: {
        pattern: '^\\+?[0-9]{7,15}$',
        description: "Must be a valid phone number (7-15 digits, optional '+').",
      },
      email: {
        pattern: '^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$',
        description: 'Must be a valid email (e.g., user@example.com).',
      },
      date: {
        pattern: '^\\d{4}-\\d{2}-\\d{2}$',
        description: 'Must be in YYYY-MM-DD format.',
      },
      datetime: {
        pattern: '^\\d{4}-\\d{2}-\\d{2} \\d{2}:\\d{2}$',
        description: 'Must be in YYYY-MM-DD HH:MM format.',
      },
      time: {
        pattern: '^\\d{2}:\\d{2}$',
        description: 'Must be in HH:MM format.',
      },
      number: {
        pattern: '^[0-9]+$',
        description: 'Only numbers allowed.',
      },
      price: {
        pattern: '^\\d+(\\.\\d{1,2})?$',
        description: 'Must be a valid price (e.g., 10 or 10.99).',
      },
      checkbox: {
        pattern: '^true|false$',
        description: 'Must be checked (true) or unchecked (false).',
      },
      dropdown: {
        pattern: '.*',
        description: 'Must select one of the available options.',
      },
      link: {
        pattern: '^(https?:\\/\\/)?[\\w.-]+\\.[a-z]{2,}(\\/\\S*)?$',
        description: 'Must be a valid URL (e.g., https://example.com).',
      },
      default: {
        pattern: '.*',
        description: 'No specific validation rules.',
      },
    };
    return validations[field] || validations['default'];
  };

  const fetchAccessToken = async (userId, instanceUrl) => {
    try {
      const response = await fetch(process.env.REACT_APP_GET_ACCESS_TOKEN_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          instanceUrl,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch access token');
      }
      return data.access_token;
    } catch (error) {
      console.error('Error fetching access token:', error);
      return null;
    }
  };

  const prepareFormData = () => {
    // Group fields by objectName
    const objectGroups = objectInfo.filter(obj => obj.fields && obj.fields.length > 0);

    const pages = [];
    let pageNumber = 1;

    // For each Salesforce object group, generate its fields as one page
    objectGroups.forEach((obj) => {
      const headingFieldId = `field-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      const headingField = {
        id: headingFieldId,
        label: 'Heading',
        type: 'heading',
        sectionId: null,
        sectionSide: null,
        subFields: {},
        heading: `${obj.objectName} Form`,
        alignment: 'center',
      };

      const generatedFields = obj.fields.map((objField) => {
        // Generate a unique ID for each field
        const fieldId = `field-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

        const fieldTypeOptions = typeMapping[objField.type] || ['shorttext'];
        const selectedType = fieldTypeOptions[0];

        const newField = {
          id: fieldId, // Use the unique fieldId here
          type: selectedType,
          label: objField.label,
          name: objField.name,
          isRequired: objField.required || false,
          Properties__c: {
            pattern: getDefaultValidation(selectedType).pattern,
            description: getDefaultValidation(selectedType).description,
            required: objField.required || false,
          },
        };

        if (objField.type === 'boolean') {
          newField.options = ['Checked'];
          newField.allowMultipleSelections = false;
          newField.dropdownRelatedValues = { 'Checked': 'Checked' };
        }

        if (['picklist', 'multipicklist'].includes(objField.type)) {
          newField.options = objField.values && objField.values.length > 0
            ? objField.values
            : ['Option 1', 'Option 2', 'Option 3'];
          newField.allowMultipleSelections = objField.type === 'multipicklist';
          newField.dropdownRelatedValues = newField.options.reduce((acc, val) => {
            acc[val] = val;
            return acc;
          }, {});
        }

        if (objField.type === 'phone') {
          newField.phoneInputMask = '(999) 999-9999';
          newField.enableCountryCode = true;
          newField.selectedCountryCode = 'US';
        }

        if (['shorttext', 'longtext', 'email', 'link'].includes(objField.type)) {
          newField.placeholder = { main: `Enter ${objField.label || objField.name}` };
        }

        if (['number', 'percent'].includes(objField.type)) {
          newField.numberValueLimits = { enabled: false, min: '', max: '' };
        }

        // You may add a custom property to associate object on field if needed:
        newField.sfObjectName = obj.objectName;

        return newField;
      });

      const pageFields = [headingField, ...generatedFields];

      pages.push({
        fields: pageFields,
        pageNumber,
        objectName: obj.objectName,
      });
      pageNumber++;
    });

    // Create formFields for backend with page number assigned per object group
    const formFields = pages.flatMap((page) =>
      page.fields.map((field, index) => ({
        Name: field.label || field.type.charAt(0).toUpperCase() + field.type.slice(1),
        Field_Type__c: field.type,
        Page_Number__c: page.pageNumber,  // Assign page number per object
        Order_Number__c: index + 1,
        Properties__c: JSON.stringify(field),
        Unique_Key__c: field.id,
      }))
    );

    // Combine all fields from all pages in order
    const allFields = pages.flatMap(page => page.fields);

    const formVersion = {
      Name: formName,
      Description__c: formDescription,
      Stage__c: 'Draft',
      Publish_Link__c: '',
      Version__c: '1',
      Object_Info__c: JSON.stringify(objectInfo),
    };

     const defaultThankyoudata = {
    "Heading__c": "{\"id\":\"title\",\"type\":\"title\",\"x\":100,\"y\":370,\"width\":800,\"height\":60,\"zIndex\":2,\"alignment\":\"center\",\"text\":\"Thank You for Your Submission!\"}",
    "Sub_Heading__c": "{\"id\":\"subtitle\",\"type\":\"subtitle\",\"x\":100,\"y\":450,\"width\":800,\"height\":40,\"zIndex\":2,\"alignment\":\"center\",\"text\":\"We have received your message and will get back to you shortly.\"}",
    "Actions__c": "{\"id\":\"button\",\"type\":\"button\",\"x\":400,\"y\":510,\"width\":200,\"height\":50,\"zIndex\":2,\"alignment\":\"center\",\"buttonText\":\"Explore More\",\"buttonLink\":\"https://example.com\"}",
    "Image_Url__c": "{\"id\":\"image\",\"type\":\"image\",\"x\":100,\"y\":30,\"width\":800,\"height\":320,\"zIndex\":1,\"alignment\":\"center\",\"imageId\":\"fb50e6f7-83e9-4a1b-8c34-71de3cee13d1\",\"images\":[{\"id\":\"fb50e6f7-83e9-4a1b-8c34-71de3cee13d1\",\"url\":\"/images/quickform-only-logo.png\",\"name\":\"Default Image\"}]}",
    "Body__c": "{\"layout\":[{\"id\":\"image\",\"type\":\"image\",\"x\":100,\"y\":30,\"width\":800,\"height\":320,\"zIndex\":1,\"alignment\":\"center\",\"imageId\":\"fb50e6f7-83e9-4a1b-8c34-71de3cee13d1\"},{\"id\":\"title\",\"type\":\"title\",\"x\":100,\"y\":370,\"width\":800,\"height\":60,\"zIndex\":2,\"alignment\":\"center\"},{\"id\":\"subtitle\",\"type\":\"subtitle\",\"x\":100,\"y\":450,\"width\":800,\"height\":40,\"zIndex\":2,\"alignment\":\"center\"},{\"id\":\"button\",\"type\":\"button\",\"x\":400,\"y\":510,\"width\":200,\"height\":50,\"zIndex\":2,\"alignment\":\"center\"},{\"id\":\"social\",\"type\":\"social\",\"x\":400,\"y\":580,\"width\":200,\"height\":60,\"zIndex\":2,\"alignment\":\"center\"}],\"socialLinks\":{\"facebook\":{\"enabled\":true,\"url\":\"https://facebook.com\"},\"instagram\":{\"enabled\":true,\"url\":\"https://instagram.com\"},\"linkedin\":{\"enabled\":true,\"url\":\"https://linkedin.com\"},\"message\":{\"enabled\":true,\"url\":\"mailto:contact@example.com\"}},\"customTexts\":[]}",
    "Description__c": "Default Thank you",
  }

    return { formVersion, formFields, allFields,defaultThankyoudata };
  };

  const prepareMappingData = (formVersionId, objectInfo, salesforceFieldToFormFieldId) => {
    const nodes = [];
    const edges = [];
    const mappings = [];

    objectInfo.forEach((obj, objIndex) => {
      const nodeId = `create_update_${Math.floor(Math.random() * 10000)}`;

      // Create field mappings only for fields of this object
      const fieldMappings = obj.fields.map(field => {
        return {
          formFieldId: salesforceFieldToFormFieldId[field.name] || '',
          fieldType: typeMapping[field.type]?.[0] || 'shorttext',
          salesforceField: field.name,
          picklistValue: '',
        };
      });

      // Add the content document configuration
      const contentDocumentConfig = {
        storeAsContentDocument: false,
        selectedFileUploadFields: []
      };

      // Use the combined mappings
      const finalMappings = [...fieldMappings, contentDocumentConfig];

      const createUpdateNode = {
        id: nodeId,
        type: 'custom',
        position: { x: 250, y: 150 + objIndex * 300 },
        data: {
          label: 'Create/Update',
          displayLabel: 'Create/Update',
          action: 'Create/Update',
          type: 'action',
          order: objIndex + 1,
          salesforceObject: obj.objectName,
          fieldMappings: finalMappings,
          conditions: [],
          logicType: 'AND',
          customLogic: '',
          enableConditions: false,
          returnLimit: '',
          sortField: '',
          sortOrder: 'ASC',
          nextNodeIds: [],
          previousNodeId: '',
        },
        draggable: true,
      };

      nodes.push(createUpdateNode);

      const mapping = {
        nodeId: nodeId,
        actionType: 'CreateUpdate',
        salesforceObject: obj.objectName,
        fieldMappings: fieldMappings,
        conditions: [],
        logicType: 'AND',
        customLogic: '',
        enableConditions: false,
        returnLimit: '',
        sortField: '',
        sortOrder: 'ASC',
        label: 'Create/Update',
        order: objIndex + 1,
        formVersionId: formVersionId,
        previousNodeId: '',
        nextNodeIds: [],
      };

      mappings.push(mapping);
    });

    // Connect nodes and mappings with edges, set prev/next metadata
    for (let i = 0; i < nodes.length; i++) {
      if (i < nodes.length - 1) {
        edges.push({
          id: `edge_${nodes[i].id}_to_${nodes[i + 1].id}`,
          source: nodes[i].id,
          target: nodes[i + 1].id,
        });

        nodes[i].data.nextNodeIds.push(nodes[i + 1].id);
        mappings[i].nextNodeIds.push(nodes[i + 1].id);

        nodes[i + 1].data.previousNodeId = nodes[i].id;
        mappings[i + 1].previousNodeId = nodes[i].id;
      }
    }

    return {
      nodes,
      edges,
      mappings,
    };
  };

  const handleFormNameSubmit = async () => {
    if (!formName.trim()) {
      setFormNameError('Form name is required.');
      return;
    }
    if (formName.length > 80) {
      setFormNameError('Form Name can\'t exceed 80 characters.');
      return;
    }
    if (formDescription.length > 255) {
      setFormNameError('Description can\'t exceed 255 characters.');
      return;
    }
    setIsSaving(true);
    setFormNameError(null)

    if (onSubmit) {
      onSubmit({ name: formName, description: formDescription });
      return;
    }
    try {
      const userId = sessionStorage.getItem('userId');
      const instanceUrl = sessionStorage.getItem('instanceUrl');
      if (!userId || !instanceUrl) {
        throw new Error('Missing userId or instanceUrl. Please log in.');
      }
      const token = await fetchAccessToken(userId, instanceUrl);
      if (!token) throw new Error('Failed to obtain access token.');

      // Create the form version and fields
       const { formVersion, formFields, allFields , defaultThankyoudata } = prepareFormData();
      const formResponse = await fetch(process.env.REACT_APP_SAVE_FORM_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          userId,
          instanceUrl: instanceUrl.replace(/https?:\/\//, ''),
          formData: { formVersion, formFields },
          thankyouData : defaultThankyoudata
        }),
      });

      const formData = await formResponse.json();
      if (!formResponse.ok) throw new Error(formData.error || 'Failed to create form.');

      const newFormVersionId = formData.formVersionId;
      const formFieldIds = formData.fieldRecordIds || {};

      console.log('Field ID mapping from backend:', formFieldIds);

      // Check if objectInfo has valid fields
      const hasValidObjectInfo = objectInfo.some((obj) => obj.fields && obj.fields.length > 0);

      if (hasValidObjectInfo) {
        // Create the mapping records
        const salesforceFieldToFormFieldId = {};
        allFields.forEach(field => {
          console.log('allfields name:: ', field);

          if (field.name && formFieldIds[field.id]) {
            salesforceFieldToFormFieldId[field.name] = formFieldIds[field.id];
          }
        });

        const { nodes, mappings, edges } = prepareMappingData(newFormVersionId, objectInfo, salesforceFieldToFormFieldId);

        console.log('Salesforce field to form field ID mapping:', salesforceFieldToFormFieldId);

        // Debug: Check if we have the right field IDs
        allFields.forEach(field => {
          console.log(`Field: ${field.name}, Unique Key: ${field.id}, Salesforce ID: ${formFieldIds[field.id]}`);
        });

        // Update field mappings with actual form field IDs
        mappings.forEach((mapping) => {
          if (mapping.actionType === 'CreateUpdate') {
            mapping.formVersionId = newFormVersionId;
            mapping.label = `Create/Update`;

            mapping.fieldMappings = mapping.fieldMappings.map((fieldMapping) => {
              // Find the form field ID using the Salesforce field name mapping
              const formFieldId = salesforceFieldToFormFieldId[fieldMapping.salesforceField] || '';

              return {
                ...fieldMapping,
                formFieldId, // Assign the correct formFieldId
              };
            });
          }
        });

        console.log('Mappings with formFieldIds:', mappings);

        const mappingResponse = await fetch(process.env.REACT_APP_SAVE_MAPPINGS_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            userId,
            instanceUrl: instanceUrl.replace(/https?:\/\//, ''),
            flowId: newFormVersionId,
            nodes,
            edges,
            mappings,
          }),
        });

        const mappingData = await mappingResponse.json();
        if (!mappingResponse.ok) {
          console.error('Failed to create mappings:', mappingData.error);
          throw new Error(mappingData.error || 'Failed to create mappings.');
        }
      }

      navigate(`/form-builder/${newFormVersionId}`, {
        state: { fields: allFields },
      });
    } catch (error) {
      console.error('Error creating form:', error);
      setFormNameError(error.message || 'Failed to create form.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        className="formdetails-modal-bg"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
      >
        {isSaving && <Loader text="Creating form" />}
        <motion.div
          className="formdetails-modal-box"
          initial={{ scale: 0.85, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.85, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        >
          <div className="formdetails-modal-header">
            <div className="formdetails-modal-title">Enter Form Details</div>
            <button
              onClick={onClose}
              className="formdetails-modal-close"
              aria-label="Close"
            >
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M10 1.00714L8.99286 0L5 3.99286L1.00714 0L0 1.00714L3.99286 5L0 8.99286L1.00714 10L5 6.00714L8.99286 10L10 8.99286L6.00714 5L10 1.00714Z" fill="#5F6165" />
              </svg>

            </button>
          </div>
          <div className="form-container">
            <div className="formdetails-modal-content">
              <div>
                <label htmlFor="formName" className="formdetails-modal-label">
                  Form Name <span className="required-star">*</span>
                </label>
                <motion.input
                  id="formName"
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="Enter form name"
                  className="formdetails-modal-input"
                  autoFocus
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                />
              </div>
              <div>
                <label htmlFor="formDescription" className="formdetails-modal-label">
                  Form Description
                </label>
                <motion.textarea
                  id="formDescription"
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Enter form description"
                  className="formdetails-modal-textarea"
                  rows={2}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                />
              </div>
              {/* Captcha Selection & Preview */}
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
                <div style={{ flex: 1 }}>
                  <label className="formdetails-modal-label">Select CAPTCHA Type</label>
                  <Select
                    value={captchaType}
                    onChange={(val) => {
                      setCaptchaType(val);
                      setCaptchaVerifyStatus(null);
                      setCaptchaInput('');
                      setCaptchaGenerateKey(prev => prev + 1);
                      captchaVerifyResult.current = null;
                    }}
                    options={Object.keys(captchaComponents).map((key) => ({ label: key, value: key }))}
                    style={{ width: '100%' }}
                    aria-label="Select CAPTCHA Type"
                  />
                </div>
                <div style={{ flex: 1, border: '1px solid #ddd', borderRadius: 10, padding: 12, background: '#fafafa', minHeight: 130 }}>
                  {SelectedCaptchaComponent && (
                    <SelectedCaptchaComponent
                      key={captchaGenerateKey}
                      onVerify={onCaptchaVerify}
                      onGenerate={handleCaptchaGenerate}  
                    />
                  )}
                </div>
              </div>

              {/* Progress Bar Selection & Preview */}
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
                <div style={{ flex: 1 }}>
                  <label className="formdetails-modal-label">Select Progress Bar Type</label>
                  <Select
                    value={progressType}
                    onChange={(val) => setProgressType(val)}
                    options={Object.keys(progressBarComponents).map((key) => ({ label: key, value: key }))}
                    style={{ width: '100%' }}
                    aria-label="Select Progress Bar Type"
                  />
                </div>
                <div style={{ flex: 1, border: '1px solid #ddd', borderRadius: 10, padding: 12, background: '#fafafa', minHeight: 130, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {SelectedProgressComponent && (
                    // Provide props for preview for all progress bar types
                    SelectedProgressComponent === SimpleProgressBar ? <SimpleProgressBar percent={50} />
                    : SelectedProgressComponent === CircularProgress ? <CircularProgress percent={75} />
                    : SelectedProgressComponent === PaginationProgress ? <PaginationProgress current={1} total={3} />
                    : SelectedProgressComponent === CirclesStepProgress ? <CirclesStepProgress steps={4} current={2} />
                    : SelectedProgressComponent === ArrowStepsProgress ? <ArrowStepsProgress steps={["Step 1", "Step 2", "Step 3"]} current={1} />
                    : SelectedProgressComponent === SquareStepsProgress ? <SquareStepsProgress steps={["Step 1", "Step 2", "Step 3", "Step 4"]} current={3} />
                    : null
                  )}
                </div>
              </div>
              <AnimatePresence>
                {formNameError && (
                  <motion.div
                    className="formdetails-modal-error"
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                  >
                    {formNameError}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
          <div className="formdetails-modal-actions">
            <div className="cancel-button">
              <button
                onClick={onClose}
                className="wizard-btn wizard-btn-secondary"
                type="button"
              >
                Cancel
              </button>
            </div>
            <div className='next-button-enabled'>
              <button
                onClick={handleFormNameSubmit}
                className="wizard-btn wizard-btn-primary"
              >
                Create Form
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );

};

export default FormName;