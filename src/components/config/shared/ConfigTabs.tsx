import React from 'react';

interface ConfigTabsProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const TABS = [
  { id: 'business', label: 'Business' },
  { id: 'theme', label: 'Tema' },
  { id: 'ai', label: 'AI' },
  { id: 'catalog', label: 'Catalogo' },
  { id: 'functions', label: 'Funzioni' },
  { id: 'ui', label: 'UI' },
  { id: 'privacy', label: 'Privacy' },
  { id: 'knowledge', label: 'Knowledge Base' }
];

export const ConfigTabs: React.FC<ConfigTabsProps> = ({ activeTab, onTabChange }) => {
  return (
    <div className="config-tabs">
      {TABS.map(tab => (
        <button
          key={tab.id}
          className={activeTab === tab.id ? 'tab-active' : ''}
          onClick={() => onTabChange(tab.id)}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
};