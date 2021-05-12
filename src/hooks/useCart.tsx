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
      const balance = await getProductBalance(productId);

      const [alreadyExists] = cart.filter(product => product.id === productId);
      if (alreadyExists) {
        let { amount } = alreadyExists;
        amount += 1;
        if (amount > balance) {
          throw new Error('Quantidade solicitada fora de estoque')
        } else {
          updateProductAmount({
            productId,
            amount,
          })
        }
        return;
      }

      if (balance < 1) {
        throw new Error('Quantidade solicitada fora de estoque')
      }
      const response = await api.get<Product[]>(`/products?id=${productId}`)
      const product = response.data[0];
      product.amount = 1;

      setCart([
        ...cart,
        product
      ])
    } catch (error) {
      if (error instanceof Error) {
        toast.error(error.message)
      } else {
        toast.error("Erro na adição do produto")
      }
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
      const balance = await getProductBalance(productId);
      if (amount > balance) {
        throw new Error('Quantidade solicitada fora de estoque')
      } else {
        const newCart = cart.map(product => {
          if (product.id === productId) {
            product.amount = amount;
          }
          return product;
        })
        setCart(newCart)
      }
    } catch (error) {
      if (error instanceof Error) {
        toast.error(error.message)
      } else {
        toast.error("Erro na alteração de quantidade do produto")
      }
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
