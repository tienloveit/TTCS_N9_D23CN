import { useRef, useState } from 'react';
import { toast } from 'react-toastify';
import axiosClient, { API_BASE_URL } from '../../api/axiosClient';
import { CalendarIcon, FilmIcon, ImageFileIcon, PlusIcon } from '../../components/Common/CinemaIcons';
import { AGE_RATINGS } from '../../utils/ageRatings';
import { Checkbox, ChoiceCards, Field, OpsButton, OpsDialog, Select, Textarea, TextInput } from '../../components/Ops';

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
  return <div className="o-field">
    <span className="o-field__label" id={`${name}-label`}>{label}{required && <b> *</b>}</span>
    <label className="o-image-upload" data-image={Boolean(value) || undefined} aria-labelledby={`${name}-label`}>
      <input type="file" accept="image/jpeg,image/png,image/webp" onChange={upload} disabled={uploading} aria-label={`Tải ${label.toLowerCase()}`} />
      {value ? <img src={mediaUrl(value)} alt={`Xem trước ${label.toLowerCase()}`} /> : <span className="o-image-upload__icon"><ImageFileIcon size={22} /><PlusIcon size={10} /></span>}
      <span>{uploading ? 'Đang tải ảnh…' : value ? 'Chọn ảnh khác' : `Khu vực tải ${name === 'thumbnailUrl' ? 'poster' : 'banner'}`}</span>
      <small>{name === 'thumbnailUrl' ? 'JPG, PNG, WebP' : 'Tỷ lệ gợi ý 16:9'}</small>
    </label>
    {value && !required && <OpsButton variant="ghost-danger" className="o-media-remove" onClick={() => onChange(name, '')}>Xóa banner</OpsButton>}
    {error && <small className="o-field__error" role="alert">{error}</small>}
  </div>;
}

export default function MovieForm({ movie, genres, directors, onSave, onClose }) {
  const formRef = useRef(null);
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
    formRef.current?.querySelectorAll('details[open]').forEach(details => { details.open = false; });
    formRef.current?.querySelector('input[name="movieName"]')?.focus();
  };
  const dismiss = () => {
    if (!saving && !uploads) onClose();
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
  const field = (label, name, placeholder, options = {}) => (
    <Field label={label} required={options.required} className={options.wide ? 'o-form-grid__wide' : ''}>
      <TextInput name={name} value={form[name]} onChange={input} placeholder={placeholder} type={options.type || 'text'}
        min={options.type === 'number' ? 1 : undefined} maxLength={options.maxLength || 255} data-autofocus={name === 'movieName' || undefined} />
    </Field>
  );
  const disabled = saving || uploads > 0;
  return <OpsDialog open size="lg" title={movie ? 'Chỉnh sửa phim' : 'Thêm phim'} onClose={dismiss} disabled={disabled}
    footer={<>
      <OpsButton onClick={dismiss} disabled={disabled}>Quay lại</OpsButton>
      <OpsButton onClick={reset} disabled={disabled}>Đặt lại</OpsButton>
      <OpsButton type="submit" form="o-movie-form" variant="primary" loading={saving} disabled={uploads > 0}>
        {uploads ? 'Đang tải ảnh…' : movie ? 'Lưu thay đổi' : 'Thêm phim'}
      </OpsButton>
    </>}>
    <form id="o-movie-form" className="o-form" ref={formRef} onSubmit={submit}>
      <fieldset disabled={saving} className="o-form-section">
        <legend><FilmIcon size={16} />Thông tin cơ bản</legend>
        <div className="o-form-grid">
          {field('Tên phim', 'movieName', 'VD: Avengers: Endgame', { required: true, wide: true })}
          {field('Tên gốc', 'originalTitle', 'Original title')}
          <div className="o-field">
            <span className="o-field__label">Thể loại <b>*</b></span>
            <details className="o-genre-select"><summary className="o-input" id="o-movie-genres">{form.genreIds.length ? genres.filter(genre => form.genreIds.includes(genre.id)).map(genre => genre.name).join(', ') : 'Chọn thể loại'}</summary>
              <div className="o-genre-options">
                {genres.length ? genres.map(genre => <label key={genre.id}><Checkbox checked={form.genreIds.includes(genre.id)} onChange={() => change('genreIds', form.genreIds.includes(genre.id) ? form.genreIds.filter(id => id !== genre.id) : [...form.genreIds, genre.id])} />{genre.name}</label>) : <span>Chưa có thể loại. Hãy thêm thể loại trước.</span>}
              </div>
            </details>
          </div>
          {field('Thời lượng (phút)', 'durationMinutes', '120', { required: true, type: 'number' })}
          <label className="o-field"><span>Phân loại độ tuổi</span><Select name="ageRating" value={form.ageRating} onChange={input}>
            <option value="">Chọn độ tuổi</option>
            {AGE_RATINGS.map((rating) => <option key={rating.code} value={rating.code}>{rating.option}</option>)}
          </Select></label>
          {field('Ngôn ngữ', 'language', 'Tiếng Anh, Tiếng Việt...', { maxLength: 100 })}
          <label className="o-field"><span>Đạo diễn</span><TextInput name="directorName" value={form.directorName} onChange={input} list="movie-directors" placeholder="Tên đạo diễn" maxLength={255} />
            <datalist id="movie-directors">{directors.map(director => <option key={director.id} value={director.name} />)}</datalist></label>
          {field('Diễn viên', 'castNames', 'Nhập danh sách diễn viên', { wide: true, maxLength: 2000 })}
          <label className="o-field o-form-grid__wide"><span>Mô tả nội dung</span><Textarea name="description" value={form.description} onChange={input} placeholder="Nhập nội dung tóm tắt của phim..." maxLength={5000} /></label>
        </div>
      </fieldset>
      <fieldset disabled={saving} className="o-form-section">
        <legend><ImageFileIcon size={16} />Hình ảnh &amp; Trailer</legend>
        <div className="o-form-grid">
          <ImageUpload key={`poster-${resetCount}`} label="Poster phim" name="thumbnailUrl" value={form.thumbnailUrl} required onChange={change} onBusy={busy} />
          <ImageUpload key={`banner-${resetCount}`} label="Banner phim" name="bannerUrl" value={form.bannerUrl} onChange={change} onBusy={busy} />
          {field('Đường dẫn trailer', 'trailerUrl', 'https://www.youtube.com/watch?v=...', { wide: true, type: 'url', maxLength: 500 })}
        </div>
      </fieldset>
      <fieldset disabled={saving} className="o-form-section">
        <legend><CalendarIcon size={16} />Phát hành &amp; Trạng thái</legend>
        <div className="o-form-grid">
          {field('Ngày khởi chiếu', 'releaseDate', 'Chọn ngày', { type: 'date' })}
          <label className="o-field"><span>Ngày kết thúc</span><TextInput type="date" name="endDate" value={form.endDate} onChange={input} min={form.releaseDate || undefined} /></label>
          <ChoiceCards className="o-form-grid__wide" name="isPublic" label="Trạng thái" value={String(form.isPublic)}
            onChange={value => change('isPublic', value === 'true')}
            options={[{ value: 'false', label: 'Bản nháp' }, { value: 'true', label: 'Công khai thông tin phim' }]} />
        </div>
      </fieldset>
      {error && <p role="alert" className="o-field__error">{error}</p>}
    </form>
  </OpsDialog>;
}
