import { useEffect, useMemo, useState } from 'react';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import ProgressBar from '../components/ui/ProgressBar';
import Badge from '../components/ui/Badge';
import Input from '../components/ui/Input';
import PageHeader from '../components/shared/PageHeader';
import { useAppContext } from '../context/AppContext';
import { calculateReplayAnalysis, getPerformanceLabel, safeNumber } from '../utils/osu';

const initialReplay = {
  accuracy: '',
  misses: '',
  achievedCombo: '',
  maxCombo: '',
  unstableRate: '',
  starRating: '',
};

export default function ReplayAnalyzer() {
  const { activeUser, addActivity, showToast, lastReplay, setLastReplay } = useAppContext();
  const [form, setForm] = useState(initialReplay);
  const [errors, setErrors] = useState({});
  const [analysis, setAnalysis] = useState(() => (lastReplay?.scores ? lastReplay : null));

  useEffect(() => {
    setAnalysis(lastReplay?.scores ? lastReplay : null);
  }, [lastReplay]);

  const handleSubmit = (event) => {
    event.preventDefault();
    const nextErrors = validate(form);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;

    const payload = {
      accuracy: safeNumber(form.accuracy),
      misses: safeNumber(form.misses),
      achievedCombo: safeNumber(form.achievedCombo),
      maxCombo: safeNumber(form.maxCombo),
      unstableRate: safeNumber(form.unstableRate),
      starRating: safeNumber(form.starRating),
    };

    const nextAnalysis = calculateReplayAnalysis(payload, activeUser);
    setAnalysis(nextAnalysis);
    setLastReplay(nextAnalysis);
    addActivity(`Analyzed replay: ${payload.accuracy}% accuracy, ${payload.misses} misses`);
    showToast('Replay analysis generated.');
  };

  const label = useMemo(() => (analysis ? getPerformanceLabel(analysis.scores.overall) : null), [analysis]);
  const displayedScores = analysis?.scores ?? {
    overall: 0,
    accuracy: 0,
    combo: 0,
    consistency: 0,
    miss: 0,
  };

  return (
    <div className="page-stack">
      <PageHeader
        eyebrow="Review Lab"
        title="Replay Analyzer"
        description="Translate raw replay stats into scored feedback and targeted suggestions."
      />

      <div className="two-column-grid">
        <Card>
          <form className="form-grid" onSubmit={handleSubmit}>
            <Input
              label="Accuracy"
              type="number"
              min="0"
              max="100"
              step="0.01"
              value={form.accuracy}
              error={errors.accuracy}
              onChange={(event) => setForm((current) => ({ ...current, accuracy: event.target.value }))}
            />
            <Input
              label="Miss Count"
              type="number"
              min="0"
              step="1"
              value={form.misses}
              error={errors.misses}
              onChange={(event) => setForm((current) => ({ ...current, misses: event.target.value }))}
            />
            <Input
              label="Achieved Combo"
              type="number"
              min="0"
              step="1"
              value={form.achievedCombo}
              error={errors.achievedCombo}
              onChange={(event) => setForm((current) => ({ ...current, achievedCombo: event.target.value }))}
            />
            <Input
              label="Max Combo (map)"
              type="number"
              min="1"
              step="1"
              value={form.maxCombo}
              error={errors.maxCombo}
              onChange={(event) => setForm((current) => ({ ...current, maxCombo: event.target.value }))}
            />
            <Input
              label="Unstable Rate"
              type="number"
              min="0"
              max="300"
              step="0.01"
              value={form.unstableRate}
              error={errors.unstableRate}
              onChange={(event) => setForm((current) => ({ ...current, unstableRate: event.target.value }))}
            />
            <Input
              label="Star Rating"
              type="number"
              min="0.1"
              max="15"
              step="0.1"
              value={form.starRating}
              error={errors.starRating}
              onChange={(event) => setForm((current) => ({ ...current, starRating: event.target.value }))}
            />
            <Button type="submit">Generate Analysis</Button>
          </form>
        </Card>

        <Card>
          <div className="analysis-panel">
            <div className="gauge">
              <div className="gauge__ring" style={{ '--gauge-value': `${displayedScores.overall}%` }}>
                <strong>{displayedScores.overall.toFixed(1)}</strong>
              </div>
              <Badge color={label?.color ?? 'ghost'}>{label?.label ?? 'No replay analyzed'}</Badge>
              <p className="muted-line">{analysis?.label?.label ?? 'Submit replay stats to generate live feedback.'}</p>
            </div>
            <div className="analysis-stack">
              <ProgressBar value={displayedScores.accuracy} max={100} color="blue" label="Accuracy Score" />
              <ProgressBar value={displayedScores.combo} max={100} color="purple" label="Combo Score" />
              <ProgressBar value={displayedScores.consistency} max={100} color="gradient" label="Consistency Score" />
              <ProgressBar value={displayedScores.miss} max={100} color="blue" label="Miss Score" />
            </div>
          </div>
        </Card>
      </div>

      {analysis ? (
        <>
          <Card>
            <div className="section-heading">
              <h3>Dynamic Suggestions</h3>
              <span>Generated from the submitted values</span>
            </div>
            <div className="tips-list">
              {analysis.suggestions.map((tip) => (
                <div key={tip} className="tip-card">
                  {tip}
                </div>
              ))}
            </div>
          </Card>

          <div className="three-column-grid">
            <MetricColumn title="Strengths" items={analysis.strengths} tone="green" />
            <MetricColumn title="Weaknesses" items={analysis.weaknesses} tone="pink" />
            <MetricColumn title="Improvement Areas" items={analysis.improvementAreas} tone="yellow" />
          </div>
        </>
      ) : null}
    </div>
  );
}

function validate(form) {
  const errors = {};
  const accuracy = Number(form.accuracy);
  const misses = Number(form.misses);
  const achievedCombo = Number(form.achievedCombo);
  const maxCombo = Number(form.maxCombo);
  const unstableRate = Number(form.unstableRate);
  const starRating = Number(form.starRating);

  if (!Number.isFinite(accuracy) || accuracy < 0 || accuracy > 100) errors.accuracy = 'Enter a value from 0 to 100.';
  if (!Number.isFinite(misses) || misses < 0) errors.misses = 'Miss count must be 0 or higher.';
  if (!Number.isFinite(achievedCombo) || achievedCombo < 0) errors.achievedCombo = 'Combo must be 0 or higher.';
  if (!Number.isFinite(maxCombo) || maxCombo < 1) errors.maxCombo = 'Max combo must be at least 1.';
  if (!Number.isFinite(unstableRate) || unstableRate < 0 || unstableRate > 300) {
    errors.unstableRate = 'Unstable rate must be between 0 and 300.';
  }
  if (!Number.isFinite(starRating) || starRating < 0.1 || starRating > 15) {
    errors.starRating = 'Star rating must be between 0.1 and 15.';
  }

  return errors;
}

function MetricColumn({ title, items, tone }) {
  return (
    <Card>
      <div className="section-heading">
        <h3>{title}</h3>
        <span>{items.length} items</span>
      </div>
      <div className="metric-list">
        {items.length ? items.map((item) => <MetricRow key={item.key} item={item} tone={tone} />) : <p className="muted-line">No items in this group.</p>}
      </div>
    </Card>
  );
}

function MetricRow({ item, tone }) {
  return (
    <div className="metric-row">
      <span className={`metric-row__dot metric-row__dot--${tone}`} />
      <div>
        <strong>{item.key}</strong>
        <p>{item.score.toFixed(0)}/100</p>
      </div>
    </div>
  );
}
