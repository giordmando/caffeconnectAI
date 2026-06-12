import React, { useEffect, useState } from 'react';
import { mockApiGetProducts } from '../../api/mockApi';
import { useCart } from '../../hooks/useCart';
import { formatPrice } from '../../utils/formatters';

interface ProductRecommendation {
  id: string;
  name: string;
  confidence: number;
  item?: any;
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
  const { addItem } = useCart();

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoading(true);
        const allProducts = await mockApiGetProducts();
        const recommendedProducts = recommendations
          .map(rec => {
            const product = rec.item || allProducts.find(candidate => candidate.id === rec.id);
            return product ? { ...product, confidence: rec.confidence } : null;
          })
          .filter(Boolean);

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
    onAction?.('view_item', {
      id: product.id,
      type: 'product',
      item: {
        ...product,
        type: 'product'
      }
    });
  };

  const handleBuyClick = (event: React.MouseEvent<HTMLElement>, product: any) => {
    event.stopPropagation();
    addItem(product, 'product');

    const button = event.currentTarget;
    button.textContent = 'Aggiunto';
    button.classList.add('added');

    setTimeout(() => {
      button.textContent = 'Aggiungi';
      button.classList.remove('added');
    }, 1500);
  };

  if (loading) {
    return (
      <div className="product-carousel loading">
        <div className="loading-spinner"></div>
        <p>Sto preparando i prodotti...</p>
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
    <div className="product-carousel menu-carousel" id={id}>
      <div className="carousel-header">
        <h3>Prodotti consigliati</h3>
      </div>

      <div className="carousel-items">
        {products.map(product => (
          <div
            key={product.id}
            className="menu-item-card product-item-card"
            onClick={() => handleProductClick(product)}
          >
            <div className="item-image">
              {product.imageUrl ? (
                <img src={product.imageUrl} alt={product.name} />
              ) : (
                <div className="image-placeholder">{product.category === 'coffee' ? 'Caffe' : product.category === 'tea' ? 'Tea' : 'Shop'}</div>
              )}
            </div>

            <div className="item-info">
              <h4>{product.name}</h4>
              {product.personalization?.reasons?.length > 0 && (
                <p className="personalization-reason">
                  Scelto per te: {product.personalization.reasons[0]}
                </p>
              )}
              <p className="item-description">{String(product.description || '').slice(0, 88)}</p>
              <div className="item-footer">
                <span className="item-price">{formatPrice(Number(product.price || 0))}</span>
                <button
                  type="button"
                  className="order-button buy-button"
                  onClick={(event) => handleBuyClick(event, product)}
                >
                  Aggiungi
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ProductCarousel;
