import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import Login from './components/login-page/login';
import CreateFormWizard from './components/create-form-wizard/createFormWizard';
import Home from './components/create-form-wizard/home';
import ProtectedRoute from './components/login-page/protectedRoute';
import MainFormBuilder from './components/form-builder-with-versions/MainFormBuilder';
import PublicFormViewer from './components/form-publish/PublicFormViewer';
import Mapping from './components/form-mapping/MappingFields';

function App() {
  return (
    // Set up the router for navigation
    <Router>
      <div className="App">
        <Routes>
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
            element={<ProtectedRoute element={<Mapping />} />}
          />

          <Route path="/public-form/:linkId" element={<PublicFormViewer />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
