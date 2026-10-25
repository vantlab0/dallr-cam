import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ChevronRight, Download, Plus } from 'lucide-react';
import { useApp } from '@/state/useApp';
import { Avatar } from '@/components/ui/Avatar';
import { ConnectionBadge } from '@/components/ui/ConnectionBadge';
import { formatCredits } from '@/lib/format';
import { isDesktopRuntime } from '@/lib/environment';
import { DownloadAppModal } from '@/components/desktop/DownloadAppModal';
import { MobileMenuButton } from './Sidebar';

const pageTitles: Record<string, { section: string; title: string }> = {
  '/studio': { section: 'Workspace', title: 'Live Studio' },
  '/sessions': { section: 'Workspace', title: 'Session history' },
  '/wallet': { section: 'Billing', title: 'Wallet' },
  '/transactions': { section: 'Billing', title: 'Transactions' },
  '/profile': { section: 'Account', title: 'Profile' },
  '/settings': { section: 'Account', title: 'Settings' },
};

export function Topbar({ onOpenNav }: { onOpenNav: () => void }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, wallet } = useApp();
  const [downloadModalOpen, setDownloadModalOpen] = useState(false);
  const isDesktop = isDesktopRuntime();
  const meta = pageTitles[location.pathname] ?? { section: 'Workspace', title: 'Dallr Studio' };

  return (
    <>
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-4 border-b border-white/[0.055] bg-ink-950/55 px-4 backdrop-blur-2xl sm:px-6 lg:px-8">
        <div className="flex min-w-0 items-center gap-2">
          <MobileMenuButton onClick={onOpenNav} />
          <div className="hidden items-center gap-1.5 text-[11px] text-white/28 sm:flex">
            <span>{meta.section}</span>
            <ChevronRight className="size-3" aria-hidden="true" />
          </div>
          <p className="truncate text-[12.5px] font-medium text-white/75">{meta.title}</p>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {!isDesktop && (
            <button
              type="button"
              onClick={() => setDownloadModalOpen(true)}
              className="flex h-[30px] items-center gap-1.5 rounded-full border border-accent/25 bg-accent/[0.08] px-2.5 text-[11px] font-medium text-accent transition hover:border-accent/40 hover:bg-accent/[0.14] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
              aria-label="Download standalone desktop app for Windows and macOS"
            >
              <Download className="size-3.5" />
              <span className="hidden sm:inline">Download App</span>
            </button>
          )}

          <span className="hidden md:block">
            <ConnectionBadge />
          </span>
          <Link
            to="/wallet"
            className="group flex h-[30px] items-center gap-1.5 rounded-full border border-white/[0.07] bg-white/[0.035] pl-2.5 pr-2 text-[11px] text-white/60 transition hover:border-white/[0.12] hover:bg-white/[0.06] hover:text-white/85 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
            aria-label={`Credit balance ${formatCredits(wallet.balanceCredits)} credits. Open wallet`}
          >
            <span className="size-1.5 rounded-full bg-accent/80" aria-hidden="true" />
            <span className="tabular-nums">{formatCredits(wallet.balanceCredits)}</span>
            <span className="hidden text-white/30 sm:inline">credits</span>
          </Link>
          <button
            type="button"
            onClick={() => navigate('/wallet')}
            className="hidden size-[30px] place-items-center rounded-full border border-white/[0.07] bg-white/[0.035] text-white/45 transition hover:border-white/[0.12] hover:bg-white/[0.06] hover:text-white/85 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 sm:grid"
            aria-label="Add credits"
          >
            <Plus className="size-3.5" />
          </button>
          {user ? (
            <Link
              to="/profile"
              className="ml-0.5 rounded-[10px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
              aria-label="Open profile"
            >
              <Avatar name={user.name} size="sm" />
            </Link>
          ) : null}
        </div>
      </header>

      <DownloadAppModal
        open={downloadModalOpen}
        onClose={() => setDownloadModalOpen(false)}
      />
    </>
  );
}
