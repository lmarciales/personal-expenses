import { CreditCard, MoreVertical, Wallet, PlusCircle } from "lucide-react";
import { Button } from "../ui/button";
import { AddAccountModal } from "./AddAccountModal";

export interface Product {
  id: string | number;
  name: string;
  balance: number;
  color: string;
  lastDigits: string;
}

const Products = ({ products, onAccountAdded }: { products: Product[], onAccountAdded: () => void }) => {
  const totalBalance = products.reduce((sum, p) => sum + p.balance, 0);

  return (
    <div className="glass-card rounded-2xl h-full flex flex-col p-6">
      <div className="flex flex-row items-start justify-between pb-4">
        <div>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
            <Wallet className="w-4 h-4 text-primary" /> Total Balance
          </h2>
          <div className="mt-3 flex items-baseline gap-1">
            <span className="text-4xl font-extrabold tracking-tighter">${totalBalance.toLocaleString()}</span>
            <span className="text-sm text-primary font-medium tracking-wide">USD</span>
          </div>
        </div>
        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground rounded-full hover:bg-surface-hover-strong opacity-50 cursor-not-allowed">
          <MoreVertical className="h-4 w-4" />
        </Button>
      </div>

      <div className="mt-auto space-y-3">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">My Accounts</h3>
          {products.length > 0 && (
            <AddAccountModal onSuccess={onAccountAdded}>
              <Button variant="ghost" size="sm" className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground rounded-full hover:bg-surface-hover-strong gap-1" title="Add Account">
                <PlusCircle className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Add</span>
              </Button>
            </AddAccountModal>
          )}
        </div>
        {products.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-6 bg-surface-input border border-subtle rounded-xl text-center space-y-3">
            <p className="text-sm text-muted-foreground italic">You don't have any accounts yet.</p>
            <AddAccountModal onSuccess={onAccountAdded}>
              <Button variant="outline" className="w-full border-primary/50 text-primary hover:bg-primary/20 shadow-[0_0_10px_rgba(212,255,0,0.15)] bg-transparent">
                <PlusCircle className="mr-2 h-4 w-4" /> Add First Account
              </Button>
            </AddAccountModal>
          </div>
        ) : (
          products.slice(0, 3).map((product) => (
            <div key={product.id} className="flex items-center justify-between p-3 rounded-xl bg-surface-overlay border border-subtle hover:bg-surface-hover transition-colors group cursor-pointer">
              <div className="flex items-center space-x-3">
                <div className={`w-10 h-10 rounded-lg ${product.color} flex items-center justify-center shadow-lg transition-transform group-hover:scale-105`}>
                  <CreditCard className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-semibold text-sm group-hover:text-primary transition-colors">{product.name}</div>
                  <div className="text-xs text-muted-foreground font-mono mt-0.5">**** {product.lastDigits}</div>
                </div>
              </div>
              <div className="text-right">
                <div className="font-semibold text-sm">${product.balance.toLocaleString()}</div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default Products;
