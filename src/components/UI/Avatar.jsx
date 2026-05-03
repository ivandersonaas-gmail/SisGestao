import React from 'react';
import { avcol } from '../../config/constants';

export function Avatar({ user, size = 28 }) {
  if (!user) return null;
  
  const un = user.username || '';
  const c = avcol(un);
  const sz = Math.round(size * 0.36);
  const initials = user.initials || (user.name ? user.name[0] : '?');

  return (
    <div style={{
      width: `${size}px`,
      height: `${size}px`,
      borderRadius: '50%',
      background: c.bg,
      color: c.fg,
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: `${sz}px`,
      fontWeight: 600,
      flexShrink: 0,
      border: `1.5px solid ${c.fg}33`
    }}>
      {initials}
    </div>
  );
}
