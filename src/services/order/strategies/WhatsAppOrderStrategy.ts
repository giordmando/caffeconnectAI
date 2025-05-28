// src/services/order/strategies/WhatsAppOrderStrategy.ts
import { IOrderStrategy } from '../OrderOrchestrator';
import { OrderRequest, OrderResult } from '../../../types/Order';
import { configManager } from '../../../config/ConfigManager';

export class WhatsAppOrderStrategy implements IOrderStrategy {
  async processOrder(order: OrderRequest): Promise<OrderResult> {
    try {
      const businessConfig = configManager.getSection('business');
      const whatsappNumber = businessConfig.whatsappBusiness;
      
      if (!whatsappNumber) {
        return {
          success: false,
          orderId: order.id,
          error: 'Numero WhatsApp Business non configurato'
        };
      }
      
      // Crea il messaggio dell'ordine
      const orderMessage = this.formatOrderMessage(order);
      
      // Crea il link WhatsApp
      const whatsappUrl = `https://wa.me/${whatsappNumber.replace(/\D/g, '')}?text=${encodeURIComponent(orderMessage)}`;
      
      // Apri WhatsApp
      window.open(whatsappUrl, '_blank');
      
      return {
        success: true,
        orderId: order.id,
        message: 'Ordine inviato su WhatsApp! Controlla il tuo telefono per completare l\'invio.'
      };
      
    } catch (error) {
      console.error('Error processing WhatsApp order:', error);
      return {
        success: false,
        orderId: order.id,
        error: 'Errore nell\'invio dell\'ordine via WhatsApp'
      };
    }
  }
  
  isAvailable(): boolean {
    const businessConfig = configManager.getSection('business');
    return !!businessConfig.whatsappBusiness;
  }
  
  private formatOrderMessage(order: OrderRequest): string {
    const businessConfig = configManager.getSection('business');
    const businessName = businessConfig.name;
    
    let message = `🛒 *Nuovo Ordine - ${businessName}*\n\n`;
    message += `📋 *Ordine #${order.id.split('-').pop()}*\n`;
    message += `👤 *Cliente:* ${order.userInfo.name || 'Non specificato'}\n`;
    message += `📞 *Telefono:* ${order.userInfo.phone || 'Non specificato'}\n`;
    message += `📅 *Data:* ${new Date(order.timestamp).toLocaleString('it-IT')}\n\n`;
    
    message += `📝 *Articoli ordinati:*\n`;
    order.items.forEach((item, index) => {
      message += `${index + 1}. ${item.name} x${item.quantity} - €${(item.price * item.quantity).toFixed(2)}\n`;
      
      // Aggiungi opzioni se presenti
      if (item.options && Object.keys(item.options).length > 0) {
        Object.entries(item.options).forEach(([key, value]) => {
          message += `   • ${key}: ${value}\n`;
        });
      }
      
      // Aggiungi note se presenti
      if (item.notes) {
        message += `   💬 ${item.notes}\n`;
      }
    });
    
    message += `\n💰 *Totale: €${order.subtotal.toFixed(2)}*\n`;
    
    // Aggiungi note generali se presenti
    if (order.userInfo.notes) {
      message += `\n📝 *Note aggiuntive:*\n${order.userInfo.notes}\n`;
    }
    
    message += `\n✅ Per confermare l'ordine, rispondi a questo messaggio.`;
    message += `\n🕒 Ti ricontatteremo al più presto per i dettagli di ritiro/consegna.`;
    
    return message;
  }
}