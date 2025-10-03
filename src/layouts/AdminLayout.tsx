import { Outlet } from 'react-router-dom';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { AdminSidebar } from '@/components/AdminSidebar';
import { ThemeToggle } from '@/components/ThemeToggle';
import { AIAssistant } from '@/components/AIAssistant';

export default function AdminLayout() {
  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <AdminSidebar />
        <main className="flex-1">
          <header className="sticky top-0 z-10 flex h-14 items-center justify-between gap-4 border-b border-border bg-background px-6">
            <SidebarTrigger />
            <ThemeToggle />
          </header>
          <div className="p-6">
            <Outlet />
          </div>
        </main>
        <AIAssistant />
      </div>
    </SidebarProvider>
  );
}