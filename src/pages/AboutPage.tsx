import React from 'react';
import { Link } from 'react-router-dom';
import { CircleDollarSign, Users, Clock, CheckCircle } from 'lucide-react';

export function AboutPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="text-center mb-16">
        <h1 className="text-4xl font-bold text-gray-900 sm:text-5xl">
          About Our Micro-Grants Program
        </h1>
        <p className="mt-4 text-xl text-gray-600">
          Supporting innovative projects and initiatives through accessible funding
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-12 mb-16">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Our Mission</h2>
          <p className="text-gray-600 leading-relaxed">
            We believe that great ideas deserve support, regardless of their scale. Our micro-grants program
            aims to provide quick, accessible funding to individuals and small organizations with innovative
            projects that can make a real difference in their communities.
          </p>
        </div>
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Who Can Apply</h2>
          <p className="text-gray-600 leading-relaxed">
            Our program is open to individuals, small businesses, non-profits, and community organizations
            with projects that align with our mission. Whether you're working on community development,
            education, technology, or social innovation, we want to hear from you.
          </p>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-8 mb-16">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center mb-4">
            <CircleDollarSign className="h-6 w-6 text-indigo-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Grant Size</h3>
          <p className="text-gray-600">
            Our micro-grants typically range from $500 to $5,000, designed to provide meaningful support
            while maintaining accessibility and quick turnaround times.
          </p>
        </div>
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center mb-4">
            <Clock className="h-6 w-6 text-indigo-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Quick Process</h3>
          <p className="text-gray-600">
            Our streamlined application and review process ensures you get a decision within weeks,
            not months. We understand that timing can be crucial for project success.
          </p>
        </div>
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center mb-4">
            <CheckCircle className="h-6 w-6 text-indigo-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Simple Requirements</h3>
          <p className="text-gray-600">
            We keep our requirements simple and straightforward. Focus on explaining your project's
            impact and feasibility rather than complex paperwork.
          </p>
        </div>
      </div>

      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Ready to Get Started?</h2>
        <div className="flex justify-center gap-4">
          <Link
            to="/auth"
            className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
          >
            Apply Now
          </Link>
          <Link
            to="/auth"
            className="inline-flex items-center px-6 py-3 border border-gray-300 text-base font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
          >
            Sign In
          </Link>
        </div>
      </div>
    </div>
  );
} 