import { Button } from "@/components/ui/button.tsx";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card.tsx";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs.tsx";
import { resetPassword, signIn, signUp } from "@/supabase/auth.ts";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { z } from "zod";

// ---- Schemas ----

const LoginSchema = z.object({
  email: z.string().email("Correo inválido").min(5, "Correo es demasiado corto"),
  password: z.string().min(8, "Contraseña es demasiado corta"),
});

const RegisterSchema = z
  .object({
    email: z.string().email("Correo inválido").min(5, "Correo es demasiado corto"),
    password: z.string().min(8, "Contraseña es demasiado corta"),
    confirmPassword: z.string().min(8, "Contraseña es demasiado corta"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Las contraseñas no coinciden",
    path: ["confirmPassword"],
  });

const ForgotPasswordSchema = z.object({
  email: z.string().email("Correo inválido").min(5, "Correo es demasiado corto"),
});

// ---- ForgotPasswordForm ----

const ForgotPasswordForm = ({ onBack }: { onBack: () => void }) => {
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const form = useForm<z.infer<typeof ForgotPasswordSchema>>({
    resolver: zodResolver(ForgotPasswordSchema),
    defaultValues: { email: "" },
  });

  const onSubmit = (data: z.infer<typeof ForgotPasswordSchema>) => {
    resetPassword(data.email)
      .then(() => {
        setSuccessMessage("Revisa tu correo para restablecer tu contraseña.");
      })
      .catch((error) => {
        console.log(error);
        form.setError("root", { message: error.message ?? "Ocurrió un error. Inténtalo de nuevo." });
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
                  <FormLabel>Correo</FormLabel>
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
          {successMessage && <span className="text-sm text-green-600">{successMessage}</span>}
        </CardContent>
        <CardFooter className="flex flex-col gap-2">
          <Button className="w-full" type="submit">
            Enviar enlace de recuperación
          </Button>
          <Button type="button" variant="link" className="w-full" onClick={onBack}>
            Volver
          </Button>
        </CardFooter>
      </form>
    </Form>
  );
};

// ---- LoginTab ----

const LoginTab = () => {
  const navigate = useNavigate();
  const [forgotMode, setForgotMode] = useState(false);

  const form = useForm<z.infer<typeof LoginSchema>>({
    resolver: zodResolver(LoginSchema),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = (data: z.infer<typeof LoginSchema>) => {
    signIn(data.email, data.password)
      .then(() => navigate("/dashboard"))
      .catch((error) => {
        console.log(error);
        form.setError("root", { message: "Correo o contraseña incorrectos" });
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
                  <FormLabel>Correo</FormLabel>
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
                  <FormLabel>Contraseña</FormLabel>
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
            Iniciar sesión
          </Button>
          <Button type="button" variant="link" className="w-full" onClick={() => setForgotMode(true)}>
            ¿Olvidaste tu contraseña?
          </Button>
        </CardFooter>
      </form>
    </Form>
  );
};

// ---- RegisterTab ----

const RegisterTab = () => {
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const form = useForm<z.infer<typeof RegisterSchema>>({
    resolver: zodResolver(RegisterSchema),
    defaultValues: { email: "", password: "", confirmPassword: "" },
  });

  const onSubmit = (data: z.infer<typeof RegisterSchema>) => {
    signUp(data.email, data.password)
      .then(() => {
        setSuccessMessage("Cuenta creada. Revisa tu correo para confirmar tu cuenta.");
      })
      .catch((error) => {
        console.log(error);
        form.setError("root", { message: error.message ?? "Ocurrió un error. Inténtalo de nuevo." });
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
                  <FormLabel>Correo</FormLabel>
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
                  <FormLabel>Contraseña</FormLabel>
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
                  <FormLabel>Confirmar contraseña</FormLabel>
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
          {successMessage && <span className="text-sm text-green-600">{successMessage}</span>}
        </CardContent>
        <CardFooter>
          <Button className="w-full" type="submit">
            Registrarse
          </Button>
        </CardFooter>
      </form>
    </Form>
  );
};

// ---- Page ----

export const LoginForm = () => {
  return (
    <main className="grid place-items-center h-screen">
      <Card className="w-full max-w-sm">
        <Tabs defaultValue="login">
          <CardHeader>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">Iniciar sesión</TabsTrigger>
              <TabsTrigger value="register">Registrarse</TabsTrigger>
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
