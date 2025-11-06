import React from 'react';
import { createRoot } from 'react-dom/client';
import { ReliabilityAllocationApp } from './ReliabilityAllocation';

export function mountReliabilityAllocation(selector: string) {
  const el = document.querySelector(selector);
  if (!el) return;
  if ((el as any)._mounted) return; // 防重复
  (el as any)._mounted = true;
  const root = createRoot(el);
  root.render(<ReliabilityAllocationApp />);
}
