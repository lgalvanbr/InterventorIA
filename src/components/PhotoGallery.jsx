import React, { useState, useRef } from 'react';
import { Camera, Image as ImageIcon, Upload, X, Trash2, Calendar, Tag, AlertCircle } from 'lucide-react';

export default function PhotoGallery({ frente, onAddPhoto, onDeletePhoto, isContractorMode }) {
  const [isUploading, setIsUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  
  // Photo metadata form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('avance');
  
  // Lightbox viewer state
  const [activePhoto, setActivePhoto] = useState(null);
  
  const fileInputRef = useRef(null);

  if (!frente) {
    return (
      <div className="empty-state">
        <ImageIcon size={40} className="empty-state-icon" />
        <p>Selecciona un frente de obra para ver y gestionar su galería fotográfica documental.</p>
      </div>
    );
  }

  const photos = frente.photos || [];

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Por favor selecciona un archivo de imagen válido.');
      return;
    }

    // Limit to 4MB for localStorage demonstration
    if (file.size > 4 * 1024 * 1024) {
      alert('La imagen es demasiado grande. Elige una menor a 4MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      setPreviewUrl(event.target.result);
      setSelectedFile(file);
      setTitle(file.name.split('.')[0]); // Default title is the filename
      setIsUploading(true);
    };
    reader.readAsDataURL(file);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      if (file.size > 4 * 1024 * 1024) {
        alert('La imagen es demasiado grande. Elige una menor a 4MB.');
        return;
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        setPreviewUrl(event.target.result);
        setSelectedFile(file);
        setTitle(file.name.split('.')[0]);
        setIsUploading(true);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUploadSubmit = (e) => {
    e.preventDefault();
    if (!previewUrl) return;

    const newPhoto = {
      id: 'photo_' + Date.now(),
      url: previewUrl,
      title: title || 'Registro Fotográfico',
      description: description || 'Fotografía de control en obra.',
      category: category,
      date: new Date().toLocaleDateString('es-CO', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    };

    onAddPhoto(frente.id, newPhoto);
    resetForm();
  };

  const resetForm = () => {
    setSelectedFile(null);
    setPreviewUrl('');
    setTitle('');
    setDescription('');
    setCategory('avance');
    setIsUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const categoryLabels = {
    avance: 'Avance Físico',
    sst: 'SST (Seguridad)',
    calidad: 'Calidad / Técnico',
    ambiental: 'PMA (Ambiental)',
    social: 'Gestión Social',
    otro: 'General / Otros'
  };

  const categoryColors = {
    avance: 'var(--primary-light)',
    sst: 'var(--warning)',
    calidad: 'var(--success)',
    ambiental: '#84cc16',
    social: '#ec4899',
    otro: 'var(--text-secondary)'
  };

  return (
    <div className="workfront-detail-card" style={{ marginTop: '1.5rem' }}>
      <div className="workfront-detail-header" style={{ borderBottom: 'none', paddingBottom: 0, marginBottom: '1rem' }}>
        <div>
          <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--primary-light)', fontWeight: 700, letterSpacing: '1px' }}>
            Registro e Imagen Documental
          </span>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '4px' }}>
            Evidencias Fotográficas del Frente
          </h3>
        </div>
      </div>

      {/* Upload Box */}
      {!isContractorMode && !isUploading ? (
        <div 
          className="upload-area" 
          onClick={() => fileInputRef.current.click()}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
        >
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileChange} 
            style={{ display: 'none' }} 
            accept="image/*"
          />
          <Upload size={32} className="upload-icon" />
          <div className="upload-text">Arrastra una imagen de obra aquí o haz clic para buscar</div>
          <div className="upload-subtext">Formatos admitidos: PNG, JPG, WEBP (Hasta 4MB)</div>
        </div>
      ) : (
        /* Image details metadata submission form */
        <div style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '1.25rem', marginBottom: '1.5rem', animation: 'fadeIn var(--transition-fast)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
            <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--secondary)' }}>Documentar Nueva Evidencia Fotográfica</h4>
            <button onClick={resetForm} className="btn btn-secondary btn-icon" style={{ padding: '4px' }}><X size={14} /></button>
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1.25rem' }}>
            {/* Preview image & fields */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div style={{ width: '100%', height: '180px', borderRadius: 'var(--radius-md)', overflow: 'hidden', border: '1px solid var(--border-color)', backgroundColor: '#0d1117' }}>
                <img src={previewUrl} alt="Vista previa" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
              </div>
              
              <form onSubmit={handleUploadSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Título de la Fotografía *</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    required 
                    placeholder="Ej. Vaciado de concreto en zapata 4" 
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                  />
                </div>
                
                <div className="form-group-row">
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Componente Normativo</label>
                    <select 
                      className="form-input" 
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      style={{ height: '42px' }}
                    >
                      <option value="avance">Avance Físico</option>
                      <option value="sst">SST (Seguridad)</option>
                      <option value="calidad">Calidad / Técnico</option>
                      <option value="ambiental">PMA (Ambiental)</option>
                      <option value="social">Gestión Social</option>
                      <option value="otro">General / Otros</option>
                    </select>
                  </div>
                  
                  <div className="form-group" style={{ marginBottom: 0, display: 'flex', alignItems: 'flex-end' }}>
                    <div style={{ display: 'flex', gap: '10px', width: '100%' }}>
                      <button type="button" onClick={resetForm} className="btn btn-secondary" style={{ flex: 1 }}>Cancelar</button>
                      <button type="submit" className="btn btn-primary" style={{ flex: 2 }}>Registrar Foto</button>
                    </div>
                  </div>
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Descripción de la Evidencia</label>
                  <textarea 
                    className="form-input" 
                    placeholder="Escribe detalles del estado observado, localización puntual del hallazgo, fallas encontradas o justificación técnica..." 
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows="3"
                  />
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Photos Grid */}
      {photos.length === 0 ? (
        <div style={{ padding: '2rem 1rem', textAlign: 'center', border: '1px dashed var(--border-color)', borderRadius: 'var(--radius-md)', color: 'var(--text-secondary)' }}>
          <ImageIcon size={30} style={{ opacity: 0.3, marginBottom: '8px' }} />
          <p style={{ fontSize: '0.85rem' }}>No hay imágenes cargadas en este frente. Carga una foto superior para documentar el avance.</p>
        </div>
      ) : (
        <div className="gallery-grid">
          {photos.map((photo) => (
            <div key={photo.id} className="photo-card" onClick={() => setActivePhoto(photo)}>
              <div className="photo-img-box">
                <img src={photo.url} alt={photo.title} className="photo-img" />
                <span className="photo-tag" style={{ backgroundColor: categoryColors[photo.category] || 'var(--primary)' }}>
                  {categoryLabels[photo.category]}
                </span>
              </div>
              <div className="photo-details">
                <h5 className="photo-title">{photo.title}</h5>
                <p className="photo-desc">{photo.description}</p>
                <div className="photo-date" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Calendar size={10} />
                  {photo.date.split(' a las')[0]} {/* Shorten date */}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Lightbox Modal */}
      {activePhoto && (
        <div className="modal-overlay" onClick={() => setActivePhoto(null)}>
          <div className="modal-content" style={{ maxWidth: '800px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ImageIcon size={20} style={{ color: categoryColors[activePhoto.category] }} />
                {activePhoto.title}
              </h3>
              <button onClick={() => setActivePhoto(null)} className="btn btn-secondary btn-icon" style={{ padding: '6px' }}>
                <X size={18} />
              </button>
            </div>
            
            <div style={{ padding: '1.5rem', display: 'grid', gridTemplateColumns: '1fr', gap: '1.5rem' }}>
              <div style={{ width: '100%', maxHeight: '450px', backgroundColor: '#05070a', borderRadius: 'var(--radius-md)', overflow: 'hidden', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                <img src={activePhoto.url} alt={activePhoto.title} style={{ maxWidth: '100%', maxHeight: '450px', objectFit: 'contain' }} />
              </div>
              
              <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Calendar size={14} />
                    <strong>Fecha de Captura:</strong> {activePhoto.date}
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Tag size={14} style={{ color: categoryColors[activePhoto.category] }} />
                    <strong>Componente:</strong> {categoryLabels[activePhoto.category]}
                  </span>
                </div>
                
                <div>
                  <h4 style={{ fontSize: '0.9rem', color: 'var(--text-primary)', marginBottom: '0.25rem' }}>Descripción del Registro:</h4>
                  <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                    {activePhoto.description}
                  </p>
                </div>
              </div>
            </div>

            <div className="modal-footer" style={{ justifyContent: 'space-between' }}>
              {!isContractorMode && (
                <button 
                  type="button" 
                  className="btn btn-danger"
                  onClick={() => {
                    if (confirm('¿Estás seguro de que deseas eliminar este registro fotográfico documental?')) {
                      onDeletePhoto(frente.id, activePhoto.id);
                      setActivePhoto(null);
                    }
                  }}
                  style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '0.5rem 1rem' }}
                >
                  <Trash2 size={14} /> Eliminar Evidencia
                </button>
              )}
              <button onClick={() => setActivePhoto(null)} className="btn btn-secondary">Cerrar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
