import React, { useEffect, useRef, useState } from 'react';
import { Trash2, ChevronLeft, ChevronRight } from 'lucide-react';
import { api } from '../../services/api';

// Declaração para evitar erro de lint com o Pannellum global
/* global pannellum */
export function Tour360({ processId, user }) {
  const [scenes, setScenes] = useState([]);
  const [activeScene, setActiveScene] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  
  const viewerRef = useRef(null);
  const currentBlobUrl = useRef(null);
  const loadData = async () => {
    try {
      setLoading(true);
      const data = await api.getTourScenes(processId);
      setScenes(data);
      if (data.length > 0 && !activeScene) setActiveScene(data[0]);
    } catch (e) {
      console.error('Erro ao carregar tour:', e);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    loadData();
    return () => destroyViewer();
  }, [processId]);
  useEffect(() => {
    if (activeScene) initViewer(activeScene);
  }, [activeScene]);
  const destroyViewer = () => {
    if (viewerRef.current) {
      viewerRef.current.destroy();
      viewerRef.current = null;
    }
    if (currentBlobUrl.current) {
      URL.revokeObjectURL(currentBlobUrl.current);
      currentBlobUrl.current = null;
    }
    const container = document.getElementById('panorama-viewer');
    if (container) container.innerHTML = '';
  };
  const initViewer = async (scene) => {
    destroyViewer();
    try {
      // Download via Blob para evitar erros de CORS no WebGL
      const response = await fetch(scene.image_url);
      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      currentBlobUrl.current = objectUrl;
      viewerRef.current = pannellum.viewer('panorama-viewer', {
        type: 'equirectangular',
        panorama: objectUrl,
        autoLoad: true,
        title: scene.title || '',
        author: 'Vistoria SisGestão',
      });
    } catch (err) {
      console.error('Erro ao inicializar visualizador 360:', err);
    }
  };
  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    setUploading(true);
    setUploadProgress(0);
    try {
      const url = await api.uploadFileWithProgress(file, (progress) => {
        setUploadProgress(progress);
      });
      const title = prompt("Dê um nome para esta cena (ex: Fachada, Sala de Estar):") || "Nova Cena";
      
      await api.saveTourScene({
        process_id: processId,
        title: title,
        image_url: url,
        created_by: user.id
      });
      
      loadData();
    } catch (err) {
      alert("Erro no upload: " + err.message);
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const handleDelete = async (e, scene) => {
    e.stopPropagation();
    if (!confirm(`Deseja excluir a cena "${scene.title}"?`)) return;
    try {
      await api.deleteTourScene(scene.id);
      if (activeScene?.id === scene.id) setActiveScene(null);
      loadData();
    } catch (err) {
      alert("Erro ao excluir: " + err.message);
    }
  };

  const handlePrevScene = () => {
    if (!scenes.length || !activeScene) return;
    const currentIndex = scenes.findIndex(s => s.id === activeScene.id);
    const newIndex = currentIndex > 0 ? currentIndex - 1 : scenes.length - 1;
    setActiveScene(scenes[newIndex]);
  };

  const handleNextScene = () => {
    if (!scenes.length || !activeScene) return;
    const currentIndex = scenes.findIndex(s => s.id === activeScene.id);
    const newIndex = currentIndex < scenes.length - 1 ? currentIndex + 1 : 0;
    setActiveScene(scenes[newIndex]);
  };

  if (loading) return <div className="empty">Carregando vistorias...</div>;
  return (
    <div className="tour-container">
      {/* Sidebar de Cenas */}
      <div className="card tour-sidebar" style={{width: '240px', marginBottom: 0, display: 'flex', flexDirection: 'column', padding: '10px'}}>
        <style>{`
          @keyframes shimmer360 {
            0% { transform: translateX(-100%); }
            100% { transform: translateX(100%); }
          }
          .tour-nav-btn {
            background: transparent;
            border: none;
            color: #fff;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 6px;
            border-radius: 50%;
            transition: all 0.2s ease;
          }
          .tour-nav-btn:hover {
            background: rgba(255, 255, 255, 0.2);
            transform: scale(1.1);
          }
        `}</style>
        <div className="fca mbs10">
          <strong style={{fontSize: '13px'}}>CENAS ({scenes.length})</strong>
          <label className="btn btn-primary btn-sm mla clickable">
            {uploading ? `${uploadProgress}%` : '+'}
            <input type="file" hidden accept="image/*" onChange={handleUpload} disabled={uploading} />
          </label>
        </div>

        {uploading && (
          <div style={{
            padding: '8px',
            background: 'rgba(240, 244, 248, 0.95)',
            borderRadius: '6px',
            border: '1px solid var(--border)',
            marginBottom: '10px',
            fontSize: '11px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontWeight: 600 }}>
              <span style={{ color: '#475569' }}>Enviando imagem...</span>
              <span style={{ color: 'var(--blue)' }}>{uploadProgress}%</span>
            </div>
            <div style={{
              width: '100%',
              height: '6px',
              background: '#e2e8f0',
              borderRadius: '3px',
              overflow: 'hidden',
              position: 'relative'
            }}>
              <div style={{
                width: `${uploadProgress}%`,
                height: '100%',
                background: 'linear-gradient(90deg, #3b82f6, #06b6d4)',
                borderRadius: '3px',
                transition: 'width 0.2s ease-out',
                position: 'relative',
                overflow: 'hidden'
              }}>
                <div style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  background: 'linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.4) 50%, rgba(255,255,255,0) 100%)',
                  animation: 'shimmer360 1.5s infinite',
                  width: '100%',
                  height: '100%'
                }}></div>
              </div>
            </div>
          </div>
        )}
        
        <div className="fg" style={{overflowY: 'auto', paddingRight: '4px'}}>
          {scenes.length === 0 ? (
            <div className="empty" style={{fontSize: '11px'}}>Nenhuma foto enviada.</div>
          ) : (
            scenes.map(s => (
              <div 
                key={s.id} 
                className={`card clickable ${activeScene?.id === s.id ? 'active-scene' : ''}`}
                style={{padding: '4px', marginBottom: '8px', border: activeScene?.id === s.id ? '2px solid var(--blue)' : '1px solid var(--border)', position: 'relative'}}
                onClick={() => setActiveScene(s)}
              >
                <button 
                  onClick={(e) => handleDelete(e, s)}
                  style={{position: 'absolute', top: '8px', right: '8px', background: 'rgba(0,0,0,0.5)', border: 'none', borderRadius: '4px', padding: '4px', color: '#fff', cursor: 'pointer', zIndex: 10}}
                >
                  <Trash2 size={14} />
                </button>
                <img src={s.image_url} style={{width: '100%', height: '60px', objectFit: 'cover', borderRadius: '4px'}} alt={s.title} />
                <div style={{fontSize: '11px', marginTop: '4px', textAlign: 'center', fontWeight: 500}}>{s.title}</div>
              </div>
            ))
          )}
        </div>
      </div>
      {/* Visualizador Principal */}
      <div className="card tour-viewer" style={{flex: 1, marginBottom: 0, padding: 0, background: '#000', overflow: 'hidden', position: 'relative'}}>
        <div id="panorama-viewer" style={{width: '100%', height: '100%'}}></div>
        {!activeScene && (
          <div className="empty" style={{position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', color: '#fff'}}>
            Selecione ou adicione uma imagem para iniciar o tour.
          </div>
        )}
        {scenes.length > 1 && activeScene && (
          <div style={{
            position: 'absolute',
            bottom: '30px',
            left: '50%',
            transform: 'translateX(-50%)',
            display: 'flex',
            alignItems: 'center',
            gap: '24px',
            background: 'rgba(0, 0, 0, 0.65)',
            padding: '8px 24px',
            borderRadius: '30px',
            backdropFilter: 'blur(4px)',
            zIndex: 10,
            boxShadow: '0 4px 6px rgba(0,0,0,0.3)'
          }}>
            <button className="tour-nav-btn" onClick={handlePrevScene} title="Imagem anterior">
              <ChevronLeft size={28} />
            </button>
            <span style={{color: '#fff', fontSize: '13px', fontWeight: '500', minWidth: '40px', textAlign: 'center'}}>
              {scenes.findIndex(s => s.id === activeScene.id) + 1} / {scenes.length}
            </span>
            <button className="tour-nav-btn" onClick={handleNextScene} title="Próxima imagem">
              <ChevronRight size={28} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
