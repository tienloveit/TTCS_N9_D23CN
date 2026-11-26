import { useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { resolveDayParam } from './scheduleModel.js';

const LAST_BRANCH_KEY = 'movieptit.lastBranchId';

// Nhớ rạp khách chọn gần nhất; lỗi localStorage (chế độ riêng tư...) thì bỏ qua.
function readLastBranch() {
  try {
    return window.localStorage.getItem(LAST_BRANCH_KEY);
  } catch {
    return null;
  }
}

function saveLastBranch(branchId) {
  try {
    window.localStorage.setItem(LAST_BRANCH_KEY, String(branchId));
  } catch {
    // Không lưu được thì lần sau mở rạp đầu tiên.
  }
}

/**
 * Rạp (?rap=), ngày (?ngay=) và cách xem (?xem=gio) nằm trên URL để tải lại và chia sẻ đúng trạng thái.
 * Giá trị sai hoặc hết hạn được thay bằng mặc định khi đọc, không ghi lại URL.
 */
export default function useScheduleParams(branches, todayKey) {
  const [searchParams, setSearchParams] = useSearchParams();
  const findBranch = (id) => (id == null ? undefined : branches.find((branch) => String(branch.branchId) === String(id)));
  const branch = findBranch(searchParams.get('rap')) || findBranch(readLastBranch()) || branches[0] || null;
  const dayKey = resolveDayParam(searchParams.get('ngay'), todayKey);
  const view = searchParams.get('xem') === 'gio' ? 'time' : 'movie';

  const update = useCallback((changes) => {
    setSearchParams((params) => {
      const next = new URLSearchParams(params);
      for (const [key, value] of Object.entries(changes)) {
        if (value == null || value === '') next.delete(key);
        else next.set(key, String(value));
      }
      return next;
    }, { replace: true });
  }, [setSearchParams]);

  const setBranch = useCallback((id) => {
    saveLastBranch(id);
    update({ rap: id });
  }, [update]);
  const setDay = useCallback((key) => update({ ngay: key }), [update]);
  const setView = useCallback((next) => update({ xem: next === 'time' ? 'gio' : null }), [update]);

  return { branch, dayKey, view, setBranch, setDay, setView };
}
