import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { queryClient } from '@/shared/queryClient';
import './index.css';

const root = document.getElementById('root');
if (!root) throw new Error('Missing #root element');

const target = import.meta.env.VITE_APP_TARGET;

async function bootstrap() {
  let MainApp: React.ComponentType;

  if (target === 'caficultores') {
    const { default: AppCaficultores } = await import('./AppCaficultores');
    MainApp = AppCaficultores;
  } else if (target === 'negocios') {
    const { default: AppNegocios } = await import('./AppNegocios');
    MainApp = AppNegocios;
  } else {
    const { default: AppClientes } = await import('./AppClientes');
    MainApp = AppClientes;
  }

  const { default: BlogIndex } = await import('./pages/blog/BlogIndex');
  const { default: BlogPost } = await import('./pages/blog/BlogPost');

  createRoot(root!).render(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <Routes>
            <Route path="/blog" element={<BlogIndex />} />
            <Route path="/blog/:slug" element={<BlogPost />} />
            <Route path="*" element={<MainApp />} />
          </Routes>
        </BrowserRouter>
      </QueryClientProvider>
    </StrictMode>,
  );
}

bootstrap();
