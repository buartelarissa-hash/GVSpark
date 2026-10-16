import { requirePagePermission } from "@/server/auth/current-user";
import { userFormOptions } from "@/server/services/users";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { NewUserForm } from "../user-form";
import { createUserAction } from "../actions";

export const metadata = { title: "Novo colaborador" };

export default async function NewUserPage() {
  await requirePagePermission("users.manage");
  const options = await userFormOptions();
  return (
    <>
      <PageHeader
        title="Novo colaborador"
        description="Uma senha temporária será gerada ao salvar. O colaborador deverá trocá-la no primeiro acesso."
      />
      <Card className="max-w-3xl">
        <CardContent className="p-6">
          <NewUserForm action={createUserAction} options={options} submitLabel="Cadastrar colaborador" />
        </CardContent>
      </Card>
    </>
  );
}
