"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { updateStoreRulesAction } from "@/app/admin/configuracoes/regras/actions";
import { useToast } from "@/components/admin/toast";
import { formatPrice } from "@/lib/format";
import { DEFAULT_RULES, RULE_FIELDS, RULE_GROUPS, getPath, validateField, type FieldSpec, type StoreRules } from "@/lib/store-rules";

const LABEL = "mb-1.5 block text-xs font-medium text-graphite";

function inputClass(hasError?: boolean) {
  return `w-full rounded-lg border bg-transparent px-3 py-2 text-base outline-none focus:border-petrol sm:text-sm ${hasError ? "border-red-500" : "border-mist"}`;
}

/** O que o campo mostra no formulário (tudo vira texto; listas viram uma linha por item). */
function toText(spec: FieldSpec, value: unknown) {
  if (Array.isArray(value)) return value.join("\n");
  if (value === null || value === undefined) return "";
  return String(value);
}

function defaultLabel(spec: FieldSpec) {
  const value = getPath(DEFAULT_RULES, spec.path);
  if (spec.kind === "money" && typeof value === "number") return formatPrice(value);
  if (Array.isArray(value)) return value.join(", ");
  const text = toText(spec, value);
  if (!text) return "vazio";
  const withUnit = spec.unit ? `${text} ${spec.unit}` : text;
  return withUnit.length > 70 ? `${withUnit.slice(0, 70)}…` : withUnit;
}

export function StoreRulesForm({ initial }: { initial: StoreRules }) {
  const { toast } = useToast();
  const startValues = useMemo(() => Object.fromEntries(RULE_FIELDS.map((spec) => [spec.path, toText(spec, getPath(initial, spec.path))])), [initial]);
  const [values, setValues] = useState<Record<string, string>>(startValues);
  const [saved, setSaved] = useState<Record<string, string>>(startValues);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const dirty = RULE_FIELDS.some((spec) => values[spec.path] !== saved[spec.path]);

  const setValue = (path: string, value: string) => {
    setValues((prev) => ({ ...prev, [path]: value }));
    setErrors((prev) => {
      if (!prev[path]) return prev;
      const next = { ...prev };
      delete next[path];
      return next;
    });
  };

  const restoreDefaults = (group: string) => {
    setValues((prev) => {
      const next = { ...prev };
      for (const spec of RULE_FIELDS.filter((s) => s.group === group)) next[spec.path] = toText(spec, getPath(DEFAULT_RULES, spec.path));
      return next;
    });
  };

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setServerError(null);

    // Conferência rápida no navegador, campo a campo, para apontar onde está o problema.
    const nextErrors: Record<string, string> = {};
    const payload: Record<string, unknown> = {};
    for (const spec of RULE_FIELDS) {
      const checked = validateField(spec, values[spec.path]);
      if (!checked.ok) nextErrors[spec.path] = checked.error;
      else payload[spec.path] = checked.value;
    }
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      toast("Confira os campos em vermelho", "error");
      return;
    }

    const nested: Record<string, unknown> = {};
    for (const [path, value] of Object.entries(payload)) {
      const keys = path.split(".");
      let cursor = nested;
      for (const key of keys.slice(0, -1)) cursor = (cursor[key] ??= {}) as Record<string, unknown>;
      cursor[keys[keys.length - 1]] = value;
    }

    setSaving(true);
    const result = await updateStoreRulesAction(nested);
    setSaving(false);
    if (!result.success) {
      setServerError(result.error);
      toast(result.error, "error");
      return;
    }
    const fresh = Object.fromEntries(RULE_FIELDS.map((spec) => [spec.path, toText(spec, getPath(result.rules, spec.path))]));
    setValues(fresh);
    setSaved(fresh);
    toast("Regras salvas");
  };

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-6">
      {RULE_GROUPS.map((group) => {
        const fields = RULE_FIELDS.filter((spec) => spec.group === group.key);
        const changedFromDefault = fields.some((spec) => values[spec.path] !== toText(spec, getPath(DEFAULT_RULES, spec.path)));
        return (
          <section key={group.key} className="admin-card rounded-xl border border-mist p-5 sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <h2 className="text-sm font-semibold">{group.title}</h2>
              {changedFromDefault ? (
                <button type="button" onClick={() => restoreDefaults(group.key)} className="text-xs text-petrol hover:underline">
                  Voltar ao padrão
                </button>
              ) : null}
            </div>
            <p className="mb-5 mt-1 text-xs text-graphite">{group.description}</p>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              {fields.map((spec) => {
                const id = `rule-${spec.path}`;
                const error = errors[spec.path];
                const wide = spec.kind === "textarea" || spec.kind === "list" || spec.kind === "url";
                const numeric = spec.kind === "number" || spec.kind === "money" || spec.kind === "percent";
                return (
                  <div key={spec.path} className={wide ? "sm:col-span-2" : ""}>
                    <label className={LABEL} htmlFor={id}>
                      {spec.label}
                      {spec.unit ? <span className="font-normal"> ({spec.unit})</span> : null}
                    </label>
                    {spec.kind === "textarea" || spec.kind === "list" ? (
                      <textarea
                        id={id}
                        rows={spec.kind === "list" ? 3 : 3}
                        value={values[spec.path]}
                        onChange={(e) => setValue(spec.path, e.target.value)}
                        className={inputClass(Boolean(error))}
                      />
                    ) : (
                      <input
                        id={id}
                        type={numeric ? "number" : spec.kind === "email" ? "email" : "text"}
                        inputMode={numeric ? "decimal" : undefined}
                        step={numeric ? (spec.step ?? (spec.integer ? 1 : 0.01)) : undefined}
                        min={numeric ? spec.min : undefined}
                        max={numeric ? spec.max : undefined}
                        value={values[spec.path]}
                        onChange={(e) => setValue(spec.path, e.target.value)}
                        className={inputClass(Boolean(error))}
                      />
                    )}
                    {error ? <p className="mt-1 text-xs text-red-500">{error}</p> : null}
                    {spec.hint ? <p className="mt-1 text-xs text-graphite">{spec.hint}</p> : null}
                    <p className="mt-0.5 text-[11px] text-graphite/70">Padrão: {defaultLabel(spec)}</p>
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}

      <p className="text-xs text-graphite">
        Frete grátis, desconto no Pix, taxa da entrega por motoboy e WhatsApp continuam na aba{" "}
        <Link href="/admin/configuracoes" className="text-petrol hover:underline">
          Loja
        </Link>
        .
      </p>

      {serverError ? <p className="text-sm text-red-500">{serverError}</p> : null}

      <div className="sticky bottom-0 -mx-1 flex items-center gap-4 bg-paper/90 px-1 py-3 backdrop-blur">
        <button
          type="submit"
          disabled={saving || !dirty}
          className="rounded-lg bg-petrol px-6 py-3 text-sm font-semibold text-[#111] transition-opacity hover:opacity-90 disabled:opacity-60"
        >
          {saving ? "Salvando…" : "Salvar regras"}
        </button>
        {dirty ? <span className="text-xs text-graphite">Há alterações não salvas</span> : null}
      </div>
    </form>
  );
}
