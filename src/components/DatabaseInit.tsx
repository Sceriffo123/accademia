import React, { useEffect } from 'react';
import { initializeDatabase } from '../lib/neonDatabase';

export default function DatabaseInit() {
  useEffect(() => {
    initializeDatabase().catch(console.error);
  }, []);

  return null;
}