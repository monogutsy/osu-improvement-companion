import { useMemo, useState } from 'react';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import EmptyState from '../components/ui/EmptyState';
import Input from '../components/ui/Input';
import Modal from '../components/ui/Modal';
import PageHeader from '../components/shared/PageHeader';
import { useAppContext } from '../context/AppContext';
import { normalizeSkin } from '../utils/osu';

const initialSkin = {
  name: '',
  author: '',
  version: '',
  notes: '',
  imageUrl: '',
};

export default function SkinManager() {
  const { skins, setSkins, addActivity, showToast } = useAppContext();
  const [showModal, setShowModal] = useState(false);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('All Skins');
  const [form, setForm] = useState(initialSkin);
  const [errors, setErrors] = useState({});
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [brokenImages, setBrokenImages] = useState({});

  const recentSkins = useMemo(() => {
    return [...skins]
      .map(normalizeSkin)
      .sort((a, b) => new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime())
      .slice(0, 5);
  }, [skins]);

  const sortedSkins = useMemo(() => {
    return [...skins].map(normalizeSkin).sort((a, b) => {
      if (a.favorite !== b.favorite) return a.favorite ? -1 : 1;
      return new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime();
    });
  }, [skins]);

  const filteredSkins = useMemo(() => {
    return sortedSkins.filter((skin) => {
      const matchesSearch =
        skin.name.toLowerCase().includes(search.toLowerCase()) ||
        skin.author.toLowerCase().includes(search.toLowerCase());
      const matchesTab =
        activeTab === 'All Skins' ||
        (activeTab === 'Favorites' && skin.favorite) ||
        (activeTab === 'Recently Added' && recentSkins.some((entry) => entry.id === skin.id));
      return matchesSearch && matchesTab;
    });
  }, [sortedSkins, recentSkins, search, activeTab]);

  const openCreateModal = () => {
    setEditingId(null);
    setForm(initialSkin);
    setErrors({});
    setShowModal(true);
  };

  const openEditModal = (skin) => {
    setEditingId(skin.id);
    setForm({
      name: skin.name,
      author: skin.author,
      version: skin.version,
      notes: skin.notes,
      imageUrl: skin.imageUrl,
    });
    setErrors({});
    setShowModal(true);
  };

  const handleFileUpload = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setForm((current) => ({ ...current, imageUrl: String(reader.result) }));
    };
    reader.readAsDataURL(file);
  };

  const submitSkin = (event) => {
    event.preventDefault();
    const nextErrors = {};
    if (!form.name.trim()) nextErrors.name = 'Skin name is required.';
    if (!form.author.trim()) nextErrors.author = 'Author is required.';
    if (!form.imageUrl.trim()) nextErrors.imageUrl = 'Provide an image URL or upload a file.';
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;

    const now = new Date().toISOString();
    const payload = {
      id: editingId ?? crypto.randomUUID(),
      name: form.name.trim(),
      author: form.author.trim(),
      version: form.version.trim(),
      notes: form.notes.trim(),
      imageUrl: form.imageUrl.trim(),
      favorite: editingId ? skins.find((skin) => skin.id === editingId)?.favorite ?? false : false,
      addedAt: editingId ? skins.find((skin) => skin.id === editingId)?.addedAt ?? now : now,
      updatedAt: now,
    };

    setSkins((current) => {
      if (editingId) {
        return current.map((skin) => (skin.id === editingId ? { ...normalizeSkin(skin), ...payload } : skin));
      }
      return [payload, ...current];
    });

    addActivity(`${editingId ? 'Updated' : 'Added'} skin '${payload.name}' by ${payload.author}`);
    showToast(editingId ? 'Skin updated.' : 'Skin added.');
    setForm(initialSkin);
    setShowModal(false);
  };

  const toggleFavorite = (id) => {
    setSkins((current) =>
      current.map((skin) =>
        skin.id === id
          ? { ...normalizeSkin(skin), favorite: !normalizeSkin(skin).favorite, updatedAt: new Date().toISOString() }
          : skin
      )
    );
    addActivity('Updated skin favorite status');
    showToast('Skin updated.');
  };

  const deleteSkin = () => {
    if (!deleteTarget) return;
    setSkins((current) => current.filter((skin) => skin.id !== deleteTarget.id));
    addActivity(`Deleted skin ${deleteTarget.name}`);
    showToast('Skin removed.', 'error');
    setDeleteTarget(null);
  };

  const favorites = sortedSkins.filter((skin) => skin.favorite);

  return (
    <div className="page-stack">
      <PageHeader
        eyebrow="Visual Locker"
        title="Skin Manager"
        description="Store your favorite layouts, compare looks, and keep previews on hand."
        action={<Button onClick={openCreateModal}>Add Skin</Button>}
      />

      <Card className="filter-bar">
        <Input
          label="Search"
          value={search}
          placeholder="Search by skin name or author"
          onChange={(event) => setSearch(event.target.value)}
        />
        <div className="skin-tabs">
          {['All Skins', 'Favorites', 'Recently Added'].map((tab) => (
            <button
              key={tab}
              type="button"
              className={`pill ${activeTab === tab ? 'pill--active' : ''}`}
              onClick={() => setActiveTab(tab)}
            >
              {tab}
            </button>
          ))}
        </div>
      </Card>

      <div className="dashboard-grid">
        <Card>
          <div className="section-heading">
            <h3>All Skins</h3>
            <span>{sortedSkins.length} total</span>
          </div>
          {filteredSkins.length ? (
            <div className="skin-grid">
              {filteredSkins.map((skin) => (
                <Card key={skin.id} className="skin-card">
                  <SkinPreview skin={skin} brokenImages={brokenImages} setBrokenImages={setBrokenImages} />
                  <div className="skin-card__body">
                    <div className="beatmap-card__header">
                      <div>
                        <h3>{skin.name}</h3>
                        <p>{skin.author}</p>
                      </div>
                      <button
                        type="button"
                        className="icon-button"
                        onClick={() => toggleFavorite(skin.id)}
                        aria-label="Toggle favorite"
                      >
                        {skin.favorite ? 'Favorite' : 'Mark favorite'}
                      </button>
                    </div>
                    <p>{skin.notes || 'No notes added for this skin yet.'}</p>
                    <p className="muted-line">{skin.version ? `Version ${skin.version}` : 'No version noted'} - Updated {new Date(skin.updatedAt).toLocaleDateString()}</p>
                    <div className="form-actions">
                      <Button variant="secondary" size="sm" onClick={() => openEditModal(skin)}>
                        Edit
                      </Button>
                      <Button variant="danger" size="sm" onClick={() => setDeleteTarget(skin)}>
                        Delete
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <EmptyState
              title="No skins match your filters"
              message="Try a broader search or switch tabs."
              action={<Button onClick={openCreateModal}>Add Skin</Button>}
            />
          )}
        </Card>

        <Card>
          <div className="section-heading">
            <h3>Favorites</h3>
            <span>{favorites.length} favorited</span>
          </div>
          {favorites.length ? (
            <div className="skin-preview-list">
              {favorites.slice(0, 3).map((skin) => (
                <div key={skin.id} className="dashboard-list__item dashboard-list__item--skin">
                  <img
                    src={skin.imageUrl}
                    alt={skin.name}
                    className="dashboard-list__thumb"
                    onError={(event) => {
                      event.currentTarget.style.display = 'none';
                    }}
                  />
                  <div>
                    <strong>{skin.name}</strong>
                    <p>{skin.author}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState title="No favorite skins yet" message="Mark a skin as favorite to pin it here." />
          )}

          <div className="section-heading section-heading--spaced">
            <h3>Recently Added</h3>
            <span>Last 5 entries</span>
          </div>
          {recentSkins.length ? (
            <div className="skin-preview-list">
              {recentSkins.map((skin) => (
                <div key={`recent-${skin.id}`} className="dashboard-list__item dashboard-list__item--skin">
                  <img
                    src={skin.imageUrl}
                    alt={skin.name}
                    className="dashboard-list__thumb"
                    onError={(event) => {
                      event.currentTarget.style.display = 'none';
                    }}
                  />
                  <div>
                    <strong>{skin.name}</strong>
                    <p>{skin.author}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="muted-line">No skins added yet.</p>
          )}
        </Card>
      </div>

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editingId ? 'Edit Skin' : 'Add Skin'}>
        <form className="form-grid" onSubmit={submitSkin}>
          <Input
            label="Name"
            value={form.name}
            error={errors.name}
            onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
          />
          <Input
            label="Author"
            value={form.author}
            error={errors.author}
            onChange={(event) => setForm((current) => ({ ...current, author: event.target.value }))}
          />
          <Input
            label="Version"
            value={form.version}
            onChange={(event) => setForm((current) => ({ ...current, version: event.target.value }))}
          />
          <Input
            label="Notes"
            as="textarea"
            rows="4"
            value={form.notes}
            onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
          />
          <Input
            label="Image URL"
            value={form.imageUrl}
            error={errors.imageUrl}
            onChange={(event) => setForm((current) => ({ ...current, imageUrl: event.target.value }))}
          />
          <label className="field">
            <span className="field__label">Upload file</span>
            <input className="field__input" type="file" accept="image/*" onChange={handleFileUpload} />
          </label>
          <div className="form-actions">
            <Button variant="secondary" onClick={() => setShowModal(false)}>
              Cancel
            </Button>
            <Button type="submit">{editingId ? 'Save Changes' : 'Add Skin'}</Button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={Boolean(deleteTarget)} onClose={() => setDeleteTarget(null)} title="Delete skin?">
        <p>This removes the saved preview permanently.</p>
        <div className="form-actions">
          <Button variant="secondary" onClick={() => setDeleteTarget(null)}>
            Cancel
          </Button>
          <Button variant="danger" onClick={deleteSkin}>
            Delete
          </Button>
        </div>
      </Modal>
    </div>
  );
}

function SkinPreview({ skin, brokenImages, setBrokenImages }) {
  const broken = brokenImages[skin.id];
  if (broken || !skin.imageUrl) {
    return <div className="skin-card__fallback">No preview available</div>;
  }

  return (
    <img
      src={skin.imageUrl}
      alt={skin.name}
      className="skin-card__image"
      onError={() => setBrokenImages((current) => ({ ...current, [skin.id]: true }))}
    />
  );
}
