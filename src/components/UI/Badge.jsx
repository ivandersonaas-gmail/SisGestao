import React from 'react';
import { SM } from '../../config/constants';

export function Badge({ statusId }) {
  const s = SM[statusId] || { label: statusId, badge: 'b-gray' };
  
  return (
    <span className={`badge ${s.badge}`}>
      {s.label}
    </span>
  );
}
