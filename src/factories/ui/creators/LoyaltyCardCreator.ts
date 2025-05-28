import React from 'react';
import { BaseComponentCreator } from './BaseComponentCreator';
import { UIComponent } from '../../../types/UI';
import { LoyaltyCard } from '../../../components/ui/LoyaltyCard';

export class LoyaltyCardCreator extends BaseComponentCreator {
  componentType = 'loyaltyCard';
  
  create(component: UIComponent, onAction?: (action: string, payload: any) => void): React.ReactElement {
    const data = this.validateData<{
      points: number;
      tier: string;
      nextTier: { name: string; pointsNeeded: number };
      history: any[];
    }>(component.data || {}, ['points', 'tier', 'nextTier']);
    
    return React.createElement(LoyaltyCard, {
      points: data.points,
      tier: data.tier,
      nextTier: data.nextTier,
      history: data.history || [],
      id: component.id,
      onAction
    });
  }
}