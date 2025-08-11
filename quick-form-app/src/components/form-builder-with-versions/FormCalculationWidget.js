// import React, { useState, useRef, useEffect } from 'react';
// import { motion, AnimatePresence } from 'framer-motion';

// function FormCalculationWidget({ selectedField, onUpdateField, fields }) {
//   const [formula, setFormula] = useState(selectedField?.formula || '');
//   const [fieldReferences, setFieldReferences] = useState(selectedField?.fieldReferences || []);
//   const [showFields, setShowFields] = useState(false);
//   const [showFunctions, setShowFunctions] = useState(false);
//   const [showOptions, setShowOptions] = useState(false);
//   const [isTextareaFocused, setIsTextareaFocused] = useState(false);
  
//   const fieldsDropdownRef = useRef(null);
//   const functionsDropdownRef = useRef(null);
//   const optionsDropdownRef = useRef(null);
//   const textareaRef = useRef(null);

//   const calculableFields = fields?.filter((field) =>
//     ['number', 'price'].includes(field.type) && field.id !== selectedField.id
//   ) || [];

//   const functionCategories = {
//     'Basic': ['SUM', 'AVERAGE', 'MIN', 'MAX'],
//     'Advanced': ['SQRT', 'POWER', 'ABS', 'ROUND'],
//     'Conditional': ['IF', 'AND', 'OR'],
//     'Date/Time': ['TODAY', 'DATEDIFF', 'NOW']
//   };

//   // Close dropdowns when clicking outside
//   useEffect(() => {
//     const handleClickOutside = (event) => {
//       if (textareaRef.current && !textareaRef.current.contains(event.target)) {
//         setIsTextareaFocused(false);
//       }
//       if (fieldsDropdownRef.current && !fieldsDropdownRef.current.contains(event.target)) {
//         setShowFields(false);
//       }
//       if (functionsDropdownRef.current && !functionsDropdownRef.current.contains(event.target)) {
//         setShowFunctions(false);
//       }
//       if (optionsDropdownRef.current && !optionsDropdownRef.current.contains(event.target)) {
//         setShowOptions(false);
//       }
//     };

//     document.addEventListener('mousedown', handleClickOutside);
//     return () => {
//       document.addEventListener('mousedown', handleClickOutside);
//     };
//   }, []);

//   const displayFormula = () => {
//     let display = formula;
//     fields.forEach((field) => {
//       const regex = new RegExp(`\\{${field.id}\\}`, 'g');
//       const label = field.label || field.type;
//       display = display.replace(regex, `{${label}}`);
//     });
//     return display;
//   };

//   const convertToRawFormula = (displayedFormula) => {
//     let raw = displayedFormula;
//     fields.forEach((field) => {
//       const regex = new RegExp(`\\{${field.label || field.type}\\}`, 'g');
//       raw = raw.replace(regex, `{${field.id}}`);
//     });
//     return raw;
//   };

//   const handleFormulaChange = (value) => {
//     const rawFormula = convertToRawFormula(value);
//     setFormula(rawFormula);
//   };

//   const appendToFormula = (value) => {
//     setFormula((prev) => prev + value);
//   };

//   const handleFieldSelect = (fieldId) => {
//     if (!fieldReferences.includes(fieldId)) {
//       const newReferences = [...fieldReferences, fieldId];
//       setFieldReferences(newReferences);
//       onUpdateField(selectedField.id, { fieldReferences: newReferences });
//     }
//     appendToFormula(`{${fieldId}}`);
//     setShowFields(false);
//   };

//   const handleFunctionSelect = (func) => {
//     appendToFormula(`${func}(`);
//     setShowFunctions(false);
//   };

//   const handleBackspace = () => {
//     setFormula((prev) => prev.slice(0, -1));
//   };

//   const handleClearFormula = () => {
//     setFormula('');
//     setFieldReferences([]);
//     onUpdateField(selectedField.id, { formula: '', fieldReferences: [] });
//     setShowOptions(false);
//   };

//   const handleSaveFormula = () => {
//     onUpdateField(selectedField.id, { formula, fieldReferences });
//   };

//   return (
//     <div className="p-4 bg-white rounded-lg border border-gray-200 max-w-md">
//       {/* Calculation Area */}
//       <div className="mb-4">
//         <label className="block text-sm font-medium text-gray-700 mb-1">Calculation Area</label>
//         <motion.textarea
//           ref={textareaRef}
//           value={displayFormula()}
//           onChange={(e) => handleFormulaChange(e.target.value)}
//           className={`w-full p-3 h-24 border rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none ${
//             isTextareaFocused ? 'border-blue-400' : 'border-gray-300'
//           }`}
//           placeholder="e.g., {Price} * {Quantity}"
//           onFocus={() => setIsTextareaFocused(true)}
//           onBlur={() => setIsTextareaFocused(false)}
//         />
//       </div>

