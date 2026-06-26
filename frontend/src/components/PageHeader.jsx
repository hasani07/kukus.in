export default function PageHeader({ title, subtitle, action, testId }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8" data-testid={testId}>
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#A1A8A3] mb-2">Kukus.In Finance</p>
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-[#2D3A30]">{title}</h1>
        {subtitle && <p className="text-[#6B756D] mt-2 max-w-2xl">{subtitle}</p>}
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}
