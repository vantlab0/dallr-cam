import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowUpRight,
  ChevronRight,
  CircleUserRound,
  History,
  LayoutDashboard,
  LogOut,
  Menu,
  PanelLeft,
  PanelLeftClose,
  WalletCards,
  X,
} from 'lucide-react';
import { useApp } from '@/state/useApp';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { ConnectionBadge } from '@/components/ui/ConnectionBadge';
import { Logo, LogoMark } from '@/components/ui/Logo';
import { formatCredits, formatDuration } from '@/lib/format';
import { estimatedSecondsRemaining } from '@/lib/credits';
import { cn } from '@/lib/utils';

const workspaceNav = [
  { to: '/studio', label: 'Live Studio', icon: LayoutDashboard },
  { to: '/sessions', label: 'Session history', icon: History },
];

const billingNav = [
  { to: '/wallet', label: 'Wallet', icon: WalletCards },
  { to: '/transactions', label: 'Transactions', icon: History },
];

const accountNav = [
  { to: '/profile', label: 'Profile', icon: CircleUserRound },
];

function NavSection({
  label,
  items,
  onNavigate,
}: {
  label: string;
  items: typeof workspaceNav;
  onNavigate?: () => void;
}) {
  return (
    <div>
      <p className="px-2.5 pb-1.5 text-[9px] font-semibold uppercase tracking-[0.19em] text-white/25">
        {label}
      </p>
      <ul className="space-y-0.5">
        {items.map((item) => (
          <li key={item.to}>
            <NavLink
              to={item.to}
              onClick={onNavigate}
              className={({ isActive }) =>
                cn(
                  'group relative flex h-[34px] items-center gap-2.5 rounded-[9px] px-2.5 text-[12px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40',
                  isActive
                    ? 'bg-white/[0.065] text-white/90'
                    : 'text-white/42 hover:bg-white/[0.035] hover:text-white/70',
                )
              }
            >
              {({ isActive }) => (
                <>
                  <span
                    className={cn(
                      'absolute left-0 top-1/2 h-3.5 w-[2px] -translate-y-1/2 rounded-full bg-accent transition-opacity',
                      isActive ? 'opacity-100' : 'opacity-0',
                    )}
                    aria-hidden="true"
                  />
                  <item.icon
                    className={cn('size-[15px] transition-colors', isActive && 'text-accent')}
                    aria-hidden="true"
                  />
                  {item.label}
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </div>
  );
}

function UserMenu({ onNavigate }: { onNavigate?: () => void }) {
  const { user, signOut } = useApp();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!open) return;
    const handlePointerDown = (event: PointerEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  if (!user) return null;

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex w-full items-center gap-2.5 rounded-[10px] border border-transparent p-1.5 text-left transition hover:border-white/[0.06] hover:bg-white/[0.035] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
      >
        <Avatar name={user.name} size="md" />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[12px] font-medium text-white/85">{user.name}</span>
          <span className="block truncate text-[10px] text-white/30">{user.email}</span>
        </span>
        <ChevronRight
          className={cn('size-3.5 text-white/25 transition-transform', open && 'rotate-90')}
          aria-hidden="true"
        />
      </button>

      <AnimatePresence>
        {open ? (
          <motion.div
            role="menu"
            initial={{ opacity: 0, y: 6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.98 }}
            transition={{ duration: 0.14 }}
            className="absolute bottom-full left-0 right-0 z-20 mb-1.5 overflow-hidden rounded-xl border border-white/[0.09] bg-ink-800/95 p-1 shadow-lift backdrop-blur-xl"
          >
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                onNavigate?.();
                navigate('/profile');
              }}
              className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[12px] text-white/65 transition hover:bg-white/[0.06] hover:text-white/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
            >
              <CircleUserRound className="size-3.5" aria-hidden="true" />
              Profile
            </button>
            <div className="my-1 h-px bg-white/[0.06]" />
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                onNavigate?.();
                signOut();
                navigate('/sign-in');
              }}
              className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[12px] text-white/55 transition hover:bg-negative/[0.08] hover:text-negative focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
            >
              <LogOut className="size-3.5" aria-hidden="true" />
              Sign out
            </button>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

function SidebarContent({
  onNavigate,
  collapsed = false,
  onToggleCollapse,
}: {
  onNavigate?: () => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}) {
  const { wallet, settings, user } = useApp();
  const navigate = useNavigate();
  const remaining = estimatedSecondsRemaining(wallet.balanceCredits, settings.usageRatePerMin);

  if (collapsed) {
    return (
      <div className="flex h-full w-[56px] flex-col justify-between py-3">
        {/* Top: LogoMark button to toggle or navigate */}
        <div className="flex flex-col items-center">
          <button
            type="button"
            onClick={onToggleCollapse}
            className="grid size-9 place-items-center rounded-xl text-white/80 transition hover:bg-white/[0.08] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
            title="Expand sidebar"
            aria-label="Expand sidebar"
          >
            <LogoMark className="size-7" />
          </button>
        </div>

        {/* Center: Nav icons column */}
        <div className="my-auto flex flex-col items-center gap-1.5">
          {workspaceNav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={onNavigate}
              className={({ isActive }) =>
                cn(
                  'group relative grid size-9 place-items-center rounded-xl transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40',
                  isActive
                    ? 'bg-white/[0.08] text-white shadow-sm'
                    : 'text-white/40 hover:bg-white/[0.04] hover:text-white/80',
                )
              }
              title={item.label}
            >
              {({ isActive }) => (
                <>
                  {isActive ? (
                    <span className="absolute left-0 top-1/2 h-3.5 w-[2px] -translate-y-1/2 rounded-full bg-accent" />
                  ) : null}
                  <item.icon className={cn('size-4', isActive && 'text-accent')} />
                </>
              )}
            </NavLink>
          ))}

          <div className="my-1.5 h-px w-5 bg-white/[0.08]" />

          {billingNav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={onNavigate}
              className={({ isActive }) =>
                cn(
                  'group relative grid size-9 place-items-center rounded-xl transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40',
                  isActive
                    ? 'bg-white/[0.08] text-white shadow-sm'
                    : 'text-white/40 hover:bg-white/[0.04] hover:text-white/80',
                )
              }
              title={item.label}
            >
              {({ isActive }) => (
                <>
                  {isActive ? (
                    <span className="absolute left-0 top-1/2 h-3.5 w-[2px] -translate-y-1/2 rounded-full bg-accent" />
                  ) : null}
                  <item.icon className={cn('size-4', isActive && 'text-accent')} />
                </>
              )}
            </NavLink>
          ))}

          <div className="my-1.5 h-px w-5 bg-white/[0.08]" />

          {accountNav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={onNavigate}
              className={({ isActive }) =>
                cn(
                  'group relative grid size-9 place-items-center rounded-xl transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40',
                  isActive
                    ? 'bg-white/[0.08] text-white shadow-sm'
                    : 'text-white/40 hover:bg-white/[0.04] hover:text-white/80',
                )
              }
              title={item.label}
            >
              {({ isActive }) => (
                <>
                  {isActive ? (
                    <span className="absolute left-0 top-1/2 h-3.5 w-[2px] -translate-y-1/2 rounded-full bg-accent" />
                  ) : null}
                  <item.icon className={cn('size-4', isActive && 'text-accent')} />
                </>
              )}
            </NavLink>
          ))}
        </div>

        {/* Bottom: Expand button & Profile */}
        <div className="flex flex-col items-center gap-2 border-t border-white/[0.06] pt-2">
          {onToggleCollapse ? (
            <button
              type="button"
              onClick={onToggleCollapse}
              className="grid size-8 place-items-center rounded-lg text-white/40 transition hover:bg-white/[0.06] hover:text-white/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
              title="Expand sidebar"
              aria-label="Expand sidebar"
            >
              <PanelLeft className="size-4" />
            </button>
          ) : null}

          <button
            type="button"
            onClick={() => {
              onNavigate?.();
              navigate('/profile');
            }}
            className="grid size-7 place-items-center rounded-full transition hover:ring-2 hover:ring-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
            title={user?.name ?? 'Profile'}
            aria-label="View profile"
          >
            <Avatar name={user?.name ?? 'Ada'} size="sm" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-14 items-center justify-between px-4">
        <Link
          to="/studio"
          onClick={onNavigate}
          className="rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
          aria-label="Dallr Studio home"
        >
          <Logo />
        </Link>
        {onToggleCollapse ? (
          <button
            type="button"
            onClick={onToggleCollapse}
            className="rounded-lg p-1.5 text-white/40 transition hover:bg-white/[0.06] hover:text-white/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
            aria-label="Collapse sidebar"
            title="Collapse sidebar"
          >
            <PanelLeftClose className="size-4" />
          </button>
        ) : onNavigate ? (
          <button
            type="button"
            onClick={onNavigate}
            className="rounded-lg p-1.5 text-white/40 transition hover:bg-white/[0.06] hover:text-white/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
            aria-label="Close navigation"
          >
            <X className="size-4" />
          </button>
        ) : null}
      </div>

      <div className="px-3 pt-1">
        <div className="flex items-center justify-between rounded-[10px] border border-white/[0.055] bg-white/[0.02] px-2.5 py-2">
          <div className="min-w-0">
            <p className="text-[8.5px] font-semibold uppercase tracking-[0.16em] text-white/25">
              Workspace
            </p>
            <p className="mt-0.5 truncate text-[11.5px] font-medium text-white/70">
              {user?.name.split(' ')[0] ?? 'Personal'}&apos;s studio
            </p>
          </div>
          <Badge tone="accent">Pro</Badge>
        </div>
      </div>

      <nav className="mt-5 flex-1 space-y-5 overflow-y-auto px-3 pb-4" aria-label="Primary">
        <NavSection label="Workspace" items={workspaceNav} onNavigate={onNavigate} />
        <NavSection label="Billing" items={billingNav} onNavigate={onNavigate} />
        <NavSection label="Account" items={accountNav} onNavigate={onNavigate} />
      </nav>

      <div className="space-y-2 px-3 pb-3">
        <Link
          to="/wallet"
          onClick={onNavigate}
          className="group block rounded-xl border border-white/[0.07] bg-[linear-gradient(150deg,rgba(255,255,255,0.05),rgba(255,255,255,0.015))] p-3 transition hover:border-white/[0.11] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
        >
          <div className="flex items-center justify-between">
            <span className="text-[9.5px] font-semibold uppercase tracking-[0.16em] text-white/30">
              Credit balance
            </span>
            <ArrowUpRight
              className="size-3.5 text-white/25 transition group-hover:text-accent"
              aria-hidden="true"
            />
          </div>
          <p className="mt-2 text-[19px] font-medium tracking-[-0.02em] text-white/90 tabular-nums">
            {formatCredits(wallet.balanceCredits)}
            <span className="ml-1.5 text-[10px] font-normal tracking-normal text-white/30">credits</span>
          </p>
          <p className="mt-0.5 text-[10.5px] text-white/32">
            ≈ {formatDuration(remaining)} live render
          </p>
          <div className="mt-2.5 h-px w-full bg-white/[0.06]" />
          <div className="mt-2 flex items-center justify-between text-[10.5px]">
            <span className="text-white/35">Add credits · min $20</span>
            <span className="font-medium text-accent/80">Top up</span>
          </div>
        </Link>

        <div className="flex items-center justify-between px-1">
          <ConnectionBadge />
          <span className="text-[9px] uppercase tracking-[0.14em] text-white/20">v0.1.0</span>
        </div>
      </div>

      <div className="border-t border-white/[0.06] p-2">
        <UserMenu onNavigate={onNavigate} />
      </div>
    </div>
  );
}

