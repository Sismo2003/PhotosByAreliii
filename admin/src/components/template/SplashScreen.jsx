// Local Imports
import { Progress } from "components/ui";
import { Logo } from "components/shared/Logo";

// ----------------------------------------------------------------------

export function SplashScreen() {
  return (
    <div className="fixed grid h-full w-full place-content-center gap-4 bg-paper">
      <Logo className="h-14" />
      <Progress
        color="primary"
        isIndeterminate
        animationDuration="1s"
        className="h-px"
      />
    </div>
  );
}
