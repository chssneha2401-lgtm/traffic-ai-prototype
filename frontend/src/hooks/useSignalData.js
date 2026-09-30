import { useState, useEffect } from 'react';
import { API_BASE_URL } from '../utils/constants';

export function useSignalData() {
  const [signalData, setSignalData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchSignalData = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/api/lanes`);
      if (!response.ok) {
        throw new Error('Failed to fetch signal data');
      }
      const data = await response.json();
      setSignalData(data);
      setError(null);
    } catch (err) {
      setError(err.message);
      console.error('Error fetching signal data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSignalData();
    // Refresh data every 5 seconds
    const interval = setInterval(fetchSignalData, 5000);
    return () => clearInterval(interval);
  }, []);

  return { signalData, loading, error, refetch: fetchSignalData };
}
