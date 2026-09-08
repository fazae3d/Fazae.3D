import { Breadcrumb } from "@/components/breadcrumb";
import { CustomerForm } from "@/components/admin/customer-form";
import { createCustomerAction } from "../actions";

export default function NewCustomerPage() {
  return (
    <div className="max-w-3xl">
      <Breadcrumb
        items={[
          { label: "Início", href: "/admin" },
          { label: "Clientes", href: "/admin/clientes" },
          { label: "Novo cliente" },
        ]}
      />
      <h1 className="font-display mb-8 mt-4 text-2xl sm:text-3xl">Novo cliente</h1>
      <p className="mb-8 text-sm text-graphite">
        Use isso para registrar um contato (ex.: WhatsApp) antes de qualquer venda. Clientes que já compraram ou
        pedem orçamento aparecem aqui automaticamente.
      </p>
      <CustomerForm action={createCustomerAction} />
    </div>
  );
}
