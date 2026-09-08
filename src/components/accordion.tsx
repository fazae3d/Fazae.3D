type AccordionItem = {
  title: string;
  content: React.ReactNode;
};

export function Accordion({ items, defaultOpenIndex = 0 }: { items: AccordionItem[]; defaultOpenIndex?: number }) {
  return (
    <div className="divide-y divide-paper/10 border-y border-paper/10">
      {items.map((item, i) => (
        <details key={item.title} open={i === defaultOpenIndex} className="group py-4">
          <summary className="label-caps flex cursor-pointer items-center justify-between text-xs text-paper marker:content-none">
            {item.title}
            <span className="transition-transform group-open:rotate-180">⌄</span>
          </summary>
          <div className="mt-3 text-sm text-graphite">{item.content}</div>
        </details>
      ))}
    </div>
  );
}
