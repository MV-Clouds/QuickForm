/**
 * Checks if a given URL is dangerous using Google Safe Browsing API.
 * @param {string} url - The URL to check.
 * @param {string} apiKey - Your Google Safe Browsing API key.
 * @returns {Promise<boolean>} - Returns true if the URL is dangerous, false otherwise.
 */
export async function isDangerousLink(url, apiKey) {
  const endpoint = `https://safebrowsing.googleapis.com/v4/threatMatches:find?key=${apiKey}`;
  const body = {
    client: {
      clientId: "prime-phalanx-433519-v4",
      clientVersion: "1.0"
    },
    threatInfo: {
      threatTypes: [
        "MALWARE",
        "SOCIAL_ENGINEERING",
        "UNWANTED_SOFTWARE",
        "POTENTIALLY_HARMFUL_APPLICATION"
      ],
      platformTypes: ["ANY_PLATFORM"],
      threatEntryTypes: ["URL"],
      threatEntries: [{ url }]
    }
  };

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      throw new Error(`Safe Browsing API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    // If 'matches' exists and is non-empty, the URL is dangerous
    return !!(data && data.matches && data.matches.length > 0);
  } catch (error) {
    console.error('Error checking link safety:', error.message);
    throw error; // Rethrow so caller can handle/log as needed
  }
}

// Example usage:
// (async () => {
//   try {
//     const apiKey = 'YOUR_API_KEY';
//     const url = 'http://testsafebrowsing.appspot.com/s/phishing.html';
//     const isDangerous = await isDangerousLink(url, apiKey);
//     console.log(`Is dangerous: ${isDangerous}`);
//   } catch (err) {
//     // Handle error
//   }