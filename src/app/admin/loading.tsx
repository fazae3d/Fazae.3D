/** Aparece na hora ao trocar de tela, enquanto os dados carregam (em vez de a página ficar parada). */
export default function AdminLoading() {
  return (
    <div aria-busy="true" aria-label="Carregando">
      <div className="admin-skeleton mb-2 h-8 w-56" />
      <div className="admin-skeleton mb-8 h-4 w-80 max-w-full" />
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="admin-skeleton h-24" />
        ))}
      </div>
      <div className="admin-skeleton h-64 w-full" />
    </div>
  );
}