//       {/* ADD FIELD Button */}
//       <div className="mb-4 relative" ref={fieldsDropdownRef}>
//         <button
//           onClick={() => setShowFields(!showFields)}
//           className="w-full px-4 py-2 bg-[#028AB0] text-white rounded-lg hover:bg-[#017393] flex items-center justify-center gap-2 transition-colors"
//         >
//           <span>+ ADD FIELD</span>
//         </button>
        
//         <AnimatePresence>
//           {showFields && (
//             <motion.div
//               className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg py-1 max-h-60 overflow-y-auto"
//               initial={{ opacity: 0, y: -10 }}
//               animate={{ opacity: 1, y: 0 }}
//               exit={{ opacity: 0, y: -10 }}
//               transition={{ duration: 0.2 }}
//             >
//               {calculableFields.length > 0 ? (
//                 calculableFields.map((field) => (
//                   <button
//                     key={field.id}
//                     onClick={() => handleFieldSelect(field.id)}
//                     className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 transition-colors"
//                   >
//                     {field.label || field.type}
//                   </button>
//                 ))
//               ) : (
//                 <div className="px-4 py-2 text-sm text-gray-500">No fields available</div>
//               )}
//             </motion.div>
//           )}
//         </AnimatePresence>
//       </div>

//       {/* Calculator Keypad */}
//       <div className="mb-4">
//         <div className="grid grid-cols-3 gap-2">
//           {['7', '8', '9'].map((char) => (
//             <button
//               key={char}
//               onClick={() => appendToFormula(char)}
//               className="p-3 bg-gray-100 rounded-lg text-gray-700 hover:bg-gray-200 transition-colors"
//             >
//               {char}
//             </button>
//           ))}
          
//           {['4', '5', '6'].map((char) => (
//             <button
//               key={char}
//               onClick={() => appendToFormula(char)}
//               className="p-3 bg-gray-100 rounded-lg text-gray-700 hover:bg-gray-200 transition-colors"
//             >
//               {char}
//             </button>
//           ))}
          
//           {['1', '2', '3'].map((char) => (
//             <button
//               key={char}
//               onClick={() => appendToFormula(char)}
//               className="p-3 bg-gray-100 rounded-lg text-gray-700 hover:bg-gray-200 transition-colors"
//             >
//               {char}
//             </button>
//           ))}
          
//           {['0', '.', '(', ')'].map((char) => (
//             <button
//               key={char}
//               onClick={() => appendToFormula(char)}
//               className="p-3 bg-gray-100 rounded-lg text-gray-700 hover:bg-gray-200 transition-colors"
//             >
//               {char}
//             </button>
//           ))}
          
//           <button
//             onClick={() => appendToFormula('+')}
//             className="p-3 bg-[#029EC9] text-white rounded-lg hover:bg-[#0290b7] transition-colors"
//           >
//             +
//           </button>
          
//           <button
//             onClick={handleBackspace}
//             className="p-3 bg-red-700 text-white rounded-lg hover:bg-red-800 transition-colors"
//           >
//             ←
//           </button>
          
//           <div className="relative" ref={functionsDropdownRef}>
//             <button
//               onClick={() => setShowFunctions(!showFunctions)}
//               className="p-3 w-full bg-purple-500 text-white rounded-lg hover:bg-purple-600 flex items-center justify-center transition-colors"
//             >
//               <span>f(x)</span>
//             </button>
            
//             <AnimatePresence>
//               {showFunctions && (
//                 <motion.div
//                   className="absolute z-10 bottom-full mb-1 left-0 right-0 bg-white border border-gray-200 rounded-lg shadow-lg py-1 max-h-60 overflow-y-auto"
//                   initial={{ opacity: 0, y: 10 }}
//                   animate={{ opacity: 1, y: 0 }}
//                   exit={{ opacity: 0, y: 10 }}
//                   transition={{ duration: 0.2 }}
//                 >
//                   {Object.entries(functionCategories).map(([category, funcs]) => (
//                     <div key={category}>
//                       <div className="px-3 py-1 text-xs font-medium text-gray-500 bg-gray-50 border-b border-gray-100">
//                         {category}
//                       </div>
//                       {funcs.map((func) => (
//                         <button
//                           key={func}
//                           onClick={() => handleFunctionSelect(func)}
//                           className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-purple-50 transition-colors"
//                         >
//                           {func}
//                         </button>
//                       ))}
//                     </div>
//                   ))}
//                 </motion.div>
//               )}
//             </AnimatePresence>
//           </div>
//         </div>
//       </div>

