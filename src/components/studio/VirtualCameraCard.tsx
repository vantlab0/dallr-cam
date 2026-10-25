import { useState } from 'react';
import { MonitorPlay, Video } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader } from '@/components/ui/Card';
import { InlineNotice } from '@/components/ui/Feedback';
import { Modal } from '@/components/ui/Overlay';

export function VirtualCameraCard() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Card className="p-3.5">
        <CardHeader
          title="Virtual camera"
          icon={<Video className="size-3.5" />}
          action={<Badge tone="neutral">Not installed</Badge>}
        />
        <div className="mt-3 rounded-lg border border-white/[0.06] bg-black/[0.14] p-3">
          <div className="flex items-center gap-2.5">
            <span className="grid size-8 place-items-center rounded-lg border border-white/[0.07] bg-white/[0.03] text-white/30">
              <MonitorPlay className="size-3.5" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <p className="text-[11px] font-medium text-white/62">No output device registered</p>
              <p className="mt-0.5 text-[9.5px] text-white/28">Zoom, Meet and OBS cannot select Dallr.</p>
            </div>
          </div>
        </div>
        <div className="mt-2.5 flex items-center justify-between gap-2">
          <span className="inline-flex items-center gap-1.5 text-[9.5px] text-white/25">
            <span className="size-1 rounded-full bg-white/20" aria-hidden="true" />
            Requires the desktop service
          </span>
          <Button
            size="sm"
            variant="ghost"
            className="h-6 px-1.5 text-[10px]"
            onClick={() => setOpen(true)}
          >
            Setup notes
          </Button>
        </div>
      </Card>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Virtual camera setup"
        description="What is and is not included in this interface preview."
        size="md"
        footer={
          <Button variant="secondary" onClick={() => setOpen(false)}>
            Close
          </Button>
        }
      >
        <div className="space-y-4">
          <InlineNotice tone="warning" title="Not available in this build">
            Dallr does not install a camera driver or system extension in this preview. The status
            above is accurate: no virtual camera device exists.
          </InlineNotice>
          <div className="space-y-3">
            {[
              {
                title: 'Desktop packaging comes first',
                copy: 'The production app will register a signed virtual camera with the operating system during installation.',
              },
              {
                title: 'Then apps can select Dallr',
                copy: 'Once registered, the output device becomes available to conferencing and recording apps as a normal camera.',
              },
              {
                title: 'Nothing is simulated here',
                copy: 'This screen does not pretend to publish a feed. It shows the real state of the current build so you can review the intended workflow.',
              },
            ].map((item, index) => (
              <div key={item.title} className="flex gap-3">
                <span className="grid size-5 shrink-0 place-items-center rounded-md border border-white/[0.08] bg-white/[0.03] text-[9px] font-medium text-white/40">
                  {index + 1}
                </span>
                <div>
                  <p className="text-[12px] font-medium text-white/70">{item.title}</p>
                  <p className="mt-0.5 text-[11.5px] leading-[1.55] text-white/36">{item.copy}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Modal>
    </>
  );
}
