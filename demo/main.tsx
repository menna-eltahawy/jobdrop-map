import { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { App as ToolsPage } from './App';
import { ApplicantPage } from './ApplicantPage';
import { CompanyPage } from './CompanyPage';

function Root() {
  const [hash, setHash] = useState(window.location.hash);
  useEffect(() => {
    const on = () => setHash(window.location.hash);
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  if (hash === '#/company') return <CompanyPage />;
  if (hash === '#/tools') return <ToolsPage />;
  return <ApplicantPage />;
}

createRoot(document.getElementById('root')!).render(<Root />);