import React, { createContext, useContext, useState } from 'react';
const ChatBotContext = createContext();

export const useChatBot = () => useContext(ChatBotContext);

export const ChatBotProvider = ({ children }) => {
  const [botResponse, setBotResponse] = useState(null);
  const [latestFieldsState, setLatestFieldsState] = useState(null);

  const sendActivityToBot = async () => {
    const res = await fetch('https://gzrhf9pxic.execute-api.us-east-1.amazonaws.com/bot-stage', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json'},
      body: JSON.stringify({ activity: latestFieldsState }),
    });
    const data = await res.json();
    console.log('Bot response:', data);
    if (!res.ok) {
      console.error('Error sending activity to bot:', data);
      throw new Error('Failed to send activity to bot');
    }
    setBotResponse(data);
    return data;
  };

  return (
    <ChatBotContext.Provider value={{ sendActivityToBot, botResponse, latestFieldsState, setLatestFieldsState }}>
      {children}
    </ChatBotContext.Provider>
  );
};