import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import DatabaseInit from './components/DatabaseInit';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Normatives from './pages/Normatives';
import NormativeDetail from './pages/NormativeDetail';
import NormativeNazionale from './pages/NormativeNazionale';
import NormativeRegionale from './pages/NormativeRegionale';
import NormativeLocale from './pages/NormativeLocale';
import Education from './pages/Education';
import Admin from './pages/Admin';
import SuperAdmin from './pages/SuperAdmin';

function App() {
  return (
    <AuthProvider>
      <DatabaseInit />
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
            <Route path="/normative/nazionale" element={
              <ProtectedRoute>
                <NormativeNazionale />
              </ProtectedRoute>
            } />
            <Route path="/normative/regionale" element={
              <ProtectedRoute>
                <NormativeRegionale />
              </ProtectedRoute>
            } />
            <Route path="/normative/locale" element={
              <ProtectedRoute>
                <NormativeLocale />
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
    </AuthProvider>
  );
}

export default App;