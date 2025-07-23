import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';

const ProtectedRoute = ({ element }) => {
  const location = useLocation(); // Get the current route location

  const queryParams = new URLSearchParams(location.search); // Parse the query parameters from the URL
  const queryUserId = queryParams.get('userId'); // Extract userId from query string
  const queryInstanceUrl = queryParams.get('instanceUrl'); // Extract instanceUrl from query string

  const sessionUserId = sessionStorage.getItem('userId'); // Get userId from sessionStorage
  const sessionInstanceUrl = sessionStorage.getItem('instanceUrl'); // Get instanceUrl from sessionStorage

  const hasValidSession =
    (sessionUserId && sessionInstanceUrl) ||
    (queryUserId && queryInstanceUrl); // Determine if session or query params are present and valid

  if (!hasValidSession) {
    return <Navigate to="/" replace />; // Redirect to home if not authenticated
  }

  return element; // Render the protected component if valid session exists
};

export default ProtectedRoute;
