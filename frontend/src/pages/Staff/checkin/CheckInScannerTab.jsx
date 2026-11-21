import Button from '../../../components/Common/Button';
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
  const cameraLabel = cameraStarting ? 'Đang mở camera…' : cameraError ? 'Thử lại camera' : 'Bật camera';

  return (
    <div className="gate-scanner-box">
      <div className="gate-scanner-hint">
        <span className="gate-scanner-hint-text">
          <SparkIcon size={16} aria-hidden="true" />
          <span>Quét mã QR trên vé hoặc nhập <strong>mã đơn</strong>.</span>
        </span>
        <Button
          size="sm"
          icon={cameraActive ? <XIcon size={15} /> : <CameraIcon size={15} />}
          disabled={cameraStarting || checking}
          onClick={() => (cameraActive ? stopCamera() : startCamera())}
        >
          {cameraActive ? 'Tắt camera' : cameraLabel}
        </Button>
      </div>

      <p className="gate-camera-status" role="status">
        {cameraActive ? 'Camera đang quét' : cameraStarting ? 'Đang chờ quyền camera' : 'Camera đang tắt'}
      </p>
      {cameraError && <div className="error-message" role="alert">{cameraError}</div>}

      {cameraActive && (
        <div className="gate-camera">
          <div className="gate-camera-stage">
            <video ref={videoRef} className="gate-camera-video" playsInline muted />
            <div className="gate-camera-overlay">
              <div className="gate-camera-frame">
                <div className="gate-camera-laser" />
              </div>
            </div>
          </div>
          <div className="gate-camera-footer">
            <span className="gate-camera-live">
              <span className="gate-camera-live-dot" aria-hidden="true" />
              Đang tự quét: đưa mã QR vào khung để soát vé ngay
            </span>
            <Button size="sm" icon={<CameraIcon size={15} />} onClick={captureCameraFrameAndCheckIn} disabled={checking}>
              Chụp thủ công
            </Button>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmitCode}>
        <label htmlFor="gate-ticket-code" className="gate-code-label">Mã đơn hoặc nội dung QR</label>
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
            placeholder="VD: BK-20261121-ABCD1234 hoặc quét QR"
            autoFocus
          />
          <button type="submit" className="btn gate-code-submit" disabled={checking || !code.trim()}>
            {checking ? 'Đang soát…' : <><span>Soát vé</span><CheckIcon size={16} /></>}
          </button>
        </div>
      </form>

      {code && (
        <div className="gate-code-clear">
          <Button size="sm" variant="ghost" onClick={() => { setCode(''); codeInputRef.current?.focus(); }}>
            Xóa ô nhập
          </Button>
        </div>
      )}
    </div>
  );
}
