export type GuideBlock = { heading?: string; paragraphs?: string[]; list?: string[] };

export type Guide = {
  slug: string;
  title: string;
  /** Título curto para o Google (até ~60 caracteres). */
  seoTitle: string;
  description: string;
  published: string;
  blocks: GuideBlock[];
};

/**
 * Guias de conteúdo: respondem perguntas que as pessoas pesquisam no Google ("PLA ou PETG", "presente personalizado")
 * e levam para o catálogo e para o orçamento. Texto escrito para leitura humana primeiro; links internos nos fins de artigo.
 */
export const GUIDES: Guide[] = [
  {
    slug: "pla-ou-petg-qual-material-escolher",
    seoTitle: "PLA ou PETG: qual material escolher na impressão 3D",
    title: "PLA ou PETG: qual material escolher para a sua peça impressa em 3D",
    description:
      "Entenda as diferenças entre PLA e PETG na impressão 3D: acabamento, resistência, calor e uso. Veja qual é melhor para decoração, chaveiros e utilidades.",
    published: "2026-10-11",
    blocks: [
      {
        paragraphs: [
          "Quando você pede uma peça impressa em 3D, uma das primeiras perguntas é: de que material ela vai ser? Os dois mais usados são o PLA e o PETG. Os dois funcionam muito bem, mas cada um brilha em uma situação diferente.",
        ],
      },
      {
        heading: "PLA: acabamento bonito para decoração e presentes",
        paragraphs: [
          "O PLA é o material mais popular da impressão 3D. Ele imprime com muito detalhe, tem um acabamento limpo e existe em uma enorme variedade de cores. Por isso é o preferido para peças decorativas, miniaturas, chaveiros e presentes.",
        ],
        list: [
          "Ótimo nível de detalhe e acabamento.",
          "Muitas cores disponíveis.",
          "Mais rígido: não dobra, mas pode quebrar se sofrer um impacto forte.",
          "Não gosta de calor intenso: evite deixar dentro do carro ao sol ou perto de fontes de calor.",
        ],
      },
      {
        heading: "PETG: mais resistência para o dia a dia",
        paragraphs: [
          "O PETG é um pouco mais resistente a impacto e ao calor do que o PLA, e tem uma leve flexibilidade que ajuda a peça a suportar o uso. É uma boa escolha para utilidades, suportes, organizadores e peças que vão ser manuseadas com frequência.",
        ],
        list: [
          "Mais resistente a impactos e à umidade.",
          "Suporta melhor o calor do que o PLA.",
          "Acabamento um pouco mais brilhante e menos detalhado em peças muito pequenas.",
        ],
      },
      {
        heading: "Então, qual escolher?",
        paragraphs: [
          "Para decorar, presentear e colecionar, o PLA costuma ser a melhor pedida. Para peças de uso intenso, que sofrem esforço ou ficam em lugares mais quentes, o PETG é mais indicado. Na dúvida, é só contar para a gente onde a peça vai ser usada: a gente sugere o material certo no orçamento.",
        ],
      },
    ],
  },
  {
    slug: "presentes-personalizados-em-3d",
    seoTitle: "Presentes personalizados em 3D: ideias para todas as ocasiões",
    title: "Presentes personalizados em 3D: ideias para todas as ocasiões",
    description:
      "Ideias de presentes personalizados feitos com impressão 3D: chaveiros com nome, miniaturas, decoração e peças sob medida. Veja como pedir o seu.",
    published: "2026-10-11",
    blocks: [
      {
        paragraphs: [
          "Um bom presente é aquele que mostra que você pensou na pessoa. A impressão 3D permite fazer exatamente isso: criar uma peça única, com o nome, a cor e o tema que combinam com quem vai receber.",
        ],
      },
      {
        heading: "Ideias que funcionam bem",
        list: [
          "Chaveiros personalizados com nome, inicial ou um símbolo especial.",
          "Miniaturas e itens geek de personagens, jogos e hobbies favoritos.",
          "Peças de decoração para a mesa, a estante ou o quarto, nas cores da casa.",
          "Organizadores e suportes sob medida para a mesa de trabalho ou o setup.",
          "Lembrancinhas para aniversários, casamentos, formaturas e eventos de empresa.",
        ],
      },
      {
        heading: "Como pedir a sua peça",
        paragraphs: [
          "É simples: você conta a ideia, o tamanho aproximado, a cor e a quantidade, e a gente monta o orçamento. Se tiver uma referência, melhor ainda. Depois que você aprova, a peça é produzida do zero e enviada para você.",
          "Na região de Natal e Parnamirim a entrega pode ser feita por motoboy. Para o resto do Brasil, enviamos pelos Correios e transportadoras.",
        ],
      },
      {
        heading: "Planeje com antecedência",
        paragraphs: [
          "Peças sob encomenda são feitas especialmente para você e precisam de um prazo de produção. Para datas especiais, peça com alguns dias de folga para garantir que tudo chegue a tempo.",
        ],
      },
    ],
  },
  {
    slug: "como-cuidar-de-pecas-impressas-em-3d",
    seoTitle: "Como cuidar de peças impressas em 3D: limpeza e conservação",
    title: "Como cuidar de peças impressas em 3D: limpeza e conservação",
    description:
      "Dicas simples para limpar e conservar peças impressas em 3D: o que fazer, o que evitar e como a peça dura mais tempo.",
    published: "2026-10-11",
    blocks: [
      {
        paragraphs: [
          "Peças impressas em 3D são resistentes para o uso do dia a dia, mas alguns cuidados simples ajudam a mantê-las bonitas por muito mais tempo.",
        ],
      },
      {
        heading: "Limpeza",
        list: [
          "Use um pano macio levemente úmido para tirar a poeira.",
          "Se precisar, use água com um pouquinho de sabão neutro e seque bem.",
          "Evite álcool, acetona e outros solventes, que podem marcar ou ressecar a superfície.",
        ],
      },
      {
        heading: "Calor e sol",
        paragraphs: [
          "Os plásticos mais usados na impressão 3D amolecem com calor intenso. Evite deixar a peça dentro do carro ao sol, perto de fogão, aquecedor ou de superfícies muito quentes. Cores escuras absorvem mais calor.",
        ],
      },
      {
        heading: "Uso e impacto",
        paragraphs: [
          "Peças decorativas e detalhes finos, como pontas e articulações, merecem um pouco mais de cuidado: evite forçar, dobrar ou deixar cair de alturas grandes. Para peças de uso mais intenso, vale escolher um material mais resistente, como o PETG.",
        ],
      },
      {
        heading: "Algo não saiu como esperado?",
        paragraphs: [
          "Se a peça chegou com algum defeito de impressão, fale com a gente. Peças com defeito de fabricação são cobertas e a gente resolve.",
        ],
      },
    ],
  },
  {
    slug: "como-encomendar-peca-3d-personalizada",
    seoTitle: "Como encomendar uma peça 3D personalizada, passo a passo",
    title: "Como encomendar uma peça 3D personalizada: passo a passo para pedir do jeito certo",
    description:
      "Quer uma peça única impressa em 3D? Veja o que informar, como funciona o orçamento, os prazos e como a Fazaê produz peças personalizadas em Natal e Parnamirim.",
    published: "2026-10-18",
    blocks: [
      {
        paragraphs: [
          "Encomendar uma peça personalizada em 3D é mais simples do que parece. Você não precisa saber desenhar nem entender de impressora: basta contar a ideia. Neste guia mostramos o que informar para o orçamento sair certeiro e como é o caminho até a peça chegar em você.",
        ],
      },
      {
        heading: "1. Conte a ideia (e mostre referências)",
        paragraphs: [
          "Descreva o que você imagina com as suas palavras. Fotos, desenhos, prints e links de referência ajudam muito: eles mostram o estilo, o formato e o nível de detalhe que você espera. Se você já tem um arquivo 3D, pode avisar também.",
        ],
      },
      {
        heading: "2. Informe tamanho, uso e quantidade",
        paragraphs: ["Esses dados deixam o orçamento mais preciso e evitam retrabalho:"],
        list: [
          "Tamanho aproximado (altura, largura, profundidade). Para peças que precisam encaixar em algo, medidas exatas fazem toda a diferença.",
          "Onde a peça vai ser usada: decoração, presente, uso diário, área externa ou perto de calor.",
          "Quantidade: pedidos em maior quantidade costumam ter condições melhores por unidade.",
          "Prazo desejado, se houver uma data importante (aniversário, evento, presente).",
        ],
      },
      {
        heading: "3. Escolha material e cor",
        paragraphs: [
          "Para decoração, miniaturas e chaveiros, o PLA entrega ótimo acabamento e muitas cores. Para peças de uso mais intenso, o PETG é mais resistente. Se estiver em dúvida, é só dizer para que a peça serve que a gente sugere o melhor material.",
        ],
      },
      {
        heading: "4. Receba o orçamento e aprove",
        paragraphs: [
          "Com as informações em mãos, enviamos o orçamento com valor, prazo de produção e condições de pagamento. Você pode pedir ajustes (tamanho, cor, quantidade) antes de aprovar. Só começamos a produzir depois da sua aprovação.",
        ],
      },
      {
        heading: "5. Produção e entrega",
        paragraphs: [
          "A peça é produzida em impressoras próprias, em Parnamirim/RN, e revisada antes do envio. Em Natal e Parnamirim a entrega pode ser feita por motoboy; para o resto do Brasil enviamos pelos Correios ou transportadora, com código de rastreio.",
        ],
      },
      {
        heading: "Dicas para um pedido sem surpresas",
        list: [
          "Peças que precisam de encaixe: envie as medidas reais ou uma foto com régua ao lado.",
          "Cores na tela podem variar um pouco da peça real: se a cor é importante, peça uma referência.",
          "Detalhes muito finos (letras pequenas, pontas fininhas) precisam de um tamanho mínimo para ficarem nítidos: a gente avisa se algo precisar de ajuste.",
          "Planeje com antecedência para datas especiais: peças personalizadas levam o tempo da produção.",
        ],
      },
    ],
  },
  {
    slug: "presentes-geek-criativos-impressos-em-3d",
    seoTitle: "Presentes geek e criativos impressos em 3D: ideias",
    title: "Presentes geek e criativos impressos em 3D: ideias para todos os gostos",
    description:
      "Ideias de presente geek e criativo feitos em impressão 3D: chaveiros, miniaturas, decoração e utilidades. Dicas para escolher e como personalizar.",
    published: "2026-10-18",
    blocks: [
      {
        paragraphs: [
          "Um presente impresso em 3D tem algo que poucos têm: é diferente, tem personalidade e pode ser feito sob medida para quem vai receber. Separamos ideias que funcionam para fãs de cultura geek, para quem curte decorar a casa e para quem gosta de coisas práticas.",
        ],
      },
      {
        heading: "Chaveiros: o presente fácil e certeiro",
        paragraphs: [
          "Chaveiros são leves, cabem em qualquer orçamento e agradam muita gente. Dá para escolher temas (personagens, bichos, esportes, símbolos) e, em muitos casos, personalizar com nome ou cor. São ótimos para lembrancinhas, amigo secreto e para presentear colegas.",
        ],
      },
      {
        heading: "Miniaturas e colecionáveis para fãs",
        paragraphs: [
          "Esculturas e miniaturas de cultura pop e geek são presente de peso para quem coleciona ou tem uma estante para exibir. Vale olhar o tamanho e o nível de detalhe e combinar a cor com o ambiente onde a peça vai ficar.",
        ],
      },
      {
        heading: "Decoração com estilo",
        paragraphs: [
          "Vasos geométricos, luminárias, porta-objetos e peças decorativas dão personalidade à casa e ao escritório. Cores neutras combinam com tudo; cores vivas funcionam como ponto de destaque na decoração.",
        ],
      },
      {
        heading: "Utilidades que facilitam o dia a dia",
        paragraphs: [
          "Suportes, organizadores e ganchos são presentes práticos que a pessoa usa todo dia, e lembra de você a cada uso. Para home office e setup gamer, suportes de fone, de celular e organizadores de mesa fazem sucesso.",
        ],
      },
      {
        heading: "Como escolher o presente certo",
        list: [
          "Pense no gosto da pessoa: um tema que ela ama vale mais do que uma peça cara.",
          "Considere onde ela vai usar ou exibir (mesa, estante, chaveiro, parede).",
          "Quer algo único? Peça uma versão personalizada com nome, cor ou tema.",
          "Para datas especiais, peça com antecedência, principalmente se for personalizado.",
        ],
      },
    ],
  },
];

export function getGuide(slug: string) {
  return GUIDES.find((g) => g.slug === slug);
}
