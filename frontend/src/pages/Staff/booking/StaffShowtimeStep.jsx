import { Checkbox, Field, FilterBar, OpsPanel, Segmented, Select, ShowTime, ShowtimeRail, StateBlock } from '../../../components/Ops';
import { TIME_FILTERS } from './staffBookingUtils';

export default function StaffShowtimeStep({
  branchFilter, branchOptions, clearFilters, dateFilter, filteredShowtimes, handleBranchFilterChange,
  handleSelectShowtime, hasActiveFilters, isShowtimeAvailable, quickDates, searchQuery, setDateFilter,
  setSearchQuery, setStatusFilter, setTimeFilter, showBranchFilter, showtimeId, soonShowtimes,
  statusFilter, timeFilter,
}) {
  const next = soonShowtimes[0];
  const canSelect = show => isShowtimeAvailable(show) && show.availableSeats !== 0;
  return (
    <>
      <OpsPanel title="Chọn suất chiếu">
        <div className="o-form">
          <Segmented label="Ngày chiếu" value={dateFilter} onChange={setDateFilter}
            options={quickDates.map(day => ({ value: day.key, label: day.label + ' ' + day.display }))} />
          <FilterBar search={searchQuery} onSearchChange={setSearchQuery} searchLabel="Tìm phim hoặc phòng"
            filtered={hasActiveFilters} onReset={clearFilters} resultLabel={filteredShowtimes.length + ' suất'}>
            {showBranchFilter && <Field label="Chi nhánh">
              <Select value={branchFilter} onChange={handleBranchFilterChange}>
                <option value="ALL">Tất cả chi nhánh</option>
                {branchOptions.map(branch => <option key={branch.id} value={branch.id}>{branch.name}</option>)}
              </Select>
            </Field>}
            <Field label="Khung giờ">
              <Select value={timeFilter} onChange={event => setTimeFilter(event.target.value)}>
                {TIME_FILTERS.map(option => <option key={option.key} value={option.key}>{option.label}</option>)}
              </Select>
            </Field>
            <label className="o-counter-check">
              <Checkbox checked={statusFilter === 'AVAILABLE'}
                onChange={event => setStatusFilter(event.target.checked ? 'AVAILABLE' : 'ALL')} />
              Chỉ suất còn bán
            </label>
          </FilterBar>
        </div>
      </OpsPanel>
      <OpsPanel title="Lịch chiếu" description={next && <>Suất gần nhất còn bán <ShowTime value={next.startTime} /></>}>
        {filteredShowtimes.length ? <ShowtimeRail date={dateFilter} showtimes={filteredShowtimes}
          selectedId={showtimeId} nextId={next?.showtimeId} isDisabled={show => !canSelect(show)}
          onSelect={show => handleSelectShowtime(show, true)} /> :
          <StateBlock title="Không có suất phù hợp" action={{ label: 'Xóa bộ lọc', onClick: clearFilters }} />}
      </OpsPanel>
    </>
  );
}
