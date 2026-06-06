import { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import {
  LuLayoutDashboard,
  LuCalendarCheck2,
  LuTarget,
  LuMap,
  LuActivity,
  LuPalette,
  LuUsers,
  LuLogIn,
  LuLogOut,
  LuPanelLeftClose,
  LuPanelLeftOpen,
  LuSparkles,
} from 'react-icons/lu';
import useMediaQuery from '../../hooks/useMediaQuery';
import { useAuth } from '../../context/AuthContext';
import { useAppContext } from '../../context/AppContext';
import { formatPP, getCountryFlagEmoji } from '../../utils/osu';
import ProfileAvatar from '../shared/ProfileAvatar';

const navGroups = [
  {
    group: 'Main Menu',
    items: [
      { to: '/', label: 'Dashboard', icon: LuLayoutDashboard },
      { to: '/planner', label: 'Planner', icon: LuCalendarCheck2 },
      { to: '/pp-tracker', label: 'PP Tracker', icon: LuTarget },
      { to: '/recommendations', label: 'Maps', icon: LuMap },
    ],
  },
  {
    group: 'Tools',
    items: [
      { to: '/replay-analyzer', label: 'Analyzer', icon: LuActivity },
      { to: '/skins', label: 'Skins', icon: LuPalette },
      { to: '/community', label: 'Community', icon: LuUsers },
    ],
  },
];

export default function Sidebar() {
  const { isAuthenticated, profile, login, logout, isLoading } = useAuth();
  const { currentPP } = useAppContext();
  const isDesktop = useMediaQuery('(min-width: 769px)');
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const activeUser = isAuthenticated ? profile : null;

  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [mobileOpen]);

  return (
    <>
      <div 
        className="sidebar-overlay" 
        onClick={() => setMobileOpen(false)}
        aria-hidden="true"
      />
      <aside 
        className={`sidebar ${collapsed ? 'sidebar--collapsed' : ''} ${mobileOpen ? 'sidebar--mobile-open' : ''}`}
        aria-label="Main navigation"
      >
        <div className="sidebar__brand">
          {collapsed ? (
            <div className="sidebar__brand-collapsed" aria-label="osu!Hub">
              <div className="sidebar__brand-compact-logo">
                <span className="sidebar__brand-logo-text">o</span>
                <span className="sidebar__brand-logo-accent">H</span>
              </div>
            </div>
          ) : (
            <div className="sidebar__brand-content">
              <h1 className="sidebar__brand-logo">
                <span className="sidebar__brand-logo-text">osu!</span>
                <span className="sidebar__brand-logo-accent">Hub</span>
              </h1>
              <p className="sidebar__brand-tagline">Performance Dashboard</p>
            </div>
          )}
        </div>

        <div className="sidebar__profile-section">
          {activeUser ? (
            <div className={`sidebar__profile-card ${collapsed ? 'sidebar__profile-card--collapsed' : ''}`} title={activeUser.username}>
              <ProfileAvatar
                src={activeUser.avatar_url}
                name={activeUser.username}
                className={`sidebar__profile-avatar ${collapsed ? 'sidebar__profile-avatar-sm' : 'sidebar__profile-avatar-lg'}`}
              />
              {!collapsed && (
                <div className="sidebar__profile-details">
                  <div className="sidebar__profile-main">
                    <strong className="sidebar__profile-name">{activeUser.username}</strong>
                    <span className="sidebar__profile-country" title={activeUser.country_name || activeUser.country}>
                      {getCountryFlagEmoji(activeUser.country)}
                    </span>
                  </div>
                  <div className="sidebar__profile-stats">
                    <div className="sidebar__stat-item">
                      <span className="sidebar__stat-label">PP</span>
                      <span className="sidebar__stat-value">{(currentPP || activeUser.pp_raw) != null ? formatPP(currentPP || activeUser.pp_raw) : '—'}</span>
                    </div>
                    <div className="sidebar__stat-item">
                      <span className="sidebar__stat-label">Global Rank</span>
                      <span className="sidebar__stat-value">{activeUser.pp_rank != null ? `#${activeUser.pp_rank}` : '—'}</span>
                    </div>
                    <div className="sidebar__stat-item">
                      <span className="sidebar__stat-label">Country Rank</span>
                      <span className="sidebar__stat-value">{activeUser.country_rank != null ? `#${activeUser.country_rank}` : '—'}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="sidebar__profile-empty">
              <div className="sidebar__profile-empty-icon" aria-hidden="true">
                <LuSparkles />
              </div>
              {!collapsed && (
                <div className="sidebar__profile-empty-text">
                  <p className="sidebar__empty-title">Welcome to osu!Hub</p>
                  <p className="sidebar__empty-subtitle">
                    Sign in with osu! to unlock your personalized dashboard.
                  </p>
                  <button
                    type="button"
                    className="button button--primary button--sm sidebar__connect-cta"
                    onClick={login}
                    disabled={isLoading}
                  >
                    <span className="button__icon" aria-hidden="true">
                      <LuLogIn />
                    </span>
                    <span className="button__content">
                      {isLoading ? 'Loading...' : 'Login with osu!'}
                    </span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        <nav className="sidebar__nav" aria-label="Primary navigation">
          {navGroups.map((group) => (
            <div key={group.group} className="nav-group">
              {!collapsed && <span className="nav-group__label">{group.group}</span>}
              <div className="nav-group__items">
                {group.items.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    className={({ isActive }) => `nav-link ${isActive ? 'nav-link--active' : ''}`}
                    onClick={() => setMobileOpen(false)}
                    {...(collapsed ? { 'aria-label': item.label, title: item.label } : {})}
                  >
                    <span className="nav-link__icon" aria-hidden="true">
                      <item.icon />
                    </span>
                    {!collapsed && <span className="nav-link__label">{item.label}</span>}
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </nav>

        <div className="sidebar__footer">
          {activeUser && (
            <button
              type="button"
              className="footer-link sidebar__logout"
              title="Sign out"
              onClick={() => { logout(); setMobileOpen(false); }}
            >
              <LuLogOut />
              {!collapsed && <span>Sign out</span>}
            </button>
          )}

          <div className="sidebar__version">
            {!collapsed && <span>v1.0.4-beta</span>}
          </div>

          <button
            type="button"
            className="sidebar__collapse"
            onClick={() => setCollapsed((value) => !value)}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <LuPanelLeftOpen /> : <LuPanelLeftClose />}
          </button>
        </div>
      </aside>
    </>
  );
}
