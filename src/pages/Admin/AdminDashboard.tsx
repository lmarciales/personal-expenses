import { supabase } from "@/supabase/client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";
import { CheckCircle, Shield, XCircle } from "lucide-react";
import { useEffect, useState } from "react";

export const AdminDashboard = () => {
  const [users, setUsers] = useState<
    Array<{
      user_id: string;
      email: string;
      role: string;
      email_confirmed_at: string | null;
      created_at: string;
    }>
  >([]);

  const fetchUsers = async () => {
    const { data, error } = await supabase.rpc("get_all_users_with_roles");
    if (!error && data) setUsers(data);
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleRoleChange = async (userId: string, newRole: string) => {
    await supabase.rpc("update_user_role", { target_user_id: userId, new_role: newRole });
    fetchUsers();
  };

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Shield className="w-6 h-6 text-primary" />
        <h1 className="text-2xl font-bold">Panel de administración</h1>
      </div>
      <div className="rounded-xl border shell-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Correo</TableHead>
              <TableHead>Rol</TableHead>
              <TableHead>Correo confirmado</TableHead>
              <TableHead>Registrado</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user.user_id}>
                <TableCell>{user.email}</TableCell>
                <TableCell>
                  <Select value={user.role} onValueChange={(newRole) => handleRoleChange(user.user_id, newRole)}>
                    <SelectTrigger className="w-28">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="user">user</SelectItem>
                      <SelectItem value="admin">admin</SelectItem>
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell>
                  {user.email_confirmed_at ? (
                    <CheckCircle className="w-5 h-5 text-green-500" />
                  ) : (
                    <XCircle className="w-5 h-5 text-red-500" />
                  )}
                </TableCell>
                <TableCell>{format(new Date(user.created_at), "dd/MM/yyyy")}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};
