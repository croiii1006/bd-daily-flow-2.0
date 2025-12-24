import { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/layout/ProtectedRoute";
import TabLayout from "@/components/layout/TabLayout";
import Login from "@/pages/Login";
import NotFound from "@/pages/NotFound";
import { loadUserProfileConfig } from "@/lib/feishuUserProfile";

const queryClient = new QueryClient();

const App = () => {
  useEffect(() => {
    void loadUserProfileConfig();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route
                path="/app/*"
                element={
                  <ProtectedRoute>
                    <TabLayout />
                  </ProtectedRoute>
                }
              />
              <Route path="/" element={<Navigate to="/app" replace />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
};

export default App;
