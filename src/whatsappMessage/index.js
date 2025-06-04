const fetch = require('node-fetch'); // or use any fetch-compatible lib like axios

/**
 * Send WhatsApp Message
 * @param {string} jsonData - JSON string of WhatsApp message body
 * @param {string} chatId - Your internal chat ID (used for tracking, optional here)
 * @param {boolean} isReaction - If this is a reaction message
 * @param {string} reaction - Reaction content (optional)
 * @param {object} config - Configuration object with accessToken, endpointUrl, etc.
 * @returns {Promise<object>} - Returns an object with errorMessage and chat data (you must handle chat updates yourself)
 */
async function sendWhatsappMessage(jsonData, chatId, isReaction, reaction, config) {
  const result = {
    errorMessage: null,
    chat: {
      Id: chatId,
      Message_Status: null,
      WhatsAppMessageId: null,
      Reaction: null,
    },
  };

  try {
    // Validate config
    if (!config || !config.accessToken || !config.endpointUrl) {
      result.errorMessage = 'METADATA_ERROR';
      if (!isReaction) {
        result.chat.Message_Status = 'Failed';
      } else {
        result.chat.Reaction = '<|USER|>' + (reaction?.split('<|USER|>')[1] || '');
      }
      return result;
    }

    // Make HTTP POST request to WhatsApp API
    const response = await fetch(config.endpointUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.accessToken}`,
      },
      body: jsonData,
    });

    const statusCode = response.status;
    const responseBody = await response.json();

    if (statusCode === 200) {
      // Extract WhatsApp Message ID from response
      const messages = responseBody.messages;
      if (!isReaction && messages && messages.length > 0) {
        result.chat.WhatsAppMessageId = messages[0].id;
        result.chat.Message_Status = 'Sent';
      }
    } else {
      if (!isReaction) {
        result.chat.Message_Status = 'Failed';
      }
      console.error('WhatsApp API error:', responseBody);
      // You can add your own logging mechanism here
    }

  } catch (error) {
    if (!isReaction) {
      result.chat.Message_Status = 'Failed';
    }
    console.error('Exception sending WhatsApp message:', error);
    result.errorMessage = error.message || 'Exception occurred';
  }

  return result;
}
