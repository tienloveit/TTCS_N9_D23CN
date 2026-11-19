import { useEffect, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import axiosClient, { API_BASE_URL } from '../../api/axiosClient';
import { CalendarIcon, FilmIcon, ImageFileIcon, PlusIcon, XIcon } from '../../components/Common/CinemaIcons';
import './MovieForm.css';

const mediaUrl = (url) => url?.startsWith('/movie/media/') ? `${API_BASE_URL}${url}` : url;

function ImageUpload({ label, name, value, required, onChange, onBusy }) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const upload = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024) {
      setError('Chọn ảnh JPG, PNG hoặc WebP, tối đa 5 MB.');
      return;
    }
    setError('');
    setUploading(true);
    onBusy(1);
    try {
      const data = new FormData();
      data.append('file', file);
      const response = await axiosClient.post('/movie/media', data, { headers: { 'Content-Type': 'multipart/form-data' } });
      onChange(name, mediaUrl(response.data.result));
    } catch (err) {
      setError(err.response?.data?.message || 'Không tải được ảnh. Vui lòng thử lại.');
    } finally {
      setUploading(false);
      onBusy(-1);
    }
  };
  return <div className="movie-form-field">
    <span className="movie-form-label" id={`${name}-label`}>{label}{required && <b> *</b>}</span>
    <label className={`movie-image-upload ${value ? 'has-image' : ''}`} aria-labelledby={`${name}-label`}>
      <input type="file" accept="image/jpeg,image/png,image/webp" onChange={upload} disabled={uploading} aria-label={`Tải ${label.toLowerCase()}`} />
      {value ? <img src={mediaUrl(value)} alt={`Xem trước ${label.toLowerCase()}`} /> : <span className="movie-upload-icon"><ImageFileIcon size={22} /><PlusIcon size={10} /></span>}
      <span>{uploading ? 'Đang tải ảnh…' : value ? 'Chọn ảnh khác' : `Khu vực tải ${name === 'thumbnailUrl' ? 'poster' : 'banner'}`}</span>
      <small>{name === 'thumbnailUrl' ? 'JPG, PNG, WebP' : 'Tỷ lệ gợi ý 16:9'}</small>
    </label>
    {value && !required && <button className="movie-remove-image" type="button" onClick={() => onChange(name, '')}>Xóa banner</button>}
    {error && <small className="movie-form-error" role="alert">{error}</small>}
  </div>;
}

