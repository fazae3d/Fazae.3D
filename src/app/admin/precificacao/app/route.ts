import { auth } from "@/auth";
import { ADMIN_AUTH_DISABLED } from "@/lib/dev-flags";
import { PRECIFICADOR_HTML } from "../precificador-html";

/**
 * Cores do painel por cima da paleta original do arquivo: o precificador usa os
 * mesmos tons da marca, mas decide claro/escuro sozinho (prefers-color-scheme).
 * Aqui ele passa a seguir o tema do painel (ver script abaixo) e a usar o mesmo
 * fundo e a mesma linha das telas do admin, para a página não "emendar" torta.
 */
const ADMIN_COLORS_CSS = `
:root{--bg:#F4F4F0;--surface:#FFFFFF;--soft:#EBEBE5;--line:#DCDCD4;color-scheme:light}
:root[data-theme="dark"]{--bg:#111111;--surface:#191919;--soft:#232323;--line:#2F2F2F;--band:#111111;color-scheme:dark}
.band,.site-foot{border-color:var(--line)}
`;

/** Roda dentro do iframe (mesma origem do painel): copia o tema claro/escuro do #admin-shell e acompanha o botão de tema. */
const EMBED_SCRIPT = `
(function(){
  try{
    var shell=parent.document.getElementById('admin-shell');
    if(shell){
      var apply=function(){document.documentElement.setAttribute('data-theme',shell.getAttribute('data-admin-theme')||'light');};
      apply();
      new MutationObserver(apply).observe(shell,{attributes:true,attributeFilter:['data-admin-theme']});
    }
  }catch(e){}
})();
`;

export async function GET() {
  if (!ADMIN_AUTH_DISABLED) {
    const session = await auth();
    if (session?.user?.role !== "admin") {
      return new Response("Acesso restrito ao administrador.", { status: 403 });
    }
  }

  const html = PRECIFICADOR_HTML.replace("</style>", `${ADMIN_COLORS_CSS}</style>`).replace(
    "</body>",
    `<script>${EMBED_SCRIPT}</script></body>`,
  );

  return new Response(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "private, no-store",
    },
  });
}
