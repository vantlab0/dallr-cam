import { Link } from 'react-router-dom';
import { ArrowLeft, Compass, LayoutDashboard } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/Feedback';

export function NotFound() {
  return (
    <div className="mx-auto max-w-2xl py-10">
      <EmptyState
        icon={Compass}
        title="Page not found"
        description="The route you requested is not part of this preview. Use the workspace navigation or return to Live Studio to continue."
        action={
          <div className="flex flex-wrap items-center justify-center gap-2">
            <Link to="/studio">
              <Button variant="primary" icon={LayoutDashboard}>
                Open Live Studio
              </Button>
            </Link>
            <Button variant="secondary" icon={ArrowLeft} onClick={() => window.history.back()}>
              Go back
            </Button>
          </div>
        }
        className="py-16"
      />
      <p className="mt-6 text-center font-mono text-[10px] uppercase tracking-[0.2em] text-white/18">
        404 · Local interface preview
      </p>
    </div>
  );
}
