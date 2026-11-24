// Phạm vi chi nhánh của bắp nước và khuyến mãi (branchId null = toàn hệ thống).
// Khớp requireFoodAccess và requirePromotionAccess ở backend: ADMIN sửa mọi mục,
// MANAGER chỉ sửa mục gắn đúng chi nhánh của mình, mục toàn hệ thống chỉ được xem.
// Backend vẫn là nơi quyết định quyền, hàm này chỉ để ẩn nút sẽ bị từ chối.

export function canEditBranchItem(item, user) {
  if (!item || !user) return false;
  if (user.role === 'ADMIN') return true;
  return user.role === 'MANAGER'
    && user.branchId != null
    && item.branchId != null
    && String(item.branchId) === String(user.branchId);
}

export function branchScopeLabel(item, branches = []) {
  if (item?.branchId == null) return 'Toàn hệ thống';
  return item.branchName
    || branches.find((branch) => String(branch.branchId) === String(item.branchId))?.name
    || 'Chi nhánh #' + item.branchId;
}
