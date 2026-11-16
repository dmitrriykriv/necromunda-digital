import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { HashRouter, Route, Routes } from 'react-router-dom';
import { BackToTop } from '@/components/BackToTop';
import { PrintCardsPage } from '@/pages/PrintCardsPage';
import { PrintSmallCardsPage } from '@/pages/PrintSmallCardsPage';
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
          <Route path="/" element={
            <>
              <BackToTop />
              <RosterBuilderPage />
            </>
          } />
          <Route path="/print" element={<PrintCardsPage />} />
          <Route path="/print/small" element={<PrintSmallCardsPage />} />
        </Routes>
      </HashRouter>
    </QueryClientProvider>
  );
}
