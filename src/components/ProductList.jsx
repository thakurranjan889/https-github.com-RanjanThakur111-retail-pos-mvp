import React, { useCallback, useEffect, useState } from 'react';
import { addDoc, collection, getDocs } from 'firebase/firestore';
import { db } from '../firebaseConfig';

const emptyForm = {
  sku: '',
  barcode: '',
  name: '',
  price: '',
  qty_on_hand: '1',
};

export default function ProductList({ isAdmin }) {
  const [products, setProducts] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const refreshProducts = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      // Do not use orderBy here: products imported from CSV and products
      // created in the UI may not all have the same optional fields.
      const snapshot = await getDocs(collection(db, 'products'));
      const rows = snapshot.docs
        .map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }))
        .sort((a, b) => String(a.name || '').localeCompare(String(b.name || '')));
      setProducts(rows);
    } catch (err) {
      setError(err.message || 'Could not load products.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshProducts();
  }, [refreshProducts]);

  function updateForm(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (!isAdmin) return;

    const sku = form.sku.trim();
    const name = form.name.trim();
    const price = Number(form.price);
    const qty = Number(form.qty_on_hand);

    if (!sku || !name || !Number.isFinite(price) || price < 0 || !Number.isInteger(qty) || qty < 0) {
      setError('Please enter a valid SKU, name, price, and whole-number quantity.');
      return;
    }

    setSaving(true);
    setError('');
    try {
      await addDoc(collection(db, 'products'), {
        sku,
        barcode: form.barcode.trim() || null,
        name,
        price,
        qty_on_hand: qty,
      });
      setForm(emptyForm);
      await refreshProducts();
    } catch (err) {
      setError(err.message || 'Could not save product.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <section>
      <h2>Products</h2>
      {error && <div className="alert error">{error}</div>}

      {isAdmin && (
        <form className="product-form" onSubmit={handleSubmit}>
          <input name="sku" value={form.sku} onChange={updateForm} placeholder="SKU" required />
          <input name="barcode" value={form.barcode} onChange={updateForm} placeholder="Barcode (optional)" />
          <input name="name" value={form.name} onChange={updateForm} placeholder="Name" required />
          <input name="price" type="number" min="0" step="0.01" value={form.price} onChange={updateForm} placeholder="Price" required />
          <input name="qty_on_hand" type="number" min="0" step="1" value={form.qty_on_hand} onChange={updateForm} placeholder="Qty" required />
          <button type="submit" disabled={saving}>{saving ? 'Saving...' : 'Add Product'}</button>
        </form>
      )}

      {loading ? (
        <p>Loading products...</p>
      ) : products.length === 0 ? (
        <div className="empty-state">
          No products available yet. {isAdmin ? 'Add a product above or import data/products.csv.' : 'Ask the admin to import or add products.'}
        </div>
      ) : (
        <table className="products">
          <thead>
            <tr><th>SKU</th><th>Name</th><th>Price</th><th>Qty</th></tr>
          </thead>
          <tbody>
            {products.map((product) => (
              <tr key={product.id}>
                <td>{product.sku || product.id}</td>
                <td>{product.name || 'Unnamed product'}</td>
                <td>{Number(product.price || 0).toFixed(2)}</td>
                <td>{product.qty_on_hand ?? 0}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
