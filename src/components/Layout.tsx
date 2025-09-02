import React from 'react';
import { Outlet } from 'react-router-dom';
import Navigation from './Navigation';
import ProblemDetector from './ProblemDetector';
import { useRouteLogger } from '../hooks/useRouteLogger';
import SystemAlertPanel from './SystemAlertPanel';

export default function Layout() {
  // Attiva logging automatico per navigazione
  useRouteLogger();
  
  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      <main className="pb-16 md:pb-0">
        <Outlet />
      </main>
      <ProblemDetector />
      <SystemAlertPanel />
    </div>
  );
}