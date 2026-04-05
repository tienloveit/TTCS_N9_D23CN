import './MovieFilters.css'

function MovieFilters({ activeFilter, onFilterChange }) {
  const filters = [
    { id: 'now-showing', label: 'Đang chiếu' },
    { id: 'coming-soon', label: 'Sắp chiếu' },
    { id: 'imax', label: 'Phim IMAX' },
    { id: 'nationwide', label: 'Toàn quốc' }
  ]

  return (
    <div className="movie-filters">
      {filters.map((filter) => (
        <button
          key={filter.id}
          className={`movie-filters__btn ${activeFilter === filter.id ? 'active' : ''}`}
          onClick={() => onFilterChange(filter.id)}
        >
          {filter.label}
        </button>
      ))}
    </div>
  )
}

export default MovieFilters
