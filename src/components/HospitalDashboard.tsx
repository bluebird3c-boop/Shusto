import React from 'react';
import { GenericProviderDashboard } from './GenericProviderDashboard';

export function HospitalDashboard() {
  return (
    <GenericProviderDashboard 
      type="hospital" 
      title="Hospital Dashboard" 
      description="Manage hospital admissions and emergency requests in real-time." 
    />
  );
}
