import { Monitor, Apple, Download, ExternalLink, Terminal, ShieldCheck, Video } from 'lucide-react';
import { Modal } from '@/components/ui/Overlay';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';

interface DownloadAppModalProps {
  open: boolean;
  onClose: () => void;
}

const GITHUB_REPO_URL = 'https://github.com/vantlab0/dallr-cam';
const GITHUB_RELEASES_URL = 'https://github.com/vantlab0/dallr-cam/releases';

export function DownloadAppModal({ open, onClose }: DownloadAppModalProps) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Download Dallr Studio Desktop"
      description="Install the standalone desktop application for Windows or macOS with native Virtual Camera output."
      size="lg"
      footer={
        <div className="flex w-full items-center justify-between">
          <a
            href={GITHUB_RELEASES_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-[11px] text-white/40 transition hover:text-white/70"
          >
            <ExternalLink className="size-3" />
            <span>View all releases on GitHub</span>
          </a>
          <Button variant="secondary" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Why Desktop Callout */}
        <div className="flex items-start gap-3 rounded-xl border border-accent/20 bg-accent/[0.04] p-3.5">
          <Video className="mt-0.5 size-4 shrink-0 text-accent" />
          <div className="text-[11.5px] leading-relaxed text-white/70">
            <span className="font-semibold text-white">Full Virtual Camera Support:</span> The desktop application exposes your real-time Decart AI transformations directly to system camera inputs, allowing you to use Dallr Cam inside <strong className="text-white">WhatsApp, Zoom, Google Meet, Microsoft Teams, and OBS Studio</strong>.
          </div>
        </div>

        {/* Platform Download Grid */}
        <div className="grid gap-4 sm:grid-cols-2">
          {/* Windows Card */}
          <div className="flex flex-col justify-between rounded-xl border border-white/[0.08] bg-white/[0.025] p-4 transition hover:border-white/[0.14] hover:bg-white/[0.04]">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="grid size-8 place-items-center rounded-lg bg-blue-500/10 text-blue-400">
                    <Monitor className="size-4" />
                  </div>
                  <div>
                    <h3 className="text-[13px] font-medium text-white/90">Windows</h3>
                    <p className="text-[10px] text-white/40">Windows 10 / 11 (64-bit)</p>
                  </div>
                </div>
                <Badge tone="neutral">.exe / .msi</Badge>
              </div>

              <div className="space-y-1.5 text-[11px] text-white/55">
                <div className="flex items-center gap-1.5">
                  <ShieldCheck className="size-3.5 text-positive" />
                  <span>DirectShow OBS Virtual Camera driver</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <ShieldCheck className="size-3.5 text-positive" />
                  <span>Hardware-accelerated WebRTC rendering</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <ShieldCheck className="size-3.5 text-positive" />
                  <span>NSIS one-click installer</span>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-white/[0.06]">
              <a
                href={`${GITHUB_RELEASES_URL}/latest`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full"
              >
                <Button variant="primary" size="sm" className="w-full" icon={Download}>
                  Download for Windows (.exe)
                </Button>
              </a>
              <p className="mt-2 text-center text-[9.5px] text-white/30">
                Run installer &bull; Driver registers automatically
              </p>
            </div>
          </div>

          {/* macOS Card */}
          <div className="flex flex-col justify-between rounded-xl border border-white/[0.08] bg-white/[0.025] p-4 transition hover:border-white/[0.14] hover:bg-white/[0.04]">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="grid size-8 place-items-center rounded-lg bg-purple-500/10 text-purple-400">
                    <Apple className="size-4" />
                  </div>
                  <div>
                    <h3 className="text-[13px] font-medium text-white/90">macOS</h3>
                    <p className="text-[10px] text-white/40">macOS 10.15+ (Universal)</p>
                  </div>
                </div>
                <Badge tone="neutral">Universal .dmg</Badge>
              </div>

              <div className="space-y-1.5 text-[11px] text-white/55">
                <div className="flex items-center gap-1.5">
                  <ShieldCheck className="size-3.5 text-positive" />
                  <span>Apple Silicon (M1-M4) & Intel Core</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <ShieldCheck className="size-3.5 text-positive" />
                  <span>CoreMediaIO virtual camera extension</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <ShieldCheck className="size-3.5 text-positive" />
                  <span>Native Metal performance</span>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-white/[0.06]">
              <a
                href={`${GITHUB_RELEASES_URL}/latest`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full"
              >
                <Button variant="primary" size="sm" className="w-full" icon={Download}>
                  Download for macOS (.dmg)
                </Button>
              </a>
              <p className="mt-2 text-center text-[9.5px] text-white/30">
                Open .dmg &bull; Drag to Applications folder
              </p>
            </div>
          </div>
        </div>

        {/* Build from Source Section */}
        <div className="rounded-xl border border-white/[0.06] bg-black/[0.25] p-3.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-[11px] font-medium text-white/60">
              <Terminal className="size-3.5 text-white/40" />
              <span>Build standalone binary locally</span>
            </div>
            <a
              href={GITHUB_REPO_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[10px] text-accent/70 hover:text-accent transition"
            >
              GitHub repository &rarr;
            </a>
          </div>
          <div className="mt-2 grid gap-1.5 sm:grid-cols-2 text-[10.5px] font-mono text-white/50">
            <div className="rounded bg-black/40 px-2.5 py-1.5 border border-white/[0.04]">
              <span className="text-white/30"># Windows .exe:</span>
              <br />
              <span className="text-white/80">pnpm build:win</span>
            </div>
            <div className="rounded bg-black/40 px-2.5 py-1.5 border border-white/[0.04]">
              <span className="text-white/30"># macOS .dmg:</span>
              <br />
              <span className="text-white/80">pnpm build:mac</span>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
}
