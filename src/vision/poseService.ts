import { Landmark } from '../types';

export interface PoseServiceListener {
  onResults: (landmarks: Landmark[]) => void;
  onStatusChange?: (status: 'loading' | 'ready' | 'error', message?: string) => void;
}

declare global {
  interface Window {
    Pose?: any;
  }
}

export class PoseService {
  private pose: any = null;
  private isProcessing = false;
  private isDestroyed = false;
  private listener: PoseServiceListener | null = null;

  constructor(listener: PoseServiceListener) {
    this.listener = listener;
  }

  public async initialize(): Promise<boolean> {
    if (this.isDestroyed) return false;

    try {
      this.listener?.onStatusChange?.('loading', 'Инициализация нейросети MediaPipe Pose...');

      let PoseClass = window.Pose;

      if (!PoseClass) {
        try {
          // Dynamic import of @mediapipe/pose
          const mp = await import('@mediapipe/pose');
          PoseClass = (mp as any).Pose || (mp as any).default?.Pose || (mp as any).default;
        } catch (e) {
          console.warn('Could not import @mediapipe/pose directly:', e);
        }
      }

      // If still not available, dynamically inject script as fallback
      if (!PoseClass && typeof document !== 'undefined') {
        await new Promise<void>((resolve, reject) => {
          if (window.Pose) {
            PoseClass = window.Pose;
            return resolve();
          }
          const script = document.createElement('script');
          script.src = 'https://cdn.jsdelivr.net/npm/@mediapipe/pose@0.5.1675469404/pose.js';
          script.crossOrigin = 'anonymous';
          script.onload = () => {
            PoseClass = window.Pose;
            resolve();
          };
          script.onerror = () => reject(new Error('Failed to load MediaPipe script from CDN'));
          document.head.appendChild(script);
        });
      }

      if (!PoseClass) {
        throw new Error('MediaPipe Pose class is not available');
      }

      const instance = new PoseClass({
        locateFile: (file: string) => {
          return `https://cdn.jsdelivr.net/npm/@mediapipe/pose@0.5.1675469404/${file}`;
        }
      });

      instance.setOptions({
        modelComplexity: 1,
        smoothLandmarks: true,
        enableSegmentation: false,
        smoothSegmentation: false,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5
      });

      instance.onResults((results: any) => {
        if (this.isDestroyed) return;

        if (results && results.poseLandmarks && results.poseLandmarks.length > 0) {
          const landmarks: Landmark[] = results.poseLandmarks.map((pt: any) => ({
            x: pt.x,
            y: pt.y,
            z: pt.z,
            visibility: pt.visibility !== undefined ? pt.visibility : 1.0
          }));
          this.listener?.onResults(landmarks);
        } else {
          this.listener?.onResults([]);
        }
      });

      await instance.initialize();
      this.pose = instance;

      if (!this.isDestroyed) {
        this.listener?.onStatusChange?.('ready', 'Нейросеть готова к отслеживанию');
      }
      return true;
    } catch (err: any) {
      console.error('Failed to initialize MediaPipe Pose:', err);
      if (!this.isDestroyed) {
        this.listener?.onStatusChange?.('error', 'Ошибка загрузки MediaPipe Pose: ' + (err?.message || 'неизвестная ошибка'));
      }
      return false;
    }
  }

  public async processFrame(videoElement: HTMLVideoElement): Promise<void> {
    if (this.isDestroyed || !this.pose || this.isProcessing) {
      return;
    }

    if (!videoElement || videoElement.readyState < 2 || videoElement.videoWidth === 0) {
      return;
    }

    this.isProcessing = true;
    try {
      await this.pose.send({ image: videoElement });
    } catch (err) {
      console.warn('Error sending frame to MediaPipe:', err);
    } finally {
      this.isProcessing = false;
    }
  }

  public destroy(): void {
    this.isDestroyed = true;
    this.listener = null;
    if (this.pose) {
      try {
        this.pose.close();
      } catch (e) {
        console.warn('Error closing Pose instance:', e);
      }
      this.pose = null;
    }
  }
}
