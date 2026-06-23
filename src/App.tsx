import { QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "react-router-dom";
import { AuthProvider } from "@/auth/AuthProvider";
import { queryClient } from "@/lib/queryClient";
import { router } from "@/router";
import { Toaster } from "@/components/ui/Toaster";

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <RouterProvider router={router} future={{ v7_startTransition: true }} />
        <Toaster />
      </AuthProvider>
    </QueryClientProvider>
  );
}
