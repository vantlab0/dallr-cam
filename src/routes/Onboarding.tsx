import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  Camera,
  CheckCircle2,
  HardDrive,
  Monitor,
  RefreshCw,
  ShieldCheck,
  Video,
} from 'lucide-react';
import { useApp } from '@/state/useApp';
import { useToast } from '@/state/useToast';
import { isDesktopRuntime } from '@/lib/environment';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import {
  checkObsVirtualCamInstalled,
  installObsVirtualCam,
  type VirtualCamInstallProgress,
} from '@/services/camera/virtualCamera';

export function Onboarding() {
  const navigate = useNavigate();
  const { user } = useApp();
  const { pushToast } = useToast();

  const [scanning, setScanning] = useState(true);
  const [cameraPermission, setCameraPermission] = useState<'pending' | 'granted' | 'denied'>('pending');
  const [detectedCameras, setDetectedCameras] = useState<MediaDeviceInfo[]>([]);
  const [vcamInstalled, setVcamInstalled] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);
  const [installProgress, setInstallProgress] = useState<VirtualCamInstallProgress>({
    percent: 0,
    stage: 'Standby',
    detail: 'Ready to configure virtual camera driver.',
  });

  const isDesktop = isDesktopRuntime();
  const isWindows = typeof navigator !== 'undefined' && /win/i.test(navigator.userAgent || '');
  const isMac = typeof navigator !== 'undefined' && /mac/i.test(navigator.userAgent || '');

  const runSystemScan = async () => {
    setScanning(true);
    try {
      // 1. Check OBS Virtual Camera installation
      const installed = await checkObsVirtualCamInstalled();
      setVcamInstalled(installed);

      // 2. Check camera permission & enumerate devices
      if (typeof navigator !== 'undefined' && navigator.mediaDevices) {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
          setCameraPermission('granted');
          // Release camera tracks immediately after checking
          stream.getTracks().forEach((track) => track.stop());
        } catch {
          setCameraPermission('denied');
        }

        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter((d) => d.kind === 'videoinput');
        setDetectedCameras(videoDevices);
      }
    } catch (error) {
      console.warn('System scan encountered an issue:', error);
    } finally {
      setScanning(false);
    }
  };

  useEffect(() => {
    void runSystemScan();
  }, []);

  const handleInstallVcam = async () => {
    setIsInstalling(true);
    try {
      await installObsVirtualCam((progress) => {
        setInstallProgress(progress);
      });
      setVcamInstalled(true);
      pushToast({
        tone: 'success',
        title: 'Virtual Camera configured',
        description: 'OBS Virtual Camera driver was successfully registered and activated.',
      });
    } catch {
      pushToast({
        tone: 'error',
        title: 'Installation failed',
        description: 'Could not automatically register the camera driver. You can try again or proceed.',
      });
    } finally {
      setIsInstalling(false);
    }
  };

  const handleComplete = () => {
    navigate('/studio', { replace: true });
  };

  return (
    <div className="min-h-screen bg-ink-950 px-4 py-8 text-white sm:px-6 lg:px-8 flex flex-col justify-center items-center">
      <div className="w-full max-w-2xl space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 rounded-full border border-accent/20 bg-accent/[0.05] px-3 py-1 text-[11px] font-medium text-accent">
            <ShieldCheck className="size-3.5" />
            <span>Hardware & System Onboarding</span>
          </div>
          <h1 className="text-2xl font-medium tracking-tight text-white/95 sm:text-3xl">
            Welcome to Dallr Cam{user?.name ? `, ${user.name}` : ''}
          </h1>
          <p className="text-[13px] leading-relaxed text-white/45 max-w-lg mx-auto">
            We are verifying your camera hardware and registering the Virtual Camera driver so other apps (WhatsApp, Zoom, Meet, Teams) can receive your live stream.
          </p>
        </div>

        {/* Readiness Checklist Card */}
        <Card className="p-5 sm:p-6 space-y-5 border-white/[0.08] bg-ink-900/60 backdrop-blur-xl">
          <div className="flex items-center justify-between border-b border-white/[0.06] pb-3.5">
            <div className="flex items-center gap-2 text-[12.5px] font-medium text-white/80">
              <HardDrive className="size-4 text-accent" />
              <span>System Readiness Scan</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              icon={RefreshCw}
              disabled={scanning || isInstalling}
              onClick={() => void runSystemScan()}
            >
              {scanning ? 'Scanning…' : 'Rescan'}
            </Button>
          </div>

          <div className="space-y-4">
            {/* Requirement 1: OS & Environment */}
            <div className="flex items-start justify-between gap-4 rounded-xl border border-white/[0.05] bg-white/[0.02] p-3.5">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 grid size-7 place-items-center rounded-lg bg-blue-500/10 text-blue-400">
                  <Monitor className="size-4" />
                </div>
                <div>
                  <p className="text-[12.5px] font-medium text-white/85">
                    Operating System & Runtime
                  </p>
                  <p className="mt-0.5 text-[11px] text-white/40">
                    {isWindows ? 'Windows 64-bit (DirectShow support)' : isMac ? 'macOS (CoreMediaIO support)' : 'Web Runtime'}
                    {isDesktop ? ' · Standalone Desktop App' : ' · Web Browser'}
                  </p>
                </div>
              </div>
              <Badge tone="positive" dot>
                Compatible
              </Badge>
            </div>

            {/* Requirement 2: Camera Hardware & Permission */}
            <div className="flex items-start justify-between gap-4 rounded-xl border border-white/[0.05] bg-white/[0.02] p-3.5">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 grid size-7 place-items-center rounded-lg bg-emerald-500/10 text-emerald-400">
                  <Camera className="size-4" />
                </div>
                <div>
                  <p className="text-[12.5px] font-medium text-white/85">Physical Webcam</p>
                  <p className="mt-0.5 text-[11px] text-white/40">
                    {cameraPermission === 'granted'
                      ? detectedCameras.length > 0
                        ? `Detected: ${detectedCameras[0].label || 'Default Webcam'} (${detectedCameras.length} device${detectedCameras.length > 1 ? 's' : ''} available)`
                        : 'Webcam accessible'
                      : cameraPermission === 'denied'
                        ? 'Camera permission denied. Please allow camera access in your browser or OS settings.'
                        : 'Checking camera access…'}
                  </p>
                </div>
              </div>
              {cameraPermission === 'granted' ? (
                <Badge tone="positive" dot>
                  Ready
                </Badge>
              ) : cameraPermission === 'denied' ? (
                <Badge tone="negative">Blocked</Badge>
              ) : (
                <Badge tone="neutral">Scanning</Badge>
              )}
            </div>

            {/* Requirement 3: OBS Virtual Camera Driver */}
            <div className="flex flex-col gap-3 rounded-xl border border-white/[0.05] bg-white/[0.02] p-3.5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 grid size-7 place-items-center rounded-lg bg-accent/10 text-accent">
                    <Video className="size-4" />
                  </div>
                  <div>
                    <p className="text-[12.5px] font-medium text-white/85">
                      OBS Virtual Camera Output Device
                    </p>
                    <p className="mt-0.5 text-[11px] text-white/40">
                      Required to stream live Dallr Cam output to external meeting & video apps.
                    </p>
                  </div>
                </div>
                {vcamInstalled ? (
                  <Badge tone="positive" dot>
                    Installed
                  </Badge>
                ) : (
                  <Badge tone="warning">Setup required</Badge>
                )}
              </div>

              {/* Virtual Camera Installation Box */}
              {!vcamInstalled && (
                <div className="mt-2 rounded-lg border border-accent/20 bg-accent/[0.035] p-3 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[11.5px] font-medium text-white/90">
                        Virtual Camera driver is not registered yet
                      </p>
                      <p className="text-[10px] text-white/40">
                        Click below to automatically install and register the DirectShow filter.
                      </p>
                    </div>
                    <Button
                      variant="primary"
                      size="sm"
                      loading={isInstalling}
                      onClick={() => void handleInstallVcam()}
                    >
                      {isInstalling ? 'Installing…' : 'Install Virtual Camera'}
                    </Button>
                  </div>

                  {isInstalling && (
                    <div className="space-y-1.5 pt-1">
                      <div className="flex justify-between text-[10px] text-white/50">
                        <span>{installProgress.stage}</span>
                        <span className="font-mono">{installProgress.percent}%</span>
                      </div>
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/[0.08]">
                        <div
                          className="h-full bg-accent transition-all duration-300 rounded-full"
                          style={{ width: `${installProgress.percent}%` }}
                        />
                      </div>
                      <p className="text-[9.5px] text-white/35 font-mono">{installProgress.detail}</p>
                    </div>
                  )}
                </div>
              )}

              {vcamInstalled && (
                <div className="flex items-center gap-2 text-[11px] text-positive/90 bg-positive/[0.06] border border-positive/15 rounded-lg px-3 py-2">
                  <CheckCircle2 className="size-3.5 text-positive" />
                  <span>
                    OBS Virtual Camera driver active. Any app searching for a webcam can select &quot;OBS Virtual Camera&quot;.
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Action Row */}
          <div className="flex items-center justify-between pt-2 border-t border-white/[0.06]">
            <button
              type="button"
              onClick={handleComplete}
              className="text-[11px] text-white/35 transition hover:text-white/65"
            >
              Skip setup for now
            </button>
            <Button
              variant="primary"
              disabled={isInstalling}
              onClick={handleComplete}
              iconRight={ArrowRight}
            >
              Enter Dallr Cam Studio
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
