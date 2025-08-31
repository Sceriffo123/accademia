import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ToastProvider } from './hooks/useToast';
import DatabaseInit from './components/DatabaseInit';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Normatives from './pages/Normatives';
import Education from './pages/Education';
import CourseViewer from './pages/CourseViewer';
import NormativeDetail from './pages/NormativeDetail';
import Admin from './pages/Admin';
import SuperAdmin from './pages/SuperAdmin';
import Docx from './pages/Docx';

function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <Router>
          <DatabaseInit />
          <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/" element={<Layout />}>
            <Route index element={<Home />} />
            <Route path="/dashboard" element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            } />
            <Route path="/normative" element={
              <ProtectedRoute>
                <Normatives />
              </ProtectedRoute>
            } />
            <Route path="/normative/:id" element={
              <ProtectedRoute>
                <NormativeDetail />
              </ProtectedRoute>
            } />
            <Route path="/education" element={
              <ProtectedRoute>
                <Education />
              </ProtectedRoute>
            } />
            <Route path="/course/:courseId" element={
              <ProtectedRoute>
                <CourseViewer />
              </ProtectedRoute>
            } />
            <Route path="/docx" element={
              <ProtectedRoute>
                <Docx />
              </ProtectedRoute>
            } />
            <Route path="/admin" element={
              <ProtectedRoute adminOnly>
                <Admin />
              </ProtectedRoute>
            } />
            <Route path="/superadmin" element={
              <ProtectedRoute superAdminOnly>
                <SuperAdmin />
              </ProtectedRoute>
            } />
          </Route>
        </Routes>
      </Router>
      </ToastProvider>
    </AuthProvider>
  );
}

export default App;