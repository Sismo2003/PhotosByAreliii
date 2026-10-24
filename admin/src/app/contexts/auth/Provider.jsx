// Import Dependencies
import { useEffect, useReducer } from "react";
import PropTypes from "prop-types";

// Local Imports
import axios, { setUnauthorizedHandler } from "utils/axios";
import { LOGIN_URL } from "constants/app.constant";
import { AuthContext } from "./context";

// ----------------------------------------------------------------------

// Session lives in the httpOnly cookie set by the backend (Backend/controllers/auth.controller.js).
// Nothing is stored in localStorage. Signing in happens on the shared page /login (client/ app,
// docs/portal-cliente-plan.md §2); this app only reads the session. Only ADMIN users can use it:
// anyone else is sent to /login, which forwards a client to /client/.

const initialState = {
  isAuthenticated: false,
  isInitialized: false,
  sessionEnded: false,
  user: null,
};

const reducerHandlers = {
  INITIALIZE: (state, { payload }) => ({
    ...state,
    isAuthenticated: !!payload.user,
    isInitialized: true,
    user: payload.user,
  }),
  LOGOUT: (state) => ({ ...state, isAuthenticated: false, user: null }),
  // The API said 401 while the app was open: back to the sign-in page, with the reason.
  SESSION_EXPIRED: (state) =>
    state.isAuthenticated ? { ...state, isAuthenticated: false, user: null, sessionEnded: true } : state,
};

const reducer = (state, action) =>
  reducerHandlers[action.type]?.(state, action) ?? state;

const isAdmin = (user) => user?.role === "ADMIN";

export function AuthProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  useEffect(() => {
    const init = async () => {
      try {
        const { data } = await axios.get("/auth/me");
        dispatch({
          type: "INITIALIZE",
          payload: { user: isAdmin(data.data) ? data.data : null },
        });
      } catch {
        // 401 = no session. Anything else (backend down) also lands on the sign-in page.
        dispatch({ type: "INITIALIZE", payload: { user: null } });
      }
    };

    init();
  }, []);

  // A 401 from any request ends the session here (see utils/axios.js).
  useEffect(() => {
    setUnauthorizedHandler(() => dispatch({ type: "SESSION_EXPIRED" }));
    return () => setUnauthorizedHandler(null);
  }, []);

  const logout = async () => {
    await axios.post("/auth/logout").catch(() => {});
    dispatch({ type: "LOGOUT" });
    window.location.replace(LOGIN_URL);
  };

  if (!children) {
    return null;
  }

  return (
    <AuthContext
      value={{
        ...state,
        logout,
      }}
    >
      {children}
    </AuthContext>
  );
}

AuthProvider.propTypes = {
  children: PropTypes.node,
};
