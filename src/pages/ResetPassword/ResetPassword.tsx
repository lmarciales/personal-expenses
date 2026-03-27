import { Button } from "@/components/ui/button.tsx";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card.tsx";
import { Input } from "@/components/ui/input.tsx";

import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form.tsx";
import { updatePassword } from "@/supabase/auth.ts";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { z } from "zod";

const ResetPasswordSchema = z
  .object({
    password: z.string().min(8, "Contraseña es demasiado corta"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Las contraseñas no coinciden",
    path: ["confirmPassword"],
  });

export const ResetPassword = () => {
  const navigate = useNavigate();
  const form = useForm<z.infer<typeof ResetPasswordSchema>>({
    resolver: zodResolver(ResetPasswordSchema),
    defaultValues: {
      password: "",
      confirmPassword: "",
    },
  });

  const onSubmit = (data: z.infer<typeof ResetPasswordSchema>) => {
    const { password } = data;
    updatePassword(password)
      .then(() => navigate("/dashboard"))
      .catch((error) => {
        console.log(error);
        form.setError("root", { message: "No se pudo restablecer la contraseña" });
      });
  };

  return (
    <main className="grid place-items-center h-screen">
      <Card className="w-full max-w-sm">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <CardHeader>
              <CardTitle className="text-2xl">Restablecer contraseña</CardTitle>
              <CardDescription>Ingresa tu nueva contraseña.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4">
              <div className="grid gap-2">
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nueva contraseña</FormLabel>
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
                <span className="text-destructive">{form.formState.errors.root?.message}</span>
              )}
            </CardContent>
            <CardFooter>
              <Button className="w-full" type="submit">
                Restablecer contraseña
              </Button>
            </CardFooter>
          </form>
        </Form>
      </Card>
    </main>
  );
};