export function Sidebar({
  open,
  onClose,
  overlay = false,
  collapsible = false,
  collapsed = false,
  onToggleCollapse,
}: {
  open: boolean;
  onClose: () => void;
  /** Renders the navigation as an overlay at every breakpoint. */
  overlay?: boolean;
  collapsible?: boolean;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}) {
  const location = useLocation();

  useEffect(() => {
    onClose();
    // Close the mobile drawer whenever the route changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  return (
    <>
      {!overlay ? (
        <aside
          className={cn(
            'fixed inset-y-0 left-0 z-40 hidden border-r border-white/[0.06] bg-ink-900/80 backdrop-blur-2xl transition-[width] duration-200 ease-in-out lg:block',
            collapsible && collapsed ? 'w-[56px]' : 'w-[236px]',
          )}
        >
          <SidebarContent
            collapsed={collapsible && collapsed}
            onToggleCollapse={onToggleCollapse}
          />
        </aside>
      ) : null}

      <AnimatePresence>
        {open ? (
          <div className={cn('fixed inset-0 z-50', !overlay && 'lg:hidden')}>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.16 }}
              className="absolute inset-0 bg-ink-950/70 backdrop-blur-[4px]"
              onClick={onClose}
              aria-hidden="true"
            />
            <motion.aside
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              className="absolute inset-y-0 left-0 w-[272px] border-r border-white/[0.07] bg-ink-900/95 shadow-lift backdrop-blur-2xl"
              aria-label="Navigation"
            >
              <SidebarContent onNavigate={onClose} onToggleCollapse={onToggleCollapse} />
            </motion.aside>
          </div>
        ) : null}
      </AnimatePresence>
    </>
  );
}

export function MobileMenuButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="grid size-8 place-items-center rounded-lg text-white/50 transition hover:bg-white/[0.06] hover:text-white/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 lg:hidden"
      aria-label="Open navigation"
    >
      <Menu className="size-4" />
    </button>
  );
}
