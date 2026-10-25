import { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { CloudOff, RefreshCw } from 'lucide-react';
import { useApp } from '@/state/useApp';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import { BootScreen } from './BootScreen';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';

function OfflineBanner() {
  const { connection, reconnect } = useApp();
  const [working, setWorking] = useState(false);

  if (connection === 'online') return null;

  const handleReconnect = async () => {
    setWorking(true);
    await reconnect();
    setWorking(false);
  };

  return (
    <div className="border-b border-negative/[0.14] bg-negative/[0.055] px-4 py-2 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-[1560px] flex-wrap items-center gap-x-3 gap-y-2">
        <div className="flex min-w-0 flex-1 items-center gap-2.5">
          <CloudOff className="size-3.5 shrink-0 text-negative/80" aria-hidden="true" />
          <p className="text-[11.5px] text-white/60">
            <span className="font-medium text-white/80">
              {connection === 'reconnecting' ? 'Reconnecting…' : 'Connection lost.'}
            </span>{' '}
            <span className="text-white/38">
              Camera previews and billing actions are paused. Local data is unaffected.
            </span>
          </p>
        </div>
        <Button
          size="sm"
          variant="secondary"
          icon={RefreshCw}
          loading={working || connection === 'reconnecting'}
          onClick={handleReconnect}
          className="h-7 border-negative/20 bg-negative/[0.06] text-[11px] hover:bg-negative/[0.1]"
        >
          Reconnect
        </Button>
      </div>
    </div>
  );
}

export function AppShell() {
  const [navOpen, setNavOpen] = useState(false);
  const [studioSidebarCollapsed, setStudioSidebarCollapsed] = useState(true);
  const { booting } = useApp();
  const location = useLocation();
  const isStudio = location.pathname === '/studio';

  if (booting) return <BootScreen />;

  if (isStudio) {
    return (
      <div className="relative min-h-[100dvh] bg-[#08090b]">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-accent focus:px-3 focus:py-2 focus:text-[12px] focus:font-medium focus:text-accent-contrast"
        >
          Skip to content
        </a>

        {/* Collapsible Sidebar for Studio - default collapsed */}
        <Sidebar
          open={navOpen}
          onClose={() => setNavOpen(false)}
          collapsible
          collapsed={studioSidebarCollapsed}
          onToggleCollapse={() => setStudioSidebarCollapsed((prev) => !prev)}
        />

        <main
          id="main-content"
          className={cn(
            'studio-main min-h-[100dvh] w-full transition-[padding] duration-200 ease-in-out lg:h-[100dvh] lg:overflow-hidden',
            studioSidebarCollapsed ? 'lg:pl-[56px]' : 'lg:pl-[236px]',
          )}
        >
          <Outlet
            context={{
              openNav: () => setNavOpen(true),
              toggleNav: () => setStudioSidebarCollapsed((prev) => !prev),
              sidebarCollapsed: studioSidebarCollapsed,
            }}
          />
        </main>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-ink-950">
      <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden="true">
        <div className="absolute -right-[16%] -top-[24%] size-[620px] rounded-full bg-[radial-gradient(circle,rgb(var(--accent)/0.075),transparent_65%)] blur-2xl" />
        <div className="absolute -bottom-[30%] -left-[12%] size-[540px] rounded-full bg-[radial-gradient(circle,rgba(86,160,170,0.05),transparent_68%)] blur-2xl" />
      </div>

      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-accent focus:px-3 focus:py-2 focus:text-[12px] focus:font-medium focus:text-accent-contrast"
      >
        Skip to content
      </a>

      <Sidebar open={navOpen} onClose={() => setNavOpen(false)} />

      <div className="relative lg:pl-[236px]">
        <Topbar onOpenNav={() => setNavOpen(true)} />
        <OfflineBanner />
        <main id="main-content" className="mx-auto w-full max-w-[1560px] px-4 py-6 sm:px-6 lg:px-8 lg:py-7">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -3 }}
              transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
