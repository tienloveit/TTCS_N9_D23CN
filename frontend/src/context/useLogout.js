import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './useAuth';

export default function useLogout() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [pending, setPending] = useState(false);
  const inFlight = useRef(false);

  async function run() {
    if (inFlight.current) return;
    inFlight.current = true;
    setPending(true);
    try {
      await logout();
    } finally {
      inFlight.current = false;
      setPending(false);
      navigate('/login');
    }
  }

  return { logout: run, pending };
}
