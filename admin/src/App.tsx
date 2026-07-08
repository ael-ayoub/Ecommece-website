import { Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./auth/AuthContext";
import { RequireAuth } from "./auth/RequireAuth";
import { AdminLayout } from "./layout/AdminLayout";
import { LoginPage } from "./pages/LoginPage";
import { DashboardPage } from "./pages/DashboardPage";
import { ProductsPage } from "./pages/products/ProductsPage";
import { PlaceholderPage } from "./pages/PlaceholderPage";

export function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<LoginPage />} />

        <Route element={<RequireAuth />}>
          <Route
            path="/"
            element={
              <AdminLayout title="Dashboard overview">
                <DashboardPage />
              </AdminLayout>
            }
          />
          <Route
            path="/products"
            element={
              <AdminLayout title="Products">
                <ProductsPage />
              </AdminLayout>
            }
          />
          <Route
            path="/categories"
            element={
              <AdminLayout title="Categories">
                <PlaceholderPage title="Categories" />
              </AdminLayout>
            }
          />
          <Route
            path="/orders"
            element={
              <AdminLayout title="Orders">
                <PlaceholderPage title="Orders" />
              </AdminLayout>
            }
          />
          <Route
            path="/users"
            element={
              <AdminLayout title="Users">
                <PlaceholderPage title="Users" />
              </AdminLayout>
            }
          />
          <Route
            path="/settings"
            element={
              <AdminLayout title="Settings">
                <PlaceholderPage title="Settings" />
              </AdminLayout>
            }
          />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  );
}
