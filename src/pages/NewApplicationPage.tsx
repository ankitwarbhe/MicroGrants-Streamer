import React from 'react';
import { ApplicationForm } from '../components/applications/ApplicationForm';

export function NewApplicationPage() {
  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">
        Submit Grant Application
      </h1>
      <div className="bg-white shadow rounded-lg p-6">
        <ApplicationForm />
      </div>
    </div>
  );
}