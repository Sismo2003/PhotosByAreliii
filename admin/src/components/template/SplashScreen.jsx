// Local Imports
import { Progress } from "components/ui";

// ----------------------------------------------------------------------

export function SplashScreen() {
  return (
    <div className="fixed grid h-full w-full place-content-center gap-4 bg-paper">
      <span className="wordmark text-ink">Photos by Areliii</span>
      <Progress
        color="primary"
        isIndeterminate
        animationDuration="1s"
        className="h-px"
      />
    </div>
  );
}
