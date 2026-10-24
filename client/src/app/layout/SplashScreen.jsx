import { Logo } from "components/Logo";

export function SplashScreen() {
  return (
    <div className="min-h-100vh flex items-center justify-center bg-paper" aria-busy="true">
      <Logo className="h-14 animate-pulse" />
    </div>
  );
}
