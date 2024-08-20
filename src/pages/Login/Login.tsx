import { Button } from "@/components/ui/button.tsx";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card.tsx";
import { Input } from "@/components/ui/input.tsx";

import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form.tsx";
import { signIn } from "@/supabase/auth.ts";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { z } from "zod";

const LoginFieldsSchema = z.object({
  email: z.string().email("Correo inválido").min(5, "Correo es demasiado corto"),
  password: z.string().min(8, "Contraseña es demasiado corta"),
});

export const LoginForm = () => {
  const navigate = useNavigate();
  const form = useForm<z.infer<typeof LoginFieldsSchema>>({
    resolver: zodResolver(LoginFieldsSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = (data: z.infer<typeof LoginFieldsSchema>) => {
    const { email, password } = data;
    signIn(email, password)
      .then(() => navigate("/dashboard"))
      .catch((error) => {
        console.log(error);
        form.setError("root", { message: "Correo o contraseña incorrectos" });
      });
  };

  return (
    <main className="grid place-items-center h-screen">
      <Card className="w-full max-w-sm">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <CardHeader>
              <CardTitle className="text-2xl">Iniciar sesión</CardTitle>
              <CardDescription>Ingresa tu correo y contraseña para iniciar sesión.</CardDescription>
            </CardHeader>
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
                <span className="text-destructive">{form.formState.errors.root?.message}</span>
              )}
            </CardContent>
            <CardFooter>
              <Button className="w-full" type="submit">
                Iniciar sesión
              </Button>
            </CardFooter>
          </form>
        </Form>
      </Card>
    </main>
  );
};
