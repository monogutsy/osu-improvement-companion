import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LuClipboardList, LuMap } from 'react-icons/lu';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import EmptyState from '../components/ui/EmptyState';
import Input from '../components/ui/Input';
import PageHeader from '../components/shared/PageHeader';
import { useAppContext } from '../context/AppContext';
import { generateRecommendations, formatStars, safeNumber } from '../utils/osu';

export default function MapRecommendations() {
  const { activeUser, beatmaps } = useAppContext();
  const navigate = useNavigate();
  const [maxStars, setMaxStars] = useState('');
  const [selectedSkills, setSelectedSkills] = useState([]);
  const [collapsedCategories, setCollapsedCategories] = useState({});

  const personalized = useMemo(() => generateRecommendations(activeUser, beatmaps), [activeUser, beatmaps]);
  const skillOptions = useMemo(
    () => [...new Set(personalized.map((map) => map.skillFocus).filter(Boolean))],
    [personalized]
  );
  const maxAvailableStars = useMemo(
    () => personalized.reduce((max, map) => Math.max(max, safeNumber(map.stars)), 0),
    [personalized]
  );

  const filteredMaps = useMemo(() => {
    return personalized.filter((map) => {
      const skillMatch = !selectedSkills.length || selectedSkills.includes(map.skillFocus);
      const starMatch = maxStars === '' || safeNumber(map.stars) <= safeNumber(maxStars);
      return skillMatch && starMatch;
    });
  }, [personalized, maxStars, selectedSkills]);

  const groupedRecommendations = useMemo(() => {
    return filteredMaps.reduce((acc, map) => {
      if (!acc[map.category]) {
        acc[map.category] = [];
      }
      acc[map.category].push(map);
      return acc;
    }, {});
  }, [filteredMaps]);

  const categories = useMemo(() => Object.keys(groupedRecommendations), [groupedRecommendations]);

  const toggleSkill = (skill) => {
    setSelectedSkills((current) =>
      current.includes(skill) ? current.filter((entry) => entry !== skill) : [...current, skill]
    );
  };

  return (
    <div className="page-stack">
      <PageHeader
        eyebrow="Discovery Engine"
        title="Map Recommendation Engine"
        description="Profile-driven suggestions generated from your saved planner maps."
      />

      {!activeUser || !beatmaps.length ? (
        <EmptyState
          icon={<LuMap />}
          title="No recommendations available"
          message={activeUser ? 'Add beatmaps to your planner before generating map recommendations.' : 'Load a profile and add planner maps before generating recommendations.'}
          action={<Button onClick={() => navigate('/planner')}><LuClipboardList /> Open Planner</Button>}
        />
      ) : null}

      {personalized.length ? (
        <div className="dashboard-grid">
          <Card className="filter-panel">
            <Input
              label={maxStars === '' ? 'Max Stars: All saved maps' : `Max Stars: ${Number(maxStars).toFixed(1)} stars`}
              type="range"
              min="0"
              max={Math.max(maxAvailableStars, 1)}
              step="0.1"
              value={maxStars === '' ? Math.max(maxAvailableStars, 1) : maxStars}
              onChange={(event) => setMaxStars(event.target.value)}
            />
            <Button variant="ghost" size="sm" onClick={() => setMaxStars('')}>
              Show All Stars
            </Button>
            {skillOptions.length ? (
              <div>
                <p className="field__label">Skill Focus</p>
                <div className="pill-row">
                  {skillOptions.map((skill) => (
                    <button
                      key={skill}
                      type="button"
                      className={`pill ${selectedSkills.includes(skill) ? 'pill--active' : ''}`}
                      onClick={() => toggleSkill(skill)}
                    >
                      {skill}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
          </Card>

          <div className="recommendation-stack">
            {categories.length ? (
              categories.map((category) => {
                const maps = groupedRecommendations[category] ?? [];
                const collapsed = Boolean(collapsedCategories[category]);
                return (
                  <Card key={category} className="recommendation-section">
                    <button
                      type="button"
                      className="recommendation-section__toggle"
                      onClick={() => setCollapsedCategories((current) => ({ ...current, [category]: !collapsed }))}
                    >
                      <span>{category}</span>
                      <span>{collapsed ? 'Expand' : 'Collapse'}</span>
                    </button>
                    {!collapsed ? (
                      <div className="recommendation-grid">
                        {maps.map((map) => (
                          <Card key={`${category}-${map.id}`}>
                            <div className="beatmap-card__header">
                              <div>
                                <h3>{map.name}</h3>
                                <p>{map.artist}</p>
                              </div>
                              <Badge color="yellow">{formatStars(map.stars, 2)}</Badge>
                            </div>
                            <p>{map.difficulty || 'N/A'}</p>
                            <div className="pill-row">
                              {map.skillFocus ? <Badge color="purple">{map.skillFocus}</Badge> : null}
                              {map.priority ? <Badge color="blue">{map.priority}</Badge> : null}
                            </div>
                            <p className="recommendation-reason">{map.reason}</p>
                            <Button className="full-width" onClick={() => navigate('/planner')}>
                              <LuClipboardList /> Open Planner
                            </Button>
                          </Card>
                        ))}
                      </div>
                    ) : null}
                  </Card>
                );
              })
            ) : (
              <EmptyState
                icon={<LuMap />}
                title="No maps match your filters"
                message="Clear the star or skill filters to see available planner-based recommendations."
              />
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
