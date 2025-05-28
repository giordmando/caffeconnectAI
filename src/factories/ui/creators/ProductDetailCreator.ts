import { UIComponent } from "../../../types/UI";
import { BaseComponentCreator } from "./BaseComponentCreator";
import { ProductDetailComponent } from '../../../components/ui/ProductDetailComponent';
import React from "react";

export class ProductDetailCreator extends BaseComponentCreator {
    componentType = 'productDetail';
    
    create(component: UIComponent, onAction?: (action: string, payload: any) => void): React.ReactElement {
        const product = component.data?.product || component.data || {};
        return React.createElement(ProductDetailComponent, {
            product: product,
            id: component.id,
            onAction
        });
    
    }
  }