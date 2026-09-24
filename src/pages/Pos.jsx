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

  const total = cart.reduce((sum, item) => sum + (Number(item.price) || 0), 0);

  return (
    <section className="panel-card pos-panel">
      <div className="section-header">
        <div>
          <p className="eyebrow">Checkout</p>
          <h2>Point of Sale</h2>
        </div>
        <span className="status-badge">{cart.length} items</span>
      </div>

      <div className="pos-controls">
        <input
          className="scanner-input"
          placeholder="Scan barcode or type SKU"
          value={barcode}
          onChange={(event) => setBarcode(event.target.value)}
        />
        <button className="primary-btn" onClick={handleBarcodeAdd}>Add item</button>
      </div>

      <div className="cart-layout">
        <div className="cart-list-wrap">
          <h3>Current Cart</h3>
          {cart.length === 0 ? (
            <div className="empty-state small-empty">No items yet. Scan a barcode to begin.</div>
          ) : (
            <ul className="cart-list">
              {cart.map((item, index) => (
                <li key={`${item.id || item.sku || index}`} className="cart-item">
                  <div>
                    <strong>{item.name}</strong>
                    <span>{item.sku || item.id}</span>
                  </div>
                  <span className="price-tag">${Number(item.price || 0).toFixed(2)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <aside className="checkout-summary">
          <p className="summary-label">Order Summary</p>
          <div className="summary-row">
            <span>Subtotal</span>
            <strong>${total.toFixed(2)}</strong>
          </div>
          <div className="summary-row total-row">
            <span>Total</span>
            <strong>${total.toFixed(2)}</strong>
          </div>
          <button className="primary-btn full-width" onClick={createSale} disabled={cart.length === 0}>
            Complete Sale
          </button>
        </aside>
      </div>
    </section>
  );
}

