'use client';

import React, { useState } from 'react';
import { AlertTriangle, X } from 'lucide-react';

interface CrisisEvent {
  active: boolean;
  type: 'election' | 'disaster' | 'health' | 'general';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
}

// Manual Crisis Configuration - Change these values as needed
const MANUAL_CRISIS_CONFIG: CrisisEvent = {
  active: false, // Set to true to enable crisis banner
  type: 'disaster',
  severity: 'critical', // Change severity: 'low' | 'medium' | 'high' | 'critical'
  message: 'There is an ongoing crisis. Please verify information carefully before sharing.',
};

export default function CrisisBanner() {
  const [dismissed, setDismissed] = useState(false);

  // Use manual config instead of API
  const crisis = MANUAL_CRISIS_CONFIG;

  // Don't render anything if dismissed or not active
  if (!crisis.active || dismissed) {
    return null;
  }

  const getSeverityStyles = () => {
    switch (crisis.severity) {
      case 'critical':
        return {
          bg: 'bg-red-50',
          border: 'border-red-200',
          text: 'text-red-800',
          icon: 'text-red-500'
        };
      case 'high':
        return {
          bg: 'bg-orange-50',
          border: 'border-orange-200',
          text: 'text-orange-800',
          icon: 'text-orange-500'
        };
      case 'medium':
        return {
          bg: 'bg-yellow-50',
          border: 'border-yellow-200',
          text: 'text-yellow-800',
          icon: 'text-yellow-500'
        };
      default:
        return {
          bg: 'bg-blue-50',
          border: 'border-blue-200',
          text: 'text-blue-800',
          icon: 'text-blue-500'
        };
    }
  };

  const styles = getSeverityStyles();

  const handleDismiss = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDismissed(true);
    console.log('Banner dismissed'); // Debug log
  };

  return (
    <div className={`w-full ${styles.bg} border-b-2 ${styles.border} py-4 z-50 fixed top-20`}>
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <AlertTriangle className={`w-6 h-6 flex-shrink-0 ${styles.icon}`} />
            <div className="flex-1 min-w-0">
              <p className={`text-base font-semibold ${styles.text}`}>
                {crisis.message}
              </p>
            </div>
          </div>
          <button
            onClick={handleDismiss}
            className={`flex-shrink-0 p-2 rounded hover:bg-black/5 ${styles.text} transition-colors cursor-pointer`}
            aria-label="Dismiss alert"
            type="button"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}