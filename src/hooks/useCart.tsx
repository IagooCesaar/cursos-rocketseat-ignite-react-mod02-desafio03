import { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product, Stock } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem('@RocketShoes:cart')
    if (storagedCart) {
      return JSON.parse(storagedCart);
    }
    return [];
  });

  useEffect(() => {
    localStorage.setItem('@RocketShoes:cart', JSON.stringify(cart))
  }, [cart])

  async function getProductBalance(productId: number) {
    const stockResponse = await api.get<Stock[]>(`/stock?id=${productId}`)
    const { amount: balance } = stockResponse.data[0];
    return balance || 0;
  }

  const addProduct = async (productId: number) => {
    try {
      const [alreadyExists] = cart.filter(product => product.id === productId);
      if (alreadyExists) {
        updateProductAmount({
          productId,
          amount: alreadyExists.amount + 1
        })
      }

      const response = await api.get<Product[]>(`/products?id=${productId}`)
      const product = response.data[0];
      console.log('received', product)
      product.amount = 1;

      setCart([
        ...cart,
        product
      ])
    } catch {
      // TODO
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const remainingProduct = cart.filter(product => product.id !== productId)
      setCart(remainingProduct)
    } catch {
      // TODO
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      const newCart = cart.map(product => {
        if (product.id === productId) {
          product.amount = amount;
        }
        return product;
      })
      setCart(newCart)
    } catch {
      // TODO
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
