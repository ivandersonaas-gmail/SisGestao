import React, { useEffect, useRef, useState } from 'react';
import { Trash2 } from 'lucide-react';
import { api } from '../../services/api';

// Declaração para evitar erro de lint com o Pannellum global
/* global pannellum */
export function Tour360({ processId, user }) {
  const [scenes, setScenes] = useState([]);
  const [activeScene, setActiveScene] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  
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
    try {
      const url = await api.uploadFile(file);
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

  if (loading) return <div className="empty">Carregando vistorias...</div>;
  return (
    <div className="tour-container">
      {/* Sidebar de Cenas */}
      <div className="card tour-sidebar" style={{width: '240px', marginBottom: 0, display: 'flex', flexDirection: 'column', padding: '10px'}}>
        <div className="fca mbs10">
          <strong style={{fontSize: '13px'}}>CENAS ({scenes.length})</strong>
          <label className="btn btn-primary btn-sm mla clickable">
            {uploading ? '...' : '+'}
            <input type="file" hidden accept="image/*" onChange={handleUpload} disabled={uploading} />
          </label>
        </div>
        
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
      </div>
    </div>
  );
}
