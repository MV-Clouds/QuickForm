import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import FormErrorBoundary from '../server/chat-bot-rag-langchain/FormBoundary';
import Home from '@/pages/Home';
import MainFormBuilder from '@/components/FormCreation/MainFormBuilder';
import NotificationSettings from '@/components/NotificationSettings/NotificationSettingsModal';
import ThankYou from '@/components/Thankyou/ThankYou';
import ChatBot from '@/components/chat-bot/chat-bot-new';
import Sidebar from '@/components/Bar';
import FormTemplate from '@/components/FormTemplate/MainTemplate';
import { ChatBotProvider } from '@/components/FormCreation/ChatBotContext';
import Mainflow from '@/components/mainFlow';
import GuestPage from '@/components/LandingPage/GuestPage';
import GuestPageC from '@/components/LandingPage/GuestPageC';
import GuestPageD from '@/components/LandingPage/GuestPageD';
export default function AllRoutes() {
  return (
    <FormErrorBoundary>
      <Router>
        <ChatBotProvider>
          <ChatBot />
          <Routes>
            <Route path='/home' element={
              <>
                <Sidebar />
                <Home />
              </>
            } />
            <Route path='/guest' element={<GuestPage />} />
            <Route path='/guest2' element={<GuestPageC />} />
            <Route path='/' element={<GuestPageD />} />
            <Route path='/fields' element={
              <>
                <Sidebar />
                <MainFormBuilder />
              </>
            } />
            <Route path='/notification' element={<NotificationSettings />} />
            <Route path='/thankyou' element={<ThankYou />} />
            <Route path='/template' element={
              <>
                <Sidebar />
                <FormTemplate />
              </>
            } />
            <Route path='/flow' element={
              <>
                <Sidebar />
                <Mainflow />
              </>
            } />
          </Routes>
        </ChatBotProvider>
      </Router>
    </FormErrorBoundary>
  );
}
