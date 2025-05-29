import React from 'react';
import { UIComponent } from '../../../../types/UI';
import { LoyaltyCard } from '../../../../components/ui/LoyaltyCard';
import { BaseComponentCreator } from './BaseComponentCreator';

export class LoyaltyCardCreator extends BaseComponentCreator {
  componentType = 'loyaltyCard';
  functionNames = ['get_user_loyalty_points'];
  
  createReactElement(component: UIComponent, onAction?: (action: string, payload: any) => void): React.ReactElement {
    const { points, tier, nextTier, history } = component.data;
    
    return React.createElement(LoyaltyCard, {
      points: points || 0,
      tier: tier || 'Bronze',
      nextTier: nextTier || { name: 'Silver', pointsNeeded: 100 },
      history: history || [],
      id: component.id,
      onAction
    });
  }
  
  createUIComponent(data: any, placement: string = 'sidebar'): UIComponent {
    return {
      type: this.componentType,
      data: {
        points: data.points || 0,
        tier: data.tier || 'Bronze',
        nextTier: data.nextTier || { name: 'Silver', pointsNeeded: 100 },
        history: data.history || []
      },
      placement,
      id: this.generateComponentId('loyalty-card', data),
      _updated: Date.now()
    };
  }
}