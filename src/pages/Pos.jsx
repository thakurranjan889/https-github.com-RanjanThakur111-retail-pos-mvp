import React, { useState } from 'react';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebaseConfig';

export default function Pos({ user }) {
  const [cart, setCart] = useState([]);
  const [barcode, setBarcode] = useState('');

  function addItem(item) {
    setCart((current) => [...current, item]);
  }

  async function createSale() {
    const sale = {
      created_at: serverTimestamp(),
      customerUid: user?.uid || null,
      customerEmail: user?.email || null,
      customerDisplayName: user?.displayName || null,
      items: cart.map((item) => ({
        sku: item.sku,
        name: item.name,
        price: Number(item.price || 0),
        qty: 1,
      })),
      total: cart.reduce((sum, item) => sum + (Number(item.price) || 0), 0),
      status: 'pending',
    };

    await addDoc(collection(db, 'sales'), sale);
    setCart([]);
    alert('Sale recorded');
  }

  async function handleBarcodeAdd() {
    const q = await (await import('firebase/firestore')).getDocs(collection(db, 'products'));
    const docs = q.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));
    const found = docs.find((product) => product.barcode === barcode || product.sku === barcode || product.id === barcode);

    if (!found) {
      alert('Product not found in this demo');
      setBarcode('');
      return;
    }

    addItem(found);
    setBarcode('');
  }

  return (
    <div>
      <h2>POS</h2>
      <div className="pos-controls">
        <input
          placeholder="Scan barcode or type SKU"
          value={barcode}
          onChange={(event) => setBarcode(event.target.value)}
        />
        <button onClick={handleBarcodeAdd}>Add</button>
      </div>

      <div className="cart">
        <h3>Cart</h3>
        <ul>
          {cart.map((item, index) => (
            <li key={`${item.id || item.sku || index}`}>
              {item.name} — {item.price}
            </li>
          ))}
        </ul>
        <div>Total: {cart.reduce((sum, item) => sum + (Number(item.price) || 0), 0).toFixed(2)}</div>
        <button onClick={createSale} disabled={cart.length === 0}>Complete Sale</button>
      </div>
    </div>
  );
}
