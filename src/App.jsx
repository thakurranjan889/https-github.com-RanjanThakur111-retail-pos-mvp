import React, { useEffect, useState } from 'react';
import { onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { auth, googleProvider, db } from './firebaseConfig';
import ProductList from './components/ProductList';
import Pos from './pages/Pos';

const ADMIN_EMAIL = 'ranjan111790@gmail.com';

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('pos');
  const [orders, setOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const isAdmin = !!user && user.email && user.email.toLowerCase() === ADMIN_EMAIL.toLowerCase();

  useEffect(() => {
    if (!isAdmin || view !== 'orders') return;

    let ignore = false;

    async function loadOrders() {
      setOrdersLoading(true);
      setError('');

      try {
        const q = query(collection(db, 'sales'), orderBy('created_at', 'desc'));
        const snap = await getDocs(q);
        const rows = snap.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));
        if (!ignore) setOrders(rows);
      } catch (err) {
        if (!ignore) setError(err.message || 'Could not load orders.');
      } finally {
        if (!ignore) setOrdersLoading(false);
      }
    }

    loadOrders();

    return () => {
      ignore = true;
    };
  }, [isAdmin, view]);

  const handleGoogleLogin = async () => {
    try {
      setError('');
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      setError(err.message || 'Google sign-in failed.');
    }
  };

  const handleSignOut = async () => {
    await signOut(auth);
    setView('pos');
  };

  if (loading) {
    return (
      <div className="app-shell loading-shell">
        <div className="spinner" />
        <p>Loading...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="login-screen">
        <div className="login-panel">
          <h1>Retail POS MVP</h1>
          <p>Sign in with Google to continue</p>
          {error && <div className="alert error">{error}</div>}
          <button className="google-btn" onClick={handleGoogleLogin}>Sign in with Google</button>
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      <header className="topbar">
        <h1>Retail POS MVP</h1>

        <nav className="nav-tabs">
          <button className={view === 'pos' ? 'active' : ''} onClick={() => setView('pos')}>
            POS
          </button>
          <button className={view === 'products' ? 'active' : ''} onClick={() => setView('products')}>
            Products
          </button>
          {isAdmin && (
            <button className={view === 'orders' ? 'active' : ''} onClick={() => setView('orders')}>
              Orders
            </button>
          )}
        </nav>

        <div className="user-box">
          <span>
            {user.email} {isAdmin ? '(Admin — client-side only)' : ''}
          </span>
          <button className="signout-btn" onClick={handleSignOut}>Sign out</button>
        </div>
      </header>

      <main>
        {view === 'products' ? (
          <ProductList isAdmin={isAdmin} />
        ) : view === 'orders' && isAdmin ? (
          <section className="orders-section">
            <h2>Orders</h2>
            {error && <div className="alert error">{error}</div>}
            {ordersLoading ? (
              <p>Loading orders...</p>
            ) : orders.length === 0 ? (
              <p>No customer orders yet.</p>
            ) : (
              <table className="orders-table">
                <thead>
                  <tr>
                    <th>Customer</th>
                    <th>Time</th>
                    <th>Items</th>
                    <th>Total</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((sale) => (
                    <tr key={sale.id}>
                      <td>{sale.customerEmail || sale.customerUid || 'Unknown customer'}</td>
                      <td>{sale.created_at?.toDate ? sale.created_at.toDate().toLocaleString() : '—'}</td>
                      <td>
                        {Array.isArray(sale.items)
                          ? sale.items.map((item) => item.name || item.sku || 'Item').join(', ')
                          : '—'}
                      </td>
                      <td>{Number(sale.total || 0).toFixed(2)}</td>
                      <td>{sale.status || 'pending'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>
        ) : (
          <Pos user={user} />
        )}
      </main>
    </div>
  );
}
