import { useEffect, useMemo, useState } from 'react';
import { LuHeart, LuSearch, LuUsers, LuX } from 'react-icons/lu';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import EmptyState from '../components/ui/EmptyState';
import Input from '../components/ui/Input';
import PageHeader from '../components/shared/PageHeader';
import ProfileAvatar from '../components/shared/ProfileAvatar';
import { useAppContext } from '../context/AppContext';
import { formatNumber, formatPercent, formatRank, getCountryFlagEmoji, profileToCommunityPlayer } from '../utils/osu';

export default function CommunityFinder() {
  const { activeUser, profileDirectory, favoritePlayers, setFavoritePlayers, showToast } = useAppContext();
  const [search, setSearch] = useState('');
  const [country, setCountry] = useState('All');
  const [minPP, setMinPP] = useState('');
  const [maxPP, setMaxPP] = useState('');
  const [minRank, setMinRank] = useState('');
  const [maxRank, setMaxRank] = useState('');
  const [activeTab, setActiveTab] = useState('All Players');
  const [comparison, setComparison] = useState([]);

  const loadedPlayers = useMemo(() => {
    const profiles = profileDirectory.length ? profileDirectory : activeUser ? [activeUser] : [];
    return profiles.map(profileToCommunityPlayer).filter(Boolean);
  }, [activeUser, profileDirectory]);

  const countries = useMemo(() => ['All', ...new Set(loadedPlayers.map((player) => player.country).filter(Boolean))], [loadedPlayers]);

  useEffect(() => {
    setComparison([]);
  }, [activeUser?.username]);

  const filteredPlayers = useMemo(() => {
    return loadedPlayers.filter((player) => {
      const matchesSearch = player.username.toLowerCase().includes(search.toLowerCase());
      const matchesCountry = country === 'All' || player.country === country;
      const matchesMinPP = !minPP || player.pp >= Number(minPP);
      const matchesMaxPP = !maxPP || player.pp <= Number(maxPP);
      const matchesMinRank = !minRank || (player.rank > 0 && player.rank >= Number(minRank));
      const matchesMaxRank = !maxRank || (player.rank > 0 && player.rank <= Number(maxRank));
      const matchesTab =
        activeTab === 'All Players' ||
        (activeTab === 'Favorites' && favoritePlayers.includes(player.id));
      return matchesSearch && matchesCountry && matchesMinPP && matchesMaxPP && matchesMinRank && matchesMaxRank && matchesTab;
    });
  }, [loadedPlayers, search, country, minPP, maxPP, minRank, maxRank, activeTab, favoritePlayers]);

  const toggleFavorite = (playerId) => {
    setFavoritePlayers((current) =>
      current.includes(playerId) ? current.filter((entry) => entry !== playerId) : [...current, playerId]
    );
    showToast('Player favorite updated.');
  };

  const toggleComparison = (player) => {
    setComparison((current) => {
      if (!current.length) return [player];
      if (current.length === 1 && current[0].id !== player.id) return [current[0], player];
      if (current.length === 1 && current[0].id === player.id) return [];
      return [player];
    });
  };

  const clearComparison = () => setComparison([]);

  const comparisonRows = comparison.length === 2 ? buildComparisonRows(comparison[0], comparison[1]) : [];

  return (
    <div className="page-stack">
      <PageHeader
        eyebrow="Network Radar"
        title="Community Finder"
        description="Filter loaded profiles, favorite players, and compare real profile data side by side."
      />

      <Card className="filter-panel">
        <div className="three-column-grid">
          <Input label="Username search" icon={<LuSearch />} value={search} onChange={(event) => setSearch(event.target.value)} />
          <Input label="Country" as="select" value={country} onChange={(event) => setCountry(event.target.value)}>
            {countries.map((entry) => (
              <option key={entry}>{entry}</option>
            ))}
          </Input>
          <Input label="Min PP" type="number" value={minPP} onChange={(event) => setMinPP(event.target.value)} />
          <Input label="Max PP" type="number" value={maxPP} onChange={(event) => setMaxPP(event.target.value)} />
          <Input label="Min Rank" type="number" value={minRank} onChange={(event) => setMinRank(event.target.value)} />
          <Input label="Max Rank" type="number" value={maxRank} onChange={(event) => setMaxRank(event.target.value)} />
        </div>
        <div className="skin-tabs">
          {['All Players', 'Favorites'].map((tab) => (
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

      {comparison.length === 2 ? (
        <Card>
          <div className="section-heading">
            <h3>Comparison Panel</h3>
            <Button variant="secondary" size="sm" onClick={clearComparison}>
              <LuX /> Clear Comparison
            </Button>
          </div>
          <div className="comparison-grid">
            <div className="comparison-grid__header">Stat</div>
            <div className="comparison-grid__header">{comparison[0].username}</div>
            <div className="comparison-grid__header">{comparison[1].username}</div>
            <div className="comparison-grid__header">Leader</div>
            {comparisonRows.map((row) => (
              <ComparisonRow key={row.label} row={row} />
            ))}
          </div>
        </Card>
      ) : null}

      {filteredPlayers.length ? (
        <div className="community-grid">
          {filteredPlayers.map((player) => {
            const isFavorite = favoritePlayers.includes(player.id);
            const compareLabel = comparison.some((entry) => entry.id === player.id)
              ? 'Selected for comparison'
              : 'Compare';
            return (
              <Card key={player.id} className="player-card">
                <div className="player-card__content">
                  <ProfileAvatar src={player.avatar} name={player.username} className="player-card__avatar" />
                  <div className="player-card__info">
                    <div className="beatmap-card__header">
                      <h3>{player.username || 'N/A'}</h3>
                      <button
                        type="button"
                        className="icon-button"
                        onClick={() => toggleFavorite(player.id)}
                        aria-label={isFavorite ? 'Remove favorite player' : 'Favorite player'}
                      >
                        <LuHeart className={isFavorite ? 'icon-button__active' : ''} />
                      </button>
                    </div>
                    <div className="player-card__stats">
                      <span className="player-card__stat">{getCountryFlagEmoji(player.country)}</span>
                      <span className="player-card__stat">{formatNumber(player.pp)} PP</span>
                      <span className="player-card__stat">{formatRank(player.rank)}</span>
                      <span className="player-card__stat">
                        {formatPercent(player.accuracy, 2)}% acc • Level {formatNumber(player.level)}
                      </span>
                    </div>
                    <span className="badge badge--purple">Loaded profile</span>
                    {comparison.some((entry) => entry.id === player.id) ? (
                      <p className="success-line">Selected for comparison</p>
                    ) : null}
                  </div>
                </div>
                <div className="player-card__actions">
                  <Button variant="secondary" size="sm" onClick={() => toggleComparison(player)}>
                    <LuUsers /> {compareLabel}
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      ) : (
        <EmptyState
          icon={<LuUsers />}
          title="No loaded profiles found"
          message={loadedPlayers.length ? 'Adjust your filters to see loaded profiles.' : 'Load osu! profiles from the top bar to build a real comparison list.'}
        />
      )}
    </div>
  );
}

function buildComparisonRows(playerA, playerB) {
  const rows = [
    { label: 'PP', a: playerA.pp, b: playerB.pp, format: (value) => `${formatNumber(value)} PP`, better: 'higher' },
    { label: 'Accuracy', a: playerA.accuracy, b: playerB.accuracy, format: (value) => `${value.toFixed(2)}%`, better: 'higher' },
    { label: 'Global Rank', a: playerA.rank, b: playerB.rank, format: formatRank, better: 'lower' },
    { label: 'Play Count', a: playerA.playcount, b: playerB.playcount, format: (value) => formatNumber(value), better: 'higher' },
    { label: 'Level', a: playerA.level, b: playerB.level, format: (value) => formatNumber(value), better: 'higher' },
  ];

  return rows.map((row) => {
    const hasRankingData = row.label !== 'Global Rank' || (row.a > 0 && row.b > 0);
    const winner =
      !hasRankingData || row.a === row.b
        ? 'Tie'
        : row.better === 'higher'
          ? row.a > row.b
            ? playerA.username
            : playerB.username
          : row.a < row.b
            ? playerA.username
            : playerB.username;

    return {
      ...row,
      winner,
      displayA: row.format(row.a),
      displayB: row.format(row.b),
    };
  });
}

function ComparisonRow({ row }) {
  return (
    <>
      <div className="comparison-grid__cell">{row.label}</div>
      <div className="comparison-grid__cell">{row.displayA}</div>
      <div className="comparison-grid__cell">{row.displayB}</div>
      <div className={`comparison-grid__cell comparison-grid__cell--winner ${row.winner === 'Tie' ? '' : 'comparison-grid__cell--active'}`}>
        {row.winner}
      </div>
    </>
  );
}
