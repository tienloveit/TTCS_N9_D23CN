import { useEffect, useState } from 'react';
import { branchApi } from '../../api';

export default function useActiveBranches() {
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState(null);

  useEffect(() => {
    let ignore = false;
    branchApi.getAll()
      .then(({ data }) => {
        if (ignore) return;
        const branches = (data?.result || []).filter((branch) => !branch.status || branch.status === 'ACTIVE');
        setResult({ attempt, branches });
      })
      .catch(() => {
        if (!ignore) setResult({ attempt, error: true });
      });
    return () => { ignore = true; };
  }, [attempt]);

  return {
    branches: result?.branches || [],
    loading: result?.attempt !== attempt,
    error: result?.attempt === attempt && result.error,
    retry: () => setAttempt((current) => current + 1),
  };
}
