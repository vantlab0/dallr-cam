import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowDownLeft,
  ArrowUpRight,
  CircleDollarSign,
  Download,
  Filter,
  Plus,
  ReceiptText,
  RotateCcw,
  Search,
  Wallet,
} from 'lucide-react';
import type { Transaction, TransactionStatus, TransactionType } from '@/types';
import { useApp } from '@/state/useApp';
import { useToast } from '@/state/useToast';
import { downloadTextFile, toCsv } from '@/lib/download';
import { formatCredits, formatDate, formatDateTime, formatUsd } from '@/lib/format';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { Badge, type BadgeTone } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Form';
import { FilterTabs } from '@/components/ui/SegmentedControl';
import {
  EmptyState,
  InlineNotice,
} from '@/components/ui/Feedback';
import { Modal } from '@/components/ui/Overlay';
import { CopyButton } from '@/components/ui/CopyButton';
import { Stat } from '@/components/ui/Progress';
import { cn } from '@/lib/utils';

type TransactionFilter = 'all' | TransactionType;

const statusTone: Record<TransactionStatus, BadgeTone> = {
  completed: 'positive',
  pending: 'warning',
  failed: 'negative',
};

const statusLabel: Record<TransactionStatus, string> = {
  completed: 'Completed',
  pending: 'Pending',
  failed: 'Failed',
};

const typeMeta: Record<
  TransactionType,
  { label: string; icon: typeof Plus; className: string }
> = {
  topup: {
    label: 'Top-up',
    icon: ArrowDownLeft,
    className: 'border-positive/15 bg-positive/[0.06] text-positive/80',
  },
  usage: {
    label: 'Usage',
    icon: ArrowUpRight,
    className: 'border-white/[0.07] bg-white/[0.03] text-white/40',
  },
  refund: {
    label: 'Refund',
    icon: RotateCcw,
    className: 'border-accent/15 bg-accent/[0.06] text-accent/80',
  },
};

