// Import Dependencies
import PropTypes from "prop-types";

// ----------------------------------------------------------------------

// Page heading from the admin design: caps eyebrow (usually today's date), 44px title,
// actions on the right (they wrap below the title on narrow screens).

export function PageHeader({ eyebrow, title, actions, children }) {
  return (
    <div className="pt-6 lg:pt-8">
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
        <div className="min-w-0">
          {eyebrow && <p className="caps text-ink-muted">{eyebrow}</p>}
          <h1 className="mt-2 text-[2.25rem] leading-[1.1] tracking-[-0.01em] text-ink sm:text-title-l">
            {title}
          </h1>
        </div>
        {actions && <div className="flex flex-wrap items-center gap-4">{actions}</div>}
      </div>
      {children}
    </div>
  );
}

PageHeader.propTypes = {
  eyebrow: PropTypes.node,
  title: PropTypes.node.isRequired,
  actions: PropTypes.node,
  children: PropTypes.node,
};
