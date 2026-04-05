export const movieData = [
  {
    id: 1,
    title: 'Vùng Đất Luân Hồi',
    genre: 'Hành động, Viễn tưởng',
    rating: 9.4,
    ageRating: 'T13',
    date: '2026-04-01',
    duration: 130,
    format: 'IMAX 2D',
    audio: 'Dolby Atmos',
    showtimes: ['13:00', '16:30', '19:30', '22:00'],
    poster: 'https://images.unsplash.com/photo-1542204165-4d5d0b7a233b?auto=format&fit=crop&w=700&q=80',
    description: 'Một bộ phim hành động viễn tưởng với các pha đấu tranh kịch tính và dàn nhân vật cá tính.',
    reservedSeats: ['A1', 'A2', 'B5', 'C6', 'D2']
  },
  {
    id: 2,
    title: 'Project Y: Gái Ngoan Đổi Đời',
    genre: 'Hồi hộp, Phiêu lưu',
    rating: 7.6,
    ageRating: 'T16',
    date: '2026-04-03',
    duration: 125,
    format: '4DX',
    audio: 'Dolby Atmos',
    showtimes: ['14:00', '17:30', '20:30'],
    poster: 'https://images.unsplash.com/photo-1433838552652-f9a46b332c40?auto=format&fit=crop&w=700&q=80',
    description: 'Câu chuyện hành trình thay đổi của một cô gái khi rơi vào thế giới đầy thử thách.',
    reservedSeats: ['A3', 'B4', 'C1', 'F12']
  },
  {
    id: 3,
    title: 'Hẹn Em Ngày Nhật Thực',
    genre: 'Kịch tính',
    rating: 7.8,
    ageRating: 'T16',
    date: '2026-04-07',
    duration: 118,
    format: 'VIP 2D',
    audio: 'Dolby Atmos',
    showtimes: ['12:30', '15:30', '18:30', '21:30'],
    poster: 'https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?auto=format&fit=crop&w=700&q=80',
    description: 'Một bộ phim tình cảm kịch tính xoay quanh mối quan hệ giữa những con người đan xen sai lầm và cơ hội.',
    reservedSeats: ['D5', 'D6', 'E7']
  },
  {
    id: 4,
    title: 'Kung Fu Quải Chưởng',
    genre: 'Hành động, Hài hước',
    rating: 7.3,
    ageRating: 'T18',
    date: '2026-04-10',
    duration: 110,
    format: '2D',
    audio: 'Dolby Digital',
    showtimes: ['13:30', '17:00', '20:00'],
    poster: 'https://images.unsplash.com/photo-1475483768296-6163e08872a1?auto=format&fit=crop&w=700&q=80',
    description: 'Phim hành động hài hước với những tình huống tréo ngoe và kỹ thuật võ thuật mãn nhãn.',
    reservedSeats: ['G2', 'G3', 'H1']
  }
]

export const getMovieById = (id) => movieData.find((movie) => movie.id === Number(id))
