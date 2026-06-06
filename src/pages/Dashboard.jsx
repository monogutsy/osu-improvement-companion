import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  LuActivity,
  LuClipboardList,
  LuImage,
  LuMap,
  LuMedal,
  LuPlus,
  LuTrendingUp,
  LuUser,
  LuTarget,
  LuGauge,
} from 'react-icons/lu';
import PageHeader from '../components/shared/PageHeader';
import StatCard from '../components/shared/StatCard';
import Card from '../components/ui/Card';
import EmptyState from '../components/ui/EmptyState';
import Button from '../components/ui/Button';
import ProgressBar from '../components/ui/ProgressBar';
import { useAppContext } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import ProfileAvatar from '../components/shared/ProfileAvatar';
import {
  generateRecommendations,
  getCountryFlagEmoji,
  isSameDay,
  formatPP,
  formatNumber,
  formatPercent,
  formatRank,
  formatStars,
} from '../utils/osu';

const shortcuts = [
  { to: '/planner', title: 'Practice Planner', description: 'Build sessions around priority maps.', icon: LuClipboardList },
  { to: '/pp-tracker', title: 'PP Tracker', description: 'Measure your climb to the next milestone.', icon: LuTarget },
  { to: '/recommendations', title: 'Map Finder', description: 'Discover maps driven by your profile.', icon: LuMap },
  { to: '/replay-analyzer', title: 'Replay Analyzer', description: 'Turn raw stats into actionable drills.', icon: LuActivity },
  { to: '/skins', title: 'Skin Vault', description: 'Curate the looks you play your best with.', icon: LuImage },
  { to: '/community', title: 'Community Finder', description: 'Scout nearby grinders and rivals.', icon: LuUser },
];

