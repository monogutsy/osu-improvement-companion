import { useEffect, useMemo, useState } from 'react';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import ProgressBar from '../components/ui/ProgressBar';
import Input from '../components/ui/Input';
import Modal from '../components/ui/Modal';
import PageHeader from '../components/shared/PageHeader';
import { useAppContext } from '../context/AppContext';
import { safeNumber, todayString } from '../utils/osu';

const milestones = [
  { label: 'Getting Started', target: 25 },
  { label: 'Halfway There', target: 50 },
  { label: 'Almost There', target: 75 },
  { label: 'Goal Reached', target: 100 },
];

export default function PPTracker() {
  const { activeUser, ppData, setPpData, addActivity, showToast } = useAppContext();
  const [currentPP, setCurrentPP] = useState(ppData.currentPP);
  const [goalPP, setGoalPP] = useState(ppData.goalPP);
  const [showClearModal, setShowClearModal] = useState(false);
  const [showMismatchWarning, setShowMismatchWarning] = useState(false);

  useEffect(() => {
    if (activeUser) {
      setCurrentPP(activeUser.pp_raw);
    }
  }, [activeUser]);

  useEffect(() => {
    setGoalPP(ppData.goalPP);
    if (!activeUser && ppData.currentPP) {
      setCurrentPP(ppData.currentPP);
    }
  }, [ppData.goalPP, ppData.currentPP, activeUser]);

  useEffect(() => {
    if (activeUser?.username && ppData.linkedUsername && ppData.linkedUsername !== activeUser.username) {
      setShowMismatchWarning(true);
    } else {
      setShowMismatchWarning(false);
    }
  }, [activeUser?.username, ppData.linkedUsername]);

  const percentage = useMemo(() => {
    if (!goalPP) return 0;
    return Math.min(100, Math.round((safeNumber(currentPP) / safeNumber(goalPP)) * 100));
  }, [currentPP, goalPP]);

  const remaining = Math.max(safeNumber(goalPP) - safeNumber(currentPP), 0);
  const isComplete = safeNumber(currentPP) >= safeNumber(goalPP) && safeNumber(goalPP) > 0;

  const saveProgress = () => {
    const nextEntry = {
      pp: safeNumber(currentPP),
      date: todayString(),
      source: activeUser ? 'api' : 'manual',
    };
    setPpData({
      currentPP: safeNumber(currentPP),
      goalPP: safeNumber(goalPP),
      linkedUsername: activeUser?.username ?? ppData.linkedUsername,
      history: [nextEntry, ...ppData.history].slice(0, 12),
    });
    addActivity(`Set PP goal: ${safeNumber(currentPP)}pp to ${safeNumber(goalPP)}pp`);
    showToast('PP progress saved.');
  };

  const clearHistory = () => {
    setPpData((current) => ({ ...current, history: [] }));
    addActivity('Cleared PP history log');
    showToast('PP history cleared.', 'error');
    setShowClearModal(false);
  };

  const keepOldGoal = () => {
    setShowMismatchWarning(false);
    showToast('Keeping the existing PP goal.');
  };

  const resetForNewUser = () => {
    if (!activeUser) return;
    setCurrentPP(activeUser.pp_raw);
    setPpData((current) => ({
      ...current,
      currentPP: safeNumber(activeUser.pp_raw),
      linkedUsername: activeUser.username,
      history: [{ pp: safeNumber(activeUser.pp_raw), date: todayString(), source: 'api' }, ...current.history].slice(0, 12),
    }));
    setShowMismatchWarning(false);
    addActivity(`Reset PP tracker for @${activeUser.username}`);
    showToast('PP tracker reset for the new user.');
  };

  return (
    <div className="page-stack">
      <PageHeader
        eyebrow="Progress Loop"
        title="PP Goal Tracker"
        description="See how far the climb goes, lock onto milestones, and keep your ranked grind tangible."
      />

      {showMismatchWarning ? (
        <Card className="warning-banner">
          <p>
            This goal was set for @{ppData.linkedUsername}. Update for @{activeUser?.username}?
          </p>
          <div className="form-actions">
            <Button variant="secondary" onClick={keepOldGoal}>Keep Old Goal</Button>
            <Button onClick={resetForNewUser}>Reset for New User</Button>
          </div>
        </Card>
      ) : null}

      <div className="two-column-grid">
        <Card className="form-grid">
          <Input
            label="Current PP"
            type="number"
            value={currentPP}
            onChange={(event) => setCurrentPP(event.target.value)}
            hint={activeUser ? `Auto-filled from @${activeUser.username}'s profile` : 'Enter your current PP manually'}
          />
          <Input
            label="Goal PP"
            type="number"
            value={goalPP}
            onChange={(event) => setGoalPP(event.target.value)}
          />
          <Button onClick={saveProgress}>Save Progress</Button>
        </Card>

        <Card>
          <div className="progress-panel">
            <div className="progress-panel__headline">{percentage}%</div>
            <ProgressBar value={percentage} max={100} color="gradient" label={`${remaining.toLocaleString()} PP remaining`} />
            {isComplete ? <p className="success-line">Goal reached for this profile.</p> : null}
          </div>
        </Card>
      </div>

      <div className="milestone-grid">
        {milestones.map((milestone) => {
          const unlocked = percentage >= milestone.target;
          return (
            <Card key={milestone.label} className={`milestone-card ${unlocked ? 'milestone-card--active' : ''}`}>
              <h3>{milestone.target}%</h3>
              <p>{milestone.label}</p>
              <p>{unlocked ? 'Unlocked' : 'Locked'}</p>
            </Card>
          );
        })}
      </div>

      <Card>
        <div className="section-heading">
          <h3>PP History Log</h3>
          <Button variant="danger" size="sm" onClick={() => setShowClearModal(true)}>
            Clear History
          </Button>
        </div>
        <div className="activity-list">
          {ppData.history.length ? (
            ppData.history.map((entry, index) => (
              <div key={`${entry.date}-${index}`} className="activity-item">
                <strong>{entry.pp} PP</strong>
                <span>{new Date(entry.date).toLocaleDateString()}</span>
              </div>
            ))
          ) : (
            <p className="muted-line">No PP checkpoints saved yet.</p>
          )}
        </div>
      </Card>

      <Modal isOpen={showClearModal} onClose={() => setShowClearModal(false)} title="Clear PP history?">
        <p>This removes every saved PP checkpoint.</p>
        <div className="form-actions">
          <Button variant="secondary" onClick={() => setShowClearModal(false)}>
            Cancel
          </Button>
          <Button variant="danger" onClick={clearHistory}>
            Clear History
          </Button>
        </div>
      </Modal>
    </div>
  );
}
