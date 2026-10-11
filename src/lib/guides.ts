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
];

export function getGuide(slug: string) {
  return GUIDES.find((g) => g.slug === slug);
}
