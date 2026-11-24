import OpsShell from '../../components/Ops/OpsShell';
import { useAuth } from '../../context/useAuth';

export default function AdminLayout() {
  const {user} = useAuth();
  return <OpsShell area={user?.role === 'MANAGER' ? 'manager' : 'admin'} density="desk" />;
}
