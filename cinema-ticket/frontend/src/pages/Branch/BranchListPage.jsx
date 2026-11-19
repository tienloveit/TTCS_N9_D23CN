import { useState } from 'react';
import { Link } from 'react-router-dom';
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
  const [{ city, search, branchId }, setFilters] = useState({ city: 'ALL', search: '', branchId: null });

  const cities = [...new Set(branches.map(branchCity))];
  const filteredBranches = filterBranches(branches, city, search);
  const selectedBranch = filteredBranches.find((branch) => branch.branchId === branchId)
    || filteredBranches[0];
  const activeBranch = selectedBranch || branches.find((branch) => branch.branchId === branchId);

  function updateFilters(nextCity, nextSearch) {
    const matches = filterBranches(branches, nextCity, nextSearch);
    const currentId = activeBranch?.branchId;
    const nextId = matches.find((branch) => branch.branchId === currentId)?.branchId
      ?? matches[0]?.branchId ?? currentId;
    setFilters({ city: nextCity, search: nextSearch, branchId: nextId });
  }

  return (
    <div className="page br-page">
      <div className="br-wrap">
        <header className="br-hero">
          <h1>Rạp chiếu &amp; Lịch chiếu</h1>
          <p>Chọn rạp và ngày chiếu để xem giờ chiếu và đặt vé.</p>
        </header>

        {loading ? (
          <BranchMessage title="Đang tải danh sách rạp…" loading />
        ) : error ? (
          <BranchMessage title="Không tải được danh sách rạp" error onRetry={retry} />
        ) : branches.length === 0 ? (
          <BranchMessage icon={<BuildingIcon size={23} />} title="Chưa có cụm rạp nào hoạt động" />
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
                  <p>Không tìm thấy rạp phù hợp.</p>
                  <button type="button" className="br-btn" onClick={() => updateFilters('ALL', '')}>
                    Đặt lại bộ lọc
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
                          onClick={() => setFilters({ city, search, branchId: branch.branchId })}
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
                <BranchSpotlight branch={activeBranch} showDetails />
                <BranchSchedule branchId={activeBranch.branchId} emptyLink="/movies" emptyLinkLabel="Xem danh sách phim" />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
