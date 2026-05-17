import React, { useEffect } from 'react';
import { X } from 'lucide-react';

export function Modal({ title, children, onClose, footer, width }) {
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  return (
    <div className="modal-bg" onClick={(e) => {
      if (e.target === e.currentTarget) onClose();
    }}>
      <div className="modal" style={width ? { maxWidth: width } : {}}>
        <div className="modal-head">
          <span className="modal-title">{title}</span>
          <button className="btn-x" onClick={onClose}>
            <X size={22} color="var(--text3)" />
          </button>
        </div>
        <div className="modal-body">
          {children}
        </div>
        {footer && (
          <div className="modal-foot">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
