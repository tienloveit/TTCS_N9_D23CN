import './PageStyles.css'

const articles = [
  { id: 1, title: 'Review phim mới', excerpt: 'Những lý do bạn không nên bỏ lỡ bộ phim này.', link: '#' },
  { id: 2, title: 'Top 5 phim IMAX', excerpt: 'Trải nghiệm điện ảnh hoành tráng trên màn ảnh lớn.', link: '#' },
  { id: 3, title: 'Công nghệ 4DX', excerpt: 'Cảm nhận chuyển động và âm thanh sống động.', link: '#' }
]

function ContentPage() {
  return (
    <main className="container page-content">
      <section className="page-hero">
        <h2>Góc Điện Ảnh</h2>
        <p>Chia sẻ bài viết, review và tin tức điện ảnh nóng hổi.</p>
      </section>

      <div className="content-grid">
        {articles.map((article) => (
          <article key={article.id} className="content-card">
            <h3>{article.title}</h3>
            <p>{article.excerpt}</p>
            <a href={article.link} className="content-card__link">Xem thêm</a>
          </article>
        ))}
      </div>
    </main>
  )
}

export default ContentPage
