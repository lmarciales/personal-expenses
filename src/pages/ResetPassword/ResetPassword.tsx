import { LanguageToggle } from "@/components/LanguageToggle";
import { Button } from "@/components/ui/button.tsx";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card.tsx";
import { Input } from "@/components/ui/input.tsx";

import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form.tsx";
import { updatePassword } from "@/supabase/auth.ts";
import { supabase } from "@/supabase/client.ts";
import { zodResolver } from "@hookform/resolvers/zod";
import type { TFunction } from "i18next";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { Navigate, useNavigate } from "react-router-dom";
import { z } from "zod";

const createResetPasswordSchema = (t: TFunction) =>
  z
    .object({
      password: z.string().min(8, t("validation:passwordTooShort")),
      confirmPassword: z.string(),
    })
    .refine((data) => data.password === data.confirmPassword, {
      message: t("validation:passwordsMismatch"),
      path: ["confirmPassword"],
    });

export const ResetPassword = () => {
  const { t } = useTranslation(["auth", "validation"]);
  const navigate = useNavigate();
  const [sessionStatus, setSessionStatus] = useState<"loading" | "valid" | "invalid">("loading");

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setSessionStatus("valid");
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setSessionStatus("valid");
      }
    });

    const timeout = setTimeout(() => {
      setSessionStatus((prev) => (prev === "loading" ? "invalid" : prev));
    }, 3000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, []);

  const schema = createResetPasswordSchema(t);
  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: {
      password: "",
      confirmPassword: "",
    },
  });

  const onSubmit = (data: z.infer<typeof schema>) => {
    const { password } = data;
    updatePassword(password)
      .then(() => navigate("/dashboard"))
      .catch((error) => {
        console.error(error);
        form.setError("root", { message: t("auth:resetPassword.error") });
      });
  };

  if (sessionStatus === "loading") {
    return (
      <main className="grid place-items-center h-screen">
        <p>{t("auth:resetPassword.verifying")}</p>
      </main>
    );
  }

  if (sessionStatus === "invalid") {
    return <Navigate to="/" />;
  }

  return (
    <main className="grid place-items-center h-screen relative">
      <div className="absolute top-4 right-4">
        <LanguageToggle />
      </div>
      <Card className="glass-card w-full max-w-sm">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <CardHeader>
              <CardTitle className="text-2xl">{t("auth:resetPassword.title")}</CardTitle>
              <CardDescription>{t("auth:resetPassword.description")}</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4">
              <div className="grid gap-2">
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("auth:resetPassword.newPassword")}</FormLabel>
                      <FormControl>
                        <Input {...field} type="password" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="grid gap-2">
                <FormField
                  control={form.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("auth:resetPassword.confirmPassword")}</FormLabel>
                      <FormControl>
                        <Input {...field} type="password" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              {form.formState.errors.root?.message && (
                <span className="text-destructive">{form.formState.errors.root?.message}</span>
              )}
            </CardContent>
            <CardFooter>
              <Button className="w-full" type="submit">
                {t("auth:resetPassword.submit")}
              </Button>
            </CardFooter>
          </form>
        </Form>
      </Card>
    </main>
  );
};
