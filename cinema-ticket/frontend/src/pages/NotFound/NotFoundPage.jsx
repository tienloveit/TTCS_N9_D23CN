import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';

const NotFoundPage = () => {
  return (
    <div className="page" style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center', 
      justifyContent: 'center', 
      textAlign: 'center',
      minHeight: '80vh'
    }}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h1 style={{ fontSize: '8rem', fontWeight: 900, color: 'var(--accent)', lineHeight: 1 }}>
          404
        </h1>
        <h2 style={{ fontSize: '2rem', marginBottom: '16px' }}>Trang không tồn tại</h2>
        <p style={{ color: 'var(--text-secondary)', maxWidth: '400px', margin: '0 auto 32px' }}>
          Có vẻ như bạn đã đi lạc vào một phòng chiếu không tồn tại trong hệ thống CinemaHub.
        </p>
        <Link to="/" className="btn btn-primary btn-lg">
          Quay lại trang chủ
        </Link>
      </motion.div>
    </div>
  );
};

export default NotFoundPage;