//       {/* Footer with Options */}
//       <div className="flex justify-between items-center pt-2 border-t border-gray-200">
//         <div className="relative" ref={optionsDropdownRef}>
//           <button
//             onClick={() => setShowOptions(!showOptions)}
//             className="text-blue-600 hover:text-blue-800 text-sm flex items-center gap-1 transition-colors"
//           >
//             Options
//           </button>
          
//           <AnimatePresence>
//             {showOptions && (
//               <motion.div
//                 className="absolute z-10 bottom-full mb-2 left-0 bg-white border border-gray-200 rounded-lg shadow-lg py-1 min-w-[120px]"
//                 initial={{ opacity: 0, y: 10 }}
//                 animate={{ opacity: 1, y: 0 }}
//                 exit={{ opacity: 0, y: 10 }}
//                 transition={{ duration: 0.2 }}
//               >
//                 <button
//                   onClick={handleClearFormula}
//                   className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 transition-colors"
//                 >
//                   Clear All
//                 </button>
//               </motion.div>
//             )}
//           </AnimatePresence>
//         </div>
        
//         <button
//           onClick={handleSaveFormula}
//           className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 text-sm flex items-center gap-1 transition-colors"
//         >
//           <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
//             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
//           </svg>
//           SAVE
//         </button>
//       </div>
//     </div>
//   );
// }

// export default FormCalculationWidget;


import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// Converts the structured formula (array of parts) into a raw string for saving
const convertPartsToRawFormula = (parts) => {
  return parts.map(p => p.type === 'field' ? `{${p.id}}` : p.value).join('');
};

// Returns the correct Tailwind CSS classes for a given formula part type
const getPillStyle = (type) => {
  switch (type) {
    case 'field':
      return 'bg-[#03B2E3] text-white';
    case 'function':
      return 'bg-purple-500 text-white';
    case 'operator':
      return 'bg-[#029EC9] text-white';
    case 'number':
    case 'parenthesis':
    default:
      return 'bg-gray-200 text-gray-800';
  }
};

