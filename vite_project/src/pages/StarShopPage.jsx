import './PageStyles.css'

const products = [
  { id: 1, title: 'Bắp rang bơ G STAR', price: '55.000₫' },
  { id: 2, title: 'Combo bắp + nước', price: '120.000₫' },
  { id: 3, title: 'Voucher xem phim', price: '90.000₫' }
]

function StarShopPage() {
  return (
    <main className="container page-content">
      <section className="page-hero">
        <h2>Star Shop</h2>
        <p>Mua combo bắp, nước và voucher giá tốt cho thành viên Galaxy.</p>
      </section>

      <div className="shop-grid">
        {products.map((product) => (
          <article key={product.id} className="shop-card">
            <h3>{product.title}</h3>
            <p>{product.price}</p>
            <button className="shop-card__btn">Mua ngay</button>
          </article>
        ))}
      </div>
    </main>
  )
}

export default StarShopPage
