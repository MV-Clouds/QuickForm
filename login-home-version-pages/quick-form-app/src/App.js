import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import Login from './components/login';
import CreateFormWizard from './components/createFormWizard';
import Home from './components/home';
import ProtectedRoute from './components/protectedRoute';
import MainFormBuilder from './components/MainFormBuilder';

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
        </Routes>
      </div>
    </Router>
  );
}

export default App;
