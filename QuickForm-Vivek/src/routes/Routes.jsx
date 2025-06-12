import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';

import Home from '@/pages/Home';
import MainFormBuilder from '@/components/FormCreation/MainFormBuilder';

export default function AllRoutes() {
  return (
    <Router>
      <Routes>
        <Route path='/' element={<Home />} />
        <Route path='/fields' element={<MainFormBuilder />} />
      </Routes>
    </Router>
  );
}
