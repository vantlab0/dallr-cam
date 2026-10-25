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
        description="The page you requested could not be found."
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
    </div>
  );
}