export default function MovieForm({ movie, genres, directors, onSave, onClose }) {
  const dialogRef = useRef(null);
  useEffect(() => {
    const previousFocus = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    dialogRef.current?.querySelector('input[name="movieName"]')?.focus();
    return () => {
      document.body.style.overflow = previousOverflow;
      previousFocus?.focus();
    };
  }, []);
  const [form, setForm] = useState({
    movieName: movie?.movieName || '', originalTitle: movie?.originalTitle || '',
    genreIds: movie?.genres?.map(genre => genre.id) || [],
    durationMinutes: movie?.durationMinutes || '', ageRating: movie?.ageRating || '',
    language: movie?.language || '', directorName: movie?.directorName || '',
    castNames: movie?.castNames || '', description: movie?.description || '',
    thumbnailUrl: movie?.thumbnailUrl || '', bannerUrl: movie?.bannerUrl || '', trailerUrl: movie?.trailerUrl || '',
    releaseDate: movie?.releaseDate?.split('T')[0] || '', endDate: movie?.endDate?.split('T')[0] || '',
    isPublic: movie ? movie.isPublic !== false : false,
  });
  const [saving, setSaving] = useState(false);
  const [uploads, setUploads] = useState(0);
  const [error, setError] = useState('');
  const initialForm = useRef(form);
  const [resetCount, setResetCount] = useState(0);
  const reset = () => {
    if (saving || uploads) return;
    setForm({ ...initialForm.current, genreIds: [...initialForm.current.genreIds] });
    setError('');
    setResetCount(previous => previous + 1);
    dialogRef.current?.querySelectorAll('details[open]').forEach(details => { details.open = false; });
    dialogRef.current?.querySelector('input[name="movieName"]')?.focus();
  };
  const dismiss = () => {
    if (!saving && !uploads) onClose();
  };
  const handleDialogKeyDown = (event) => {
    if (event.key === 'Escape') {
      event.stopPropagation();
      dismiss();
    }
    if (event.key === 'Tab') {
      const controls = [...dialogRef.current.querySelectorAll('button, input, select, textarea, summary, [tabindex="0"]')]
        .filter(control => !control.matches(':disabled') && control.getClientRects().length > 0);
      const first = controls[0];
      const last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    }
  };
  const change = (name, value) => setForm(previous => ({ ...previous, [name]: value }));
  const input = (event) => change(event.target.name, event.target.value);
  const busy = (delta) => setUploads(previous => previous + delta);
  const submit = async (event) => {
    event.preventDefault();
    if (saving || uploads) return;
    if (!form.movieName.trim() || !form.genreIds.length || !form.thumbnailUrl) {
      setError('Vui lòng nhập tên phim, chọn thể loại và tải poster phim.');
      return;
    }
    if (form.releaseDate && form.endDate && form.endDate < form.releaseDate) {
      setError('Ngày kết thúc phải từ ngày khởi chiếu trở đi.');
      return;
    }
    setError('');
    setSaving(true);
    try {
      await onSave({ ...form, movieName: form.movieName.trim(), directorName: form.directorName.trim(),
        durationMinutes: Number(form.durationMinutes), ageRating: form.ageRating || null,
        releaseDate: form.releaseDate || null, endDate: form.endDate || null,
        status: movie?.status || 'UPCOMING' });
    } catch (err) {
      const message = err.response?.data?.message || 'Không lưu được phim. Vui lòng thử lại.';
      setError(message);
      toast.error(message);
    } finally { setSaving(false); }
  };
  const field = (label, name, placeholder, options = {}) => <label className={`movie-form-field ${options.wide ? 'movie-field-wide' : ''}`}>
    <span>{label}{options.required && <b> *</b>}</span>
    <input name={name} value={form[name]} onChange={input} placeholder={placeholder} type={options.type || 'text'}
      required={options.required} min={options.type === 'number' ? 1 : undefined} maxLength={options.maxLength || 255} />
  </label>;

  return <div className="modal-overlay movie-modal-overlay" onClick={event => {
    if (event.target === event.currentTarget) dismiss();
  }} onKeyDown={handleDialogKeyDown}>
    <div className="modal-content movie-editor" role="dialog" aria-modal="true" aria-labelledby="movie-editor-title" ref={dialogRef}>
    <header className="movie-editor-header">
      <h2 id="movie-editor-title">{movie ? 'Chỉnh sửa phim' : 'Thêm phim mới'}</h2>
      <button type="button" className="modal-close" onClick={dismiss} disabled={saving || uploads > 0} aria-label="Đóng"><XIcon size={18} /></button>
    </header>
    <form onSubmit={submit}>
      <fieldset disabled={saving} className="movie-form-section">
        <legend><FilmIcon size={16} />Thông tin cơ bản</legend>
        <div className="movie-form-grid">
          {field('Tên phim', 'movieName', 'VD: Avengers: Endgame', { required: true, wide: true })}
          {field('Tên gốc', 'originalTitle', 'Original title')}
          <div className="movie-form-field">
            <label htmlFor="movie-genres">Thể loại <b>*</b></label>
            <details className="movie-genre-select"><summary>{form.genreIds.length ? genres.filter(genre => form.genreIds.includes(genre.id)).map(genre => genre.name).join(', ') : 'Chọn thể loại'}</summary>
              <div id="movie-genres" className="movie-genre-options">
                {genres.length ? genres.map(genre => <label key={genre.id}><input type="checkbox" checked={form.genreIds.includes(genre.id)} onChange={() => change('genreIds', form.genreIds.includes(genre.id) ? form.genreIds.filter(id => id !== genre.id) : [...form.genreIds, genre.id])} />{genre.name}</label>) : <span>Chưa có thể loại. Hãy thêm thể loại trước.</span>}
              </div>
            </details>
          </div>
          {field('Thời lượng (phút)', 'durationMinutes', '120', { required: true, type: 'number' })}
          <label className="movie-form-field"><span>Phân loại độ tuổi</span><select name="ageRating" value={form.ageRating} onChange={input}>
            <option value="">Chọn độ tuổi</option><option value="P">P - Mọi độ tuổi</option><option value="K">K - Có người giám hộ</option>
            <option value="T13">T13 - Từ 13 tuổi</option><option value="T16">T16 - Từ 16 tuổi</option><option value="T18">T18 - Từ 18 tuổi</option>
          </select></label>
          {field('Ngôn ngữ', 'language', 'Tiếng Anh, Tiếng Việt...', { maxLength: 100 })}
          <label className="movie-form-field"><span>Đạo diễn</span><input name="directorName" value={form.directorName} onChange={input} list="movie-directors" placeholder="Tên đạo diễn" maxLength={255} />
            <datalist id="movie-directors">{directors.map(director => <option key={director.id} value={director.name} />)}</datalist></label>
          {field('Diễn viên', 'castNames', 'Nhập danh sách diễn viên', { wide: true, maxLength: 2000 })}
          <label className="movie-form-field movie-field-wide"><span>Mô tả nội dung</span><textarea name="description" value={form.description} onChange={input} placeholder="Nhập nội dung tóm tắt của phim..." maxLength={5000} /></label>
        </div>
      </fieldset>
      <fieldset disabled={saving} className="movie-form-section">
        <legend><ImageFileIcon size={16} />Hình ảnh &amp; Trailer</legend>
        <div className="movie-form-grid">
          <ImageUpload key={`poster-${resetCount}`} label="Poster phim" name="thumbnailUrl" value={form.thumbnailUrl} required onChange={change} onBusy={busy} />
          <ImageUpload key={`banner-${resetCount}`} label="Banner phim" name="bannerUrl" value={form.bannerUrl} onChange={change} onBusy={busy} />
          {field('Đường dẫn trailer', 'trailerUrl', 'https://www.youtube.com/watch?v=...', { wide: true, type: 'url', maxLength: 500 })}
        </div>
      </fieldset>
      <fieldset disabled={saving} className="movie-form-section">
        <legend><CalendarIcon size={16} />Phát hành &amp; Trạng thái</legend>
        <div className="movie-form-grid">
          {field('Ngày khởi chiếu', 'releaseDate', 'Chọn ngày', { type: 'date' })}
          <label className="movie-form-field"><span>Ngày kết thúc</span><input type="date" name="endDate" value={form.endDate} onChange={input} min={form.releaseDate || undefined} /></label>
          <div className="movie-form-field movie-field-wide"><span>Trạng thái</span>
            <label className="movie-publish-option"><input type="radio" name="isPublic" checked={!form.isPublic} onChange={() => change('isPublic', false)} />Bản nháp</label>
            <label className="movie-publish-option"><input type="radio" name="isPublic" checked={form.isPublic} onChange={() => change('isPublic', true)} />Công khai thông tin phim</label>
          </div>
        </div>
      </fieldset>
      {error && <p role="alert" className="movie-form-error">{error}</p>}
      <footer className="movie-form-actions"><button type="button" className="btn btn-secondary" onClick={dismiss} disabled={saving || uploads > 0}>Hủy</button>
        <button type="button" className="btn btn-secondary" onClick={reset} disabled={saving || uploads > 0}>Đặt lại</button>
        <button type="submit" className="btn btn-primary" disabled={saving || uploads > 0}>{saving ? 'Đang lưu…' : uploads ? 'Đang tải ảnh…' : movie ? 'Lưu thay đổi' : 'Thêm phim'}</button></footer>
    </form>
    </div>
  </div>;
}
