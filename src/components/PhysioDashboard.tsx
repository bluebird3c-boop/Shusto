import React from 'react';
import { GenericProviderDashboard } from './GenericProviderDashboard';

export function PhysioDashboard() {
  return (
    <GenericProviderDashboard 
      type="physio" 
      title="Physiotherapy Dashboard" 
      description="Manage therapy sessions and recovery requests in real-time." 
    />
  );
}
