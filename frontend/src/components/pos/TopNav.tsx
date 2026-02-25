import { Button } from '@/components/ui/button';
import { ShoppingCart, Package, Receipt } from 'lucide-react';

type View = 'pos' | 'products' | 'history';

interface TopNavProps {
    currentView: View;
    onViewChange: (view: View) => void;
}

export function TopNav({ currentView, onViewChange }: TopNavProps) {
    return (
        <nav className="flex gap-2">
            <Button
                variant={currentView === 'pos' ? 'default' : 'outline'}
                onClick={() => onViewChange('pos')}
                className="gap-2"
            >
                <ShoppingCart className="h-4 w-4" />
                Point of Sale
            </Button>
            <Button
                variant={currentView === 'products' ? 'default' : 'outline'}
                onClick={() => onViewChange('products')}
                className="gap-2"
            >
                <Package className="h-4 w-4" />
                Products
            </Button>
            <Button
                variant={currentView === 'history' ? 'default' : 'outline'}
                onClick={() => onViewChange('history')}
                className="gap-2"
            >
                <Receipt className="h-4 w-4" />
                History
            </Button>
        </nav>
    );
}
