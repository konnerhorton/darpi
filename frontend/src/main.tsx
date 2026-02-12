import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { AllCommunityModule } from 'ag-grid-community'
import { AgGridProvider } from 'ag-grid-react'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AgGridProvider modules={[AllCommunityModule]}>
      <App />
    </AgGridProvider>
  </StrictMode>,
)
