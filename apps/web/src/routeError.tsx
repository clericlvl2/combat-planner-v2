import { UnexpectedError } from '@combat-planner/ui';
import { useEffect } from 'react';
import { useNavigate, useRouteError } from 'react-router';

export interface RouteErrorProps {
  onShow: () => void;
  onReport: (error: unknown) => void;
}

export function RouteError({ onShow, onReport }: RouteErrorProps) {
  const navigate = useNavigate();
  const error = useRouteError();
  useEffect(() => onShow(), [onShow]);
  useEffect(() => onReport(error), [onReport, error]);
  return (
    <UnexpectedError onReload={() => window.location.reload()} onHome={() => void navigate('/')} />
  );
}
