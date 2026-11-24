import { Field, OpsButton, StateBlock, TextInput } from '../../../components/Ops';
import { CameraIcon, XIcon } from '../../../components/Common/CinemaIcons';

export default function CheckInScannerTab({
  cameraActive, cameraError, cameraStarting, captureCameraFrameAndCheckIn, checking,
  code, codeInputRef, handleSubmitCode, setCode, startCamera, stopCamera, videoRef,
}) {
  const cameraLabel = cameraStarting ? 'Đang mở camera…' : cameraError ? 'Thử lại camera' : 'Bật camera';
  return (
    <div className="o-form">
      <div className="o-actions">
        <OpsButton icon={cameraActive ? <XIcon size={16} /> : <CameraIcon size={16} />}
          disabled={cameraStarting || checking} onClick={cameraActive ? stopCamera : startCamera}>
          {cameraActive ? 'Tắt camera' : cameraLabel}
        </OpsButton>
        <span role="status">{cameraActive ? 'Camera đang quét' : cameraStarting ? 'Đang chờ quyền camera' : 'Camera đang tắt'}</span>
      </div>
      {cameraError && <StateBlock state="error" title={cameraError} />}
      {cameraActive && <div className="o-form">
        <video ref={videoRef} className="o-check-video" playsInline muted />
        <div className="o-actions">
          <p>Đưa mã QR vào khung hình để soát vé.</p>
          <OpsButton onClick={captureCameraFrameAndCheckIn} disabled={checking}>Chụp thủ công</OpsButton>
        </div>
      </div>}
      <form className="o-form" onSubmit={handleSubmitCode}>
        <Field label="Mã đơn hoặc nội dung QR">
          <TextInput ref={codeInputRef} autoComplete="off" spellCheck={false} value={code}
            onChange={event => setCode(event.target.value)} placeholder="BK-20261121-ABCD1234" />
        </Field>
        <div className="o-actions">
          <OpsButton type="submit" variant="primary" size="lg" loading={checking} disabled={!code.trim()}>Soát vé</OpsButton>
          {code && <OpsButton variant="ghost" onClick={() => { setCode(''); codeInputRef.current?.focus(); }}>Xóa ô nhập</OpsButton>}
        </div>
      </form>
    </div>
  );
}
