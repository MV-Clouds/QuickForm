import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import FormErrorBoundary from '../server/chat-bot-rag-langchain/FormBoundary';
import Home from '@/components/create-form-wizard/home';
import MainFormBuilder from '@/components/form-builder-with-versions/MainFormBuilder';
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
import CreateFormWizard from '@/components/create-form-wizard/createFormWizard';
import Login from '@/components/login-page/login';
import ProtectedRoute from '@/components/login-page/protectedRoute';
import MappingFields from '@/components/form-mapping/MappingFields';
import PublicFormViewer from '@/components/form-publish/PublicFormViewer';
import FileUpload from '@/components/file-upload/file-upload';
export default function AllRoutes() {
  return (
    <FormErrorBoundary>
      <Router>
        <ChatBotProvider>
          <ChatBot />
          <Routes>
            <Route path='/guest' element={<GuestPage />} />
            <Route path='/guest2' element={<GuestPageC />} />
            <Route path='/' element={<GuestPageD />} />
            <Route path='/notification' element={<ProtectedRoute element={<NotificationSettings />} />} />
            <Route path='/thankyou/:formVersionId' element={<MainFormBuilder showThankYou />} />
            <Route path='/template' element={<ProtectedRoute element={<FormTemplate />}/>} />
            <Route element={<FileUpload/>} path='/file' />
            {/* Public route for login */}
            <Route path="/" element={<Login />} />

            {/* Protected route for form creation wizard */}
            <Route
              path="/wizard"
              element={<ProtectedRoute element={<CreateFormWizard />} />}
            />

            {/* Protected route for Home component */}
            <Route
              path="/home"
              element={<ProtectedRoute element={<Home />} />}
            />

            {/* Duplicate protected route for Home (to support /app/home path) */}
            <Route
              path="/app/home"
              element={<ProtectedRoute element={<Home />} />}
            />

            {/* Protected route for main form builder */}
            <Route
              path="/form-builder"
              element={<ProtectedRoute element={<MainFormBuilder />} />}
            />
            {/* Protected route for main form builder with formVersionId */}
            <Route
              path="/form-builder/:formVersionId"
              element={<ProtectedRoute element={<MainFormBuilder />} />}
            />
            {/* Protected route for Mapping component */}
            <Route
              path="/mapping"
              element={<ProtectedRoute element={<MappingFields />} />}
            />
            <Route path="/public-form/:linkId" element={<PublicFormViewer />} />
          </Routes>
        </ChatBotProvider>
      </Router>
    </FormErrorBoundary>
  );
}
