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
  LuMenu,
  LuX,
} from 'react-icons/lu';
import useMediaQuery from '../../hooks/useMediaQuery';
import { useAuth } from '../../context/AuthContext';
import { formatPP, formatRank, getCountryFlagEmoji } from '../../utils/osu';
import ProfileAvatar from '../shared/ProfileAvatar';

const navItems = [
  { to: '/', label: 'Dashboard', icon: LuLayoutDashboard },
  { to: '/planner', label: 'Planner', icon: LuCalendarCheck2 },
  { to: '/pp-tracker', label: 'PP Tracker', icon: LuTarget },
  { to: '/recommendations', label: 'Maps', icon: LuMap },
  { to: '/replay-analyzer', label: 'Analyzer', icon: LuActivity },
  { to: '/skins', label: 'Skins', icon: LuPalette },
  { to: '/community', label: 'Community', icon: LuUsers },
];

export default function MobileNav() {
  const isMobile = useMediaQuery('(max-width: 768px)');
  const { isAuthenticated, profile, login, logout, isLoading } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  if (!isMobile) {
    return null;
  }

  const activeUser = isAuthenticated ? profile : null;

  return (
    <>
      <header className="mobile-header">
        <div className="mobile-header__brand">
          {activeUser ? (
            <div className="mobile-header__profile">
              <ProfileAvatar
                src={activeUser.avatar_url}
                name={activeUser.username}
                className="mobile-header__avatar"
              />
              <div>
                <strong>{activeUser.username}</strong>
                <span>
                  {getCountryFlagEmoji(activeUser.country)}{' '}
                  {formatPP(activeUser.pp_raw)} • {formatRank(activeUser.pp_rank)}
                </span>
              </div>
            </div>
          ) : (
            <span className="mobile-header__title">osu!Hub</span>
          )}
        </div>
        <button
          type="button"
          className="icon-button"
          onClick={() => setMobileOpen((value) => !value)}
          aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={mobileOpen}
        >
          {mobileOpen ? <LuX /> : <LuMenu />}
        </button>
      </header>
      {mobileOpen ? (
        <div className="mobile-drawer__backdrop" onClick={() => setMobileOpen(false)} role="presentation">
          <div className="mobile-drawer" onClick={(event) => event.stopPropagation()}>
            {activeUser ? (
              <div className="mobile-drawer__profile">
                <ProfileAvatar
                  src={activeUser.avatar_url}
                  name={activeUser.username}
                  className="mobile-drawer__avatar"
                />
                <div>
                  <strong>{activeUser.username}</strong>
                  <span>
                    {formatPP(activeUser.pp_raw)} • {formatRank(activeUser.pp_rank)}
                  </span>
                </div>
              </div>
            ) : (
              <div className="mobile-drawer__profile mobile-drawer__profile--empty">
                <p>Sign in to unlock your dashboard.</p>
                <button
                  type="button"
                  className="button button--primary"
                  onClick={() => {
                    setMobileOpen(false);
                    login();
                  }}
                  disabled={isLoading}
                >
                  <span className="button__icon" aria-hidden="true">
                    <LuLogIn />
                  </span>
                  <span className="button__content">Login with osu!</span>
                </button>
              </div>
            )}
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) => `nav-link ${isActive ? 'nav-link--active' : ''}`}
                onClick={() => setMobileOpen(false)}
              >
                <span className="nav-link__icon" aria-hidden="true">
                  <item.icon />
                </span>
                <span>{item.label}</span>
              </NavLink>
            ))}
            {activeUser ? (
              <button
                type="button"
                className="footer-link mobile-drawer__logout"
                onClick={() => {
                  setMobileOpen(false);
                  logout();
                }}
              >
                <LuLogOut />
                <span>Sign out</span>
              </button>
            ) : null}
          </div>
        </div>
      ) : null}
    </>
  );
}