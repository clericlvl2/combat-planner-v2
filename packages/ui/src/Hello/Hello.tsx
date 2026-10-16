import { Text } from '@mantine/core';
import classes from './Hello.module.css';

export interface HelloProps {
  name: string;
}

export function Hello({ name }: HelloProps) {
  return <Text className={classes.root}>Hello, {name}</Text>;
}
