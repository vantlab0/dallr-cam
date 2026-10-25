import { useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowDownLeft,
  ArrowUpRight,
  Check,
  CircleDollarSign,
  CreditCard,
  Info,
  Plus,
  ShieldCheck,
  Sparkles,
  WalletCards,
} from 'lucide-react';
import { useApp } from '@/state/useApp';
import { useToast } from '@/state/useToast';
import {
  creditsToUsd,
  estimatedSecondsRemaining,
  isValidTopUpUsd,
  MIN_TOPUP_CREDITS,
  MIN_TOPUP_USD,
  ngnEquivalent,
  TOPUP_PRESETS_USD,
  usdToCredits,
} from '@/lib/credits';
import {
  formatCredits,
  formatDate,
  formatDuration,
  formatNgn,
  formatUsd,
  formatUsdWhole,
} from '@/lib/format';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card, CardHeader, Divider, Eyebrow } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { FormField, Input } from '@/components/ui/Form';
import { InlineNotice } from '@/components/ui/Feedback';
import { Modal } from '@/components/ui/Overlay';
import { Progress, Stat } from '@/components/ui/Progress';
import { cn } from '@/lib/utils';

export function Wallet() {
  const { wallet, transactions, settings, topUpWallet } = useApp();
  const { pushToast } = useToast();
  const [amountUsd, setAmountUsd] = useState<number>(MIN_TOPUP_USD);
  const [customInput, setCustomInput] = useState(String(MIN_TOPUP_USD));
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const topUpRef = useRef<HTMLDivElement>(null);

  // Keep invalid or negative input from producing negative credits in the preview.
  const safeAmountUsd = Number.isFinite(amountUsd) && amountUsd > 0 ? amountUsd : 0;
  const credits = usdToCredits(safeAmountUsd);
  const ngn = ngnEquivalent(safeAmountUsd, wallet.ngnPerUsdMock);
  const amountValid = isValidTopUpUsd(amountUsd);
  const estimated = estimatedSecondsRemaining(wallet.balanceCredits, settings.usageRatePerMin);
  const balanceUsd = creditsToUsd(wallet.balanceCredits);

  const recentTransactions = useMemo(
    () =>
      [...transactions]
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 4),
    [transactions],
  );

  const handlePreset = (usd: number) => {
    setAmountUsd(usd);
    setCustomInput(String(usd));
  };

  const handleCustomChange = (value: string) => {
    setCustomInput(value);
    const parsed = Number(value);
    if (value.trim() === '' || !Number.isFinite(parsed)) {
      setAmountUsd(0);
      return;
    }
    setAmountUsd(parsed);
  };

  const handleCheckout = () => {
    if (!amountValid) {
      pushToast({
        tone: 'error',
        title: 'Minimum top-up is $20',
        description: 'Enter an amount of $20 or more to continue.',
      });
      return;
    }
    setCheckoutOpen(true);
  };

  const handleCompleteTopUp = () => {
    if (!amountValid) return;
    topUpWallet(credits, safeAmountUsd, `Credit top-up · ${formatCredits(credits)} credits`);
    setCheckoutOpen(false);
    pushToast({
      tone: 'success',
      title: 'Credits added successfully',
      description: `Added ${formatCredits(credits)} credits ($${safeAmountUsd}) to your wallet balance.`,
    });
  };

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Billing"
        title="Wallet"
        description="Credit balance, top-ups and live studio usage. Render Lucy 2.5 in realtime at 4 credits per second."
        actions={
          <>
            <Link to="/transactions">
              <Button variant="secondary" icon={ArrowUpRight}>
                Transaction history
              </Button>
            </Link>
          </>
        }
      />

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_390px]">
        <div className="min-w-0 space-y-5">
          <Card className="relative overflow-hidden p-5 sm:p-6">
            <div
              className="pointer-events-none absolute -right-[8%] -top-[35%] size-[360px] rounded-full bg-[radial-gradient(circle,rgb(var(--accent)/0.16),transparent_64%)] blur-2xl"
              aria-hidden="true"
            />
            <div
              className="pointer-events-none absolute -bottom-[50%] left-[20%] size-[320px] rounded-full bg-[radial-gradient(circle,rgba(83,160,171,0.08),transparent_66%)] blur-2xl"
              aria-hidden="true"
            />
            <div className="relative">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <Eyebrow>Available credit</Eyebrow>
                  <div className="mt-2 flex items-baseline gap-2.5">
                    <span className="text-[36px] font-medium leading-none tracking-[-0.035em] text-white/95 tabular-nums">
                      {formatCredits(wallet.balanceCredits)}
                    </span>
                    <span className="text-[12px] text-white/32">credits</span>
                  </div>
                  <p className="mt-2 flex items-center gap-1.5 text-[12px] text-white/40">
                    <CircleDollarSign className="size-3.5 text-accent/70" aria-hidden="true" />
                    ≈ <span className="font-medium text-white/70">{formatUsd(balanceUsd)} USD</span>
                  </p>
                </div>
                <span className="grid size-10 place-items-center rounded-xl border border-white/[0.08] bg-white/[0.035] text-accent/80">
                  <WalletCards className="size-4" aria-hidden="true" />
                </span>
              </div>

              <div className="mt-6">
                <div className="mb-1.5 flex items-center justify-between text-[10px]">
                  <span className="text-white/30">Estimated run time</span>
                  <span className="font-medium text-white/55">{formatDuration(estimated)}</span>
                </div>
                <Progress
                  value={wallet.balanceCredits}
                  max={Math.max(wallet.balanceCredits, 25_000)}
                  label="Sample credit balance"
                  tone="accent"
                />
                <p className="mt-1.5 text-[9.5px] text-white/24">
                  Based on a demo rate of {settings.usageRatePerMin} credits per minute. Not a quote.
                </p>
              </div>

              <div className="mt-5 grid grid-cols-2 gap-y-4 border-t border-white/[0.06] pt-4 sm:grid-cols-3">
                <Stat label="Lifetime added" value={formatUsd(wallet.lifetimeTopUpUsd)} detail="Sample top-ups" />
                <Stat
                  label="Credit price"
                  value={formatUsd(wallet.creditUsd)}
                  detail="Per credit · demo"
                  className="sm:pl-4 sm:border-l border-white/[0.06]"
                />
                <Stat
                  label="Minimum top-up"
                  value={formatUsd(MIN_TOPUP_USD)}
                  detail={`${formatCredits(MIN_TOPUP_CREDITS)} credits`}
                  className="col-span-2 border-t border-white/[0.06] pt-3 sm:col-span-1 sm:border-l sm:border-t-0 sm:pl-4 sm:pt-0"
                />
              </div>

              <div className="mt-5 flex flex-wrap items-center gap-2">
                <Button
                  variant="primary"
                  icon={Plus}
                  onClick={() => topUpRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })}
                >
                  Top up credits
                </Button>
                <Link to="/transactions">
                  <Button variant="ghost">View activity</Button>
                </Link>
              </div>
            </div>
          </Card>

          <Card className="p-4 sm:p-5">
            <CardHeader
              title="Recent activity"
              description="The latest entries from your transaction ledger."
              icon={<Sparkles className="size-3.5" />}
              action={
                <Link
                  to="/transactions"
                  className="text-[10.5px] font-medium text-accent/65 transition hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
                >
                  View all
                </Link>
              }
            />
            {recentTransactions.length === 0 ? (
              <div className="py-8 text-center">
                <p className="text-[12px] font-medium text-white/50">No transactions yet</p>
                <p className="mt-1 text-[10.5px] text-white/30">
                  Transactions will appear here when you top up credits or run live sessions.
                </p>
              </div>
            ) : (
              <div className="mt-3 divide-y divide-white/[0.055]">
                {recentTransactions.map((transaction) => {
                  const incoming = transaction.type === 'topup' || transaction.type === 'refund';
                  return (
                    <div key={transaction.id} className="flex items-center gap-3 py-2.5">
                      <span
                        className={cn(
                          'grid size-7 shrink-0 place-items-center rounded-lg border',
                          incoming
                            ? 'border-positive/15 bg-positive/[0.06] text-positive/80'
                            : 'border-white/[0.07] bg-white/[0.03] text-white/35',
                        )}
                      >
                        {incoming ? (
                          <ArrowDownLeft className="size-3.5" aria-hidden="true" />
                        ) : (
                          <ArrowUpRight className="size-3.5" aria-hidden="true" />
                        )}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[11.5px] font-medium text-white/68">
                          {transaction.description}
                        </p>
                        <p className="mt-0.5 text-[9.5px] text-white/27">
                          {formatDate(transaction.createdAt)} · {transaction.reference}
                        </p>
                      </div>
                      <div className="text-right">
                        <p
                          className={cn(
                            'text-[11.5px] font-medium tabular-nums',
                            incoming ? 'text-positive/85' : 'text-white/65',
                          )}
                        >
                          {incoming ? '+' : '−'}
                          {formatCredits(transaction.credits)} cr
                        </p>
                        <p className="mt-0.5 text-[9.5px] tabular-nums text-white/25">
                          {incoming ? '+' : '−'}
                          {formatUsd(transaction.amountUsd)}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </div>

        <div className="min-w-0 space-y-4" ref={topUpRef}>
          <Card className="p-4 sm:p-5">
            <CardHeader
              title="Add credits"
              description="Choose an amount or enter a custom top-up."
              icon={<CreditCard className="size-3.5" />}
              action={<Badge tone="accent">Mock checkout</Badge>}
            />

            <div className="mt-4 grid grid-cols-2 gap-2">
              {TOPUP_PRESETS_USD.map((usd) => {
                const active = amountUsd === usd;
                return (
                  <button
                    key={usd}
                    type="button"
                    aria-pressed={active}
                    onClick={() => handlePreset(usd)}
                    className={cn(
                      'relative rounded-[10px] border p-3 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/45',
                      active
                        ? 'border-accent/35 bg-accent/[0.06]'
                        : 'border-white/[0.07] bg-white/[0.02] hover:border-white/[0.13] hover:bg-white/[0.04]',
                    )}
                  >
                    {active ? (
                      <span className="absolute right-2 top-2 grid size-4 place-items-center rounded-full bg-accent text-accent-contrast">
                        <Check className="size-2.5" strokeWidth={3} aria-hidden="true" />
                      </span>
                    ) : null}
                    <p className="text-[14px] font-medium tabular-nums text-white/85">
                      {formatUsdWhole(usd)}
                    </p>
                    <p className="mt-0.5 text-[10px] text-white/35">
                      {formatCredits(usdToCredits(usd))} credits
                    </p>
                  </button>
                );
              })}
            </div>

            <div className="mt-3">
              <FormField
                label="Custom amount"
                htmlFor="topup-amount"
                error={!amountValid ? 'The minimum top-up is $20.' : undefined}
                hint="USD · minimum $20"
              >
                <div className="relative">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[13px] text-white/30">
                    $
                  </span>
                  <Input
                    id="topup-amount"
                    type="number"
                    inputMode="decimal"
                    min={MIN_TOPUP_USD}
                    step={5}
                    value={customInput}
                    onChange={(event) => handleCustomChange(event.target.value)}
                    invalid={!amountValid}
                    className="pl-7 pr-16 tabular-nums"
                    aria-describedby="topup-amount-hint"
                  />
                  <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-white/25">
                    USD
                  </span>
                </div>
              </FormField>
            </div>

            <div className="mt-3 space-y-2 rounded-[10px] border border-white/[0.06] bg-black/[0.14] p-3">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-white/35">You receive</span>
                <span className="font-medium tabular-nums text-white/80">
                  {formatCredits(credits)} credits
                </span>
              </div>
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-white/35">Checkout total</span>
                <span className="font-medium tabular-nums text-white/80">{formatUsd(safeAmountUsd)}</span>
              </div>
              <Divider className="my-1" />
              <div className="flex items-center justify-between text-[11px]">
                <span className="flex items-center gap-1 text-white/35">
                  NGN equivalent
                  <Info className="size-2.5" aria-hidden="true" />
                </span>
                <span className="font-medium tabular-nums text-accent/80">
                  ≈ {formatNgn(ngn)}
                </span>
              </div>
              <p className="text-[9px] leading-[1.5] text-white/22">
                Conversion calculated at {formatNgn(wallet.ngnPerUsdMock)} NGN per $1 USD.
              </p>
            </div>

            <Button
              variant="primary"
              className="mt-3 w-full"
              icon={Plus}
              onClick={handleCheckout}
            >
              Top up credits
            </Button>
          </Card>

          <Card className="p-4">
            <div className="flex items-start gap-2.5">
              <ShieldCheck className="mt-px size-3.5 shrink-0 text-positive/60" aria-hidden="true" />
              <div>
                <p className="text-[11px] font-medium text-white/60">Secure payment</p>
                <p className="mt-1 text-[10.5px] leading-[1.55] text-white/32">
                  Top-up credits are added immediately to your workspace wallet balance upon confirmation.
                </p>
                <div className="mt-2 flex items-center gap-2">
                  <Badge tone="positive">Instant allocation</Badge>
                  <Badge tone="neutral">Card / Transfer</Badge>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>

      <InlineNotice tone="accent" icon={Info} title="Billing rate & credit pricing">
        Credits are priced at $0.02 each ($20 buys 1,000 credits). Live studio rendering with Decart Lucy 2.5
        deducts 4 credits per second while streaming.
      </InlineNotice>

      <Modal
        open={checkoutOpen}
        onClose={() => setCheckoutOpen(false)}
        title="Confirm Credit Top-Up"
        description="Review your credit bundle and add funds to your wallet."
        size="md"
        footer={
          <>
            <Button variant="secondary" onClick={() => setCheckoutOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" icon={Plus} onClick={handleCompleteTopUp}>
              Confirm & Add {formatCredits(credits)} Credits
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-4">
            <div className="space-y-2.5 text-[12px]">
              <div className="flex items-center justify-between gap-4">
                <span className="text-white/35">Credits to add</span>
                <span className="font-semibold tabular-nums text-accent">{formatCredits(credits)} cr</span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-white/35">Total cost</span>
                <span className="font-medium tabular-nums text-white/80">{formatUsd(safeAmountUsd)}</span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-white/35">NGN equivalent</span>
                <span className="font-medium tabular-nums text-white/60">≈ {formatNgn(ngn)}</span>
              </div>
              <Divider />
              <div className="flex items-center justify-between gap-4">
                <span className="text-white/35">Live Studio rendering</span>
                <span className="text-white/60">≈ {formatDuration(estimatedSecondsRemaining(credits, 240))} at 4 cr/sec</span>
              </div>
            </div>
          </div>
          <p className="text-[10.5px] leading-[1.6] text-white/30">
            Once confirmed, your balance will be updated instantly and a top-up transaction will be logged in your ledger.
          </p>
        </div>
      </Modal>
    </div>
  );
}
