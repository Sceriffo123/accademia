import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import Navigation from './components/Navigation';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Admin from './pages/Admin';
import SuperAdmin from './pages/SuperAdmin';
import ControlCenter from './pages/ControlCenter';
import Normatives from './pages/Normatives';
import Docx from './pages/Docx';
import Education from './pages/Education';
import CourseDetail from './pages/CourseDetail';
import ProtectedRoute from './components/ProtectedRoute';
import GlobalErrorHandler from './lib/errorHandler';
// import DatabaseCheck from './components/DatabaseCheck';
import Layout from './components/Layout';
import Home from './pages/Home';
import Register from './pages/Register';
import NormativeDetail from './pages/NormativeDetail';
import './App.css';

// Inizializza gestione errori globale
GlobalErrorHandler.getInstance().initialize();

function App() {
  return (
    <AuthProvider>
      {/* <DatabaseCheck /> */}
      <Router>
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
            <Route path="/course/:id" element={
              <ProtectedRoute>
                <CourseDetail />
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
            <Route path="/control-center" element={
              <ProtectedRoute superAdminOnly>
                <ControlCenter />
              </ProtectedRoute>
            } />
          </Route>
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
