import { ScrollArea } from '@mantine/core';
import { useMergedRef } from '@mantine/hooks';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { ComponentPropsWithoutRef, ReactNode, Ref } from 'react';
import { layout } from '../../layout.ts';
import classes from './ScrollList.module.css';

type DataAttributes = { [key: `data-${string}`]: string | undefined };

export interface ScrollListProps extends Omit<ComponentPropsWithoutRef<'div'>, 'children'> {
  ref?: Ref<HTMLDivElement>;
  children: ReactNode;
  contentClassName?: string;
  viewportRef?: Ref<HTMLDivElement>;
  viewportProps?: ComponentPropsWithoutRef<'div'> & DataAttributes;
}

interface Edges {
  up: boolean;
  down: boolean;
}

const EDGE = 1;

export function ScrollList({
  className,
  contentClassName,
  viewportRef,
  viewportProps,
  children,
  ...rest
}: ScrollListProps) {
  const viewport = useRef<HTMLDivElement>(null);
  const mergedViewportRef = useMergedRef(viewport, viewportRef);
  const [edges, setEdges] = useState<Edges>({ up: false, down: false });

  const measure = useCallback(() => {
    const node = viewport.current;
    if (!node) return;
    const up = node.scrollTop > EDGE;
    const down = node.scrollHeight - node.clientHeight - node.scrollTop > EDGE;
    setEdges((current) => (current.up === up && current.down === down ? current : { up, down }));
  }, []);

  useEffect(() => {
    const node = viewport.current;
    if (!node) return;
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    for (const child of node.children) observer.observe(child);
    return () => observer.disconnect();
  }, [measure]);

  return (
    <ScrollArea
      {...rest}
      type="scroll"
      scrollbars="y"
      scrollbarSize={layout.scrollbar}
      className={className}
      classNames={{
        root: classes.root,
        viewport: classes.viewport,
        content: contentClassName ? `${classes.content} ${contentClassName}` : classes.content,
        scrollbar: classes.scrollbar,
        thumb: classes.thumb,
      }}
      viewportRef={mergedViewportRef}
      viewportProps={viewportProps}
      onScrollPositionChange={measure}
      data-scroll-list=""
      data-scroll-up={edges.up || undefined}
      data-scroll-down={edges.down || undefined}
    >
      {children}
    </ScrollArea>
  );
}
