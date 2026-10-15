import { auth } from "@/auth";
import { ADMIN_AUTH_DISABLED } from "@/lib/dev-flags";
import { PRECIFICADOR_HTML } from "../precificador-html";

/**
 * Visual do painel por cima do arquivo original do precificador: ele deixa de ter topo, banner e rodapé
 * próprios (o painel já tem os dele) e passa a usar as mesmas cores, bordas e fundo das telas de gestão,
 * seguindo o tema claro/escuro escolhido no painel (ver script abaixo). Só sobra a ferramenta em si.
 */
const ADMIN_COLORS_CSS = `
:root{--bg:#F4F4F0;--surface:#FFFFFF;--soft:#EBEBE5;--line:#DCDCD4;--band-ink:#111111;color-scheme:light}
:root[data-theme="dark"]{--bg:#111111;--surface:#171717;--soft:#232323;--line:#2A2A2A;--band:#111111;--band-ink:#F4F4F0;color-scheme:dark}
html,body{background:transparent!important}
.hero,.brand,.site-foot{display:none!important}
.band{background:transparent!important;border:0!important}
.nav{padding:0 0 18px!important}
.wrap{max-width:none!important;padding:0!important}
main{padding:0 0 8px!important}
.tabs{background:var(--surface)!important;border:1px solid var(--line)!important}
.tabs button{color:var(--ink)!important}
.tabs button[aria-selected="true"]{background:var(--lime)!important;color:#111!important}
`;

/** Roda dentro do iframe (mesma origem do painel): copia o tema claro/escuro do #admin-shell e acompanha o botão de tema. */
const EMBED_SCRIPT = `
(function(){
  try{
    var shell=parent.document.getElementById('admin-shell');
    if(shell){
      var apply=function(){document.documentElement.setAttribute('data-theme',shell.getAttribute('data-admin-theme')||'dark');};
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
