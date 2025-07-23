// src/utils/crypto.js

// Basic obfuscation: base64 + reverse

function encrypt(text) {
  const base64 = btoa(text); // Convert to base64
  return base64.split('').reverse().join(''); // Reverse the string
}

function decrypt(obfuscated) {
  try {
    const reversed = obfuscated.split('').reverse().join('');
    return atob(reversed); // Decode base64
  } catch (e) {
    throw new Error('Invalid or corrupted link');
  }
}

export { encrypt, decrypt };