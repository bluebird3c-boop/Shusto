import React from 'react';
import { GenericProviderDashboard } from './GenericProviderDashboard';

export function LabDashboard() {
  return (
    <GenericProviderDashboard 
      type="lab" 
      title="Lab Dashboard" 
      description="Manage diagnostic tests and real-time booking requests." 
    />
  );
}
