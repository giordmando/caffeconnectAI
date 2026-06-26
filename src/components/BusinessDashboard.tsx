import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useServices } from '../contexts/ServiceProvider';
import { useCart } from '../hooks/useCart';
import { MenuItem } from '../types/MenuItem';
import { Product } from '../types/Product';
import {
  BusinessEvent,
  BusinessEventSummary,
  GatewayOrderRecord,
  businessEventService
} from '../services/analytics/BusinessEventService';
import { userContextService } from '../services/user/UserContextService';
import { UserContext } from '../types/UserContext';

interface BusinessDashboardProps {
  onClose: () => void;
  initialSection?: 'overview' | 'orders';
}

interface StoredConversation {
  messages?: Array<{
    role: 'user' | 'assistant';
    content?: string;
  }>;
  intents?: string[];
  topics?: string[];
}

const COMMERCIAL_QUERIES = [
  'colazione',
  'senza lattosio',
  'caffe specialty',
  'aperitivo',
  'regalo',
  'ordine whatsapp'
];

function readStoredConversations(): StoredConversation[] {
  try {
    const raw = localStorage.getItem('cafeconnect_conversations');
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch (_error) {
    return [];
  }
}

function includesAny(text: string, terms: string[]): boolean {
  const normalized = text.toLowerCase();
  return terms.some(term => normalized.includes(term));
}

function formatCurrency(value: number): string {
  return value.toLocaleString('it-IT', {
    style: 'currency',
    currency: 'EUR'
  });
}

function formatEventType(type: string): string {
  const labels: Record<string, string> = {
    message_sent: 'Messaggio',
    gateway_result: 'Risposta AI',
    ui_action: 'Azione UI',
    item_viewed: 'Dettaglio visto',
    add_to_cart: 'Add to cart',
    cart_opened: 'Carrello aperto',
    cart_cleared: 'Carrello svuotato',
    checkout_started: 'Checkout',
    order_submitted: 'Ordine inviato',
    order_failed: 'Ordine fallito'
  };

  return labels[type] || type;
}

function formatEventPayload(event: BusinessEvent): string {
  const payload = event.payload || {};

  if (event.type === 'message_sent') {
    return String(payload.content || '').slice(0, 90);
  }

  if (payload.name) {
    return String(payload.name);
  }

  if (payload.action) {
    return String(payload.action);
  }

  if (payload.orderId) {
    return String(payload.orderId);
  }

  if (payload.subtotal) {
    return formatCurrency(Number(payload.subtotal));
  }

  return 'Evento registrato';
}

function formatEventTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString('it-IT', {
    hour: '2-digit',
    minute: '2-digit'
  });
}

function formatPreferenceLabel(rating: number): string {
  if (rating >= 5) return 'forte';
  if (rating >= 4) return 'esplicita';
  if (rating >= 2) return 'interesse';
  return 'da evitare';
}

