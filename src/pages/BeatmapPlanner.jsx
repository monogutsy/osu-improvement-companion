import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import EmptyState from '../components/ui/EmptyState';
import Input from '../components/ui/Input';
import Modal from '../components/ui/Modal';
import ProgressBar from '../components/ui/ProgressBar';
import PageHeader from '../components/shared/PageHeader';
import { useAppContext } from '../context/AppContext';
import { buildBeatmapFromRecommendation, isOverdue, isSameDay, isWithinLastDays, normalizeBeatmap, safeNumber, todayString } from '../utils/osu';

const initialForm = {
  name: '',
  artist: '',
  difficulty: '',
  stars: '',
  skillFocus: '',
  goal: '',
  targetAccuracy: '',
  targetCombo: '',
  priority: 'Medium',
  deadline: '',
};

export default function BeatmapPlanner() {
  const { beatmaps, setBeatmaps, addActivity, showToast } = useAppContext();
  const location = useLocation();
  const navigate = useNavigate();
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(initialForm);
  const [errors, setErrors] = useState({});
  const [search, setSearch] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [deleteTarget, setDeleteTarget] = useState(null);

  useEffect(() => {
    const prefill = location.state?.prefill;
    if (prefill) {
      setEditingId(null);
      setForm({
        ...initialForm,
        ...buildBeatmapFromRecommendation(prefill, {
          goal: `Practice ${prefill.skillFocus?.toLowerCase() ?? 'this map'} with a focus on clean reps.`,
        }),
        name: prefill.name,
        artist: prefill.artist,
        difficulty: prefill.difficulty,
        stars: prefill.stars,
        skillFocus: prefill.skillFocus,
      });
      setErrors({});
      setShowModal(true);
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.pathname, location.state, navigate]);

  const normalizedBeatmaps = useMemo(() => beatmaps.map(normalizeBeatmap), [beatmaps]);

  const plannerStats = useMemo(() => {
    const total = normalizedBeatmaps.length;
    const completed = normalizedBeatmaps.filter((beatmap) => beatmap.completed).length;
    const active = total - completed;
    const dueToday = normalizedBeatmaps.filter((beatmap) => isSameDay(beatmap.deadline));
    const overdue = normalizedBeatmaps.filter((beatmap) => isOverdue(beatmap.deadline, beatmap.completed));
    const completionRate = total ? (completed / total) * 100 : 0;
    const weeklyCompleted = normalizedBeatmaps.filter((beatmap) => beatmap.completed && isWithinLastDays(beatmap.completedAt, 7)).length;
    const previousWeekCompleted = normalizedBeatmaps.filter(
      (beatmap) =>
        beatmap.completed &&
        beatmap.completedAt &&
        !isWithinLastDays(beatmap.completedAt, 7) &&
        isWithinLastDays(beatmap.completedAt, 14)
    ).length;

    return { total, completed, active, dueToday, overdue, completionRate, weeklyCompleted, previousWeekCompleted };
  }, [normalizedBeatmaps]);

  const filteredBeatmaps = useMemo(() => {
    return normalizedBeatmaps.filter((beatmap) => {
      const matchesSearch =
        beatmap.name.toLowerCase().includes(search.toLowerCase()) ||
        beatmap.artist.toLowerCase().includes(search.toLowerCase()) ||
        beatmap.skillFocus.toLowerCase().includes(search.toLowerCase());
      const matchesPriority = priorityFilter === 'All' || beatmap.priority === priorityFilter;
      const matchesStatus =
        statusFilter === 'All' ||
        (statusFilter === 'Active' && !beatmap.completed) ||
        (statusFilter === 'Completed' && beatmap.completed) ||
        (statusFilter === 'Due Today' && isSameDay(beatmap.deadline)) ||
        (statusFilter === 'Overdue' && isOverdue(beatmap.deadline, beatmap.completed));
      return matchesSearch && matchesPriority && matchesStatus;
    });
  }, [normalizedBeatmaps, search, priorityFilter, statusFilter]);

  const openCreateModal = () => {
    setEditingId(null);
    setForm(initialForm);
    setErrors({});
    setShowModal(true);
  };

  const openEditModal = (beatmap) => {
    setEditingId(beatmap.id);
    setForm({
      name: beatmap.name,
      artist: beatmap.artist,
      difficulty: beatmap.difficulty,
      stars: beatmap.stars,
      skillFocus: beatmap.skillFocus,
      goal: beatmap.goal,
      targetAccuracy: beatmap.targetAccuracy,
      targetCombo: beatmap.targetCombo,
      priority: beatmap.priority,
      deadline: beatmap.deadline,
    });
    setErrors({});
    setShowModal(true);
  };

  const validate = () => {
    const nextErrors = {};
    if (!form.name.trim()) nextErrors.name = 'Beatmap name is required.';
    if (!form.artist.trim()) nextErrors.artist = 'Artist is required.';
    if (!form.skillFocus.trim()) nextErrors.skillFocus = 'Skill focus is required.';
    if (form.stars === '' || Number(form.stars) <= 0 || Number(form.stars) > 15) {
      nextErrors.stars = 'Star rating must be between 0.1 and 15.';
    }
    if (!form.priority) nextErrors.priority = 'Priority is required.';
    const targetAccuracy = Number(form.targetAccuracy);
    const targetCombo = Number(form.targetCombo);
    if (form.targetAccuracy !== '' && (!Number.isFinite(targetAccuracy) || targetAccuracy < 0 || targetAccuracy > 100)) {
      nextErrors.targetAccuracy = 'Target accuracy must be between 0 and 100.';
    }
    if (form.targetCombo !== '' && (!Number.isFinite(targetCombo) || targetCombo < 0)) {
      nextErrors.targetCombo = 'Target combo must be 0 or higher.';
    }
    return nextErrors;
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    const nextErrors = validate();
    setErrors(nextErrors);

    if (Object.keys(nextErrors).length) {
      return;
    }

    const basePayload = {
      id: editingId ?? crypto.randomUUID(),
      name: form.name.trim(),
      artist: form.artist.trim(),
      difficulty: form.difficulty.trim(),
      stars: Number(form.stars),
      skillFocus: form.skillFocus.trim(),
      goal: form.goal.trim(),
      targetAccuracy: safeNumber(form.targetAccuracy),
      targetCombo: safeNumber(form.targetCombo),
      priority: form.priority,
      deadline: form.deadline,
      completed: false,
      completedAt: null,
      addedAt: new Date().toISOString(),
    };

    setBeatmaps((current) => {
      if (editingId) {
        return current.map((beatmap) =>
          beatmap.id === editingId
            ? {
                ...normalizeBeatmap(beatmap),
                ...basePayload,
                completed: beatmap.completed,
                completedAt: beatmap.completedAt,
                addedAt: beatmap.addedAt,
              }
            : beatmap
        );
      }
      return [basePayload, ...current];
    });

    addActivity(`${editingId ? 'Updated' : 'Added'} beatmap ${basePayload.name}`);
    showToast(editingId ? 'Beatmap updated.' : 'Beatmap added.');
    setShowModal(false);
  };

  const toggleComplete = (id) => {
    setBeatmaps((current) =>
      current.map((beatmap) => {
        if (beatmap.id !== id) return beatmap;
        const completed = !beatmap.completed;
        return {
          ...normalizeBeatmap(beatmap),
          completed,
          completedAt: completed ? new Date().toISOString() : null,
        };
      })
    );

    const target = normalizedBeatmaps.find((beatmap) => beatmap.id === id);
    if (target) {
      addActivity(`${target.completed ? 'Reopened' : 'Completed'} '${target.name}' in practice planner`);
    }
    showToast('Practice goal updated.');
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
    setBeatmaps((current) => current.filter((beatmap) => beatmap.id !== deleteTarget.id));
    addActivity(`Deleted beatmap ${deleteTarget.name}`);
    showToast('Beatmap removed.', 'error');
    setDeleteTarget(null);
  };

  const todaysBeatmaps = plannerStats.dueToday;

  return (
    <div className="page-stack">
      <PageHeader
        eyebrow="Session Builder"
        title="Beatmap Practice Planner"
        description="Organize your grind list, mark clears, and keep the next improvement target obvious."
        action={<Button onClick={openCreateModal}>Add Beatmap</Button>}
      />

      <Card className="planner-stats-bar">
        <div>
          <strong>{plannerStats.total}</strong>
          <span>Total Maps</span>
        </div>
        <div>
          <strong>{plannerStats.active}</strong>
          <span>Active Maps</span>
        </div>
        <div>
          <strong>{plannerStats.completed}</strong>
          <span>Completed Maps</span>
        </div>
        <div>
          <strong>{plannerStats.completionRate.toFixed(1)}%</strong>
          <span>Completion Rate</span>
        </div>
        <div>
          <strong>{todaysBeatmaps.length}</strong>
          <span>Due Today</span>
        </div>
        <div>
          <strong>{plannerStats.overdue.length}</strong>
          <span>Overdue</span>
        </div>
      </Card>

      {todaysBeatmaps.length ? (
        <Card>
          <div className="section-heading">
            <h3>Today's Practice</h3>
            <span>{todayString()}</span>
          </div>
          <div className="planner-grid">
            {todaysBeatmaps.map((beatmap) => (
              <Card key={`today-${beatmap.id}`} className={`beatmap-card ${beatmap.completed ? 'beatmap-card--done' : ''}`}>
                <div className="beatmap-card__header">
                  <div>
                    <h3>{beatmap.name}</h3>
                    <p>{beatmap.artist}</p>
                  </div>
                  <Badge color={beatmap.priority === 'High' ? 'pink' : beatmap.priority === 'Medium' ? 'yellow' : 'blue'}>
                    {beatmap.priority}
                  </Badge>
                </div>
                <p>{beatmap.skillFocus} - {beatmap.difficulty}</p>
                <Button variant="secondary" size="sm" onClick={() => toggleComplete(beatmap.id)}>
                  {beatmap.completed ? 'Reopen' : 'Complete'}
                </Button>
              </Card>
            ))}
          </div>
        </Card>
      ) : null}

      <Card className="planner-weekly-card">
        <div className="section-heading">
          <h3>Weekly Completion Rate</h3>
          <span>You completed {plannerStats.weeklyCompleted} maps this week</span>
        </div>
        <ProgressBar
          value={plannerStats.weeklyCompleted}
          max={Math.max(plannerStats.previousWeekCompleted || 1, plannerStats.weeklyCompleted || 1)}
          color="gradient"
          label={`Previous week: ${plannerStats.previousWeekCompleted}`}
        />
      </Card>

      <Card className="filter-bar">
        <Input
          label="Search"
          placeholder="Search by beatmap, artist, or skill"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        <Input
          label="Priority"
          as="select"
          value={priorityFilter}
          onChange={(event) => setPriorityFilter(event.target.value)}
        >
          <option>All</option>
          <option>Low</option>
          <option>Medium</option>
          <option>High</option>
        </Input>
        <Input
          label="Status"
          as="select"
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value)}
        >
          <option>All</option>
          <option>Active</option>
          <option>Completed</option>
          <option>Due Today</option>
          <option>Overdue</option>
        </Input>
      </Card>

      {filteredBeatmaps.length ? (
        <div className="planner-grid">
          {filteredBeatmaps.map((beatmap) => (
            <Card key={beatmap.id} className={`beatmap-card ${beatmap.completed ? 'beatmap-card--done' : ''}`}>
              <div className="beatmap-card__header">
                <div>
                  <h3>{beatmap.name}</h3>
                  <p>{beatmap.artist}</p>
                </div>
                <Badge color={beatmap.priority === 'High' ? 'pink' : beatmap.priority === 'Medium' ? 'yellow' : 'blue'}>
                  {beatmap.priority}
                </Badge>
              </div>
              <div className="beatmap-card__meta">
                <span>{beatmap.difficulty || 'Open difficulty'}</span>
                <span>{beatmap.skillFocus || 'No skill focus'}</span>
                <span className="accent-text">{beatmap.stars.toFixed(1)} stars</span>
              </div>
              <p>{beatmap.goal || 'No custom goal set yet.'}</p>
              {beatmap.targetAccuracy || beatmap.targetCombo ? (
                <p>
                  Target: {beatmap.targetAccuracy ? `${beatmap.targetAccuracy.toFixed(1)}% accuracy` : 'N/A accuracy'} - {beatmap.targetCombo ? `${Number(beatmap.targetCombo).toLocaleString()} combo` : 'N/A combo'}
                </p>
              ) : null}
              <div className="beatmap-card__footer">
                <Button variant="secondary" size="sm" onClick={() => toggleComplete(beatmap.id)}>
                  {beatmap.completed ? 'Reopen' : 'Complete'}
                </Button>
                <Button variant="ghost" size="sm" onClick={() => openEditModal(beatmap)}>
                  Edit
                </Button>
                <Button variant="danger" size="sm" onClick={() => setDeleteTarget(beatmap)}>
                  Delete
                </Button>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState
          title="No beatmaps added yet"
          message="Start building your practice list or add a recommendation directly from the map engine."
          action={<Button onClick={openCreateModal}>Add Beatmap</Button>}
        />
      )}

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editingId ? 'Edit Beatmap' : 'Add Beatmap'}>
        <form className="form-grid" onSubmit={handleSubmit}>
          <Input
            label="Beatmap Name"
            value={form.name}
            error={errors.name}
            onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
          />
          <Input
            label="Artist"
            value={form.artist}
            error={errors.artist}
            onChange={(event) => setForm((current) => ({ ...current, artist: event.target.value }))}
          />
          <Input
            label="Difficulty"
            value={form.difficulty}
            onChange={(event) => setForm((current) => ({ ...current, difficulty: event.target.value }))}
          />
          <Input
            label="Skill Focus"
            value={form.skillFocus}
            error={errors.skillFocus}
            onChange={(event) => setForm((current) => ({ ...current, skillFocus: event.target.value }))}
          />
          <Input
            label="Star Rating"
            type="number"
            min="0.1"
            max="15"
            step="0.1"
            value={form.stars}
            error={errors.stars}
            onChange={(event) => setForm((current) => ({ ...current, stars: event.target.value }))}
          />
          <Input
            label="Practice Goal"
            as="textarea"
            rows="4"
            value={form.goal}
            onChange={(event) => setForm((current) => ({ ...current, goal: event.target.value }))}
          />
          <Input
            label="Target Accuracy"
            type="number"
            min="0"
            max="100"
            step="0.1"
            value={form.targetAccuracy}
            error={errors.targetAccuracy}
            onChange={(event) => setForm((current) => ({ ...current, targetAccuracy: event.target.value }))}
          />
          <Input
            label="Target Combo"
            type="number"
            min="0"
            step="1"
            value={form.targetCombo}
            error={errors.targetCombo}
            onChange={(event) => setForm((current) => ({ ...current, targetCombo: event.target.value }))}
          />
          <Input
            label="Priority"
            as="select"
            value={form.priority}
            error={errors.priority}
            onChange={(event) => setForm((current) => ({ ...current, priority: event.target.value }))}
          >
            <option>Low</option>
            <option>Medium</option>
            <option>High</option>
          </Input>
          <Input
            label="Deadline"
            type="date"
            value={form.deadline}
            onChange={(event) => setForm((current) => ({ ...current, deadline: event.target.value }))}
          />
          <div className="form-actions">
            <Button variant="secondary" onClick={() => setShowModal(false)}>
              Cancel
            </Button>
            <Button type="submit">{editingId ? 'Save Changes' : 'Add Beatmap'}</Button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={Boolean(deleteTarget)} onClose={() => setDeleteTarget(null)} title="Delete beatmap?">
        <p>This removes the map from your practice list permanently.</p>
        <div className="form-actions">
          <Button variant="secondary" onClick={() => setDeleteTarget(null)}>
            Cancel
          </Button>
          <Button variant="danger" onClick={handleDelete}>
            Delete
          </Button>
        </div>
      </Modal>
    </div>
  );
}
