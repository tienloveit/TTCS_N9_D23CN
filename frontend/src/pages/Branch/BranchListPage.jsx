import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  BuildingIcon,
  CheckIcon,
  ChevronRightIcon,
  MapPinIcon,
  SearchIcon,
  XIcon,
} from '../../components/Common/CinemaIcons';
import { BranchMessage, BranchSchedule, BranchSpotlight } from './BranchSchedule';
import useActiveBranches from './useActiveBranches';
import './BranchPages.css';

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

function branchCity(branch) {
  return (branch.city || 'Khác').trim();
}

function filterBranches(branches, city, search) {
  const query = search.trim().toLowerCase();
  return branches.filter((branch) =>
    (city === 'ALL' || branchCity(branch) === city) &&
    (!query || [branch.name, branch.address, branch.city, branch.branchCode]
      .some((value) => value?.toLowerCase().includes(query)))
  );
}

export default function BranchListPage() {
  const { branches, loading, error, retry } = useActiveBranches();
  const [searchParams, setSearchParams] = useSearchParams();
  const [{ city, search }, setFilters] = useState({ city: 'ALL', search: '' });
  // Rạp đang chọn nằm trên URL (?rap=) để chia sẻ được; không có thì dùng rạp khách chọn lần trước.
  const branchId = searchParams.get('rap') || readLastBranch();

  const cities = [...new Set(branches.map(branchCity))];
  const filteredBranches = filterBranches(branches, city, search);
  const isBranch = (branch) => String(branch.branchId) === String(branchId);
  const selectedBranch = filteredBranches.find(isBranch) || filteredBranches[0];
  const activeBranch = selectedBranch || branches.find(isBranch);

  function selectBranch(id) {
    saveLastBranch(id);
    setSearchParams((params) => {
      const next = new URLSearchParams(params);
      next.set('rap', String(id));
      return next;
    }, { replace: true });
  }

  function updateFilters(nextCity, nextSearch) {
    setFilters({ city: nextCity, search: nextSearch });
  }

  return (
    <div className="page br-page">
      <div className="br-wrap">
        <header className="br-hero">
          <h1>Lịch chiếu theo rạp</h1>
          <p>Chọn rạp và ngày để xem các suất còn vé, rồi bấm vào giờ chiếu để chọn ghế.</p>
        </header>

        {loading ? (
          <BranchMessage title="Đang tải danh sách rạp…" loading />
        ) : error ? (
          <BranchMessage title="Không tải được danh sách rạp" error onRetry={retry} />
        ) : branches.length === 0 ? (
          <BranchMessage icon={<BuildingIcon size={23} />} title="Hiện chưa có rạp nào mở cửa" detail="Hãy quay lại sau." />
        ) : (
          <div className="br-hub">
            <aside className="br-sidebar" aria-labelledby="br-cinema-heading">
              <div className="br-sidebar-head">
                <div className="br-sidebar-title">
                  <BuildingIcon size={19} />
                  <h2 id="br-cinema-heading">Chọn rạp</h2>
                  <span>{filteredBranches.length} rạp</span>
                </div>
                {cities.length > 1 && (
                  <select
                    className="br-city-select"
                    aria-label="Lọc rạp theo khu vực"
                    value={city}
                    onChange={(event) => updateFilters(event.target.value, search)}
                  >
                    <option value="ALL">Tất cả khu vực</option>
                    {cities.map((name) => <option key={name} value={name}>{name}</option>)}
                  </select>
                )}
                <div className="br-search">
                  <SearchIcon size={16} />
                  <input
                    type="text"
                    aria-label="Tìm rạp"
                    placeholder="Tìm tên rạp, địa chỉ…"
                    value={search}
                    onChange={(event) => updateFilters(city, event.target.value)}
                  />
                  {search && (
                    <button type="button" aria-label="Xóa tìm kiếm rạp" onClick={() => updateFilters(city, '')}>
                      <XIcon size={16} />
                    </button>
                  )}
                </div>
              </div>

              {filteredBranches.length === 0 ? (
                <div className="br-sidebar-empty" role="status">
                  <p>Không có rạp nào khớp với bộ lọc.</p>
                  <button type="button" className="br-btn" onClick={() => updateFilters('ALL', '')}>
                    Xem tất cả rạp
                  </button>
                </div>
              ) : (
                <ul className="br-branch-list">
                  {filteredBranches.map((branch) => {
                    const selected = branch.branchId === selectedBranch?.branchId;
                    return (
                      <li key={branch.branchId}>
                        <button
                          type="button"
                          className="br-branch-item"
                          aria-pressed={selected}
                          onClick={() => selectBranch(branch.branchId)}
                        >
                          <span className="br-branch-name">{branch.name}</span>
                          {selected ? <CheckIcon size={17} /> : <ChevronRightIcon size={17} />}
                          {(branch.address || branch.city) && (
                            <span className="br-branch-address">
                              <MapPinIcon size={13} />
                              <span>{[branch.address, branch.city].filter(Boolean).join(', ')}</span>
                            </span>
                          )}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </aside>

            {activeBranch && (
              <div className="br-main">
                <BranchSpotlight branch={activeBranch} />
                {/* Không đặt key theo rạp: đổi rạp vẫn giữ ngày đang xem để so sánh các rạp. */}
                <BranchSchedule
                  branchId={activeBranch.branchId}
                  emptyLink="/movies?status=NOW_SHOWING"
                  emptyLinkLabel="Xem phim đang chiếu"
                />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
