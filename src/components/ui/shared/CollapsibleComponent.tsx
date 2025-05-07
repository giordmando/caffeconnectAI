import React, { useState } from 'react';

interface CollapsibleComponentProps {
  title: string;
  children: React.ReactNode;
  className?: string;
  initialExpanded?: boolean;
  placement?: string;
}

/**
 * Componente collassabile generico per i pannelli NLP
 * Implementa il Single Responsibility Principle gestendo solo la logica di collasso
 */
const CollapsibleComponent: React.FC<CollapsibleComponentProps> = ({
  title,
  children,
  className = '',
  initialExpanded = true,
  placement = 'sidebar'
}) => {
  const [isExpanded, setIsExpanded] = useState(initialExpanded);

  // Auto-collasso per componenti nel flusso principale o in basso
  // ma mantieni espansi quelli nella sidebar
  React.useEffect(() => {
    if (placement !== 'sidebar' && initialExpanded !== false) {
      setIsExpanded(false);
    }
  }, [placement, initialExpanded]);

  const toggleExpand = () => {
    setIsExpanded(!isExpanded);
  };

  return (
    <div className={`collapsible-component ${className}`}>
      <div className="collapsible-header" onClick={toggleExpand}>
        <h4>{title}</h4>
        <span className={`collapsible-icon ${isExpanded ? '' : 'collapsed'}`}>
          ▼
        </span>
      </div>
      <div className={`collapsible-content ${isExpanded ? 'expanded' : ''}`}>
        {children}
      </div>
    </div>
  );
};

export default CollapsibleComponent;