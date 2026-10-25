import { NotFound } from '@combat-planner/ui';
import { useNavigate } from 'react-router';

export function NotFoundPage() {
  const navigate = useNavigate();
  return <NotFound onHome={() => void navigate('/')} />;
}
