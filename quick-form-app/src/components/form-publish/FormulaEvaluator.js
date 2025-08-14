export const evaluateFormula = (formula, formValues, fieldReferences = []) => {
  try {
    if (!formula || !formula.trim()) return '';

    // DATE & TIME FUNCTIONS

    // Adds days to a date (handles invalid dates)
    const addDays = function(date, numDays) {
      if (!date) return null;
      const d = new Date(date);
      if (isNaN(d)) return null;
      d.setDate(d.getDate() + (Number(numDays) || 0));
      return d;
    };

    // Adds months to a date (handles year rollover)
    const addMonths = function(date, numMonths) {
      if (!date) return null;
      const d = new Date(date);
      if (isNaN(d)) return null;
      d.setMonth(d.getMonth() + (Number(numMonths) || 0));
      return d;
    };

    // Adds years to a date
    const addYears = function(date, numYears) {
      if (!date) return null;
      const d = new Date(date);
      if (isNaN(d)) return null;
      d.setFullYear(d.getFullYear() + (Number(numYears) || 0));
      return d;
    };

    // Calculates difference between two dates in specified units
    const subtractDates = function(date1, date2, unit = 'days') {
      if (!date1 || !date2) return null;
      const d1 = new Date(date1);
      const d2 = new Date(date2);
      if (isNaN(d1) || isNaN(d2)) return null;
      const diffMs = d1 - d2;
      switch (unit) {
        case 'seconds': return diffMs / 1000;
        case 'minutes': return diffMs / (1000 * 60);
        case 'hours': return diffMs / (1000 * 60 * 60);
        case 'days': default: return diffMs / (1000 * 60 * 60 * 24);
      }
    };

    // Parses time string (HH:mm:ss) into {h,m,s} object
    const parseTime = function(val) {
      if (!val) return null;
      const parts = val.split(':').map(n => Number(n));
      if (parts.length < 2) return null;
      const [h, m, s = 0] = parts;
      if (
        h < 0 || h > 23 ||
        m < 0 || m > 59 ||
        s < 0 || s > 59 ||
        parts.some(n => isNaN(n))
      ) return null;
      return { h, m, s };
    };

    // Adds two times (handles 24h rollover)
    const addTimes = function(time1, time2) {
      const t1 = typeof time1 === 'string' ? parseTime(time1) : time1;
      const t2 = typeof time2 === 'string' ? parseTime(time2) : time2;
      if (!t1 || !t2) return null;
      let totalSeconds = t1.h * 3600 + t1.m * 60 + t1.s + t2.h * 3600 + t2.m * 60 + t2.s;
      totalSeconds %= 86400;
      const h = Math.floor(totalSeconds / 3600);
      const m = Math.floor((totalSeconds % 3600) / 60);
      const s = totalSeconds % 60;
      return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

    // Subtracts time2 from time1 (handles negative results)
    const subtractTimes = function(time1, time2) {
      const t1 = typeof time1 === 'string' ? parseTime(time1) : time1;
      const t2 = typeof time2 === 'string' ? parseTime(time2) : time2;
      if (!t1 || !t2) return null;
      let totalSeconds = (t1.h * 3600 + t1.m * 60 + t1.s) - (t2.h * 3600 + t2.m * 60 + t2.s);
      if (totalSeconds < 0) totalSeconds += 86400;
      const h = Math.floor(totalSeconds / 3600);
      const m = Math.floor((totalSeconds % 3600) / 60);
      const s = totalSeconds % 60;
      return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

    // Sets time on a date object
    const setTime = function(date, time) {
      if (!date || !time) return null;
      const d = new Date(date);
      if (isNaN(d)) return null;
      const t = parseTime(time);
      if (!t) return null;
      d.setHours(t.h, t.m, t.s || 0, 0);
      return d;
    };

    // Parses date string into Date object
    const parseDate = function(val) {
      if (!val) return null;
      const d = new Date(val);
      return isNaN(d) ? null : d;
    };

    // Alias for parseDate
    const toDate = parseDate;

    // Converts time string to HH:mm:ss format
    const toTime = function(val) {
      if (typeof val === 'string') {
        const t = parseTime(val);
        if (!t) return null;
        return `${t.h.toString().padStart(2, '0')}:${t.m.toString().padStart(2, '0')}:${t.s.toString().padStart(2, '0')}`;
      }
      return null;
    };

    // NUMBER FUNCTIONS

    // Safely converts value to number (NaN becomes 0)
    const parseNumber = function(val) {
      const n = Number(val);
      return isNaN(n) ? 0 : n;
    };

    // Rounds number to specified decimals
    const round = function(val, decimals = 0) {
      const n = parseNumber(val);
      return Number(n.toFixed(decimals));
    };
    
    // Math.floor with safe number conversion
    const floor = val => Math.floor(parseNumber(val));
    
    // Math.ceil with safe number conversion
    const ceil = val => Math.ceil(parseNumber(val));
    
    // STRING FUNCTIONS

    // Concatenates multiple values into string
    const concatStrings = function() {
      return Array.from(arguments).map(v => v == null ? '' : String(v)).join('');
    };
    
    // Safe string conversion (null/undefined becomes empty string)
    const toString = val => val == null ? '' : String(val);
    
    // Returns string length (0 for non-strings)
    const stringLength = str => (typeof str === 'string' ? str.length : 0);
    
    // Uppercase conversion (safe for non-strings)
    const toUpperCase = str => typeof str === 'string' ? str.toUpperCase() : '';
    
    // Lowercase conversion (safe for non-strings)
    const toLowerCase = str => typeof str === 'string' ? str.toLowerCase() : '';
    
    // replace logic
    const replace = function(str, search, replacement) {
    if (typeof str !== 'string') return '';
    
    try {
        // Handle regex string (like "/pattern/g")
        if (search.startsWith('/') && search.lastIndexOf('/') > 0) {
        const lastSlash = search.lastIndexOf('/');
        const pattern = search.slice(1, lastSlash);
        const flags = search.slice(lastSlash + 1);
        return str.replace(new RegExp(pattern, flags), replacement);
        }
        // Default global string replacement
        return str.replace(new RegExp(search, 'g'), replacement);
    } catch (e) {
        console.error('Invalid replace pattern:', search);
        return str; // Return original on error
    }
    };

    // ARRAY FUNCTIONS

    // Returns array length (0 for non-arrays)
    const count = list => Array.isArray(list) ? list.length : 0;
    
    // Sums array or arguments (handles non-numbers)
    const sum = function() {
      const args = Array.from(arguments);
      if (args.length === 1 && Array.isArray(args[0])) args = args[0];
      return args.reduce((acc, v) => acc + (parseNumber(v) || 0), 0);
    };
    
    // Calculates average of numbers
    const mean = function() {
      const args = Array.from(arguments);
      if (args.length === 1 && Array.isArray(args[0])) args = args[0];
      return args.length === 0 ? 0 : sum(...args) / args.length;
    };
    
    // Finds minimum value (with number conversion)
    const min = function() {
      const args = Array.from(arguments);
      if (args.length === 1 && Array.isArray(args[0])) args = args[0];
      return Math.min(...args.map(v => parseNumber(v)));
    };
    
    // Finds maximum value (with number conversion)
    const max = function() {
      const args = Array.from(arguments);
      if (args.length === 1 && Array.isArray(args[0])) args = args[0];
      return Math.max(...args.map(v => parseNumber(v)));
    };

    // TYPE CONVERSION FUNCTIONS

    // Converts value to boolean (smart parsing)
    const toBoolean = function(val) {
      if (typeof val === 'boolean') return val;
      if (typeof val === 'string') {
        const v = val.toLowerCase().trim();
        if (['true', 'yes', '1'].includes(v)) return true;
        if (['false', 'no', '0'].includes(v)) return false;
      }
      if (typeof val === 'number') return val !== 0;
      return Boolean(val);
    };
    
    // Type coercion to specified type
    const coerceToType = function(val, type) {
      switch(type) {
        case 'string': return toString(val);
        case 'number': return parseNumber(val);
        case 'boolean': return toBoolean(val);
        case 'date': return toDate(val);
        case 'array': return Array.isArray(val) ? val : [val];
        default: return val;
      }
    };
    
    // Converts timestamp to Date
    const numberToDate = num => {
      const n = parseNumber(num);
      return n <= 0 ? null : new Date(n);
    };
    
    // Converts Date to timestamp
    const dateToNumber = date => {
      const d = toDate(date);
      return d ? d.valueOf() : NaN;
    };
    
    // Alias for parseNumber
    const toNumber = parseNumber;

    // MATH FUNCTIONS

    // Power function with safe number conversion
    const pow = (base, exponent) => Math.pow(parseNumber(base), parseNumber(exponent));
    
    // Modulo operation with safe number conversion
    const mod = (a, b) => parseNumber(a) % parseNumber(b);
    
    // Logarithm with optional base (default: natural log)
    const log = (value, base = Math.E) => {
      const v = parseNumber(value);
      const b = parseNumber(base);
      if (v <= 0 || b <= 0 || b === 1) return NaN;
      return Math.log(v) / Math.log(b);
    };
    
    // Exponential function with safe number conversion
    const exp = value => Math.exp(parseNumber(value));

    // =============================================
    // EVALUATION CONTEXT
    // =============================================
    const context = {
      // Date & Time
      addDays, addMonths, addYears, subtractDates,
      addTimes, subtractTimes, setTime,
      parseDate, parseTime, toDate, toTime,
      
      // Number
      parseNumber, abs: Math.abs, sqrt: Math.sqrt,
      min, max, sum, mean, round, floor, ceil,
      toNumber, pow, mod, log, exp,
      
      // String
      concatStrings, toString, stringLength,replace,
      toUpperCase, toLowerCase, trim: str => str?.trim() || '',
      
      // Type Conversion
      coerceToType, numberToDate, dateToNumber, toBoolean,
      
      // Null/Empty Check
      isNullOrEmpty: val => (
        val === null ||
        val === undefined ||
        val === '' ||
        (Array.isArray(val) && val.length === 0) ||
        (typeof val === 'object' && Object.keys(val).length === 0)
      )
    };

    // FORMULA EVALUATION

    // Replace field references with actual values
    const replacedFormula = fieldReferences.reduce((currentFormula, fieldId) => {
      const fieldValue = formValues[fieldId];
      
      const replacementValue = 
        fieldValue === undefined ? 'undefined' :
        fieldValue === null ? 'null' :
        typeof fieldValue === 'string' ? `"${fieldValue.replace(/"/g, '\\"')}"` :
        typeof fieldValue === 'object' ? JSON.stringify(fieldValue) :
        fieldValue;
      
      return currentFormula.replace(new RegExp(`\\{${fieldId}\\}`, 'g'), replacementValue);
    }, formula);    

    // Safe evaluation with function whitelisting
    const safeEval = (expr) => {
      const allowedFunctions = Object.keys(context);
      
      // Security checks
      const dangerousPatterns = [
        /\.constructor/i, /__proto__/i, /prototype/i,
        /require\(/i, /import\(/i, /eval\(/i,
        /Function\(/i, /new Function\(/i,
        /process\./i, /fs\./i
      ];
      
      if (dangerousPatterns.some(pattern => pattern.test(expr))) {
        throw new Error('Potentially dangerous expression detected');
      }

      // Validate called functions
      const functionCalls = expr.match(/([a-zA-Z_$][0-9a-zA-Z_$]*)\(/g) || [];
      const calledFunctions = functionCalls.map(f => f.slice(0, -1));
      
      for (const func of calledFunctions) {
        if (!allowedFunctions.includes(func)) {
          throw new Error(`Function ${func} is not allowed`);
        }
      }

      return Function(...Object.keys(context), `"use strict"; return ${expr}`)(...Object.values(context));
    };

    // Execute evaluation
    const result = safeEval(replacedFormula);
    
    if (typeof result === 'number' && isNaN(result)) return 'Error: Result is NaN';
    if (result === undefined) return '';

    return result;

  } catch (e) {
    console.error('Error evaluating formula:', e);
    return `Error: ${e.message}`;
  }
};


// handling 3 diffferent formula scenario

// export const evaluateFormula = (formula, formValues, fieldReferences = []) => {
//   try {
//     if (!formula || !formula.trim()) return '';

//     const detectAndHandleScenarios = (formula, fieldReferences, formValues) => {
//       // Extract simple operations pattern (e.g., {field1} + {field2})
//       const simpleOpMatch = formula.match(/^\{([^}]+)\}\s*([+-])\s*\{([^}]+)\}$/);
//       if (!simpleOpMatch) return null;

//       const [, leftField, operator, rightField] = simpleOpMatch;
      
//       // Get actual values
//       const leftVal = formValues[leftField];
//       const rightVal = formValues[rightField];

//       // Scenario 1: Date +- Number
//       if ((leftVal instanceof Date || !isNaN(new Date(leftVal)))) {
//         const date = new Date(leftVal);
//         const num = parseFloat(rightVal);
//         if (!isNaN(date) && !isNaN(num)) {
//           const result = new Date(date);
//           result.setDate(result.getDate() + (operator === '+' ? num : -num));
//           return result;
//         }
//       }

//       // Scenario 2: Number - Date
//       if (operator === '-' && (rightVal instanceof Date || !isNaN(new Date(rightVal)))) {
//         const num = parseFloat(leftVal);
//         const date = new Date(rightVal);
//         if (!isNaN(num) && !isNaN(date)) {
//           return num - date.getTime();
//         }
//       }

//       // Scenario 3: Text + Any
//       if (operator === '+') {
//         return String(leftVal || '') + String(rightVal || '');
//       }

//       return null;
//     };

//     // Try to handle simple scenarios first
//     const scenarioResult = detectAndHandleScenarios(formula, fieldReferences, formValues);
//     if (scenarioResult !== null) {
//       return scenarioResult;
//     }
    
//     // DATE & TIME FUNCTIONS

//     // Adds days to a date (handles invalid dates)
//     const addDays = function(date, numDays) {
//       if (!date) return null;
//       const d = new Date(date);
//       if (isNaN(d)) return null;
//       d.setDate(d.getDate() + (Number(numDays) || 0));
//       return d;
//     };

//     // Adds months to a date (handles year rollover)
//     const addMonths = function(date, numMonths) {
//       if (!date) return null;
//       const d = new Date(date);
//       if (isNaN(d)) return null;
//       d.setMonth(d.getMonth() + (Number(numMonths) || 0));
//       return d;
//     };

//     // Adds years to a date
//     const addYears = function(date, numYears) {
//       if (!date) return null;
//       const d = new Date(date);
//       if (isNaN(d)) return null;
//       d.setFullYear(d.getFullYear() + (Number(numYears) || 0));
//       return d;
//     };

//     // Calculates difference between two dates in specified units
//     const subtractDates = function(date1, date2, unit = 'days') {
//       if (!date1 || !date2) return null;
//       const d1 = new Date(date1);
//       const d2 = new Date(date2);
//       if (isNaN(d1) || isNaN(d2)) return null;
//       const diffMs = d1 - d2;
//       switch (unit) {
//         case 'seconds': return diffMs / 1000;
//         case 'minutes': return diffMs / (1000 * 60);
//         case 'hours': return diffMs / (1000 * 60 * 60);
//         case 'days': default: return diffMs / (1000 * 60 * 60 * 24);
//       }
//     };

//     // Parses time string (HH:mm:ss) into {h,m,s} object
//     const parseTime = function(val) {
//       if (!val) return null;
//       const parts = val.split(':').map(n => Number(n));
//       if (parts.length < 2) return null;
//       const [h, m, s = 0] = parts;
//       if (
//         h < 0 || h > 23 ||
//         m < 0 || m > 59 ||
//         s < 0 || s > 59 ||
//         parts.some(n => isNaN(n))
//       ) return null;
//       return { h, m, s };
//     };

//     // Adds two times (handles 24h rollover)
//     const addTimes = function(time1, time2) {
//       const t1 = typeof time1 === 'string' ? parseTime(time1) : time1;
//       const t2 = typeof time2 === 'string' ? parseTime(time2) : time2;
//       if (!t1 || !t2) return null;
//       let totalSeconds = t1.h * 3600 + t1.m * 60 + t1.s + t2.h * 3600 + t2.m * 60 + t2.s;
//       totalSeconds %= 86400;
//       const h = Math.floor(totalSeconds / 3600);
//       const m = Math.floor((totalSeconds % 3600) / 60);
//       const s = totalSeconds % 60;
//       return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
//     };

//     // Subtracts time2 from time1 (handles negative results)
//     const subtractTimes = function(time1, time2) {
//       const t1 = typeof time1 === 'string' ? parseTime(time1) : time1;
//       const t2 = typeof time2 === 'string' ? parseTime(time2) : time2;
//       if (!t1 || !t2) return null;
//       let totalSeconds = (t1.h * 3600 + t1.m * 60 + t1.s) - (t2.h * 3600 + t2.m * 60 + t2.s);
//       if (totalSeconds < 0) totalSeconds += 86400;
//       const h = Math.floor(totalSeconds / 3600);
//       const m = Math.floor((totalSeconds % 3600) / 60);
//       const s = totalSeconds % 60;
//       return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
//     };

//     // Sets time on a date object
//     const setTime = function(date, time) {
//       if (!date || !time) return null;
//       const d = new Date(date);
//       if (isNaN(d)) return null;
//       const t = parseTime(time);
//       if (!t) return null;
//       d.setHours(t.h, t.m, t.s || 0, 0);
//       return d;
//     };

//     // Parses date string into Date object
//     const parseDate = function(val) {
//       if (!val) return null;
//       const d = new Date(val);
//       return isNaN(d) ? null : d;
//     };

//     // Alias for parseDate
//     const toDate = parseDate;

//     // Converts time string to HH:mm:ss format
//     const toTime = function(val) {
//       if (typeof val === 'string') {
//         const t = parseTime(val);
//         if (!t) return null;
//         return `${t.h.toString().padStart(2, '0')}:${t.m.toString().padStart(2, '0')}:${t.s.toString().padStart(2, '0')}`;
//       }
//       return null;
//     };

//     // NUMBER FUNCTIONS

//     // Safely converts value to number (NaN becomes 0)
//     const parseNumber = function(val) {
//       const n = Number(val);
//       return isNaN(n) ? 0 : n;
//     };

//     // Rounds number to specified decimals
//     const round = function(val, decimals = 0) {
//       const n = parseNumber(val);
//       return Number(n.toFixed(decimals));
//     };
    
//     // Math.floor with safe number conversion
//     const floor = val => Math.floor(parseNumber(val));
    
//     // Math.ceil with safe number conversion
//     const ceil = val => Math.ceil(parseNumber(val));
    
//     // STRING FUNCTIONS

//     // Concatenates multiple values into string
//     const concatStrings = function() {
//       return Array.from(arguments).map(v => v == null ? '' : String(v)).join('');
//     };
    
//     // Safe string conversion (null/undefined becomes empty string)
//     const toString = val => val == null ? '' : String(val);
    
//     // Returns string length (0 for non-strings)
//     const stringLength = str => (typeof str === 'string' ? str.length : 0);
    
//     // Uppercase conversion (safe for non-strings)
//     const toUpperCase = str => typeof str === 'string' ? str.toUpperCase() : '';
    
//     // Lowercase conversion (safe for non-strings)
//     const toLowerCase = str => typeof str === 'string' ? str.toLowerCase() : '';
    
//     // replace logic
//     const replace = function(str, search, replacement) {
//     if (typeof str !== 'string') return '';
    
//     try {
//         // Handle regex string (like "/pattern/g")
//         if (search.startsWith('/') && search.lastIndexOf('/') > 0) {
//         const lastSlash = search.lastIndexOf('/');
//         const pattern = search.slice(1, lastSlash);
//         const flags = search.slice(lastSlash + 1);
//         return str.replace(new RegExp(pattern, flags), replacement);
//         }
//         // Default global string replacement
//         return str.replace(new RegExp(search, 'g'), replacement);
//     } catch (e) {
//         console.error('Invalid replace pattern:', search);
//         return str; // Return original on error
//     }
//     };

//     // ARRAY FUNCTIONS

//     // Returns array length (0 for non-arrays)
//     const count = list => Array.isArray(list) ? list.length : 0;
    
//     // Sums array or arguments (handles non-numbers)
//     const sum = function() {
//       const args = Array.from(arguments);
//       if (args.length === 1 && Array.isArray(args[0])) args = args[0];
//       return args.reduce((acc, v) => acc + (parseNumber(v) || 0), 0);
//     };
    
//     // Calculates average of numbers
//     const mean = function() {
//       const args = Array.from(arguments);
//       if (args.length === 1 && Array.isArray(args[0])) args = args[0];
//       return args.length === 0 ? 0 : sum(...args) / args.length;
//     };
    
//     // Finds minimum value (with number conversion)
//     const min = function() {
//       const args = Array.from(arguments);
//       if (args.length === 1 && Array.isArray(args[0])) args = args[0];
//       return Math.min(...args.map(v => parseNumber(v)));
//     };
    
//     // Finds maximum value (with number conversion)
//     const max = function() {
//       const args = Array.from(arguments);
//       if (args.length === 1 && Array.isArray(args[0])) args = args[0];
//       return Math.max(...args.map(v => parseNumber(v)));
//     };

//     // TYPE CONVERSION FUNCTIONS

//     // Converts value to boolean (smart parsing)
//     const toBoolean = function(val) {
//       if (typeof val === 'boolean') return val;
//       if (typeof val === 'string') {
//         const v = val.toLowerCase().trim();
//         if (['true', 'yes', '1'].includes(v)) return true;
//         if (['false', 'no', '0'].includes(v)) return false;
//       }
//       if (typeof val === 'number') return val !== 0;
//       return Boolean(val);
//     };
    
//     // Type coercion to specified type
//     const coerceToType = function(val, type) {
//       switch(type) {
//         case 'string': return toString(val);
//         case 'number': return parseNumber(val);
//         case 'boolean': return toBoolean(val);
//         case 'date': return toDate(val);
//         case 'array': return Array.isArray(val) ? val : [val];
//         default: return val;
//       }
//     };
    
//     // Converts timestamp to Date
//     const numberToDate = num => {
//       const n = parseNumber(num);
//       return n <= 0 ? null : new Date(n);
//     };
    
//     // Converts Date to timestamp
//     const dateToNumber = date => {
//       const d = toDate(date);
//       return d ? d.valueOf() : NaN;
//     };
    
//     // Alias for parseNumber
//     const toNumber = parseNumber;

//     // MATH FUNCTIONS

//     // Power function with safe number conversion
//     const pow = (base, exponent) => Math.pow(parseNumber(base), parseNumber(exponent));
    
//     // Modulo operation with safe number conversion
//     const mod = (a, b) => parseNumber(a) % parseNumber(b);
    
//     // Logarithm with optional base (default: natural log)
//     const log = (value, base = Math.E) => {
//       const v = parseNumber(value);
//       const b = parseNumber(base);
//       if (v <= 0 || b <= 0 || b === 1) return NaN;
//       return Math.log(v) / Math.log(b);
//     };
    
//     // Exponential function with safe number conversion
//     const exp = value => Math.exp(parseNumber(value));

//     // =============================================
//     // EVALUATION CONTEXT
//     // =============================================
//     const context = {
//       // Date & Time
//       addDays, addMonths, addYears, subtractDates,
//       addTimes, subtractTimes, setTime,
//       parseDate, parseTime, toDate, toTime,
      
//       // Number
//       parseNumber, abs: Math.abs, sqrt: Math.sqrt,
//       min, max, sum, mean, round, floor, ceil,
//       toNumber, pow, mod, log, exp,
      
//       // String
//       concatStrings, toString, stringLength,replace,
//       toUpperCase, toLowerCase, trim: str => str?.trim() || '',
      
//       // Type Conversion
//       coerceToType, numberToDate, dateToNumber, toBoolean,
      
//       // Null/Empty Check
//       isNullOrEmpty: val => (
//         val === null ||
//         val === undefined ||
//         val === '' ||
//         (Array.isArray(val) && val.length === 0) ||
//         (typeof val === 'object' && Object.keys(val).length === 0)
//       )
//     };

//     // FORMULA EVALUATION

//     // Replace field references with actual values
//     const replacedFormula = fieldReferences.reduce((currentFormula, fieldId) => {
//       const fieldValue = formValues[fieldId];
      
//       const replacementValue = 
//         fieldValue === undefined ? 'undefined' :
//         fieldValue === null ? 'null' :
//         fieldValue instanceof Date ? `new Date("${fieldValue.toISOString()}")` : // Enhanced date handling
//         typeof fieldValue === 'string' ? `"${fieldValue.replace(/"/g, '\\"')}"` :
//         typeof fieldValue === 'object' ? JSON.stringify(fieldValue) :
//         fieldValue;
      
//       return currentFormula.replace(new RegExp(`\\{${fieldId}\\}`, 'g'), replacementValue);
//     }, formula);    

//     // Safe evaluation with function whitelisting
//     const safeEval = (expr) => {
//       const allowedFunctions = Object.keys(context);
      
//       // Security checks
//       const dangerousPatterns = [
//         /\.constructor/i, /__proto__/i, /prototype/i,
//         /require\(/i, /import\(/i, /eval\(/i,
//         /Function\(/i, /new Function\(/i,
//         /process\./i, /fs\./i
//       ];
      
//       if (dangerousPatterns.some(pattern => pattern.test(expr))) {
//         throw new Error('Potentially dangerous expression detected');
//       }

//       // Validate called functions
//       const functionCalls = expr.match(/([a-zA-Z_$][0-9a-zA-Z_$]*)\(/g) || [];
//       const calledFunctions = functionCalls.map(f => f.slice(0, -1));
      
//       for (const func of calledFunctions) {
//         if (!allowedFunctions.includes(func)) {
//           throw new Error(`Function ${func} is not allowed`);
//         }
//       }

//       return Function(...Object.keys(context), `"use strict"; return ${expr}`)(...Object.values(context));
//     };

//     // Execute evaluation
//     const result = safeEval(replacedFormula);
    
//     if (typeof result === 'number' && isNaN(result)) return 'Error: Result is NaN';
//     if (result === undefined) return '';
//     if (result instanceof Date) return result.toISOString(); // Enhanced date handling

//     return result;

//   } catch (e) {
//     console.error('Error evaluating formula:', e);
//     return `Error: ${e.message}`;
//   }
// };