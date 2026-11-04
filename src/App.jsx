import { useEffect, useState } from 'react';
import DatabaseApp from './DatabaseApp';
import SpecialCategoryImages from './SpecialCategoryImages';
import AdminOrdersPanel from './AdminOrdersPanel';
import AdminReceiptReview from './AdminReceiptReview';
import BankTransferReceiptGate from './BankTransferReceiptGate';

function WhatsAppSupportButton() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const sync = () => {
      const path = window.location.pathname;
      setVisible(path === '/' || path === '/store' || path === '/shop' || path === '/home');
    };

    sync();
    window.addEventListener('popstate', sync);
    return () => window.removeEventListener('popstate', sync);
  }, []);

  if (!visible) return null;

  return (
    <>
      <style>{`
        .whatsapp-float-button {
          position: fixed;
          right: 18px;
          bottom: 22px;
          z-index: 90;
          display: grid;
          place-items: center;
          width: 58px;
          height: 58px;
          border-radius: 50%;
          background: #25d366;
          color: white;
          text-decoration: none;
          font-weight: 800;
          font-size: 1.15rem;
          box-shadow: 0 18px 32px rgba(37, 211, 102, 0.32);
          border: 2px solid rgba(255,255,255,0.7);
        }
        .whatsapp-float-button:hover { transform: translateY(-2px); }
      `}</style>
      <a className="whatsapp-float-button" href="https://wa.me/2349068192327" target="_blank" rel="noreferrer" aria-label="Chat on WhatsApp">WA</a>
    </>
  );
}

export default function App() {
  return <>
    <DatabaseApp />
    <SpecialCategoryImages />
    <AdminOrdersPanel />
    <AdminReceiptReview />
    <BankTransferReceiptGate />
    <WhatsAppSupportButton />
  </>;
}
