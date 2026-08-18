import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { HashRouter, Route, Routes } from 'react-router-dom';
import { PrintCardsPage } from '@/pages/PrintCardsPage';
import { RosterBuilderPage } from '@/pages/RosterBuilderPage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5_000,
      refetchOnWindowFocus: false,
    },
  },
});

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <HashRouter>
        <Routes>
          <Route path="/" element={<RosterBuilderPage />} />
          <Route path="/print" element={<PrintCardsPage />} />
        </Routes>
      </HashRouter>
    </QueryClientProvider>
  );
}
