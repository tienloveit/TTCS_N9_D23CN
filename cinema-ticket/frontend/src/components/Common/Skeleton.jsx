import './Skeleton.css';

const Skeleton = ({ width, height, borderRadius, className = '' }) => {
  return (
    <div 
      className={`skeleton-base ${className}`} 
      style={{ 
        width: width || '100%', 
        height: height || '20px', 
        borderRadius: borderRadius || 'var(--radius-sm)' 
      }} 
    />
  );
};

export const SkeletonBox = ({ count = 1, ...props }) => {
  return (
    <>
      {Array(count).fill(0).map((_, i) => (
        <Skeleton key={i} {...props} />
      ))}
    </>
  );
};

export default Skeleton;
