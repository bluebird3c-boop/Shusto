import React from 'react';
import { GenericProviderDashboard } from './GenericProviderDashboard';

export function AmbulanceDashboard() {
  return (
    <GenericProviderDashboard 
      type="ambulance" 
      title="Ambulance Dashboard" 
      description="Real-time emergency vehicle dispatch and request management." 
    />
  );
}
