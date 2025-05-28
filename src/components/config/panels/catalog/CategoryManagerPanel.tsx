import React from 'react';
import type { IConfigSection } from '../../interfaces/IConfigSection';
import type { AppConfig } from '../../../../config/interfaces/IAppConfig';

type CatalogConfig = AppConfig['catalog'];

export const CategoryManagerPanel: React.FC<IConfigSection<CatalogConfig>> = ({
  config,
  onChange,
  className = ''
}) => {
  const handleCategoryChange = (index: number, field: string, value: string) => {
    const newCategories = [...(config.categories || [])];
    (newCategories[index] as any)[field] = value;
    onChange('categories', newCategories);
  };
  
  const handleAddCategory = () => {
    const newCategories = [...(config.categories || []), { id: '', name: '', icon: '🆕' }];
    onChange('categories', newCategories);
  };
  
  const handleRemoveCategory = (index: number) => {
    const newCategories = (config.categories || []).filter((_, i) => i !== index);
    onChange('categories', newCategories);
  };
  
  return (
    <div className={`config-section ${className}`}>
      <h3>Gestione Categorie</h3>
      
      <div className="categories-container">
        {(config.categories || []).map((category, index) => (
          <div key={index} className="category-item">
            <input
              type="text"
              value={category.id}
              onChange={(e) => handleCategoryChange(index, 'id', e.target.value)}
              placeholder="ID categoria"
            />
            <input
              type="text"
              value={category.name}
              onChange={(e) => handleCategoryChange(index, 'name', e.target.value)}
              placeholder="Nome Categoria"
            />
            <input
              type="text"
              value={category.icon}
              onChange={(e) => handleCategoryChange(index, 'icon', e.target.value)}
              placeholder="Icona"
              maxLength={2}
              className="icon-input"
            />
            <button
              className="remove-btn"
              onClick={() => handleRemoveCategory(index)}
            >
              ×
            </button>
          </div>
        ))}
        <button className="add-btn" onClick={handleAddCategory}>
          Aggiungi Categoria
        </button>
      </div>
      
      <h4>Menu per Fascia Oraria</h4>
      
      <div className="form-group">
        <label htmlFor="morning-menu">Categorie Menu Mattina</label>
        <input
          id="morning-menu"
          type="text"
          value={config.timeBasedMenus?.morning.join(', ') || ''}
          onChange={(e) => {
            const categories = e.target.value.split(',').map(s => s.trim()).filter(Boolean);
            onChange('timeBasedMenus.morning', categories);
          }}
          placeholder="ID categorie (es. coffee, pastry)"
        />
      </div>
      
      <div className="form-group">
        <label htmlFor="afternoon-menu">Categorie Menu Pomeriggio</label>
        <input
          id="afternoon-menu"
          type="text"
          value={config.timeBasedMenus?.afternoon.join(', ') || ''}
          onChange={(e) => {
            const categories = e.target.value.split(',').map(s => s.trim()).filter(Boolean);
            onChange('timeBasedMenus.afternoon', categories);
          }}
          placeholder="ID categorie (es. lunch, sandwich)"
        />
      </div>
      
      <div className="form-group">
        <label htmlFor="evening-menu">Categorie Menu Sera</label>
        <input
          id="evening-menu"
          type="text"
          value={config.timeBasedMenus?.evening.join(', ') || ''}
          onChange={(e) => {
            const categories = e.target.value.split(',').map(s => s.trim()).filter(Boolean);
            onChange('timeBasedMenus.evening', categories);
          }}
          placeholder="ID categorie (es. aperitivo, dinner)"
        />
      </div>
    </div>
  );
};