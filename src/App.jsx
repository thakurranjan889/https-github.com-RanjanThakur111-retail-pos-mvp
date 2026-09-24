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
        <p>Loading your workspace...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="login-screen">
        <div className="login-glow login-glow-one" />
        <div className="login-glow login-glow-two" />
        <div className="login-panel">
          <div className="brand-mark">R</div>
          <p className="eyebrow">Retail Operations</p>
          <h1>Retail POS MVP</h1>
          <p className="login-subtext">Track inventory, manage sales, and keep your store running smoothly.</p>
          {error && <div className="alert error">{error}</div>}
          <button className="google-btn" onClick={handleGoogleLogin}>Sign in with Google</button>
          <div className="login-meta">
            <span>Admin access</span>
            <strong>ranjan111790@gmail.com</strong>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app-shell dashboard-shell">
      <header className="topbar">
        <div className="brand-block">
          <div className="brand-mark brand-mark-small">R</div>
          <div>
            <div className="brand-label">Retail POS</div>
            <h1>Operations Center</h1>
          </div>
        </div>

        <nav className="nav-tabs" aria-label="Main navigation">
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
          <div className="user-meta">
            <span className="user-role">{isAdmin ? 'Admin' : 'Staff'}</span>
            <span>{user.email}</span>
          </div>
          <button className="signout-btn" onClick={handleSignOut}>Sign out</button>
        </div>
      </header>

      <main className="content-shell">
        <div className="stat-grid">
          <div className="stat-card">
            <span className="stat-label">Sales</span>
            <strong>{view === 'orders' ? 'Live' : 'Ready'}</strong>
          </div>
          <div className="stat-card">
            <span className="stat-label">Inventory</span>
            <strong>{view === 'products' ? 'Managed' : 'Synced'}</strong>
          </div>
          <div className="stat-card">
            <span className="stat-label">Access</span>
            <strong>{isAdmin ? 'Admin' : 'View Only'}</strong>
          </div>
        </div>

        {view === 'products' ? (
          <ProductList isAdmin={isAdmin} />
        ) : view === 'orders' && isAdmin ? (
          <section className="panel-card orders-section">
            <div className="section-header">
              <div>
                <p className="eyebrow">Analytics</p>
                <h2>Recent Orders</h2>
              </div>
              <span className="status-badge">{orders.length} total</span>
            </div>
            {error && <div className="alert error">{error}</div>}
            {ordersLoading ? (
              <p className="empty-state inline-empty">Loading orders...</p>
            ) : orders.length === 0 ? (
              <p className="empty-state inline-empty">No customer orders yet.</p>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Customer</th>
                    <th>Delivery Address</th>
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
                      <td>{sale.delivery_address || 'Pickup'}</td>
                      <td>{sale.created_at?.toDate ? sale.created_at.toDate().toLocaleString() : '—'}</td>
                      <td>
                        {Array.isArray(sale.items)
                          ? sale.items.map((item) => item.name || item.sku || 'Item').join(', ')
                          : '—'}
                      </td>
                      <td>{Number(sale.total || 0).toFixed(2)}</td>
                      <td><span className="status-pill">{sale.status || 'pending'}</span></td>
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

