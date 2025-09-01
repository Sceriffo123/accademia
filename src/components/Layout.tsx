import React from 'react';
import { Outlet } from 'react-router-dom';
import Navigation from './Navigation';
import ProblemDetector from './ProblemDetector';

export default function Layout() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      <main className="pb-16 md:pb-0">
        <Outlet />
      </main>
      <SystemAlertPanel />
    </div>
  );
}