import { Hello } from '@combat-planner/ui';
import { Text } from '@mantine/core';
import { useEffect, useState } from 'react';
import { fetchHealth } from './health.ts';

export function App() {
  const [status, setStatus] = useState('…');

  useEffect(() => {
    fetchHealth(fetch).then(
      (health) => setStatus(health.status),
      (error: unknown) => setStatus(String(error)),
    );
  }, []);

  return (
    <>
      <Hello name="Combat Planner" />
      <Text>API: {status}</Text>
    </>
  );
}
