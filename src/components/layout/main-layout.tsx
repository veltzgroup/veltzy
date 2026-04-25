import { Outlet } from 'react-router-dom'
import { AppSidebar } from '@/components/layout/app-sidebar'
import { ErrorReportButton } from '@/components/shared/error-report-button'

const MainLayout = () => {
  return (
    <div className="flex h-screen overflow-hidden">
      <AppSidebar />
      <main className="flex-1 overflow-y-auto scrollbar-minimal">
        <Outlet />
      </main>
      <ErrorReportButton />
    </div>
  )
}

export { MainLayout }
