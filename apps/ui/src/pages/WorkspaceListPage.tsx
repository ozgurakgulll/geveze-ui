import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { CreateWorkspaceDialog } from './CreateWorkspaceDialog';
import type { Workspace } from '@/types';

function WorkspaceCard({ workspace, onClick }: { workspace: Workspace; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col gap-3 p-5 bg-white border border-gray-200 rounded-xl hover:border-indigo-400 hover:shadow-md transition-all text-left"
    >
      <div
        className="w-12 h-12 rounded-xl flex items-center justify-center text-white text-lg font-bold"
        style={{ backgroundColor: workspace.color }}
      >
        {workspace.icon ?? workspace.name.charAt(0).toUpperCase()}
      </div>
      <div>
        <h3 className="font-semibold text-gray-900">{workspace.name}</h3>
        {workspace.description && (
          <p className="text-sm text-gray-500 mt-0.5 line-clamp-2">{workspace.description}</p>
        )}
        <p className="text-xs text-gray-400 mt-2">{workspace.members.length} üye</p>
      </div>
    </button>
  );
}

export function WorkspaceListPage() {
  const { workspaces, isLoading, setCurrentWorkspaceById } = useWorkspace();
  const navigate = useNavigate();
  const [showCreate, setShowCreate] = useState(false);

  const handleSelect = (id: string) => {
    setCurrentWorkspaceById(id);
    navigate(`/workspaces/${id}/dashboard`);
  };

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p className="text-gray-500">Yükleniyor…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-indigo-600 flex items-center justify-center">
              <Star className="h-5 w-5 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Çalışma Alanları</h1>
          </div>
        </div>

        {/* Liste */}
        {workspaces.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-16 h-16 rounded-2xl bg-indigo-50 flex items-center justify-center mb-4">
              <Star className="h-8 w-8 text-indigo-400" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900 mb-1">
              Henüz çalışma alanı yok
            </h2>
            <p className="text-gray-500 mb-6 max-w-xs">
              İlk çalışma alanını oluşturarak başla.
            </p>
            <Button onClick={() => setShowCreate(true)}>
              <Plus className="h-4 w-4 mr-1" />
              Çalışma Alanı Oluştur
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {workspaces.map(ws => (
              <WorkspaceCard
                key={ws.id}
                workspace={ws}
                onClick={() => handleSelect(ws.id)}
              />
            ))}
            <button
              onClick={() => setShowCreate(true)}
              className="flex flex-col items-center justify-center gap-2 p-5 border-2 border-dashed border-gray-200 rounded-xl hover:border-indigo-400 hover:bg-indigo-50/50 transition-all text-gray-400 hover:text-indigo-500"
            >
              <Plus className="h-6 w-6" />
              <span className="text-sm font-medium">Yeni ekle</span>
            </button>
          </div>
        )}
      </div>

      <CreateWorkspaceDialog
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onCreated={(id) => navigate(`/workspaces/${id}/dashboard`)}
      />
    </div>
  );
}
