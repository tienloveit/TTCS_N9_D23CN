import {
  CameraIcon,
  CheckIcon,
  SparkIcon,
  XIcon,
} from '../../../components/Common/CinemaIcons';

/** Tab quét QR bằng camera, tải ảnh QR hoặc nhập mã thủ công. */
export default function CheckInScannerTab({
  cameraActive,
  cameraError,
  cameraStarting,
  captureCameraFrameAndCheckIn,
  checking,
  code,
  codeInputRef,
  handleSubmitCode,
  setCode,
  startCamera,
  stopCamera,
  videoRef,
}) {
  return (
    <div className="gate-scanner-box">
      <div className="gate-scanner-hint">
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          <SparkIcon size={16} />
          <span>
            Quét QR/mã vạch hoặc nhập <strong>Mã đơn</strong>, <strong>Mã vé</strong>.
          </span>
        </span>
        <button
          type="button"
          className="btn btn-secondary"
          style={{ padding: '5px 12px', fontSize: '0.78rem' }}
          disabled={cameraStarting || checking}
          onClick={() => (cameraActive ? stopCamera() : startCamera())}
        >
          {cameraActive ? (
            <>
              <XIcon size={15} />
              <span>Tắt Camera</span>
            </>
          ) : (
            <>
              <CameraIcon size={15} />
              <span>{cameraStarting ? 'Đang mở camera…' : cameraError ? 'Thử lại camera' : 'Bật camera'}</span>
            </>
          )}
        </button>
      </div>

      <p className="gate-camera-status" role="status">{cameraActive ? 'Camera đang quét' : cameraStarting ? 'Đang chờ quyền camera' : 'Camera đang tắt'}</p>
      {cameraError && <div className="error-message" role="alert">{cameraError}</div>}

      {cameraActive && (
        <div style={{ display: 'grid', gap: 10 }}>
          <div className="gate-camera-stage">
            <video ref={videoRef} className="gate-camera-video" playsInline muted />
            <div className="gate-camera-overlay">
              <div className="gate-camera-frame">
                <div className="gate-camera-laser" />
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.82rem', color: '#059669', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: '#10b981',
                  boxShadow: '0 0 0 4px rgba(16, 185, 129, 0.2)',
                }}
              />
              Đang tự động quét QR thời gian thực (đưa mã vào khung sẽ tự nhận diện & check-in ngay)
            </span>
            <button
              type="button"
              className="btn btn-secondary"
              style={{ padding: '7px 14px', fontSize: '0.8rem' }}
              onClick={captureCameraFrameAndCheckIn}
              disabled={checking}
            >
              <CameraIcon size={15} />
              <span>Chụp thủ công</span>
            </button>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmitCode}>
        <label
          htmlFor="gate-ticket-code"
          style={{
            display: 'block',
            fontSize: '0.8rem',
            fontWeight: 800,
            color: '#475569',
            textTransform: 'uppercase',
            marginBottom: 8,
          }}
        >
          Nhập mã vé / Mã đặt chỗ (Booking Code)
        </label>
        <div className="gate-input-wrap">
          <input
            ref={codeInputRef}
            id="gate-ticket-code"
            type="text"
            autoComplete="off"
            spellCheck={false}
            className="gate-code-input"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="VD: BK-2026... hoặc TICKET=123..."
            autoFocus
          />
          <button
            type="submit"
            className="btn gate-code-submit"
            disabled={checking || !code.trim()}
          >
            {checking ? (
              'Đang soát...'
            ) : (
              <>
                <span>Soát vé</span>
                <CheckIcon size={16} />
              </>
            )}
          </button>
        </div>
      </form>

      {code && (
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => {
              setCode('');
              codeInputRef.current?.focus();
            }}
          >
            Xóa ô nhập
          </button>
        </div>
      )}
    </div>
  );
}
