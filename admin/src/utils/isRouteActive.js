import { matchPath } from "react-router";

/**
 * Checks if the given path matches the current pathname.
 *
 * @param {string} path - The path to check against the current location.
 * @param {string} pathname - The current path of the browser.
 * @returns {boolean} - Returns `true` if the path matches the current pathname, otherwise `false`.
 */
export function isRouteActive(path, pathname) {
    // Check if the given path matches the current pathname using react-router's matchPath
    return path ? !!matchPath({ path, end: false }, pathname) : false;
}

/**
 * Like isRouteActive, but honors a nav item's `end` flag so "/" (Overview) only matches itself.
 *
 * @param {{path: string, end?: boolean}} item - Navigation item.
 * @param {string} pathname - The current path of the browser.
 * @returns {boolean}
 */
export function isNavItemActive(item, pathname) {
    return item?.path ? !!matchPath({ path: item.path, end: !!item.end }, pathname) : false;
}
