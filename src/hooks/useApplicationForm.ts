import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createApplication } from '../services/applications';
import type { Currency } from '../types';

interface FormData {
  title: string;
  description: string;
  amount_requested: string;
  first_name: string;
  last_name: string;
  currency: Currency;
}

const initialFormData: FormData = {
  title: '',
  description: '',
  amount_requested: '',
  first_name: '',
  last_name: '',
  currency: 'USD',
};

export function useApplicationForm() {
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await createApplication({
        ...formData,
        amount_requested: parseFloat(formData.amount_requested),
      });
      navigate('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit application');
    } finally {
      setLoading(false);
    }
  };

  return {
    formData,
    handleChange,
    handleSubmit,
    error,
    loading,
  };
}