export const BusinessDashboard: React.FC<BusinessDashboardProps> = ({ onClose, initialSection = 'overview' }) => {
  const { appConfig, catalogService } = useServices();
  const { items, itemCount, subtotal } = useCart();
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [conversations, setConversations] = useState<StoredConversation[]>([]);
  const [events, setEvents] = useState<BusinessEvent[]>([]);
  const [remoteSummary, setRemoteSummary] = useState<BusinessEventSummary | null>(null);
  const [remoteOrders, setRemoteOrders] = useState<GatewayOrderRecord[]>([]);
  const [customerProfile, setCustomerProfile] = useState<UserContext>(() => userContextService.getUserContext());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefreshAt, setLastRefreshAt] = useState<number | null>(null);

  const refreshAnalytics = useCallback(async () => {
    setIsRefreshing(true);

    try {
      const [loadedMenuItems, loadedProducts] = await Promise.all([
        catalogService.getAllMenuItems(),
        catalogService.getProducts()
      ]);
      const loadedRemoteSummary = await businessEventService.getRemoteSummary();
      const loadedRemoteOrders = await businessEventService.getRemoteOrders(8);

      setMenuItems(loadedMenuItems);
      setProducts(loadedProducts);
      setConversations(readStoredConversations());
      setEvents(businessEventService.getEvents());
      setCustomerProfile(userContextService.getUserContext());
      setRemoteSummary(loadedRemoteSummary);
      setRemoteOrders(loadedRemoteOrders);
      setLastRefreshAt(Date.now());
    } finally {
      setIsRefreshing(false);
    }
  }, [catalogService]);

  const refreshCustomerProfile = useCallback(() => {
    setCustomerProfile({ ...userContextService.getUserContext() });
  }, []);

  const handleRemovePreference = useCallback((itemId: string, itemType: string) => {
    userContextService.removePreference(itemId, itemType);
    refreshCustomerProfile();
  }, [refreshCustomerProfile]);

  const handleRemoveRestriction = useCallback((restriction: string) => {
    userContextService.updateDietaryRestrictions(
      customerProfile.dietaryRestrictions.filter(item => item !== restriction)
    );
    refreshCustomerProfile();
  }, [customerProfile.dietaryRestrictions, refreshCustomerProfile]);

  const handleResetCustomerProfile = useCallback(() => {
    userContextService.resetContext();
    refreshCustomerProfile();
  }, [refreshCustomerProfile]);

  useEffect(() => {
    let isMounted = true;

    const refreshIfMounted = async () => {
      if (!isMounted) return;
      await refreshAnalytics();
    };

    refreshIfMounted();
    const intervalId = window.setInterval(refreshIfMounted, 30000);

    return () => {
      isMounted = false;
      window.clearInterval(intervalId);
    };
  }, [refreshAnalytics]);

  useEffect(() => {
    if (initialSection !== 'orders') return;

    const timeoutId = window.setTimeout(() => {
      document
        .getElementById('dashboard-orders-panel')
        ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 150);

    return () => window.clearTimeout(timeoutId);
  }, [initialSection, remoteOrders.length]);

  const dashboard = useMemo(() => {
    const userMessages = conversations.flatMap(conversation =>
      (conversation.messages || []).filter(message => message.role === 'user')
    );
    const messageEvents = events.filter(event => event.type === 'message_sent');
    const addToCartEvents = events.filter(event => event.type === 'add_to_cart');
    const orderEvents = events.filter(event => event.type === 'order_submitted');
    const failedOrderEvents = events.filter(event => event.type === 'order_failed');
    const viewedEvents = events.filter(event => event.type === 'item_viewed' || event.type === 'ui_action');
    const latestEvents = events
      .slice()
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 8);

    const userText = userMessages
      .map(message => message.content || '')
      .concat(messageEvents.map(event => String(event.payload?.content || '')))
      .join(' ')
      .toLowerCase();

    const allergenMentions = includesAny(userText, ['allerg', 'lattosio', 'glutine', 'vegano', 'vegan'])
      ? Math.max(1, Math.round(userMessages.length * 0.22))
      : Math.max(3, Math.round(menuItems.filter(item => item.allergens.length > 0).length * 0.6));

    const addToCartCounts = addToCartEvents.reduce<Record<string, number>>((counts, event) => {
      const id = String(event.payload?.id || '');
      if (!id) return counts;
      counts[id] = (counts[id] || 0) + Number(event.payload?.quantity || 1);
      return counts;
    }, {});

    const productInterest = products
      .slice()
      .sort((a, b) => (addToCartCounts[b.id] || 0) - (addToCartCounts[a.id] || 0) || b.popularity - a.popularity)
      .slice(0, 3);

    const menuInterest = menuItems
      .slice()
      .sort((a, b) => (addToCartCounts[b.id] || 0) - (addToCartCounts[a.id] || 0) || b.popularity - a.popularity)
      .slice(0, 3);

    const averageOrderValue = subtotal > 0
      ? subtotal
      : orderEvents.length > 0
        ? orderEvents.reduce((sum, event) => sum + Number(event.payload?.subtotal || 0), 0) / orderEvents.length
        : productInterest.reduce((sum, product) => sum + product.price, 0) / Math.max(1, productInterest.length);

    const localSummary = {
      eventCount: events.length,
      conversationCount: conversations.length || Math.max(1, Math.ceil(messageEvents.length / 4)) || 24,
      userMessageCount: userMessages.length || messageEvents.length || 86,
      unansweredCount: conversations.length > 0 && includesAny(userText, ['non so', 'non ho trovato'])
        ? 2
        : 4,
      allergenMentions,
      cartItemCount: itemCount,
      currentCartValue: subtotal,
      averageOrderValue,
      addToCartCount: addToCartEvents.length,
      orderCount: orderEvents.length,
      failedOrderCount: failedOrderEvents.length,
      viewedCount: viewedEvents.length,
      latestEvents,
      topItems: Object.entries(addToCartCounts)
        .map(([id, quantity]) => {
          const catalogItem = [...products, ...menuItems].find(item => item.id === id);
          return {
            id,
            name: catalogItem?.name || id,
            type: 'local',
            category: catalogItem?.category || '',
            quantity,
            revenue: Number(catalogItem?.price || 0) * quantity
          };
        })
        .sort((a, b) => b.quantity - a.quantity || b.revenue - a.revenue)
        .slice(0, 5),
      productInterest,
      menuInterest,
      recommendedActions: [
        'Pubblica il menu da Google Sheet per aggiornare prezzi e disponibilita senza deploy.',
        'Crea una promo colazione su cappuccino, cornetto e assaggio filtro.',
        'Aggiungi una FAQ allergeni piu completa per ridurre richieste manuali.',
        'Collega un webhook ordine per inviare bozze a POS o gestionale.'
      ]
    };

    if (!remoteSummary || remoteSummary.eventCount === 0) {
      return localSummary;
    }

    return {
      ...localSummary,
      eventCount: Math.max(localSummary.eventCount, remoteSummary.eventCount),
      userMessageCount: remoteSummary.messageCount || localSummary.userMessageCount,
      addToCartCount: remoteSummary.addToCartCount || localSummary.addToCartCount,
      orderCount: remoteSummary.orderCount,
      failedOrderCount: remoteSummary.failedOrderCount,
      viewedCount: remoteSummary.viewedCount || localSummary.viewedCount,
      allergenMentions: remoteSummary.allergenMentions || localSummary.allergenMentions,
      averageOrderValue: remoteSummary.averageOrderValue || localSummary.averageOrderValue,
      topItems: remoteSummary.topItems?.length ? remoteSummary.topItems : localSummary.topItems
    };
  }, [conversations, events, itemCount, menuItems, products, remoteSummary, subtotal]);

  const knowledgeEntries = appConfig?.knowledgeBase?.length || 0;
  const remoteSources = appConfig?.merchantKnowledge?.sources?.filter(source => source.enabled && source.url).length
    || appConfig?.knowledgeSources?.urls?.length
    || 0;
  const businessName = appConfig?.business?.name || 'CafeConnect AI';
  const rankedPreferences = customerProfile.preferences
    .slice()
    .sort((a, b) => Number(b.timestamp || 0) - Number(a.timestamp || 0))
    .slice(0, 8);
  const recentInteractions = customerProfile.interactions.slice(0, 6);

  return (
    <div className="business-dashboard">
      <div className="config-header">
        <div>
          <h2>Dashboard esercente</h2>
          <p>{businessName}</p>
        </div>
        <div className="dashboard-header-actions">
          <button
            className="dashboard-refresh-btn"
            onClick={refreshAnalytics}
            disabled={isRefreshing}
          >
            {isRefreshing ? 'Aggiorno...' : 'Aggiorna'}
          </button>
          <button className="close-btn" onClick={onClose} aria-label="Chiudi dashboard">
            x
          </button>
        </div>
      </div>

      <div className="dashboard-content">
        <section className="dashboard-summary">
          <div>
            <h3>Vista demo commerciale</h3>
            <p>
              Metriche operative per raccontare al gestore cosa chiedono i clienti,
              quali prodotti spingere e dove migliorare catalogo e knowledge base.
            </p>
          </div>
          <div className="dashboard-health">
            <span>Catalogo: {menuItems.length + products.length} voci</span>
            <span>Knowledge: {knowledgeEntries} blocchi</span>
            <span>Eventi: {dashboard.eventCount}</span>
            <span>{remoteSummary ? 'Gateway analytics' : 'Analytics locali'}</span>
            <span>
              {lastRefreshAt
                ? `Aggiornato ${formatEventTime(lastRefreshAt)}`
                : 'Aggiornamento in corso'}
            </span>
            <span>Fonti: {remoteSources} URL</span>
          </div>
        </section>

        <section className="dashboard-kpi-grid">
          <div className="dashboard-kpi">
            <span className="kpi-label">Conversazioni</span>
            <strong>{dashboard.conversationCount}</strong>
            <span className="kpi-note">ultimi dati locali/demo</span>
          </div>
          <div className="dashboard-kpi">
            <span className="kpi-label">Messaggi cliente</span>
            <strong>{dashboard.userMessageCount}</strong>
            <span className="kpi-note">base per insight e campagne</span>
          </div>
          <div className="dashboard-kpi">
            <span className="kpi-label">Add to cart</span>
            <strong>{dashboard.addToCartCount || itemCount}</strong>
            <span className="kpi-note">{formatCurrency(subtotal)}</span>
          </div>
          <div className="dashboard-kpi">
            <span className="kpi-label">Ordini completati</span>
            <strong>{dashboard.orderCount}</strong>
            <span className="kpi-note">{dashboard.failedOrderCount} falliti</span>
          </div>
          <div className="dashboard-kpi">
            <span className="kpi-label">Valore medio</span>
            <strong>{formatCurrency(dashboard.averageOrderValue)}</strong>
            <span className="kpi-note">carrello o ordini reali</span>
          </div>
        </section>

        <section className="dashboard-panel customer-profile-panel">
          <div className="customer-profile-header">
            <div>
              <h3>Profilo cliente AI</h3>
              <p className="dashboard-muted">
                Memoria usata dagli agenti per incrociare preferenze, restrizioni e catalogo.
              </p>
            </div>
            <button type="button" className="profile-reset-btn" onClick={handleResetCustomerProfile}>
              Reset profilo
            </button>
          </div>

          <div className="customer-profile-grid">
            <div className="profile-block">
              <span className="profile-block-label">Cliente</span>
              <strong>{customerProfile.name || customerProfile.userId}</strong>
              <small>
                Ultima visita: {customerProfile.lastVisit
                  ? new Date(customerProfile.lastVisit).toLocaleDateString('it-IT')
                  : 'non disponibile'}
              </small>
            </div>

            <div className="profile-block">
              <span className="profile-block-label">Restrizioni</span>
              {customerProfile.dietaryRestrictions.length > 0 ? (
                <div className="profile-chip-list">
                  {customerProfile.dietaryRestrictions.map(restriction => (
                    <button
                      type="button"
                      key={restriction}
                      className="profile-chip removable"
                      onClick={() => handleRemoveRestriction(restriction)}
                      title="Rimuovi restrizione"
                    >
                      {restriction}
                    </button>
                  ))}
                </div>
              ) : (
                <small>Nessuna restrizione appresa.</small>
              )}
            </div>
          </div>

          <div className="profile-sections">
            <div>
              <h4>Preferenze apprese</h4>
              {rankedPreferences.length > 0 ? (
                <ul className="profile-preference-list">
                  {rankedPreferences.map(preference => (
                    <li key={`${preference.itemType}-${preference.itemId}`}>
                      <div>
                        <strong>{preference.itemName || preference.itemCategory}</strong>
                        <span>{preference.itemCategory} / {formatPreferenceLabel(preference.rating)}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemovePreference(preference.itemId, preference.itemType)}
                        aria-label={`Rimuovi ${preference.itemName}`}
                      >
                        Rimuovi
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="dashboard-muted">
                  Interagisci con chat, card o carrello per alimentare la memoria.
                </p>
              )}
            </div>

            <div>
              <h4>Interazioni recenti</h4>
              {recentInteractions.length > 0 ? (
                <ul className="profile-interaction-list">
                  {recentInteractions.map((interaction, index) => (
                    <li key={`${interaction}-${index}`}>{interaction}</li>
                  ))}
                </ul>
              ) : (
                <p className="dashboard-muted">
                  Le ultime richieste del cliente appariranno qui.
                </p>
              )}
            </div>
          </div>
        </section>

        <section className="dashboard-columns">
          <div className="dashboard-panel">
            <h3>Domande frequenti da presidiare</h3>
            <div className="query-list">
              {COMMERCIAL_QUERIES.map(query => (
                <span key={query}>{query}</span>
              ))}
            </div>
            <p className="dashboard-muted">
              Richieste allergeni o preferenze alimentari stimate: {dashboard.allergenMentions}.
              Richieste senza risposta da ridurre: {dashboard.unansweredCount}.
              Interazioni con card e azioni: {dashboard.viewedCount}.
            </p>
          </div>

          <div className="dashboard-panel">
            <h3>Prodotti da spingere</h3>
            <ul className="dashboard-list">
              {dashboard.productInterest.map(product => (
                <li key={product.id}>
                  <span>{product.name}</span>
                  <strong>{formatCurrency(product.price)}</strong>
                </li>
              ))}
            </ul>
          </div>

          <div className="dashboard-panel">
            <h3>Menu piu demo-friendly</h3>
            <ul className="dashboard-list">
              {dashboard.menuInterest.map(item => (
                <li key={item.id}>
                  <span>{item.name}</span>
                  <strong>{item.popularity}%</strong>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="dashboard-detail-grid">
          <div className="dashboard-panel">
            <h3>Top prodotti reali</h3>
            {dashboard.topItems.length > 0 ? (
              <ul className="dashboard-list dashboard-ranked-list">
                {dashboard.topItems.map((item, index) => (
                  <li key={item.id}>
                    <span>
                      <b>{index + 1}</b>
                      {item.name}
                    </span>
                    <strong>{item.quantity}x</strong>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="dashboard-muted">
                Aggiungi un prodotto al carrello per popolare questa classifica.
              </p>
            )}
          </div>

          <div className="dashboard-panel">
            <h3>Ultimi eventi</h3>
            {dashboard.latestEvents.length > 0 ? (
              <ul className="dashboard-event-list">
                {dashboard.latestEvents.map(event => (
                  <li key={event.id}>
                    <span className={`event-type event-${event.type}`}>
                      {formatEventType(event.type)}
                    </span>
                    <span className="event-payload">{formatEventPayload(event)}</span>
                    <time>{formatEventTime(event.timestamp)}</time>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="dashboard-muted">
                Interagisci con chat, card o carrello per vedere gli eventi in tempo reale.
              </p>
            )}
          </div>
        </section>

        <section id="dashboard-orders-panel" className="dashboard-panel dashboard-orders-panel">
          <h3>Ordini inviati</h3>
          {remoteOrders.length > 0 ? (
            <ul className="dashboard-order-list">
              {remoteOrders.map(order => (
                <li key={order.id}>
                  <span className={`order-status order-status-${order.status}`}>
                    {order.status === 'submitted' ? 'Inviato' : 'Fallito'}
                  </span>
                  <span className="order-main">
                    <strong>{order.orderId}</strong>
                    <small>{order.customerName || 'Cliente non indicato'} / {order.itemCount} articoli</small>
                    {order.error && <small>{order.error}</small>}
                  </span>
                  <span className="order-value">{formatCurrency(order.subtotal)}</span>
                  <time>{formatEventTime(order.timestamp)}</time>
                </li>
              ))}
            </ul>
          ) : (
            <p className="dashboard-muted">
              Invia un ordine o usa il test webhook per popolare lo storico gateway.
            </p>
          )}
        </section>

        <section className="dashboard-panel dashboard-actions-panel">
          <h3>Azioni consigliate dall'AI business copilot</h3>
          <div className="dashboard-action-grid">
            {dashboard.recommendedActions.map(action => (
              <div key={action} className="dashboard-action-item">
                {action}
              </div>
            ))}
          </div>
        </section>

        {items.length > 0 && (
          <section className="dashboard-panel">
            <h3>Carrello in corso</h3>
            <ul className="dashboard-list">
              {items.map(item => (
                <li key={`${item.type}-${item.id}`}>
                  <span>{item.name} x{item.quantity}</span>
                  <strong>{formatCurrency(item.price * item.quantity)}</strong>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </div>
  );
};
