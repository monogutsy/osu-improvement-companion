const PP_TIER_RANGES = [
  { min: 0, max: 1000, stars: [3.0, 4.5] },
  { min: 1000, max: 3000, stars: [4.5, 6.0] },
  { min: 3000, max: 6000, stars: [6.0, 7.5] },
  { min: 6000, max: 10000, stars: [7.5, 9.0] },
  { min: 10000, max: Infinity, stars: [9.0, 12.0] },
];

export function safeNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function formatNumber(value) {
  return safeNumber(value).toLocaleString();
}

export function formatPP(value) {
  return `${formatNumber(value)}pp`;
}

export function formatPercent(value, digits = 1) {
  return `${safeNumber(value).toFixed(digits)}%`;
}

export function formatStars(value, digits = 1) {
  return `${safeNumber(value).toFixed(digits)} stars`;
}

export function formatRank(value) {
  const rank = safeNumber(value);
  return rank > 0 ? `#${formatNumber(rank)}` : 'N/A';
}

export function todayString(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

export function isSameDay(dateString, date = new Date()) {
  if (!dateString) return false;
  return dateString.slice(0, 10) === todayString(date);
}

export function isWithinLastDays(dateString, days = 7) {
  if (!dateString) return false;
  const parsed = new Date(dateString);
  if (Number.isNaN(parsed.getTime())) return false;
  const diff = Date.now() - parsed.getTime();
  return diff >= 0 && diff <= days * 24 * 60 * 60 * 1000;
}

export function isOverdue(deadline, completed = false) {
  if (!deadline || completed) return false;
  return deadline < todayString();
}

export function getCountryFlagEmoji(countryCode = '') {
  const code = String(countryCode).trim().toUpperCase();
  if (!code) return 'N/A';
  return code;
}

export function normalizeActivityEntry(entry) {
  if (!entry) return null;
  if (typeof entry === 'string') {
    return {
      id: crypto.randomUUID(),
      message: entry,
      timestamp: new Date().toISOString(),
    };
  }

  return {
    id: entry.id ?? crypto.randomUUID(),
    message: entry.message ?? String(entry),
    timestamp: entry.timestamp ?? new Date().toISOString(),
  };
}

export function normalizeActivityList(value) {
  if (!Array.isArray(value)) return [];
  return value.map(normalizeActivityEntry).filter(Boolean).slice(0, 10);
}

export function appendActivity(existing, message) {
  const current = normalizeActivityList(existing);
  return [
    {
      id: crypto.randomUUID(),
      message,
      timestamp: new Date().toISOString(),
    },
    ...current,
  ].slice(0, 10);
}

export function getPpTierRange(ppRaw) {
  const value = safeNumber(ppRaw);
  return PP_TIER_RANGES.find((tier) => value >= tier.min && value < tier.max) ?? PP_TIER_RANGES[0];
}

export function getTargetStarsForUser(ppRaw) {
  const range = getPpTierRange(ppRaw);
  return range.stars;
}

export function getPPThresholdFromUser(userProfile) {
  const pp = safeNumber(userProfile?.pp_raw);
  if (pp >= 10000) return 9.0;
  if (pp >= 6000) return 7.5;
  if (pp >= 3000) return 6.0;
  if (pp >= 1000) return 4.5;
  return 3.0;
}

export function getPerformanceLabel(score) {
  if (score >= 90) return { label: 'Outstanding', color: 'green' };
  if (score >= 75) return { label: 'Great', color: 'blue' };
  if (score >= 60) return { label: 'Good', color: 'yellow' };
  if (score >= 40) return { label: 'Average', color: 'yellow' };
  return { label: 'Needs Work', color: 'pink' };
}

export function calculateReplayAnalysis(values, userProfile) {
  const accuracy = safeNumber(values.accuracy);
  const misses = Math.max(0, Math.floor(safeNumber(values.misses)));
  const achievedCombo = Math.max(0, Math.floor(safeNumber(values.achievedCombo ?? values.combo)));
  const maxCombo = Math.max(1, Math.floor(safeNumber(values.maxCombo)));
  const ur = Math.max(0, safeNumber(values.unstableRate));
  const stars = Math.max(0.1, safeNumber(values.starRating));

  const accuracyScore =
    accuracy >= 99 ? 100 : accuracy >= 97 ? 85 : accuracy >= 95 ? 70 : accuracy >= 90 ? 50 : 30;

  const comboRetention = (achievedCombo / maxCombo) * 100;
  const comboScore =
    comboRetention >= 95 ? 100 : comboRetention >= 80 ? 75 : comboRetention >= 60 ? 50 : 25;

  const consistencyScore = ur <= 60 ? 100 : ur <= 100 ? 80 : ur <= 140 ? 60 : ur <= 180 ? 40 : 20;

  const missScore =
    misses === 0 ? 100 : misses <= 3 ? 80 : misses <= 10 ? 55 : misses <= 30 ? 30 : 10;

  const overallScore =
    accuracyScore * 0.35 + comboScore * 0.25 + consistencyScore * 0.25 + missScore * 0.15;

  const label = getPerformanceLabel(overallScore);
  const threshold = getPPThresholdFromUser(userProfile);

  const suggestions = [];
  if (misses > 20 && stars < 5.0) {
    suggestions.push(
      'Your miss count is high on a relatively low difficulty. Focus on full-combo attempts on 3 to 4 star maps before progressing further.'
    );
  }
  if (accuracy < 95 && misses === 0) {
    suggestions.push(
      "You're full-comboing but losing accuracy. Practice with Hidden to sharpen reading accuracy without worrying about combo breaks."
    );
  }
  if (ur > 180) {
    suggestions.push(
      `Your unstable rate of ${ur.toFixed(1)} suggests timing calibration issues. Go to Options and recalibrate your universal offset.`
    );
  }
  if (comboRetention < 60) {
    suggestions.push(
      `You retained only ${comboRetention.toFixed(1)}% of the max combo. Try practicing the map in halftime to learn the note patterns before full speed.`
    );
  }
  if (accuracy > 98 && stars < threshold) {
    suggestions.push(
      `You're significantly over-performing for this difficulty. Consider attempting maps ${(threshold + 0.5).toFixed(1)} stars higher to improve your PP.`
    );
  }
  if (!suggestions.length) {
    suggestions.push(
      'Your replay is balanced overall. Push one targeted weakness in the next session and keep the rest of the run conditions similar.'
    );
  }

  const strengths = [];
  const weaknesses = [];
  const improvementAreas = [];

  const metrics = [
    { key: 'Accuracy', score: accuracyScore },
    { key: 'Combo Retention', score: comboScore },
    { key: 'Consistency', score: consistencyScore },
    { key: 'Miss Control', score: missScore },
  ];

  metrics.forEach((metric) => {
    if (metric.score >= 75) {
      strengths.push(metric);
    } else if (metric.score < 50) {
      weaknesses.push(metric);
    } else {
      improvementAreas.push(metric);
    }
  });

  return {
    inputs: {
      accuracy,
      misses,
      achievedCombo,
      maxCombo,
      unstableRate: ur,
      starRating: stars,
    },
    scores: {
      accuracy: accuracyScore,
      combo: comboScore,
      consistency: consistencyScore,
      miss: missScore,
      overall: overallScore,
    },
    comboRetention,
    label,
    suggestions,
    strengths,
    weaknesses,
    improvementAreas,
    generatedAt: new Date().toISOString(),
  };
}

function chooseByStarTarget(maps, targetMin, targetMax, limit = 4) {
  return [...maps]
    .sort((a, b) => Math.abs(safeNumber(a.stars) - targetMax) - Math.abs(safeNumber(b.stars) - targetMax))
    .filter((map) => safeNumber(map.stars) >= targetMin && safeNumber(map.stars) <= targetMax)
    .slice(0, limit);
}

function deriveRecommendationCategory(map) {
  if (map.category) return map.category;
  const skill = String(map.skillFocus ?? '').toLowerCase();
  if (skill.includes('accuracy')) return 'Accuracy Training';
  if (skill.includes('stream')) return 'Stream Practice';
  if (skill.includes('aim')) return 'Aim Practice';
  if (skill.includes('speed')) return 'Speed Practice';
  if (skill.includes('stamina')) return 'Stamina Practice';
  return 'Planner Matches';
}

function reasonForCategory(category, map, userProfile) {
  const pp = safeNumber(userProfile?.pp_raw);
  const accuracy = safeNumber(userProfile?.accuracy);
  const playcount = safeNumber(userProfile?.playcount);
  const stars = safeNumber(map.stars);
  const ppText = formatPP(pp);

  switch (category) {
    case 'Accuracy Training':
      return `Recommended because your accuracy (${accuracy.toFixed(2)}%) needs cleaner reading work. This ${formatStars(stars)} map builds consistency.`;
    case 'Stream Practice':
      return `Based on your PP (${ppText}), this ${formatStars(stars)} stream map keeps the density high enough to sharpen control without overextending.`;
    case 'Aim Practice':
      return `Based on your PP (${ppText}), this ${formatStars(stars)} aim map sits in a productive challenge range for higher quality reps.`;
    case 'Speed Practice':
      return `Your PP level (${ppText}) can support this ${formatStars(stars)} speed map, which is a strong pick for pushing tap speed.`;
    case 'Stamina Practice':
      return `You have ${formatNumber(playcount)} plays, so this ${formatStars(stars)} stamina map is a good endurance test.`;
    case 'PP Farm Maps':
    default:
      return `Recommended because your PP (${ppText}) fits this ${formatStars(stars)} farm map, making it a good ranked gain target.`;
  }
}

export function generateRecommendations(userProfile, mapDatabase) {
  const maps = Array.isArray(mapDatabase)
    ? mapDatabase
        .map((map) => ({
          ...map,
          category: deriveRecommendationCategory(map),
          stars: safeNumber(map.stars),
          bpm: safeNumber(map.bpm),
        }))
        .filter((map) => map.name && map.artist)
    : [];
  if (!userProfile || !maps.length) return [];

  const { stars: [minStars, maxStars] } = getPpTierRange(userProfile.pp_raw);
  const targetMid = (minStars + maxStars) / 2;
  const byCategory = new Map();

  const categories = [
    { name: 'PP Farm Maps', enabled: true },
    { name: 'Accuracy Training', enabled: safeNumber(userProfile.accuracy) < 97 },
    { name: 'Stream Practice', enabled: safeNumber(userProfile.pp_raw) > 2000 },
    { name: 'Aim Practice', enabled: safeNumber(userProfile.pp_raw) > 1000 },
    { name: 'Speed Practice', enabled: safeNumber(userProfile.pp_raw) > 1500 },
    { name: 'Stamina Practice', enabled: safeNumber(userProfile.playcount) > 5000 },
    { name: 'Planner Matches', enabled: true },
  ];

  categories.forEach((category) => {
    if (!category.enabled) return;
    const categoryMaps = maps.filter((map) => map.category === category.name);
    const fallbackMaps = maps.filter((map) =>
      map.skillFocus?.toLowerCase().includes(category.name.split(' ')[0].toLowerCase())
    );
    const candidateMaps = categoryMaps.length ? categoryMaps : fallbackMaps;

    const targetMin = category.name === 'PP Farm Maps' ? minStars : Math.max(0.1, targetMid - 1.25);
    const targetMaxValue = category.name === 'PP Farm Maps' ? maxStars : targetMid + 1.25;
    const pp = safeNumber(userProfile.pp_raw);
    const selected = chooseByStarTarget(
      candidateMaps.filter((map) => {
        const minPP = map.minPP == null ? 0 : safeNumber(map.minPP);
        const maxPP = map.maxPP == null ? Infinity : safeNumber(map.maxPP, Infinity);
        return pp >= minPP && pp <= maxPP;
      }),
      targetMin,
      targetMaxValue,
      5
    );

    if (selected.length) {
      byCategory.set(
        category.name,
        selected.map((map) => ({
          ...map,
          category: category.name,
          reason: reasonForCategory(category.name, map, userProfile),
        }))
      );
    }
  });

  return categories.flatMap((category) => byCategory.get(category.name) ?? []);
}

export function buildBeatmapFromRecommendation(map, overrides = {}) {
  return {
    id: crypto.randomUUID(),
    name: map.name ?? '',
    artist: map.artist ?? '',
    difficulty: map.difficulty ?? '',
    stars: safeNumber(map.stars),
    skillFocus: map.skillFocus ?? '',
    goal: overrides.goal ?? `Improve ${String(map.skillFocus ?? 'this map').toLowerCase()} control on this pick.`,
    targetAccuracy: safeNumber(overrides.targetAccuracy ?? map.targetAccuracy),
    targetCombo: safeNumber(overrides.targetCombo ?? map.targetCombo),
    priority: overrides.priority ?? map.priority ?? (safeNumber(map.stars) >= 7 ? 'High' : safeNumber(map.stars) >= 5.5 ? 'Medium' : 'Low'),
    deadline: overrides.deadline ?? '',
    completed: false,
    completedAt: null,
    addedAt: new Date().toISOString(),
  };
}

export function normalizeBeatmap(beatmap) {
  return {
    id: beatmap.id ?? crypto.randomUUID(),
    name: beatmap.name ?? '',
    artist: beatmap.artist ?? '',
    difficulty: beatmap.difficulty ?? '',
    stars: safeNumber(beatmap.stars),
    skillFocus: beatmap.skillFocus ?? '',
    goal: beatmap.goal ?? '',
    targetAccuracy: safeNumber(beatmap.targetAccuracy),
    targetCombo: safeNumber(beatmap.targetCombo),
    priority: beatmap.priority ?? 'Medium',
    deadline: beatmap.deadline ?? '',
    completed: Boolean(beatmap.completed),
    completedAt: beatmap.completedAt ?? null,
    addedAt: beatmap.addedAt ?? new Date().toISOString(),
  };
}

export function normalizeSkin(skin) {
  return {
    id: skin.id ?? crypto.randomUUID(),
    name: skin.name ?? '',
    author: skin.author ?? '',
    version: skin.version ?? '',
    notes: skin.notes ?? skin.description ?? '',
    imageUrl: skin.imageUrl ?? '',
    favorite: Boolean(skin.favorite),
    addedAt: skin.addedAt ?? new Date().toISOString(),
    updatedAt: skin.updatedAt ?? skin.addedAt ?? new Date().toISOString(),
  };
}

export function normalizePlayer(player) {
  return {
    id: String(player.id ?? player.user_id ?? player.username ?? ''),
    username: player.username ?? '',
    country: player.country ?? '',
    countryCode: player.countryCode ?? '',
    city: player.city ?? '',
    rank: safeNumber(player.rank),
    pp: safeNumber(player.pp),
    accuracy: safeNumber(player.accuracy),
    level: safeNumber(player.level),
    playcount: safeNumber(player.playcount),
    mainSkill: player.mainSkill ?? '',
    discord: player.discord ?? '',
    avatar: player.avatar ?? '',
    favorite: Boolean(player.favorite),
  };
}

export function normalizeProfile(profile) {
  if (!profile) return null;

  return {
    user_id: String(profile.user_id ?? profile.id ?? profile.username ?? ''),
    username: profile.username ?? '',
    avatar_url: profile.avatar_url ?? '',
    pp_raw: safeNumber(profile.pp_raw),
    pp_rank: safeNumber(profile.pp_rank),
    pp_country_rank: safeNumber(profile.pp_country_rank),
    country: profile.country ?? '',
    accuracy: safeNumber(profile.accuracy),
    level: safeNumber(profile.level),
    playcount: safeNumber(profile.playcount),
    total_seconds_played: safeNumber(profile.total_seconds_played),
    ranked_score: safeNumber(profile.ranked_score),
    total_score: safeNumber(profile.total_score),
    loadedAt: profile.loadedAt ?? new Date().toISOString(),
  };
}

export function profileToCommunityPlayer(profile) {
  const normalized = normalizeProfile(profile);
  if (!normalized) return null;

  return {
    id: normalized.user_id || normalized.username,
    username: normalized.username,
    country: normalized.country,
    countryCode: normalized.country,
    rank: normalized.pp_rank,
    pp: normalized.pp_raw,
    accuracy: normalized.accuracy,
    level: normalized.level,
    playcount: normalized.playcount,
    avatar: normalized.avatar_url,
    loadedAt: normalized.loadedAt,
  };
}

export function normalizePpData(ppData) {
  return {
    currentPP: safeNumber(ppData?.currentPP),
    goalPP: safeNumber(ppData?.goalPP, 0),
    linkedUsername: ppData?.linkedUsername ?? '',
    history: Array.isArray(ppData?.history)
      ? ppData.history.map((entry) => ({
          pp: safeNumber(entry.pp),
          date: entry.date ?? todayString(),
          source: entry.source ?? 'manual',
        }))
      : [],
  };
}