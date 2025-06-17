import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import FormErrorBoundary from '../server/chat-bot-rag-langchain/FormBoundary';
import Home from '@/pages/Home';
import MainFormBuilder from '@/components/FormCreation/MainFormBuilder';
import NotificationSettings from '@/components/NotificationSettings/NotificationSettingsModal';
import ThankYou from '@/components/Thankyou/ThankYou';
import ChatBot from '@/components/chat-bot/chat-bot-new';
import Sidebar from '@/components/Bar';
import FormTemplate from '@/components/FormTemplate/FormTemplate';
import { ChatBotProvider } from '@/components/FormCreation/ChatBotContext';
import Mainflow from '@/components/mainFlow';
export default function AllRoutes() {
  return (
    <FormErrorBoundary>
    <Router>
      <ChatBotProvider>
      <Sidebar/>
      <ChatBot /> 
        <Routes>
        <Route path='/' element={<Home />} />
        <Route path='/fields' element={<MainFormBuilder />} />
        <Route path='/notification' element={<NotificationSettings />} />
        <Route path='/thankyou' element={<ThankYou />} />
        <Route path='/template' element={<FormTemplate />} />
        <Route path='/flow' element={<Mainflow />} />
      </Routes>
      </ChatBotProvider>
    </Router>
    </FormErrorBoundary>
  );
}
