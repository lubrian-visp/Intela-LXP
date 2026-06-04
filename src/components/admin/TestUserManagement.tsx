import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { UserPlus, Trash2, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export default function TestUserManagement() {
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleCreateTestUsers = async () => {
    setCreating(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { toast.error("Not authenticated"); return; }

      const { data, error } = await supabase.functions.invoke("create-test-users", {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (error) throw error;

      const created = data?.results?.filter((r: any) => r.status === "created").length ?? 0;
      const existing = data?.results?.filter((r: any) => r.status === "already_exists").length ?? 0;
      toast.success(`${created} test users created, ${existing} already existed.`);
    } catch (err: any) {
      toast.error(err.message || "Failed to create test users");
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteTestUsers = async () => {
    setDeleting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { toast.error("Not authenticated"); return; }

      const { data, error } = await supabase.functions.invoke("delete-test-users", {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (error) throw error;

      const deletedCount = data?.deleted_count ?? 0;
      toast.success(`${deletedCount} test user(s) deleted successfully.`);
    } catch (err: any) {
      toast.error(err.message || "Failed to delete test users");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Test User Management</CardTitle>
        <CardDescription>
          Create or remove all @test.com accounts. Only available to Super Admins.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-3">
        <Button onClick={handleCreateTestUsers} disabled={creating} variant="outline" size="sm">
          {creating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <UserPlus className="h-4 w-4 mr-2" />}
          Create Test Users
        </Button>

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" size="sm" disabled={deleting}>
              {deleting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Trash2 className="h-4 w-4 mr-2" />}
              Delete All Test Users
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete all test users?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently remove all accounts with @test.com emails, including their profiles and role assignments. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteTestUsers}>
                Delete All
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
}
