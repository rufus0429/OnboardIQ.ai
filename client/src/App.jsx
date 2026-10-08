import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { WorkspaceProvider } from './contexts/WorkspaceContext';

import AppLayout from './components/layout/AppLayout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Diagnosis from './pages/Diagnosis';
import Interventions from './pages/Interventions';
import Results from './pages/Results';
import Users from './pages/Users';
import Simulator from './pages/Simulator';
import Settings from './pages/Settings';

export default function App() {
  return (
    <AuthProvider>
      <WorkspaceProvider>
        <Router>
          <Routes>
            <Route path="/login" element={<Login />} />
            
            <Route path="/" element={<AppLayout />}>
              <Route index element={<Dashboard />} />
              <Route path="diagnosis" element={<Diagnosis />} />
              <Route path="interventions" element={<Interventions />} />
              <Route path="results" element={<Results />} />
              <Route path="users" element={<Users />} />
              <Route path="simulator" element={<Simulator />} />
              <Route path="settings" element={<Settings />} />
            </Route>
            
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Router>
      </WorkspaceProvider>
    </AuthProvider>
  );
}
