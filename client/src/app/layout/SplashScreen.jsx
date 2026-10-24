import { APP_NAME } from "constants/app.constant";

export function SplashScreen() {
  return (
    <div className="min-h-100vh flex items-center justify-center bg-paper" aria-busy="true">
      <span className="wordmark animate-pulse text-ink-muted">{APP_NAME}</span>
    </div>
  );
}
