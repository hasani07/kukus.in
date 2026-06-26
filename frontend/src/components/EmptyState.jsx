export default function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="bg-white border border-dashed border-[#E5E2DC] rounded-lg p-12 text-center" data-testid="empty-state">
      {Icon && (
        <div className="mx-auto w-12 h-12 rounded-full bg-[#E9EFEA] flex items-center justify-center mb-4">
          <Icon size={22} className="text-[#4A6750]" />
        </div>
      )}
      <h3 className="text-lg font-semibold text-[#2D3A30] mb-1">{title}</h3>
      {description && <p className="text-sm text-[#6B756D] max-w-md mx-auto mb-4">{description}</p>}
      {action}
    </div>
  );
}
