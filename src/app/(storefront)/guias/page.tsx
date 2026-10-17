import { pageMeta } from "@/lib/seo";
import type { Metadata } from "next";
import Link from "next/link";
import { Breadcrumb } from "@/components/breadcrumb";
import { GUIDES } from "@/lib/guides";

export const metadata: Metadata = pageMeta({
  title: "Guias e dicas de impressão 3D",
  description: "Guias da Fazaê 3D: como escolher o material, ideias de presentes personalizados e como cuidar de peças impressas em 3D.",
  path: "/guias",
});

export default function GuidesIndexPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
      <Breadcrumb items={[{ label: "Início", href: "/" }, { label: "Guias" }]} />
      <h1 className="font-display mb-3 text-3xl sm:text-4xl">Guias e dicas de impressão 3D</h1>
      <p className="mb-10 text-graphite">Respostas simples para quem quer escolher, presentear e cuidar de peças impressas em 3D.</p>

      <ul className="space-y-6">
        {GUIDES.map((guide) => (
          <li key={guide.slug} className="border border-paper/15 p-6 transition-colors hover:border-petrol">
            <h2 className="font-display text-xl">
              <Link href={`/guias/${guide.slug}`} className="hover:text-petrol">
                {guide.title}
              </Link>
            </h2>
            <p className="mt-2 text-sm text-graphite">{guide.description}</p>
            <Link href={`/guias/${guide.slug}`} className="label-caps mt-4 inline-block text-[11px] text-petrol hover:underline">
              Ler guia
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
