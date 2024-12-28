import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useApplicationForm } from '../../hooks/useApplicationForm';
import { Info } from 'lucide-react';

export function ApplicationForm() {
  const { 
    formData, 
    handleChange, 
    handleSubmit, 
    error, 
    loading 
  } = useApplicationForm();

  // Character limits
  const LIMITS = {
    title: 50,
    description: 2000,
    first_name: 20,
    last_name: 20
  };

  // Character count displays
  const getCharacterCount = (field: string, value: string) => {
    const limit = LIMITS[field as keyof typeof LIMITS];
    return `${value.length}/${limit}`;
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="bg-red-50 text-red-700 p-3 rounded-md">{error}</div>
      )}
      
      <div>
        <div className="flex items-center justify-between gap-2">
          <label htmlFor="title" className="block text-sm font-medium text-gray-700">
            Project Title
          </label>
          <div className="flex items-center gap-2">
            <div className="group relative">
              <Info className="h-4 w-4 text-gray-400 hover:text-gray-500 cursor-help" />
              <div className="invisible group-hover:visible absolute left-0 top-6 w-64 p-2 bg-gray-800 text-white text-xs rounded shadow-lg z-10">
                Choose a clear, specific title that describes your project. Keep it concise but informative.
              </div>
            </div>
            <span className="text-sm text-gray-500">
              {getCharacterCount('title', formData.title)}
            </span>
          </div>
        </div>
        <input
          type="text"
          id="title"
          name="title"
          value={formData.title}
          onChange={handleChange}
          required
          maxLength={LIMITS.title}
          placeholder="Example: Mobile App for Local Food Bank Inventory Management"
          className="mt-1 block w-full rounded-md border-2 border-gray-300 bg-gray-50 px-3 py-2 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 hover:border-gray-400"
        />
      </div>

      <div>
        <div className="flex items-center justify-between gap-2">
          <label htmlFor="description" className="block text-sm font-medium text-gray-700">
            Project Description
          </label>
          <div className="flex items-center gap-2">
            <div className="group relative">
              <Info className="h-4 w-4 text-gray-400 hover:text-gray-500 cursor-help" />
              <div className="invisible group-hover:visible absolute left-0 top-6 w-72 p-2 bg-gray-800 text-white text-xs rounded shadow-lg z-10">
                <p className="font-medium mb-1">Please include:</p>
                <ul className="list-disc pl-4 space-y-1">
                  <li>Purpose of your project</li>
                  <li>Why you need this grant</li>
                  <li>How you'll use the funds</li>
                  <li>Expected impact</li>
                  <li>Implementation timeline</li>
                </ul>
              </div>
            </div>
            <span className="text-sm text-gray-500">
              {getCharacterCount('description', formData.description)}
            </span>
          </div>
        </div>
        <textarea
          id="description"
          name="description"
          value={formData.description}
          onChange={handleChange}
          required
          maxLength={LIMITS.description}
          rows={8}
          placeholder="Example: Our project aims to develop a mobile app that helps local food banks better manage their inventory. We need this grant to cover initial development costs and server expenses. The funds will be used for development tools, hosting services, and user testing. This app will help food banks reduce waste and serve more people in need. We plan to complete development within 3 months and launch a pilot program with two local food banks."
          className="mt-1 block w-full rounded-md border-2 border-gray-300 bg-gray-50 px-3 py-2 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 hover:border-gray-400"
        />
      </div>

      <div>
        <div className="flex items-center justify-between gap-2">
          <label htmlFor="amount" className="block text-sm font-medium text-gray-700">
            Amount Requested ($)
          </label>
          <div className="group relative">
            <Info className="h-4 w-4 text-gray-400 hover:text-gray-500 cursor-help" />
            <div className="invisible group-hover:visible absolute left-0 top-6 w-72 p-2 bg-gray-800 text-white text-xs rounded shadow-lg z-10">
              <p className="font-medium mb-1">Consider all costs including:</p>
              <ul className="list-disc pl-4 space-y-1">
                <li>Development or implementation costs</li>
                <li>Equipment or materials</li>
                <li>Operating expenses</li>
                <li>Marketing or outreach costs</li>
                <li>Other project-related expenses</li>
              </ul>
            </div>
          </div>
        </div>
        <input
          type="number"
          id="amount"
          name="amount_requested"
          value={formData.amount_requested}
          onChange={handleChange}
          required
          min="0"
          step="0.01"
          placeholder="Example: 5000.00"
          className="mt-1 block w-full rounded-md border-2 border-gray-300 bg-gray-50 px-3 py-2 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 hover:border-gray-400"
        />
      </div>

      <div>
        <div className="flex items-center justify-between gap-2">
          <label htmlFor="first_name" className="block text-sm font-medium text-gray-700">
            First Name
          </label>
          <span className="text-sm text-gray-500">
            {getCharacterCount('first_name', formData.first_name)}
          </span>
        </div>
        <input
          type="text"
          id="first_name"
          name="first_name"
          value={formData.first_name}
          onChange={handleChange}
          required
          maxLength={LIMITS.first_name}
          placeholder="Enter your first name"
          className="mt-1 block w-full rounded-md border-2 border-gray-300 bg-gray-50 px-3 py-2 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 hover:border-gray-400"
        />
      </div>

      <div>
        <div className="flex items-center justify-between gap-2">
          <label htmlFor="last_name" className="block text-sm font-medium text-gray-700">
            Last Name
          </label>
          <span className="text-sm text-gray-500">
            {getCharacterCount('last_name', formData.last_name)}
          </span>
        </div>
        <input
          type="text"
          id="last_name"
          name="last_name"
          value={formData.last_name}
          onChange={handleChange}
          required
          maxLength={LIMITS.last_name}
          placeholder="Enter your last name"
          className="mt-1 block w-full rounded-md border-2 border-gray-300 bg-gray-50 px-3 py-2 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 hover:border-gray-400"
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
      >
        {loading ? 'Creating...' : 'Create Draft'}
      </button>
    </form>
  );
}