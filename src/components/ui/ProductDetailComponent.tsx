import React, { useState } from 'react';
import { formatPrice } from '../../utils/formatters';
import { useCart } from '../../hooks/useCart';
import { MenuItem } from '../../types/MenuItem';
import { Product } from '../../types/Product';

type ProductOrMenuItemData = Partial<MenuItem & Product>;

interface ProductDetailProps {
  product: ProductOrMenuItemData | null | undefined;
  id: string;
  onAction?: (action: string, payload: any) => void;
}

export const ProductDetailComponent: React.FC<ProductDetailProps> = ({ product, id }) => {
  const [quantity, setQuantity] = useState(1);
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>({});
  const [showSuccess, setShowSuccess] = useState(false);
  const [notes, setNotes] = useState('');
  const { addItem } = useCart();

  if (!product || !product.id || !product.name || typeof product.category !== 'string' || typeof product.price !== 'number') {
    return (
      <div className="product-detail-card product-detail-loading" id={id}>
        <p>Dettagli non disponibili.</p>
      </div>
    );
  }

  const isFood = product.category === 'food' || product.category === 'pastry';
  const isBeverage = product.category === 'beverage' || product.category === 'coffee' || product.category === 'tea';
  const itemType: 'menuItem' | 'product' = isFood || isBeverage ? 'menuItem' : 'product';

  const handleAddToCart = () => {
    addItem({
      id: product.id!,
      name: product.name!,
      price: product.price!,
      quantity,
      type: itemType,
      options: { ...selectedOptions },
      notes: notes.trim() || undefined,
      category: product.category,
      description: product.description,
      imageUrl: product.imageUrl,
    }, itemType);

    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 2000);
  };

  const handleOptionChange = (optionName: string, value: string) => {
    setSelectedOptions(prev => ({
      ...prev,
      [optionName]: value
    }));
  };

  return (
    <div className="product-detail-card product-detail-card-compact" id={id}>
      <div className="product-detail-header">
        <div>
          <h3>{product.name}</h3>
          <p>{product.description}</p>
        </div>
        <span className="product-category">{product.category}</span>
      </div>

      <div className="product-detail-content">
        <div className="product-image-container">
          {product.imageUrl ? (
            <img src={product.imageUrl} alt={product.name} className="product-image" />
          ) : (
            <div className="product-image-placeholder">{isBeverage ? 'Caffe' : isFood ? 'Menu' : 'Shop'}</div>
          )}
        </div>

        <div className="product-info">
          {product.ingredients && product.ingredients.length > 0 && (
            <div className="product-meta-block">
              <h4>Ingredienti</h4>
              <p>{product.ingredients.join(', ')}</p>
            </div>
          )}

          {product.allergens && product.allergens.length > 0 && (
            <div className="product-meta-block">
              <h4>Allergeni</h4>
              <div className="allergen-tags">
                {product.allergens.map((allergen, index) => (
                  <span key={index} className="allergen-tag">{allergen}</span>
                ))}
              </div>
            </div>
          )}

          {product.dietaryInfo && product.dietaryInfo.length > 0 && (
            <div className="product-meta-block">
              <h4>Info</h4>
              <div className="dietary-tags">
                {product.dietaryInfo.map((info, index) => (
                  <span key={index} className="dietary-tag">{info}</span>
                ))}
              </div>
            </div>
          )}

          {isBeverage && product.subcategory === 'coffee' && (
            <div className="product-options">
              <h4>Personalizza</h4>
              <div className="option-group">
                <label>Latte</label>
                <div className="option-buttons">
                  {['Normale', 'Scremato', 'Soia', 'Mandorla', 'Avena'].map(milk => (
                    <button
                      key={milk}
                      type="button"
                      className={`option-button ${selectedOptions.milk === milk ? 'selected' : ''}`}
                      onClick={() => handleOptionChange('milk', milk)}
                    >
                      {milk}
                    </button>
                  ))}
                </div>
              </div>
              <div className="option-group">
                <label>Zucchero</label>
                <div className="option-buttons">
                  {['Normale', 'Poco', 'Nessuno', 'Dolcificante'].map(sugar => (
                    <button
                      key={sugar}
                      type="button"
                      className={`option-button ${selectedOptions.sugar === sugar ? 'selected' : ''}`}
                      onClick={() => handleOptionChange('sugar', sugar)}
                    >
                      {sugar}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          <label className="product-notes">
            Note
            <textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Es. senza lattosio, ritiro tra 10 minuti..."
              rows={2}
            />
          </label>
        </div>
      </div>

      <div className="product-detail-actions">
        <div className="quantity-control">
          <button type="button" className="quantity-btn decrease" onClick={() => setQuantity(Math.max(1, quantity - 1))} disabled={quantity <= 1}>-</button>
          <span className="quantity-value">{quantity}</span>
          <button type="button" className="quantity-btn increase" onClick={() => setQuantity(quantity + 1)}>+</button>
        </div>

        <div className="product-price">
          <span className="price-label">Totale</span>
          <span className="price-value">{formatPrice(product.price * quantity)}</span>
        </div>

        <button type="button" className="add-to-cart-button" onClick={handleAddToCart}>
          {showSuccess ? 'Aggiunto' : `Aggiungi (${quantity})`}
        </button>
      </div>
    </div>
  );
};
