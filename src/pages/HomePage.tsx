import React from 'react';
import { Link } from 'react-router-dom';
import { CircleDollarSign } from 'lucide-react';

export function HomePage() {
  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-900 sm:text-5xl md:text-6xl">
          Empowering Dreams Through
          <span className="text-indigo-600"> Micro-Grants</span>
        </h1>
        <p className="mt-3 max-w-md mx-auto text-base text-gray-500 sm:text-lg md:mt-5 md:text-xl md:max-w-3xl">
          Apply for micro-grants to fund your projects and initiatives. Quick application process, 
          transparent reviews, and fast disbursement.
        </p>
        <div className="mt-5 max-w-md mx-auto sm:flex sm:justify-center md:mt-8">
          <div className="rounded-md shadow">
            <Link
              to="/auth"
              className="w-full flex items-center justify-center px-8 py-3 border border-transparent text-base font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 md:py-4 md:text-lg md:px-10"
            >
              Apply Now
            </Link>
          </div>
          <div className="mt-3 rounded-md shadow sm:mt-0 sm:ml-3">
            <Link
              to="/about"
              className="w-full flex items-center justify-center px-8 py-3 border border-transparent text-base font-medium rounded-md text-indigo-600 bg-white hover:bg-gray-50 md:py-4 md:text-lg md:px-10"
            >
              Learn More
            </Link>
          </div>
        </div>
      </div>

      <div className="mt-24 grid gap-8 md:grid-cols-3">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center mb-4">
            <CircleDollarSign className="h-6 w-6 text-indigo-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Quick Application</h3>
          <p className="text-gray-600">Simple and straightforward application process designed to get you funded faster.</p>
        </div>
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center mb-4">
            <CircleDollarSign className="h-6 w-6 text-indigo-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Transparent Review</h3>
          <p className="text-gray-600">Clear criteria and feedback throughout the review process.</p>
        </div>
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center mb-4">
            <CircleDollarSign className="h-6 w-6 text-indigo-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Fast Disbursement</h3>
          <p className="text-gray-600">Receive your funds quickly once your application is approved.</p>
        </div>
      </div>
    </main>
  );
}