import { Navigate, Route, Routes } from 'react-router-dom';
import AppShell from './components/layout/AppShell';
import LedgerPage from './modules/ledger/LedgerPage';
import Dashboard from './modules/analytics/Dashboard';
import ChallengeCenter from './modules/challenge/ChallengeCenter';
import BillingPortal from './modules/billing/BillingPortal';
import AiAssistant from './modules/ai/AiAssistant';
import { LedgerProvider } from './modules/ledger/ledgerContext';
import { BillingProvider } from './modules/billing/billingContext';
import AdminPanel from './modules/admin/AdminPanel';

export default function App() {
  return (
    <BillingProvider>
      <LedgerProvider>
        <Routes>
          <Route element={<AppShell />}>
            <Route path="/" element={<Navigate to="/ledger" replace />} />
            <Route path="/ledger" element={<LedgerPage />} />
            <Route path="/analytics" element={<Dashboard />} />
            <Route path="/challenges" element={<ChallengeCenter />} />
            <Route path="/billing" element={<BillingPortal />} />
            <Route path="/admin" element={<AdminPanel />} />
          </Route>
        </Routes>
        <AiAssistant />
      </LedgerProvider>
    </BillingProvider>
  );
}
