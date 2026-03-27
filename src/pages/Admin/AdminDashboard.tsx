import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getDateLocale } from "@/lib/dateFnsLocale";
import { supabase } from "@/supabase/client";
import { format } from "date-fns";
import { CheckCircle, Shield, XCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

export const AdminDashboard = () => {
  const { t } = useTranslation("admin");
  const [users, setUsers] = useState<
    Array<{
      id: string;
      email: string;
      role: string;
      email_confirmed_at: string | null;
      created_at: string;
    }>
  >([]);
  const [error, setError] = useState<string | null>(null);

  const fetchUsers = async () => {
    const { data, error } = await supabase.rpc("get_all_users_with_roles");
    if (error) {
      setError(t("loadError"));
      return;
    }
    if (data) {
      setError(null);
      setUsers(data);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleRoleChange = async (userId: string, newRole: string) => {
    const { error } = await supabase.rpc("update_user_role", { target_user_id: userId, new_role: newRole });
    if (error) {
      setError(t("updateRoleError"));
      return;
    }
    setError(null);
    fetchUsers();
  };

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Shield className="w-6 h-6 text-primary" />
        <h1 className="typo-page-title">{t("title")}</h1>
      </div>
      {error && (
        <div className="mb-4 rounded-lg border border-danger/30 bg-danger/10 text-danger px-4 py-3 text-sm">
          {error}
        </div>
      )}
      <div className="glass-card rounded-2xl overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("columns.email")}</TableHead>
              <TableHead>{t("columns.role")}</TableHead>
              <TableHead>{t("columns.emailConfirmed")}</TableHead>
              <TableHead>{t("columns.registered")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user.id}>
                <TableCell>{user.email}</TableCell>
                <TableCell>
                  <Select value={user.role} onValueChange={(newRole) => handleRoleChange(user.id, newRole)}>
                    <SelectTrigger className="w-28">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="user">{t("roles.user")}</SelectItem>
                      <SelectItem value="admin">{t("roles.admin")}</SelectItem>
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell>
                  {user.email_confirmed_at ? (
                    <CheckCircle className="w-5 h-5 text-success" />
                  ) : (
                    <XCircle className="w-5 h-5 text-danger" />
                  )}
                </TableCell>
                <TableCell>{format(new Date(user.created_at), "dd/MM/yyyy", { locale: getDateLocale() })}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};
