// Local Imports
import { useThemeContext } from "app/contexts/theme/context";

// ----------------------------------------------------------------------

// Reads the Customizer's "Sections" setting (theme.cardSkin): Hairlines or Shadow.
export function useSectionSkin() {
  const { cardSkin } = useThemeContext();
  return { isShadow: cardSkin === "shadow-sm", isBordered: cardSkin !== "shadow-sm" };
}
