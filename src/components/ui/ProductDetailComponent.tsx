// src/components/ui/ProductDetailComponent.tsx
import React, { useState } from 'react';
import { formatPrice } from '../../utils/formatters';
import { useCart } from '../../hooks/useCart';
import { MenuItem } from '../../types/MenuItem';
import { Product } from '../../types/Product';

type ProductOrMenuItemData = Partial<MenuItem & Product>;

interface ProductDetailProps {
  product: ProductOrMenuItemData | null | undefined; // La prop 'product' è l'oggetto con i dettagli effettivi
  id: string;
  onAction?: (action: string, payload: any) => void;
}

export const ProductDetailComponent: React.FC<ProductDetailProps> = ({ product, id, onAction }) => {
  const [quantity, setQuantity] = useState(1);
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>({});
  const [showSuccess, setShowSuccess] = useState(false);
  const [notes, setNotes] = useState('');
  const { addItem } = useCart();
  console.log(`[ProductDetailComponent RENDER] ID: ${id}, Product Prop Ricevuta:`, JSON.stringify(product, null, 2));

  // Controllo robusto: il prodotto deve esistere e avere campi essenziali
  if (!product || !product.id || !product.name || typeof product.category !== 'string' || typeof product.price !== 'number') {
    return (
      <div className="product-detail-card product-detail-loading" id={id} style={{ padding: '20px', textAlign: 'center' }}>
        <p>Dettagli del prodotto non disponibili o articolo non trovato.</p>
      </div>
    );
  }

  const handleAddToCart = () => {
    // product.category è già stato validato dal controllo sopra
    // product.id, product.name, product.price sono anch'essi validati.

    const itemTypeDetermined = product.category!.includes('food') || product.category!.includes('pastry') || product.category!.includes('beverage')
      ? 'menuItem'
      : 'product';

    // Prepara un payload completo per CartService, includendo le opzioni selezionate e le note
    const itemToAdd = {
      id: product.id!, // Sappiamo che esiste dal check iniziale
      name: product.name!, // Sappiamo che esiste
      price: product.price!, // Sappiamo che esiste
      quantity: quantity, // La quantità corrente dallo stato del componente
      type: itemTypeDetermined,
      options: { ...selectedOptions }, // Copia delle opzioni
      notes: notes.trim() || undefined, // Aggiungi note solo se presenti
      // Includi altri campi del prodotto se necessari per il carrello o l'ordine
      category: product.category,
      description: product.description,
      imageUrl: product.imageUrl,
    };

    addItem(itemToAdd, itemTypeDetermined);

    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 2000);
    // Non resettare quantity a 1 automaticamente, l'utente potrebbe voler aggiungerne altri
    // setQuantity(1);
    // setSelectedOptions({});
    // setNotes('');
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
            <img src={product.imageUrl} alt={product.name!} className="product-image" />
          ) : (
            <div className="product-image-placeholder">
              {isBeverage ? '☕' : isFood ? '🍽️' : '🛒'}
            </div>
          )}
        </div>

        <div className="product-info">
          <p className="product-description">{product.description}</p>
          {showSuccess && (
            <div className="success-message" style={{ marginTop: '10px', color: 'green', fontWeight: 'bold'}}>
              ✓ {quantity} x {product.name} aggiunto al carrello!
            </div>
          )}
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

          {!isFood && !isBeverage && product.details && Object.keys(product.details).length > 0 && (
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

          {isBeverage && product.subcategory === 'coffee' && (
             <div className="product-options">
              <h4>Opzioni:</h4>
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

          <div className="product-notes">
            <label htmlFor={`${id}-notes`}>Note speciali:</label>
            <textarea
              id={`${id}-notes`}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Aggiungi note specifiche..."
              rows={2}
            />
          </div>

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
              <span className="price-label">Prezzo Totale:</span>
              <span className="price-value">{formatPrice(product.price! * quantity)}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="product-detail-actions">
        <button
          className="add-to-cart-button"
          onClick={handleAddToCart}
        >
          Aggiungi al Carrello ({quantity})
        </button>

        <div className="product-badges">
          {product.popularity && product.popularity > 8 && (
            <span className="popularity-badge">Popolare</span>
          )}
          {isBeverage && product.alcoholic && (
            <span className="alcoholic-badge">Contiene alcol</span>
          )}
        </div>
      </div>
    </div>
  );
};