import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import * as adminAuth from "../api/adminAuth";
import { ApiError } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import { Button } from "../components/Button";
import { Input } from "../components/Input";
import { Card } from "../components/Card";

// Mirrors backend/src/modules/admin/auth/admin-auth.schema.ts
const credentialsSchema = z.object({
  email: z.string().email("Enter a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});
type CredentialsForm = z.infer<typeof credentialsSchema>;

const otpSchema = z.object({
  code: z.string().length(6, "Enter the 6-digit code"),
});
type OtpForm = z.infer<typeof otpSchema>;

const RESEND_COOLDOWN_SECONDS = 30;

export function LoginPage() {
  const navigate = useNavigate();
  const { setAdmin } = useAuth();
  const [step, setStep] = useState<"credentials" | "otp">("credentials");
  const [credentials, setCredentials] = useState<CredentialsForm | null>(null);
  const [cooldown, setCooldown] = useState(0);

  const credentialsForm = useForm<CredentialsForm>({ resolver: zodResolver(credentialsSchema) });
  const otpForm = useForm<OtpForm>({ resolver: zodResolver(otpSchema) });

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => setCooldown((s) => s - 1), 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  async function sendOtp(values: CredentialsForm) {
    try {
      await adminAuth.login(values.email, values.password);
      setCredentials(values);
      setStep("otp");
      setCooldown(RESEND_COOLDOWN_SECONDS);
      otpForm.reset();
    } catch (error) {
      const message = error instanceof ApiError ? error.message : "Something went wrong. Please try again.";
      credentialsForm.setError("root", { message });
    }
  }

  async function handleResend() {
    if (!credentials || cooldown > 0) return;
    try {
      await adminAuth.login(credentials.email, credentials.password);
      setCooldown(RESEND_COOLDOWN_SECONDS);
      toast.success("A new code has been sent");
    } catch {
      toast.error("Couldn't resend the code. Please try again.");
    }
  }

  async function verifyOtp(values: OtpForm) {
    if (!credentials) return;
    try {
      const result = await adminAuth.verifyOtp(credentials.email, values.code);
      setAdmin(result.admin);
      navigate("/", { replace: true });
    } catch (error) {
      const message = error instanceof ApiError ? error.message : "Something went wrong. Please try again.";
      otpForm.setError("code", { message });
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="w-full max-w-sm">
        <h1 className="font-headline-lg text-headline-lg text-primary">Ecommerce Admin</h1>
        <p className="mb-8 mt-1 text-body-md text-on-surface-variant">
          {step === "credentials" ? "Sign in to the management console" : "Enter the verification code we sent you"}
        </p>

        {step === "credentials" ? (
          <form key="credentials" className="flex flex-col gap-4" onSubmit={credentialsForm.handleSubmit(sendOtp)}>
            <Input
              label="Email"
              type="email"
              autoComplete="username"
              error={credentialsForm.formState.errors.email?.message}
              {...credentialsForm.register("email")}
            />
            <Input
              label="Password"
              type="password"
              autoComplete="current-password"
              error={credentialsForm.formState.errors.password?.message}
              {...credentialsForm.register("password")}
            />
            {credentialsForm.formState.errors.root && (
              <p className="text-[12px] text-error">{credentialsForm.formState.errors.root.message}</p>
            )}
            <Button type="submit" className="mt-2 w-full" isLoading={credentialsForm.formState.isSubmitting}>
              Continue
            </Button>
          </form>
        ) : (
          <form key="otp" className="flex flex-col gap-4" onSubmit={otpForm.handleSubmit(verifyOtp)}>
            <Input
              label="Verification code"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              placeholder="000000"
              autoFocus
              error={otpForm.formState.errors.code?.message}
              {...otpForm.register("code")}
            />
            <Button type="submit" className="w-full" isLoading={otpForm.formState.isSubmitting}>
              Verify
            </Button>
            <div className="flex items-center justify-between text-[13px]">
              <button
                type="button"
                className="text-on-surface-variant hover:text-primary"
                onClick={() => setStep("credentials")}
              >
                Back
              </button>
              <button
                type="button"
                className="text-primary disabled:cursor-not-allowed disabled:text-on-surface-variant"
                disabled={cooldown > 0}
                onClick={handleResend}
              >
                {cooldown > 0 ? `Resend code (${cooldown}s)` : "Resend code"}
              </button>
            </div>
          </form>
        )}
      </Card>
    </div>
  );
}
