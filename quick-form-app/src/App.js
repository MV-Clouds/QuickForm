import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import Login from './components/login-page/login';
import CreateFormWizard from './components/create-form-wizard/createFormWizard';
import Home from './components/create-form-wizard/home';
import ProtectedRoute from './components/login-page/protectedRoute';
import MainFormBuilder from './components/form-builder-with-versions/MainFormBuilder';
import PublicFormViewer from './components/form-publish/PublicFormViewer';
import Conditions from './components/conditions/Conditions';
import { SalesforceDataProvider } from './components/Context/MetadataContext';
import FormTemplate from './components/FormTemplate/MainTemplate';
import { ChatBotProvider } from './components/form-builder-with-versions/ChatBotContext';
import ChatBot from './components/chat-bot/chat-bot-new';
import GuestPageD from './components/LandingPage/GuestPageD';
import NotificationPage from './components/NotificationSettings/NotificationSettingsModal';
import NotFound from './components/not-found/NotFound';
import SharePage from './components/share-page/SharePage'; // adjust path as necessary

function App() {
  return (
    // Set up the router for navigation
    <SalesforceDataProvider>
      <ChatBotProvider>
        {/* <ChatBot /> */}
        <Router>
          <div className="App">
            <Routes>
              {/* Public route for login */}
              <Route path="/" element={<Login />} />
              <Route path="/guest" element={<ProtectedRoute element={< GuestPageD />} />} />
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
              <Route path="/public-form/:linkId" element={<PublicFormViewer />} />
              <Route
                path="/public-form/prefill/:linkId"
                element={<PublicFormViewer runPrefill={true} />}
              />
              <Route
                path="/conditions/:formVersionId"
                element={<ProtectedRoute element={<MainFormBuilder showCondition/>} />}
              />
               <Route
                path="/notifications/:formVersionId"
                element={<ProtectedRoute element={<MainFormBuilder showNotification />} />}
              />
                <Route
                path="/submissions/:formVersionId"
                element={
                  <ProtectedRoute
                    element={<MainFormBuilder showSubmission />}
                  />
                }
              />
              <Route
                path="/mapping/:formVersionId"
                element={<ProtectedRoute element={<MainFormBuilder showMapping />} />}
              />
              <Route path='/thankyou/:formVersionId' element={<ProtectedRoute element = {<MainFormBuilder showThankYou />}/>} />
              <Route path='/template' element={<ProtectedRoute element={<FormTemplate />}/>} />
              <Route path="*" element={<ProtectedRoute element={<NotFound />} />} />
               <Route 
                path="/share/:formVersionId"
                element={
                  <ProtectedRoute element={
                    <MainFormBuilder showShare />
                  }/>
                }
              />
               <Route 
                path="/prefill/:formVersionId"
                element={
                  <ProtectedRoute element={
                    <MainFormBuilder showPrefill />
                  }/>
                }
              />
            </Routes>
          </div>
        </Router>
      </ChatBotProvider>
    </SalesforceDataProvider>
  );
}

export default App;
