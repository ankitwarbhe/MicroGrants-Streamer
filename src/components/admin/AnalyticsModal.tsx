import React from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { Fragment } from 'react';
import { X } from 'lucide-react';
import { AnalyticsDashboard } from './AnalyticsDashboard';

interface AnalyticsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AnalyticsModal({ isOpen, onClose }: AnalyticsModalProps) {
  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black bg-opacity-25" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-7xl transform overflow-hidden rounded-2xl bg-gray-50 p-6 shadow-xl transition-all">
                <div className="flex justify-between items-center mb-4">
                  <Dialog.Title as="h3" className="text-2xl font-bold text-gray-900">
                    Analytics Dashboard
                  </Dialog.Title>
                  <button
                    type="button"
                    className="rounded-full p-2 hover:bg-gray-200 transition-colors"
                    onClick={onClose}
                  >
                    <X className="h-6 w-6 text-gray-500" />
                  </button>
                </div>
                <AnalyticsDashboard />
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
} 