export default function Dashboard() {
  const { activeUser, ppData, beatmaps, skins, lastReplay, activity } = useAppContext();
  const { refresh } = useAuth();

  const plannerStats = useMemo(() => {
    const total = beatmaps.length;
    const completed = beatmaps.filter((beatmap) => beatmap.completed).length;
    const active = total - completed;
    const today = beatmaps.filter((beatmap) => isSameDay(beatmap.deadline));
    return {
      total,
      completed,
      active,
      today,
      rate: total ? (completed / total) * 100 : 0,
    };
  }, [beatmaps]);

  const recommendations = useMemo(() => generateRecommendations(activeUser, beatmaps).slice(0, 3), [activeUser, beatmaps]);
  const favoriteSkins = useMemo(() => skins.filter((skin) => skin.favorite).slice(0, 3), [skins]);
  const currentPP = activeUser?.pp_raw ?? ppData.currentPP ?? 0;
  const goalPP = ppData.goalPP ?? 0;
  const remaining = Math.max(goalPP - currentPP, 0);
  const goalProgress = goalPP > 0 ? Math.min((currentPP / goalPP) * 100, 100) : 0;
  const replay = lastReplay?.scores ? lastReplay : null;

  return (
    <div className="page-stack">
      <PageHeader
        eyebrow="Command Center"
        title="Dashboard"
        description="A live snapshot of your profile, goals, planner, analyzer, and recommendations."
      />

      <Card className="dashboard-profile-card">
        {activeUser ? (
          <>
            <div className="dashboard-profile-card__header">
              <div className="dashboard-profile-card__identity">
                <ProfileAvatar
                  src={activeUser.avatar_url}
                  name={activeUser.username}
                  className="dashboard-profile-card__avatar"
                />
                <div>
                  <p className="dashboard-kicker">
                    {getCountryFlagEmoji(activeUser.country)}
                  </p>
                  <h2>{activeUser.username}</h2>
                  <p>
                    {formatPP(activeUser.pp_raw)} - {formatRank(activeUser.pp_rank)} - {formatRank(activeUser.pp_country_rank)} country rank
                  </p>
                </div>
              </div>
              <Button variant="secondary" onClick={refresh}>
                Refresh profile
              </Button>
            </div>
            <div className="stats-grid stats-grid--compact">
              <StatCard icon={<LuGauge />} label="Accuracy" value={formatPercent(activeUser.accuracy, 2)} trend={`Level ${safeLevel(activeUser.level)}`} />
              <StatCard icon={<LuTrendingUp />} label="Play Count" value={formatNumber(activeUser.playcount)} trend="Total plays" />
              <StatCard icon={<LuMedal />} label="Ranked Score" value={formatNumber(activeUser.ranked_score)} trend="Lifetime ranked score" />
              <StatCard icon={<LuPlus />} label="Total Score" value={formatNumber(activeUser.total_score)} trend="Lifetime score" />
            </div>
          </>
        ) : (
          <EmptyState icon={<LuUser />} title="No user selected" message="Search a username in the top bar to connect the whole app to a live osu! profile." />
        )}
      </Card>

      <div className="stats-grid">
        <StatCard icon={<LuTarget />} label="Current PP" value={formatPP(currentPP)} trend={activeUser ? `Loaded for @${activeUser.username}` : 'No active profile'} />
        <StatCard
          icon={<LuTarget />}
          label="Remaining to Goal"
          value={goalPP ? formatPP(remaining) : 'Set a goal'}
          trend={goalPP ? `${formatPP(goalPP)} target` : 'No PP goal yet'}
        />
        <StatCard icon={<LuMap />} label="Planner Maps" value={plannerStats.total} trend={`${plannerStats.completed} completed`} />
        <StatCard icon={<LuActivity />} label="Dashboard Activity" value={activity.length} trend="Latest actions" />
      </div>

      <div className="dashboard-grid">
        <Card>
          <div className="section-heading">
            <h3>PP Goal Progress</h3>
            <Link to="/pp-tracker">View full tracker</Link>
          </div>
          {goalPP ? (
            <div className="dashboard-stack">
              <ProgressBar value={goalProgress} max={100} color="gradient" label={`${formatPP(remaining)} remaining`} />
              <p className="muted-line">
                Current PP: {formatPP(currentPP)} - Goal: {formatPP(goalPP)}
              </p>
            </div>
          ) : (
            <EmptyState icon={<LuTarget />} title="Set a PP goal in the PP Tracker" message="No goal is stored yet, so this widget is waiting for your first target." />
          )}
        </Card>

        <Card>
          <div className="section-heading">
            <h3>Practice Planner Summary</h3>
            <Link to="/planner">Go to planner</Link>
          </div>
          <div className="dashboard-stack">
            <p>Total maps: {plannerStats.total}</p>
            <p>Completed: {plannerStats.completed} - Active: {plannerStats.active}</p>
            <p>Today&apos;s maps: {plannerStats.today.length}</p>
            <ProgressBar value={plannerStats.rate} max={100} color="blue" label={`${plannerStats.rate.toFixed(1)}% complete`} />
          </div>
        </Card>

        <Card>
          <div className="section-heading">
            <h3>Recent Replay Analysis</h3>
            <Link to="/replay-analyzer">Analyze a replay</Link>
          </div>
          {replay ? (
            <div className="dashboard-stack">
              <p>Overall score: {replay.scores.overall.toFixed(1)}</p>
              <p>Accuracy rating: {replay.scores.accuracy}/100</p>
              <p>Consistency rating: {replay.scores.consistency}/100</p>
              <p>{replay.label.label}</p>
            </div>
          ) : (
            <EmptyState icon={<LuActivity />} title="No replays analyzed yet" message="Submit a replay and the last analysis will appear here automatically." />
          )}
        </Card>

        <Card>
          <div className="section-heading">
            <h3>Recommended Maps Preview</h3>
            <Link to="/recommendations">See all recommendations</Link>
          </div>
          {activeUser && recommendations.length ? (
            <div className="dashboard-list">
              {recommendations.map((map) => (
                <div key={`${map.category}-${map.id}`} className="dashboard-list__item">
                  <div>
                    <strong>{map.name}</strong>
                    <p>{map.difficulty}</p>
                  </div>
                  <div className="dashboard-list__meta">
                    <span>{formatStars(map.stars, 2)}</span>
                    <span>{map.skillFocus}</span>
                  </div>
                  <p className="muted-line">{map.reason}</p>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={<LuMap />}
              title="No recommendations available"
              message={activeUser ? 'Add beatmaps to your planner so the engine has real map data to evaluate.' : 'Load a profile and add planner maps to generate real recommendations.'}
            />
          )}
        </Card>

        <Card>
          <div className="section-heading">
            <h3>Favorite Skins Preview</h3>
            <Link to="/skins">Open skin manager</Link>
          </div>
          {favoriteSkins.length ? (
            <div className="dashboard-list">
              {favoriteSkins.map((skin) => (
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
            <EmptyState icon={<LuImage />} title="No favorite skins yet" message="Mark a few skins as favorite to surface them here." />
          )}
        </Card>

        <Card>
          <div className="section-heading">
            <h3>Recent Activity</h3>
            <span>Latest 10 actions</span>
          </div>
          {activity.length ? (
            <div className="activity-list">
              {activity.map((item) => (
                <div key={item.id} className="activity-item">
                  <strong>{item.message}</strong>
                  <span>{new Date(item.timestamp).toLocaleString()}</span>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState icon={<LuActivity />} title="No recent activity yet" message="Your saved goals, replay analysis, and planner edits will show up here." />
          )}
        </Card>
      </div>

      <Card>
        <div className="section-heading">
          <h3>Quick Routes</h3>
          <span>Jump into the next task</span>
        </div>
        <div className="shortcut-grid">
          {shortcuts.map((item) => (
            <Link key={item.to} to={item.to} className="shortcut-card">
              <div className="shortcut-card__badge"><item.icon /></div>
              <h4>{item.title}</h4>
              <p>{item.description}</p>
            </Link>
          ))}
        </div>
      </Card>
    </div>
  );
}

function safeLevel(level) {
  return Number.isFinite(Number(level)) ? Number(level).toFixed(1) : '0.0';
}
