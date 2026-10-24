// Import Dependencies
import PropTypes from "prop-types";

// Local Imports
import { defaultTheme } from "configs/theme.config";
import { useIsomorphicEffect, useLocalStorage, useMediaQuery } from "hooks";
import { ThemeContext } from "./context";

// ----------------------------------------------------------------------

const COLOR_SCHEME_QUERY = "(prefers-color-scheme: dark)";

const _html = document?.documentElement;

// "sideblock" is the approved design and the default; "main-layout" is the template's
// icon rail + panel. Chosen in Display (Customizer).
const LAYOUTS = ["sideblock", "main-layout"];

const initialSettings = {
  themeMode: defaultTheme.themeMode,
  themeLayout: defaultTheme.themeLayout,
  cardSkin: defaultTheme.cardSkin,
  notification: { ...defaultTheme.notification },
};

export function ThemeProvider({ children }) {
  const isDarkOS = useMediaQuery(COLOR_SCHEME_QUERY);

  const [settings, setSettings] = useLocalStorage(
    "pba-admin-display",
    initialSettings,
  );

  const isDark =
    (settings.themeMode === "system" && isDarkOS) ||
    settings.themeMode === "dark";

  const update = (patch) => setSettings((prev) => ({ ...prev, ...patch }));

  const themeLayout = LAYOUTS.includes(settings.themeLayout)
    ? settings.themeLayout
    : defaultTheme.themeLayout;

  const setThemeMode = (val) => update({ themeMode: val });
  const setThemeLayout = (val) => LAYOUTS.includes(val) && update({ themeLayout: val });
  const setCardSkin = (val) => update({ cardSkin: val });

  const setNotification = (patch) =>
    setSettings((prev) => ({
      ...prev,
      notification: { ...prev.notification, ...patch },
    }));

  const setNotificationPosition = (val) => setNotification({ position: val });
  const setNotificationExpand = (val) => setNotification({ isExpanded: val });
  const setNotificationMaxCount = (val) =>
    setNotification({ visibleToasts: val });

  const resetTheme = () => setSettings(initialSettings);

  useIsomorphicEffect(() => {
    isDark ? _html.classList.add("dark") : _html.classList.remove("dark");
  }, [isDark]);

  useIsomorphicEffect(() => {
    _html.dataset.cardSkin = settings.cardSkin;
  }, [settings.cardSkin]);

  useIsomorphicEffect(() => {
    if (document) document.body.dataset.layout = themeLayout;
  }, [themeLayout]);

  if (!children) {
    return null;
  }

  return (
    <ThemeContext
      value={{
        ...settings,
        themeLayout,
        layouts: LAYOUTS,
        isDark,
        setThemeMode,
        setThemeLayout,
        setCardSkin,
        setNotificationPosition,
        setNotificationExpand,
        setNotificationMaxCount,
        setSettings,
        resetTheme,
      }}
    >
      {children}
    </ThemeContext>
  );
}

ThemeProvider.propTypes = {
  children: PropTypes.node,
};
