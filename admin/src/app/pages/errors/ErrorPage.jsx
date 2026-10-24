// Import Dependencies
import PropTypes from "prop-types";
import { Link } from "react-router";

// Local Imports
import { Page } from "components/shared/Page";
import { Button } from "components/ui";

// ----------------------------------------------------------------------

const COPY = {
  401: { title: "Please sign in", text: "Your session ended. Sign in again to continue." },
  403: { title: "Not available", text: "This part of the studio isn't open to your account." },
  404: { title: "Page not found", text: "This page doesn't exist or was moved." },
  429: { title: "Too many tries", text: "Wait a minute and try again." },
  500: { title: "Something went wrong", text: "Try again in a moment. If it keeps happening, tell Alexis." },
};

export default function ErrorPage({ status = 500 }) {
  const copy = COPY[status] ?? COPY[500];

  return (
    <Page title={copy.title}>
      <main className="min-h-100vh grid w-full place-items-center bg-paper px-4">
        <div className="w-full max-w-md">
          <p className="caps text-ink-muted">Error {status}</p>
          <h1 className="mt-2 text-title-l tracking-[-0.01em] text-ink">{copy.title}</h1>
          <p className="mt-3 text-body text-ink-muted">{copy.text}</p>
          <Button component={Link} to="/" color="primary" className="mt-8">
            Back to overview
          </Button>
        </div>
      </main>
    </Page>
  );
}

ErrorPage.propTypes = {
  status: PropTypes.number,
};
