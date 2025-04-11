import React, { useState, useEffect } from 'react';
import { mockApiGetProducts } from '../api/mockApi';

interface ProductRecommendation {
  id: string;
  name: string;
  confidence: number;
}

interface ProductCarouselProps {
  recommendations: ProductRecommendation[];
  id: string;
  onAction?: (action: string, payload: any) => void;
}

export const ProductCarousel: React.FC<ProductCarouselProps> = ({ 
  recommendations, 
  id,
  onAction 
}) => {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoading(true);
        // Ottieni tutti i prodotti
        const allProducts = await mockApiGetProducts();
        
        // Filtra solo quelli raccomandati
        const recommendedProducts = recommendations.map(rec => {
          const product = allProducts.find(product => product.id === rec.id);
          if (product) {
            return {
              ...product,
              confidence: rec.confidence
            };
          }
          return null;
        }).filter(Boolean);
        
        setProducts(recommendedProducts);
      } catch (error) {
        console.error('Errore nel caricamento dei prodotti:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchProducts();
  }, [recommendations]);
  
  const handleProductClick = (product: any) => {
    if (onAction) {
      onAction('view_item', {
        id: product.id,
        type: 'product'
      });
    }
  };
  
  const handleBuyClick = (e: React.MouseEvent, product: any) => {
    e.stopPropagation(); // Preveni il click sul prodotto
    if (onAction) {
      onAction('buy_item', {
        id: product.id,
        type: 'product',
        name: product.name
      });
    }
  };
  
  if (loading) {
    return (
      <div className="product-carousel loading">
        <div className="loading-spinner"></div>
        <p>Caricamento prodotti consigliati...</p>
      </div>
    );
  }
  
  if (products.length === 0) {
    return (
      <div className="product-carousel empty">
        <p>Nessun prodotto consigliato disponibile.</p>
      </div>
    );
  }
  
  return (
    <div className="product-carousel" id={id}>
      <div className="carousel-header">
        <h3>Prodotti consigliati</h3>
      </div>
      
      <div className="carousel-items">
        {products.map(product => (
          <div 
            key={product.id} 
            className="product-item-card"
            onClick={() => handleProductClick(product)}
          >
            <div className="item-image">
              {/* Placeholder per immagine generata da AI */}
              <div className="image-placeholder">
                {product.category === 'coffee' 
                  ? '☕' 
                  : product.category === 'tea'
                    ? '🍵'
                    : product.category === 'accessory'
                      ? '🧰'
                      : '🛒'}
              </div>
            </div>
            
            <div className="item-info">
              <h4>{product.name}</h4>
              <p className="item-description">{product.description.slice(0, 60)}...</p>
              <div className="item-footer">
                <span className="item-price">{product.price.toFixed(2)}€</span>
                <button 
                  className="buy-button"
                  onClick={(e) => handleBuyClick(e, product)}
                >
                  Acquista
                </button>
              </div>
            </div>
            
            {/* Badge di confidenza per ogni prodotto */}
            <div 
              className="confidence-badge"
              style={{
                opacity: product.confidence / 100
              }}
            >
              {Math.round(product.confidence * 100)}%
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ProductCarousel;