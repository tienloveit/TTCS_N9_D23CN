import { Link } from 'react-router-dom';

const EmptyState = ({ 
  title = "Chưa có dữ liệu", 
  message = "Hiện tại chưa có thông tin nào để hiển thị.",
  showButton = true,
  buttonText = "Khám phá ngay",
  buttonLink = "/movies"
}) => {
  return (
    <div className="empty-state-container" style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '60px 20px',
      textAlign: 'center',
      width: '100%'
    }}>
      <div className="empty-state-image" style={{
        width: '240px',
        height: '240px',
        marginBottom: '32px',
        opacity: 0.8,
        background: `url("/assets/img/empty-cinema.png") center/cover no-repeat`,
        borderRadius: '24px',
        boxShadow: '0 20px 40px rgba(0,0,0,0.3)'
      }} />
      
      <h3 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '12px', color: 'var(--text-primary)' }}>
        {title}
      </h3>
      <p style={{ color: 'var(--text-secondary)', maxWidth: '400px', marginBottom: '32px', lineHeight: 1.6 }}>
        {message}
      </p>
      
      {showButton && (
        <Link to={buttonLink} className="btn btn-primary btn-lg">
          {buttonText}
        </Link>
      )}
    </div>
  );
};

export default EmptyState;
