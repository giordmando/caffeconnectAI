import React, { useState } from 'react';
import { formatPrice } from '../../utils/formatters';

// Interfacce
interface ProductDetailProps {
  product: any;
  id: string;
  onAction?: (action: string, payload: any) => void;
}

export const ProductDetailComponent: React.FC<ProductDetailProps> = ({ product, id, onAction }) => {
  const [quantity, setQuantity] = useState(1);
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>({});
  const [notes, setNotes] = useState('');
  
  if (!product) {
    return (
      <div className="product-detail-loading" id={id}>
        <div className="loading-spinner"></div>
        <p>Caricamento prodotto...</p>
      </div>
    );
  }
  
  const handleAddToCart = () => {
    if (onAction) {
      onAction('add_to_cart', {
        id: product.id,
        type: product.category.includes('food') ? 'menuItem' : 'product',
        name: product.name,
        price: product.price,
        quantity,
        options: selectedOptions,
        notes
      });
    }
  };
  
  const handleQuantityChange = (delta: number) => {
    const newQuantity = Math.max(1, quantity + delta);
    setQuantity(newQuantity);
  };
  
  const handleOptionChange = (optionName: string, value: string) => {
    setSelectedOptions(prev => ({
      ...prev,
      [optionName]: value
    }));
  };
  
  // Determina se è un prodotto food o beverage per mostrare le informazioni appropriate
  const isFood = product.category === 'food' || product.category === 'pastry';
  const isBeverage = product.category === 'beverage' || product.category === 'coffee' || product.category === 'tea';
  
  return (
    <div className="product-detail-card" id={id}>
      <div className="product-detail-header">
        <h3>{product.name}</h3>
        {product.category && (
          <span className="product-category">{product.category}</span>
        )}
      </div>
      
      <div className="product-detail-content">
        <div className="product-image-container">
          {product.imageUrl ? (
            <img src={product.imageUrl} alt={product.name} className="product-image" />
          ) : (
            <div className="product-image-placeholder">
              {isBeverage ? '☕' : isFood ? '🍽️' : '🛒'}
            </div>
          )}
        </div>
        
        <div className="product-info">
          <p className="product-description">{product.description}</p>
          
          {/* Sezione ingredienti per cibi e bevande */}
          {(isFood || isBeverage) && product.ingredients && product.ingredients.length > 0 && (
            <div className="product-ingredients">
              <h4>Ingredienti:</h4>
              <ul>
                {product.ingredients.map((ingredient: string, index: number) => (
                  <li key={index}>{ingredient}</li>
                ))}
              </ul>
            </div>
          )}
          
          {/* Allergeni */}
          {product.allergens && product.allergens.length > 0 && (
            <div className="product-allergens">
              <h4>Allergeni:</h4>
              <div className="allergen-tags">
                {product.allergens.map((allergen: string, index: number) => (
                  <span key={index} className="allergen-tag">{allergen}</span>
                ))}
              </div>
            </div>
          )}
          
          {/* Info dietetiche */}
          {product.dietaryInfo && product.dietaryInfo.length > 0 && (
            <div className="dietary-info">
              <h4>Info dietetiche:</h4>
              <div className="dietary-tags">
                {product.dietaryInfo.map((info: string, index: number) => (
                  <span key={index} className="dietary-tag">{info}</span>
                ))}
              </div>
            </div>
          )}
          
          {/* Dettagli specifici del prodotto (non menu) */}
          {!isFood && !isBeverage && product.details && (
            <div className="product-details">
              <h4>Dettagli:</h4>
              <ul>
                {Object.entries(product.details).map(([key, value]) => (
                  <li key={key}>
                    <strong>{key}:</strong> {String(value)}
                  </li>
                ))}
              </ul>
            </div>
          )}
          
          {/* Opzioni per bevande */}
          {isBeverage && (
            <div className="product-options">
              <h4>Opzioni:</h4>
              
              {/* Esempio: opzione latte */}
              <div className="option-group">
                <label>Tipo di latte:</label>
                <div className="option-buttons">
                  {['Normale', 'Scremato', 'Soia', 'Mandorla', 'Avena'].map(milk => (
                    <button
                      key={milk}
                      className={`option-button ${selectedOptions['milk'] === milk ? 'selected' : ''}`}
                      onClick={() => handleOptionChange('milk', milk)}
                    >
                      {milk}
                    </button>
                  ))}
                </div>
              </div>
              
              {/* Esempio: opzione zucchero */}
              <div className="option-group">
                <label>Zucchero:</label>
                <div className="option-buttons">
                  {['Normale', 'Poco', 'Nessuno', 'Dolcificante'].map(sugar => (
                    <button
                      key={sugar}
                      className={`option-button ${selectedOptions['sugar'] === sugar ? 'selected' : ''}`}
                      onClick={() => handleOptionChange('sugar', sugar)}
                    >
                      {sugar}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
          
          {/* Note */}
          <div className="product-notes">
            <label htmlFor="notes">Note speciali:</label>
            <textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Aggiungi note specifiche..."
              rows={2}
            />
          </div>
          
          {/* Controllo quantità e prezzo */}
          <div className="product-quantity-price">
            <div className="quantity-control">
              <button 
                className="quantity-btn decrease"
                onClick={() => handleQuantityChange(-1)}
                disabled={quantity <= 1}
              >
                -
              </button>
              <span className="quantity-value">{quantity}</span>
              <button 
                className="quantity-btn increase"
                onClick={() => handleQuantityChange(1)}
              >
                +
              </button>
            </div>
            
            <div className="product-price">
              <span className="price-label">Prezzo:</span>
              <span className="price-value">{formatPrice(product.price * quantity)}</span>
            </div>
          </div>
        </div>
      </div>
      
      <div className="product-detail-actions">
        <button 
          className="add-to-cart-button"
          onClick={handleAddToCart}
        >
          Aggiungi al Carrello
        </button>
        
        {/* Badge informativi */}
        <div className="product-badges">
          {product.popularity > 8 && (
            <span className="popularity-badge">Popolare</span>
          )}
          
          {product.availability === 'limited' && (
            <span className="availability-warning">Disponibilità limitata</span>
          )}
          
          {isBeverage && product.alcoholic && (
            <span className="alcoholic-badge">Contiene alcol</span>
          )}
        </div>
      </div>
    </div>
  );
};