type SectionHeaderProps = {
  eyebrow: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
};

export default function SectionHeader({ eyebrow, title, description, action }: SectionHeaderProps) {
  return (
    <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-8">
      <div>
        <p className="text-[10px] font-black uppercase tracking-widest text-blue-600 mb-2">{eyebrow}</p>
        <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">{title}</h1>
        {description && <p className="text-sm font-medium text-slate-500 mt-2 max-w-2xl">{description}</p>}
      </div>
      {action}
    </div>
  );
}
