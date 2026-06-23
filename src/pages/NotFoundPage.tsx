import { Link } from "react-router-dom";
import { Button } from "@/components/ui/Button";

export function NotFoundPage() {
  return (
    <div className="grid min-h-screen place-items-center px-6 text-center">
      <div className="animate-fade-in">
        <p className="text-sm font-semibold text-brand-600">404</p>
        <h1 className="mt-2 text-3xl font-bold text-slate-900">Nothing lives here</h1>
        <p className="mt-2 text-slate-600">
          The page you were after has moved or never existed.
        </p>
        <Link to="/" className="mt-6 inline-block">
          <Button>Back to start</Button>
        </Link>
      </div>
    </div>
  );
}
