import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ToastProvider } from './components/Toast';
import { Layout } from './components/Layout';
import { ProtectedRoute } from './components/ProtectedRoute';

import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { StudentsPage } from './pages/StudentsPage';
import { StudentFormPage } from './pages/StudentFormPage';
import { StudentDetailPage } from './pages/StudentDetailPage';
import { ValidationPage } from './pages/ValidationPage';
import { DelayRiskPage } from './pages/DelayRiskPage';
import { ReviewQueuePage } from './pages/ReviewQueuePage';
import { ReportsPage } from './pages/ReportsPage';
import { SettingsPage } from './pages/SettingsPage';

export function App() {
  return (
    <ToastProvider>
      <BrowserRouter>
        <Routes>
          {/* Public / Demo Login Route */}
          <Route path="/login" element={<LoginPage />} />

          {/* Authenticated Platform Routes */}
          <Route
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/students" element={<StudentsPage />} />
            <Route
              path="/students/new"
              element={
                <ProtectedRoute actionRequired="create:student">
                  <StudentFormPage />
                </ProtectedRoute>
              }
            />
            <Route path="/students/:id" element={<StudentDetailPage />} />
            <Route
              path="/students/:id/edit"
              element={
                <ProtectedRoute actionRequired="edit:student">
                  <StudentFormPage />
                </ProtectedRoute>
              }
            />
            <Route path="/validation" element={<ValidationPage />} />
            <Route path="/delay-risk" element={<DelayRiskPage />} />
            <Route path="/review-queue" element={<ReviewQueuePage />} />
            <Route path="/reports" element={<ReportsPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Route>

          {/* Fallback redirects */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </ToastProvider>
  );
}

export default App;