export function Transactions() {
  const { transactions, wallet } = useApp();
  const { pushToast } = useToast();
  const state = 'ready' as const;
  const [filter, setFilter] = useState<TransactionFilter>('all');
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<Transaction | null>(null);

  const sorted = useMemo(
    () =>
      [...transactions].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      ),
    [transactions],
  );

  const counts = useMemo(
    () => ({
      all: sorted.length,
      topup: sorted.filter((item) => item.type === 'topup').length,
      usage: sorted.filter((item) => item.type === 'usage').length,
      refund: sorted.filter((item) => item.type === 'refund').length,
    }),
    [sorted],
  );

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return sorted.filter((transaction) => {
      if (filter !== 'all' && transaction.type !== filter) return false;
      if (!normalized) return true;
      return (
        transaction.description.toLowerCase().includes(normalized) ||
        transaction.reference.toLowerCase().includes(normalized) ||
        transaction.method?.toLowerCase().includes(normalized)
      );
    });
  }, [filter, query, sorted]);

  const totals = useMemo(() => {
    const added = sorted
      .filter((item) => item.type === 'topup' && item.status === 'completed')
      .reduce((sum, item) => sum + item.amountUsd, 0);
    const spent = sorted
      .filter((item) => item.type === 'usage' && item.status === 'completed')
      .reduce((sum, item) => sum + item.amountUsd, 0);
    const credits = sorted
      .filter((item) => item.type === 'usage' && item.status === 'completed')
      .reduce((sum, item) => sum + item.credits, 0);
    return { added, spent, credits };
  }, [sorted]);

  const handleExport = () => {
    if (filtered.length === 0) {
      pushToast({ tone: 'info', title: 'Nothing to export in this view' });
      return;
    }
    const rows: Array<Array<string | number>> = [
      ['Date', 'Type', 'Description', 'Credits', 'Amount USD', 'Status', 'Reference', 'Method'],
      ...filtered.map((transaction) => [
        transaction.createdAt,
        transaction.type,
        transaction.description,
        transaction.credits,
        transaction.amountUsd.toFixed(2),
        transaction.status,
        transaction.reference,
        transaction.method ?? '',
      ]),
    ];
    downloadTextFile('dallr-transactions.csv', toCsv(rows), 'text/csv');
    pushToast({
      tone: 'success',
      title: 'CSV exported',
      description: `${filtered.length} transactions downloaded.`,
    });
  };

  const clearFilters = () => {
    setFilter('all');
    setQuery('');
  };

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Billing"
        title="Transactions"
        description="The transaction history and billing ledger for this workspace."
        actions={
          <>
            <Link to="/wallet">
              <Button variant="secondary" icon={Wallet}>
                Add credits
              </Button>
            </Link>
            <Button
              variant="primary"
              icon={Download}
              onClick={handleExport}
              disabled={state !== 'ready' || filtered.length === 0}
              title={filtered.length === 0 ? 'No transactions in this view' : 'Export filtered rows'}
            >
              Export CSV
            </Button>
          </>
        }
      />

      {transactions.length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Card className="p-4">
            <div className="flex items-start justify-between">
              <Stat
                label="Current balance"
                value={`${formatCredits(wallet.balanceCredits)} cr`}
              />
              <span className="grid size-7 place-items-center rounded-lg border border-accent/15 bg-accent/[0.06] text-accent/80">
                <CircleDollarSign className="size-3.5" aria-hidden="true" />
              </span>
            </div>
          </Card>
          <Card className="p-4">
            <Stat label="Total added" value={formatUsd(totals.added)} />
          </Card>
          <Card className="p-4">
            <Stat label="Total spent" value={formatUsd(totals.spent)} />
          </Card>
          <Card className="p-4">
            <Stat label="Refunds" value="$0.00" />
          </Card>
        </div>
      ) : null}

      <Card className="overflow-hidden">
        {transactions.length > 0 && (
          <div className="flex flex-col gap-3 border-b border-white/[0.055] p-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-2">
              <Filter className="size-3.5 text-white/30" aria-hidden="true" />
              <FilterTabs<TransactionFilter>
                label="Filter transactions"
                value={filter}
                onChange={(value) => {
                  setFilter(value);
                  setSelected(null);
                }}
                options={[
                  { value: 'all', label: 'All', count: counts.all },
                  { value: 'topup', label: 'Top-ups', count: counts.topup },
                  { value: 'usage', label: 'Usage', count: counts.usage },
                  { value: 'refund', label: 'Refunds', count: counts.refund },
                ]}
              />
            </div>
            <div className="relative w-full lg:w-[260px]">
              <Search
                className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-white/25"
                aria-hidden="true"
              />
              <Input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search transactions"
                aria-label="Search transactions"
                className="h-8 pl-8 text-[11.5px]"
              />
            </div>
          </div>
        )}

        {filtered.length === 0 ? (
          <div className="p-8">
            <EmptyState
              icon={ReceiptText}
              title={query ? 'No matching transactions' : 'No transactions yet'}
              description={query ? 'Try a different search term.' : 'Transactions will appear here when you top up credits or run live sessions.'}
              action={
                query || filter !== 'all' ? (
                  <Button size="sm" variant="secondary" onClick={clearFilters}>
                    Clear filters
                  </Button>
                ) : (
                  <Link to="/wallet">
                    <Button size="sm" variant="primary">
                      Top up credits
                    </Button>
                  </Link>
                )
              }
            />
          </div>
        ) : (
          <>
            <div className="hidden grid-cols-[minmax(0,1fr)_120px_110px_110px_90px] gap-3 border-b border-white/[0.05] px-4 py-2 text-[9px] font-semibold uppercase tracking-[0.14em] text-white/25 md:grid">
              <span>Description</span>
              <span>Date</span>
              <span className="text-right">Credits</span>
              <span className="text-right">Amount</span>
              <span className="text-right">Status</span>
            </div>
            <ul className="divide-y divide-white/[0.05]">
              {filtered.map((transaction) => {
                const meta = typeMeta[transaction.type];
                const Icon = meta.icon;
                const incoming = transaction.type === 'topup' || transaction.type === 'refund';
                return (
                  <li key={transaction.id}>
                    <button
                      type="button"
                      onClick={() => setSelected(transaction)}
                      className="group grid w-full grid-cols-1 items-center gap-2 px-4 text-left transition hover:bg-white/[0.025] focus-visible:bg-white/[0.03] focus-visible:outline-none md:grid-cols-[minmax(0,1fr)_120px_110px_110px_90px] md:gap-3"
                    >
                      <span className="flex min-w-0 items-center gap-2.5 pt-3 md:py-3">
                        <span
                          className={cn(
                            'grid size-8 shrink-0 place-items-center rounded-lg border',
                            meta.className,
                          )}
                        >
                          <Icon className="size-3.5" aria-hidden="true" />
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate text-[12px] font-medium text-white/72 group-hover:text-white/88">
                            {transaction.description}
                          </span>
                          <span className="mt-0.5 flex items-center gap-1.5 text-[9.5px] text-white/27">
                            <span>{meta.label}</span>
                            <span className="text-white/15">·</span>
                            <span className="truncate font-mono text-[9px]">{transaction.reference}</span>
                          </span>
                        </span>
                      </span>
                      <span className="hidden text-[10.5px] text-white/34 md:block">
                        {formatDate(transaction.createdAt)}
                      </span>
                      <span
                        className={cn(
                          'text-[11px] font-medium tabular-nums md:text-right',
                          incoming ? 'text-positive/80' : 'text-white/60',
                        )}
                      >
                        {incoming ? '+' : '−'}
                        {formatCredits(transaction.credits)}
                      </span>
                      <span className="text-[11px] font-medium tabular-nums text-white/60 md:text-right">
                        {incoming ? '+' : '−'}
                        {formatUsd(transaction.amountUsd)}
                      </span>
                      <span className="flex items-center justify-between gap-2 pb-3 md:justify-end md:pb-0">
                        <span className="text-[9.5px] text-white/27 md:hidden">
                          {formatDate(transaction.createdAt)}
                        </span>
                        <Badge tone={statusTone[transaction.status]}>
                          {statusLabel[transaction.status]}
                        </Badge>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
            <div className="flex items-center justify-between gap-3 border-t border-white/[0.05] px-4 py-2.5">
              <p className="text-[9.5px] text-white/40">
                Showing {filtered.length} of {sorted.length} transactions
              </p>
            </div>
          </>
        )}
      </Card>

      <InlineNotice tone="accent" icon={ReceiptText} title="Transaction Ledger">
        Transactions track wallet credit additions and live studio rendering deductions at 4 credits per second.
      </InlineNotice>

      <Modal
        open={selected !== null}
        onClose={() => setSelected(null)}
        title={selected?.description ?? 'Transaction'}
        description="Transaction details and reference"
        size="md"
        footer={
          <>
            {selected ? <CopyButton value={selected.reference} label="Copy reference" /> : null}
            <Button variant="secondary" onClick={() => setSelected(null)}>
              Close
            </Button>
          </>
        }
      >
        {selected ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3 rounded-xl border border-white/[0.07] bg-white/[0.02] p-4">
              <div>
                <p className="text-[10px] uppercase tracking-[0.14em] text-white/30">Amount</p>
                <p className="mt-1 text-[22px] font-medium tabular-nums text-white/90">
                  {selected.type === 'usage' ? '−' : '+'}
                  {formatUsd(selected.amountUsd)}
                </p>
              </div>
              <Badge tone={statusTone[selected.status]} dot>
                {statusLabel[selected.status]}
              </Badge>
            </div>

            <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-[11.5px]">
              <div>
                <dt className="text-white/30">Credits</dt>
                <dd className="mt-0.5 font-medium tabular-nums text-white/72">
                  {selected.type === 'usage' ? '−' : '+'}
                  {formatCredits(selected.credits)}
                </dd>
              </div>
              <div>
                <dt className="text-white/30">Type</dt>
                <dd className="mt-0.5 font-medium text-white/72">{typeMeta[selected.type].label}</dd>
              </div>
              <div>
                <dt className="text-white/30">Date</dt>
                <dd className="mt-0.5 font-medium text-white/72">{formatDateTime(selected.createdAt)}</dd>
              </div>
              <div>
                <dt className="text-white/30">Method</dt>
                <dd className="mt-0.5 font-medium text-white/72">{selected.method ?? '—'}</dd>
              </div>
              <div className="col-span-2">
                <dt className="text-white/30">Reference</dt>
                <dd className="mt-0.5 flex items-center gap-2 font-mono text-[11px] text-white/60">
                  {selected.reference}
                  <CopyButton value={selected.reference} label="" toastTitle="Reference copied" />
                </dd>
              </div>
            </dl>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
