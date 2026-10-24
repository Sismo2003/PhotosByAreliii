// Import Dependencies
import PropTypes from "prop-types";

// ----------------------------------------------------------------------

// Temporary body for screens whose API isn't built yet. Names the design artboard and the
// spec so the next agent knows exactly what goes here. Remove when the screen is built.

export function Placeholder({ design, spec, children }) {
  return (
    <div className="border-t border-line py-10">
      <p className="text-body text-ink-muted">{children}</p>
      {(design || spec) && (
        <p className="mt-2 text-small text-ink-muted">
          {design && <>Design: <code>{design}</code></>}
          {design && spec && " · "}
          {spec && <>Spec: <code>{spec}</code></>}
        </p>
      )}
    </div>
  );
}

Placeholder.propTypes = {
  design: PropTypes.string,
  spec: PropTypes.string,
  children: PropTypes.node,
};
