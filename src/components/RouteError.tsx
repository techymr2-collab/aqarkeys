import { useRouteError, isRouteErrorResponse, Link } from "react-router-dom";
import { Button } from "@/components/ui/Button";
import { Logo } from "@/components/brand/Logo";

export function RouteError() {
  const error = useRouteError();
  const status = isRouteErrorResponse(error) ? error.status : null;

  return (
    <div className="grid min-h-screen place-items-center px-6 text-center">
      <div className="animate-fade-in">
        <div className="mb-6 flex justify-center">
          <Logo />
        </div>
        {status && <p className="text-sm font-semibold text-brand-600">{status}</p>}
        <h1 className="mt-2 text-3xl font-bold text-slate-900">Something went wrong</h1>
        <p className="mx-auto mt-2 max-w-sm text-slate-600">
          We hit an unexpected error rendering this page. Try again, or head back to
          start.
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <Button onClick={() => window.location.reload()}>Try again</Button>
          <Link to="/">
            <Button variant="secondary">Back to start</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
