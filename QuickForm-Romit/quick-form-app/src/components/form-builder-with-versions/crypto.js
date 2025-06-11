// src/utils/crypto.js
import CryptoJS from 'crypto-js';

const secret = process.env.REACT_APP_ENCRYPTION_SECRET;
const iv = CryptoJS.enc.Hex.parse(process.env.REACT_APP_ENCRYPTION_IV);

function encrypt(text) {
  return CryptoJS.AES.encrypt(text, secret, { iv }).toString();
}

function decrypt(encrypted) {
  const bytes = CryptoJS.AES.decrypt(encrypted, secret, { iv });
  return bytes.toString(CryptoJS.enc.Utf8);
}

export { encrypt, decrypt };