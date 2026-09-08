/**
 * Hand-drawn low-poly icons standing in for real product photography.
 * Deliberately faceted/geometric (paper + lime + gray planes) so they read
 * as "white/lime 3D-printed plastic on a dark backdrop" rather than trying
 * to fake a photo — see ProductArt, which wraps these with the studio
 * backdrop when no real photo crop exists for a slug yet.
 */
const PAPER = "#F4F4F0";
const LIME = "#B6FF00";
const MID = "#9a9a94";
const DARK = "#5a5a56";
const DEEP = "#1a1a1a";

type IconProps = { className?: string };

export function SkullIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 120 120" className={className} role="img" aria-label="Caveira geométrica">
      <polygon points="30,40 60,15 90,40 85,55 35,55" fill={PAPER} />
      <polygon points="30,40 35,55 30,75 20,60" fill={DARK} />
      <polygon points="90,40 85,55 90,75 100,60" fill={LIME} />
      <polygon points="35,55 85,55 85,75 35,75" fill={PAPER} />
      <polygon points="38,58 50,58 44,72" fill={DEEP} />
      <polygon points="70,58 82,58 76,72" fill={DEEP} />
      <polygon points="58,66 62,66 60,76" fill={DEEP} />
      <polygon points="35,75 60,75 60,95 42,95" fill={PAPER} />
      <polygon points="60,75 85,75 78,95 60,95" fill={MID} />
    </svg>
  );
}

export function DragonIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 120 120" className={className} role="img" aria-label="Dragão articulado">
      <polygon points="15,100 15,88 32,80 32,92" fill={PAPER} />
      <polygon points="32,92 32,80 47,74 47,86" fill={MID} />
      <polygon points="47,86 47,74 62,62 62,74" fill={PAPER} />
      <polygon points="62,74 62,62 75,50 75,62" fill={MID} />
      <polygon points="75,62 75,50 88,40 88,52" fill={PAPER} />
      <polygon points="28,80 32,68 36,80" fill={LIME} />
      <polygon points="43,74 47,62 51,74" fill={LIME} />
      <polygon points="58,62 62,50 66,62" fill={LIME} />
      <polygon points="71,50 75,38 79,50" fill={LIME} />
      <polygon points="88,52 88,40 100,34 104,42 98,50" fill={PAPER} />
      <polygon points="100,34 108,32 104,42" fill={LIME} />
      <circle cx="94" cy="42" r="1.8" fill={DEEP} />
    </svg>
  );
}

export function VaseIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 120 120" className={className} role="img" aria-label="Vaso em prisma">
      <polygon points="45,30 60,22 75,30 60,36" fill={LIME} />
      <polygon points="45,30 60,36 60,95 40,90" fill={DARK} />
      <polygon points="60,36 75,30 80,90 60,95" fill={PAPER} />
      <polygon points="40,90 60,95 60,101 42,97" fill={MID} />
      <polygon points="60,95 80,90 78,97 60,101" fill={DARK} />
    </svg>
  );
}

export function StandIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 120 120" className={className} role="img" aria-label="Suporte de celular">
      <polygon points="25,90 95,90 95,98 25,98" fill={DARK} />
      <polygon points="40,90 55,35 65,35 50,90" fill={PAPER} />
      <polygon points="45,85 70,85 58,74" fill={MID} />
      <polygon points="48,80 78,75 74,25 44,30" fill={MID} />
      <polygon points="52,76 74,72 71,32 49,36" fill={LIME} opacity="0.9" />
    </svg>
  );
}

export function OrganizerIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 120 120" className={className} role="img" aria-label="Organizador modular">
      <polygon points="20,50 46,50 46,90 20,90" fill={PAPER} />
      <polygon points="20,50 46,50 54,40 28,40" fill={MID} />
      <polygon points="50,50 76,50 76,90 50,90" fill={PAPER} />
      <polygon points="50,50 76,50 84,40 58,40" fill={LIME} />
      <polygon points="80,50 106,50 106,90 80,90" fill={PAPER} />
      <polygon points="80,50 106,50 114,40 88,40" fill={MID} />
      <polygon points="106,50 114,40 114,80 106,90" fill={DARK} />
    </svg>
  );
}

export function HookIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 120 120" className={className} role="img" aria-label="Gancho de parede">
      <polygon points="15,20 105,20 105,35 15,35" fill={MID} />
      <polygon points="32,35 38,35 38,70 32,70" fill={PAPER} />
      <polygon points="32,70 45,70 32,82" fill={LIME} />
      <polygon points="57,35 63,35 63,70 57,70" fill={PAPER} />
      <polygon points="57,70 70,70 57,82" fill={LIME} />
      <polygon points="82,35 88,35 88,70 82,70" fill={PAPER} />
      <polygon points="82,70 95,70 82,82" fill={LIME} />
    </svg>
  );
}

export function MiniatureIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 120 120" className={className} role="img" aria-label="Miniatura de RPG">
      <ellipse cx="60" cy="103" rx="28" ry="7" fill={DARK} />
      <polygon points="30,62 42,56 42,88 30,92" fill={LIME} opacity="0.85" />
      <polygon points="42,58 50,55 50,75 40,75" fill={MID} />
      <polygon points="50,55 70,55 75,90 45,90" fill={PAPER} />
      <polygon points="70,55 78,58 80,75 70,75" fill={MID} />
      <polygon points="78,40 82,38 84,90 80,90" fill={LIME} />
      <polygon points="52,35 68,35 72,48 60,55 48,48" fill={PAPER} />
      <polygon points="54,42 66,42 66,45 54,45" fill={DEEP} />
    </svg>
  );
}

export function LampIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 120 120" className={className} role="img" aria-label="Luminária low poly">
      <polygon points="60,20 40,55 60,55" fill={PAPER} />
      <polygon points="60,20 60,55 80,55" fill={LIME} />
      <polygon points="60,20 80,55 90,50" fill={DARK} />
      <polygon points="57,55 63,55 63,90 57,90" fill={MID} />
      <polygon points="40,90 80,90 90,98 30,98" fill={PAPER} />
    </svg>
  );
}

export function PrinterIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 120 120" className={className} role="img" aria-label="Impressora 3D imprimindo uma peça">
      <polygon points="20,12 26,12 26,105 20,105" fill={MID} opacity="0.7" />
      <polygon points="100,12 106,12 106,105 100,105" fill={MID} opacity="0.7" />
      <polygon points="20,10 106,10 106,18 20,18" fill={PAPER} opacity="0.8" />
      <polygon points="50,25 76,25 76,35 50,35" fill={PAPER} />
      <polygon points="58,35 68,35 63,46" fill={LIME} />
      <polygon points="15,105 111,105 111,112 15,112" fill={MID} />
      <polygon points="50,105 63,70 63,105" fill={DARK} />
      <polygon points="63,70 76,105 63,105" fill={PAPER} />
      <polygon points="58,72 63,60 68,72" fill={LIME} />
    </svg>
  );
}

export const PRODUCT_ICONS: Record<string, (props: IconProps) => React.ReactElement> = {
  "caveira-geo": SkullIcon,
  "dragao-articulado": DragonIcon,
  "vaso-prisma": VaseIcon,
  "suporte-pulse": StandIcon,
  "organizador-modular": OrganizerIcon,
  "gancho-parede-x3": HookIcon,
  "miniatura-rpg-guerreiro": MiniatureIcon,
  "luminaria-lowpoly": LampIcon,
};

export function getProductIcon(slug: string) {
  return PRODUCT_ICONS[slug];
}
