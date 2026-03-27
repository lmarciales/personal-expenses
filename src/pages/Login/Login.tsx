import { LanguageToggle } from "@/components/LanguageToggle";
import { Button } from "@/components/ui/button.tsx";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card.tsx";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs.tsx";
import { resetPassword, signIn, signUp } from "@/supabase/auth.ts";
import { zodResolver } from "@hookform/resolvers/zod";
import type { TFunction } from "i18next";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { z } from "zod";

// ---- Schemas ----

const createLoginSchema = (t: TFunction) =>
  z.object({
    email: z.string().email(t("validation:emailInvalid")).min(5, t("validation:emailTooShort")),
    password: z.string().min(8, t("validation:passwordTooShort")),
  });

const createRegisterSchema = (t: TFunction) =>
  z
    .object({
      email: z.string().email(t("validation:emailInvalid")).min(5, t("validation:emailTooShort")),
      password: z.string().min(8, t("validation:passwordTooShort")),
      confirmPassword: z.string().min(8, t("validation:passwordTooShort")),
    })
    .refine((data) => data.password === data.confirmPassword, {
      message: t("validation:passwordsMismatch"),
      path: ["confirmPassword"],
    });

const createForgotPasswordSchema = (t: TFunction) =>
  z.object({
    email: z.string().email(t("validation:emailInvalid")).min(5, t("validation:emailTooShort")),
  });

// ---- ForgotPasswordForm ----

const ForgotPasswordForm = ({ onBack }: { onBack: () => void }) => {
  const { t } = useTranslation(["auth", "validation"]);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const schema = createForgotPasswordSchema(t);
  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { email: "" },
  });

  const onSubmit = (data: z.infer<typeof schema>) => {
    resetPassword(data.email)
      .then(() => {
        setSuccessMessage(t("auth:forgotPassword.success"));
      })
      .catch((error) => {
        console.error(error);
        form.setError("root", { message: error.message ?? t("common:genericError") });
      });
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <CardContent className="grid gap-4">
          <div className="grid gap-2">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("auth:login.email")}</FormLabel>
                  <FormControl>
                    <Input {...field} type="email" placeholder="m@example.com" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          {form.formState.errors.root?.message && (
            <span className="text-destructive">{form.formState.errors.root.message}</span>
          )}
          {successMessage && <span className="text-sm text-success">{successMessage}</span>}
        </CardContent>
        <CardFooter className="flex flex-col gap-2">
          <Button className="w-full" type="submit">
            {t("auth:forgotPassword.submit")}
          </Button>
          <Button type="button" variant="link" className="w-full" onClick={onBack}>
            {t("auth:forgotPassword.back")}
          </Button>
        </CardFooter>
      </form>
    </Form>
  );
};

// ---- LoginTab ----

const LoginTab = () => {
  const { t } = useTranslation(["auth", "validation"]);
  const navigate = useNavigate();
  const [forgotMode, setForgotMode] = useState(false);

  const schema = createLoginSchema(t);
  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = (data: z.infer<typeof schema>) => {
    signIn(data.email, data.password)
      .then(() => navigate("/dashboard"))
      .catch((error) => {
        console.error(error);
        form.setError("root", { message: t("auth:login.invalidCredentials") });
      });
  };

  if (forgotMode) {
    return <ForgotPasswordForm onBack={() => setForgotMode(false)} />;
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <CardContent className="grid gap-4">
          <div className="grid gap-2">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("auth:login.email")}</FormLabel>
                  <FormControl>
                    <Input {...field} type="email" placeholder="m@example.com" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <div className="grid gap-2">
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("auth:login.password")}</FormLabel>
                  <FormControl>
                    <Input {...field} type="password" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          {form.formState.errors.root?.message && (
            <span className="text-destructive">{form.formState.errors.root.message}</span>
          )}
        </CardContent>
        <CardFooter className="flex flex-col gap-2">
          <Button className="w-full" type="submit">
            {t("auth:login.submit")}
          </Button>
          <Button type="button" variant="link" className="w-full" onClick={() => setForgotMode(true)}>
            {t("auth:login.forgotPassword")}
          </Button>
        </CardFooter>
      </form>
    </Form>
  );
};

// ---- RegisterTab ----

const RegisterTab = () => {
  const { t } = useTranslation(["auth", "validation"]);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const schema = createRegisterSchema(t);
  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { email: "", password: "", confirmPassword: "" },
  });

  const onSubmit = (data: z.infer<typeof schema>) => {
    signUp(data.email, data.password)
      .then(() => {
        setSuccessMessage(t("auth:register.success"));
      })
      .catch((error) => {
        console.error(error);
        form.setError("root", { message: error.message ?? t("common:genericError") });
      });
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <CardContent className="grid gap-4">
          <div className="grid gap-2">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("auth:login.email")}</FormLabel>
                  <FormControl>
                    <Input {...field} type="email" placeholder="m@example.com" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <div className="grid gap-2">
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("auth:login.password")}</FormLabel>
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
                  <FormLabel>{t("auth:register.confirmPassword")}</FormLabel>
                  <FormControl>
                    <Input {...field} type="password" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          {form.formState.errors.root?.message && (
            <span className="text-destructive">{form.formState.errors.root.message}</span>
          )}
          {successMessage && <span className="text-sm text-success">{successMessage}</span>}
        </CardContent>
        <CardFooter>
          <Button className="w-full" type="submit">
            {t("auth:register.submit")}
          </Button>
        </CardFooter>
      </form>
    </Form>
  );
};

// ---- Page ----

export const LoginForm = () => {
  const { t } = useTranslation(["auth"]);
  return (
    <main className="grid place-items-center h-screen relative">
      <div className="absolute top-4 right-4">
        <LanguageToggle />
      </div>
      <Card className="glass-card w-full max-w-sm">
        <Tabs defaultValue="login">
          <CardHeader>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">{t("auth:login.title")}</TabsTrigger>
              <TabsTrigger value="register">{t("auth:register.title")}</TabsTrigger>
            </TabsList>
          </CardHeader>
          <TabsContent value="login">
            <LoginTab />
          </TabsContent>
          <TabsContent value="register">
            <RegisterTab />
          </TabsContent>
        </Tabs>
      </Card>
    </main>
  );
};
