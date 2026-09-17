"use client";

import { useRouter } from "next/navigation";
import { Breadcrumb } from "@/components/breadcrumb";
import { ConsigneeForm } from "@/components/admin/consignee-form";
import { createConsigneeAction } from "../actions";

export default function NewConsigneePage() {
  const router = useRouter();

  return (
    <div className="max-w-3xl">
      <Breadcrumb
        items={[
          { label: "Início", href: "/admin" },
          { label: "Consignação", href: "/admin/consignacao" },
          { label: "Novo lojista" },
        ]}
      />
      <h1 className="font-display mb-8 mt-4 text-2xl sm:text-3xl">Novo lojista</h1>
      <p className="mb-8 text-sm text-graphite">
        Cadastre o lojista antes de entregar as primeiras peças — depois disso você poderá registrar entregas, vendas,
        devoluções e visitas na página de detalhes dele.
      </p>
      <ConsigneeForm action={createConsigneeAction} onSuccess={(consignee) => router.push(`/admin/consignacao/${consignee.id}`)} />
    </div>
  );
}