function FormCalculationWidget({ selectedField, onUpdateField, fields }) {
  const [formulaParts, setFormulaParts] = useState([]);
  const [showFields, setShowFields] = useState(false);
  const [showFunctions, setShowFunctions] = useState(false);
  const [showOptions, setShowOptions] = useState(false);

  const fieldsDropdownRef = useRef(null);
  const functionsDropdownRef = useRef(null);
  const optionsDropdownRef = useRef(null);

  const disabledFieldTypes = [
    'heading', 'display text', 'divider', 'pagebreak', 'toggle', 
    'imageuploader', 'fileuploader', 'section', 'formcalculation', 
    'signature', 'terms of service'
  ];

  const availableFields = fields?.filter((field) => field.id !== selectedField.id) || [];

  const functionCategories = {
    'Basic': ['SUM', 'AVERAGE', 'MIN', 'MAX'],
    'Advanced': ['SQRT', 'POWER', 'ABS', 'ROUND'],
    'Conditional': ['IF', 'AND', 'OR'],
    'Date/Time': ['TODAY', 'DATEDIFF', 'NOW']
  };

  useEffect(() => {
    const rawFormula = selectedField?.formula || '';
    if (!rawFormula) {
      setFormulaParts([]);
      return;
    }

    // Regex to find all parts: {fields}, functions, numbers, and operators/parentheses
    const tokens = rawFormula.match(/(\{[^}]+\})|([A-Z_]+(?=\())|([0-9.]+)|([+\-*/(),])/g) || [];
    
    const allFunctions = Object.values(functionCategories).flat();

    const parts = tokens.map(token => {
      // Field: {field_id}
      if (token.startsWith('{') && token.endsWith('}')) {
        const fieldId = token.substring(1, token.length - 1);
        const field = fields.find(f => f.id === fieldId);
        return { type: 'field', id: fieldId, label: field?.label || fieldId };
      }
      // Function
      if (allFunctions.includes(token)) {
        return { type: 'function', value: token };
      }
      // Number
      if (!isNaN(parseFloat(token)) && isFinite(token)) {
        return { type: 'number', value: token };
      }
      // Operator
      if (['+', '-', '*', '/'].includes(token)) {
        return { type: 'operator', value: token };
      }
      // Parenthesis
      if (['(', ')'].includes(token)) {
        return { type: 'parenthesis', value: token };
      }
      return { type: 'misc', value: token }; // Fallback
    });

    setFormulaParts(parts);
  }, [selectedField.id, selectedField.formula, fields]);


  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (fieldsDropdownRef.current && !fieldsDropdownRef.current.contains(event.target)) setShowFields(false);
      if (functionsDropdownRef.current && !functionsDropdownRef.current.contains(event.target)) setShowFunctions(false);
      if (optionsDropdownRef.current && !optionsDropdownRef.current.contains(event.target)) setShowOptions(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Adds a new part (pill) to the formula
  const addPartToFormula = (part) => {
    setFormulaParts(prev => {
      // This logic inserts new parts *before* the closing parenthesis of a function
      const lastPart = prev[prev.length - 1];
      if (lastPart?.type === 'parenthesis' && lastPart?.value === ')') {
        return [...prev.slice(0, -1), part, lastPart];
      }
      return [...prev, part];
    });
  };

  const handleFieldSelect = (field) => {
    addPartToFormula({ type: 'field', id: field.id, label: field.label || field.type });
    setShowFields(false);
  };

  const handleFunctionSelect = (func) => {
    // Add the function and its parentheses as three separate parts
    setFormulaParts(prev => [
      ...prev,
      { type: 'function', value: func },
      { type: 'parenthesis', value: '(' },
      { type: 'parenthesis', value: ')' }
    ]);
    setShowFunctions(false);
  };
  
  const handleOperatorOrNumberSelect = (value, type) => {
    addPartToFormula({ type, value });
  }

  const handleBackspace = () => {
    setFormulaParts(prev => prev.slice(0, -1));
  };

  const handleClearFormula = () => {
    setFormulaParts([]);
    setShowOptions(false);
  };

  const handleSaveFormula = () => {
    const rawFormula = convertPartsToRawFormula(formulaParts);
    // Find all unique field IDs used in the formula
    const fieldReferences = formulaParts
      .filter(p => p.type === 'field')
      .map(p => p.id)
      .filter((id, index, self) => self.indexOf(id) === index); // Unique IDs

    onUpdateField(selectedField.id, { formula: rawFormula, fieldReferences });
    // You can add a success notification here if you like
  };

   return (
    <div className="p-4 bg-white rounded-lg border border-gray-200 max-w-md">
      {/* Calculation Pill Area */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">Calculation Area</label>
        <div className="w-full p-3 h-24 border rounded-lg bg-gray-50 focus-within:ring-2 focus-within:ring-blue-400 focus-within:border-blue-400 flex flex-wrap items-start gap-2 overflow-y-auto">
          {formulaParts.length > 0 ? (
            formulaParts.map((part, index) => (
              <span key={index} className={`px-2.5 py-1.5 rounded-lg text-sm font-semibold flex items-center justify-center ${getPillStyle(part.type)}`}>
                {part.label || part.value}
              </span>
            ))
          ) : (
            <span className="text-gray-400 px-1 py-1">Click buttons to build formula...</span>
          )}
        </div>
      </div>

      {/* ADD FIELD Button */}
      <div className="mb-4 relative" ref={fieldsDropdownRef}>
        <button
          onClick={() => setShowFields(!showFields)}
          className="w-full px-4 py-2 bg-[#028AB0] text-white rounded-lg hover:bg-[#017393] flex items-center justify-center gap-2 transition-colors"
        >
          <span>+ ADD FIELD</span>
        </button>
        
        <AnimatePresence>
          {showFields && (
            <motion.div
              className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg py-1 max-h-60 overflow-y-auto"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {availableFields.length > 0 ? (
                availableFields.map((field) => {
                  const isDisabled = disabledFieldTypes.includes(field.type);
                  return (
                    <button
                      key={field.id}
                      onClick={() => !isDisabled && handleFieldSelect(field)}
                      disabled={isDisabled}
                      className={`w-full text-left px-4 py-2 text-sm transition-colors ${
                        isDisabled 
                          ? 'text-gray-400 cursor-not-allowed bg-gray-50' 
                          : 'text-gray-700 hover:bg-blue-50'
                      }`}
                    >
                      {field.label || field.type}
                    </button>
                  )
                })
              ) : (
                <div className="px-4 py-2 text-sm text-gray-500">No other fields available</div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Calculator Keypad */}
      <div className="mb-4">
        <div className="grid grid-cols-4 gap-2">
          {['7', '8', '9'].map((char) => ( <button key={char} onClick={() => handleOperatorOrNumberSelect(char, 'number')} className="p-3 bg-gray-100 rounded-lg text-gray-700 hover:bg-gray-200 transition-colors">{char}</button> ))}
          <button onClick={() => handleOperatorOrNumberSelect('/', 'operator')} className="p-3 bg-[#029EC9] text-white rounded-lg hover:bg-[#0290b7] transition-colors">÷</button>
          
          {['4', '5', '6'].map((char) => ( <button key={char} onClick={() => handleOperatorOrNumberSelect(char, 'number')} className="p-3 bg-gray-100 rounded-lg text-gray-700 hover:bg-gray-200 transition-colors">{char}</button>))}
          <button onClick={() => handleOperatorOrNumberSelect('*', 'operator')} className="p-3 bg-[#029EC9] text-white rounded-lg hover:bg-[#0290b7] transition-colors">×</button>
          
          {['1', '2', '3'].map((char) => ( <button key={char} onClick={() => handleOperatorOrNumberSelect(char, 'number')} className="p-3 bg-gray-100 rounded-lg text-gray-700 hover:bg-gray-200 transition-colors">{char}</button>))}
          <button onClick={() => handleOperatorOrNumberSelect('-', 'operator')} className="p-3 bg-[#029EC9] text-white rounded-lg hover:bg-[#0290b7] transition-colors">-</button>

          {['0', '.'].map((char) => ( <button key={char} onClick={() => handleOperatorOrNumberSelect(char, 'number')} className="p-3 bg-gray-100 rounded-lg text-gray-700 hover:bg-gray-200 transition-colors">{char}</button>))}
          <button onClick={handleBackspace} className="p-3 bg-red-700 text-white rounded-lg hover:bg-red-800 transition-colors flex items-center justify-center">←</button>
          <button onClick={() => handleOperatorOrNumberSelect('+', 'operator')} className="p-3 bg-[#029EC9] text-white rounded-lg hover:bg-[#0290b7] transition-colors">+</button>
        </div>
        
        <div className="grid grid-cols-3 gap-2 mt-2">
            <button onClick={() => handleOperatorOrNumberSelect('(', 'parenthesis')} className="p-3 bg-gray-100 rounded-lg text-gray-700 hover:bg-gray-200 transition-colors">(</button>
            <button onClick={() => handleOperatorOrNumberSelect(')', 'parenthesis')} className="p-3 bg-gray-100 rounded-lg text-gray-700 hover:bg-gray-200 transition-colors">)</button>
            <div className="relative" ref={functionsDropdownRef}>
                <button onClick={() => setShowFunctions(!showFunctions)} className="p-3 w-full bg-purple-500 text-white rounded-lg hover:bg-purple-600 flex items-center justify-center transition-colors">
                    <span>f(x)</span>
                </button>
                <AnimatePresence>
                  {showFunctions && (
                    <motion.div className="absolute z-10 bottom-full mb-1 left-0 right-0 bg-white border border-gray-200 rounded-lg shadow-lg py-1 max-h-60 overflow-y-auto" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} transition={{ duration: 0.2 }}>
                      {Object.entries(functionCategories).map(([category, funcs]) => (
                        <div key={category}>
                          <div className="px-3 py-1 text-xs font-medium text-gray-500 bg-gray-50 border-b border-gray-100">{category}</div>
                          {funcs.map((func) => ( <button key={func} onClick={() => handleFunctionSelect(func)} className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-purple-50 transition-colors">{func}</button> ))}
                        </div>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
            </div>
        </div>
      </div>

      {/* Footer with Options */}
      <div className="flex justify-between items-center pt-2 border-t border-gray-200">
        <div className="relative" ref={optionsDropdownRef}>
          <button onClick={() => setShowOptions(!showOptions)} className="text-blue-600 hover:text-blue-800 text-sm flex items-center gap-1 transition-colors">Options</button>
          <AnimatePresence>
            {showOptions && (
              <motion.div className="absolute z-10 bottom-full mb-2 left-0 bg-white border border-gray-200 rounded-lg shadow-lg py-1 min-w-[120px]" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} transition={{ duration: 0.2 }}>
                <button onClick={handleClearFormula} className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors">Clear All</button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        <button onClick={handleSaveFormula} className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 text-sm flex items-center gap-1 transition-colors">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
          SAVE
        </button>
      </div>
    </div>
  );
}

export default FormCalculationWidget;