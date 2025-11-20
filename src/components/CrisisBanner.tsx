'use client';

import React, { useEffect, useState } from 'react';
import { AlertTriangle, X, RefreshCw } from 'lucide-react';

interface CrisisEvent {
  active: boolean;
  type: 'election' | 'disaster' | 'health' | 'general';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  start_date: string;
  keywords: string[];
}

export default function CrisisBanner() {
  const [crisis, setCrisis] = useState<CrisisEvent | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkCrisisMode();
  }, []);

  const checkCrisisMode = async () => {
    try {
      setLoading(true);
      console.log('Checking crisis mode...');
      
      const response = await fetch('/api/crisis-mode');
      const data = await response.json();
      
      console.log('Crisis API response:', data);
      
      if (data.success && data.crisis) {
        console.log('Crisis detected:', data.crisis);
        setCrisis(data.crisis);
        setDismissed(false);
      } else {
        console.log('No active crisis');
        setCrisis(null);
      }
    } catch (error) {
      console.error('Failed to check crisis mode:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="w-full bg-blue-50 border-b border-blue-200 py-1.5">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-center gap-2">
            <RefreshCw className="w-3 h-3 text-blue-600 animate-spin" />
            <span className="text-xs text-blue-600 font-medium">Checking for crisis alerts...</span>
          </div>
        </div>
      </div>
    );
  }

  if (!crisis || !crisis.active || dismissed) {
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

  return (
    <div className={`w-full ${styles.bg} border-b ${styles.border} py-1.5 z-40`}>
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <AlertTriangle className={`w-3.5 h-3.5 flex-shrink-0 ${styles.icon}`} />
            <div className="flex-1 min-w-0">
              <p className={`text-xs font-medium leading-tight ${styles.text} truncate`}>
                {crisis.message}
              </p>
            </div>
          </div>
          <button
            onClick={() => setDismissed(true)}
            className={`flex-shrink-0 p-1 rounded hover:bg-black/5 ${styles.text}`}
            aria-label="Dismiss alert"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      </div>
    </div>
  );
}