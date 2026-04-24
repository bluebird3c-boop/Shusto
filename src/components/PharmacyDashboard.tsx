import React from 'react';
import { GenericProviderDashboard } from './GenericProviderDashboard';

export function PharmacyDashboard() {
  return (
    <GenericProviderDashboard 
      type="pharmacy" 
      title="State Dashboard" 
      description="আপনার রেফারেল এবং মেডিসিন অর্ডার ম্যানেজ করুন এখান থেকে।" 
    />
  );
}
