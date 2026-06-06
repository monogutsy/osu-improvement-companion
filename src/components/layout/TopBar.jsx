import { useState, useRef, useEffect } from 'react';
import { LuLogIn, LuLogOut, LuRefreshCw, LuUserCheck, LuMenu } from 'react-icons/lu';
import { useAuth } from '../../context/AuthContext';
import { useAppContext } from '../../context/AppContext';
import { formatPP, formatRank, getCountryFlagEmoji } from '../../utils/osu';
import ProfileAvatar from '../shared/ProfileAvatar';

export default function TopBar({ title }) {
  const { isAuthenticated, profile, isLoading, login, logout, refresh } = useAuth();
  const { currentPP } = useAppContext();
  const [menuOpen, setMenuOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const pillRef = useRef(null);
  const triggerRef = useRef(null);
  const firstFocusableRef = useRef(null);

  const activeUser = isAuthenticated ? profile : null;

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await refresh();
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (pillRef.current && !pillRef.current.contains(event.target)) {
        setMenuOpen(false);
        triggerRef.current?.focus();
      }
    };
    if (menuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [menuOpen]);

  useEffect(() => {
    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        setMenuOpen(false);
        triggerRef.current?.focus();
      }
    };
    if (menuOpen) {
      document.addEventListener('keydown', handleEscape);
    }
    return () => document.removeEventListener('keydown', handleEscape);
  }, [menuOpen]);

  useEffect(() => {
    if (menuOpen) {
      firstFocusableRef.current?.focus();
    }
  }, [menuOpen]);

  return (
    <>
      <button
        type="button"
        className="topbar__mobile-toggle"
        onClick={() => window.dispatchEvent(new CustomEvent('sidebar:mobile-toggle', { detail: true }))}
        aria-label="Open menu"
        style={{ display: 'none' }}
      >
        <LuMenu />
      </button>

      <header className="topbar" ref={pillRef}>
        <div className="topbar__left">
          <div className="topbar__title-group">
            <p className="topbar__eyebrow">
              {isAuthenticated ? 'Performance Analytics' : 'osu! Companion'}
            </p>
            <h2 className="topbar__title">{title}</h2>
          </div>
        </div>

        <div className="topbar__center">
          {isAuthenticated ? (
            <div className="topbar__auth-status" role="status">
              <span className="topbar__auth-dot" aria-hidden="true" />
              <span>Connected to osu!</span>
            </div>
          ) : (
            <div className="topbar__auth-status topbar__auth-status--off" role="status">
              <span className="topbar__auth-dot topbar__auth-dot--off" aria-hidden="true" />
              <span>Not signed in</span>
            </div>
          )}
        </div>

        <div className="topbar__right">
          {activeUser ? (
            <div className={`topbar__user-pill ${menuOpen ? 'topbar__user-pill--open' : ''}`}>
              <ProfileAvatar
                src={activeUser.avatar_url}
                name={activeUser.username}
                className="topbar__pill-avatar"
              />
              <div className="topbar__pill-info">
                <strong className="topbar__pill-name">{activeUser.username}</strong>
                <span className="topbar__pill-stats">
                  {formatPP(currentPP || activeUser.pp_raw)}{' '}
                  <span className="topbar__pill-sep">•</span>{' '}
                  {formatRank(activeUser.pp_rank)}
                </span>
              </div>

              <button
                type="button"
                className="topbar__pill-action"
                ref={triggerRef}
                onClick={() => setMenuOpen((value) => !value)}
                aria-expanded={menuOpen}
                aria-label={menuOpen ? 'Close user menu' : 'Open user menu'}
              >
                <LuMenu />
              </button>

               {menuOpen ? (
                 <div
                   className="topbar__pill-menu"
                   role="menu"
                 >
                   <div className="topbar__pill-menu-section">
                     <div className="topbar__pill-menu-header">
                       <ProfileAvatar
                         src={activeUser.avatar_url}
                         name={activeUser.username}
                         className="topbar__pill-menu-avatar"
                       />
                       <div className="topbar__pill-menu-user-info">
                         <strong className="topbar__pill-menu-username">{activeUser.username}</strong>
                         <span className="topbar__pill-menu-country">
                           {getCountryFlagEmoji(activeUser.country)}{' '}
                           {activeUser.country_name || activeUser.country}
                         </span>
                       </div>
                     </div>
                     <div className="topbar__pill-menu-stats">
                       <div className="topbar__stat-card">
                         <span className="topbar__stat-label">PP</span>
                         <strong className="topbar__stat-value">{formatPP(activeUser.pp_raw)}</strong>
                       </div>
                       <div className="topbar__stat-card">
                         <span className="topbar__stat-label">Global</span>
                         <strong className="topbar__stat-value">{formatRank(activeUser.pp_rank)}</strong>
                       </div>
                       <div className="topbar__stat-card">
                         <span className="topbar__stat-label">Country</span>
                         <strong className="topbar__stat-value">{formatRank(activeUser.pp_country_rank)}</strong>
                       </div>
                     </div>
                   </div>

                   <div className="topbar__pill-menu-divider" />

                   <div className="topbar__pill-menu-section">
                     <button
                       type="button"
                       className="topbar__pill-menu-action"
                       ref={firstFocusableRef}
                       onClick={handleRefresh}
                       disabled={refreshing}
                     >
                       <LuRefreshCw className={refreshing ? 'spin' : ''} />
                       <span>{refreshing ? 'Refreshing...' : 'Refresh profile'}</span>
                     </button>
                     <button
                       type="button"
                       className="topbar__pill-menu-action topbar__pill-menu-action--danger"
                       onClick={() => {
                         setMenuOpen(false);
                         logout();
                       }}
                     >
                       <LuLogOut />
                       <span>Sign out</span>
                     </button>
                   </div>
                 </div>
               ) : null}
            </div>
          ) : (
            <button
              type="button"
              className="button button--primary topbar__login-cta"
              onClick={login}
              disabled={isLoading}
            >
              <span className="button__icon" aria-hidden="true">
                {isLoading ? <LuRefreshCw className="spin" /> : <LuLogIn />}
              </span>
              <span className="button__content">
                {isLoading ? 'Loading...' : 'Login with osu!'}
              </span>
            </button>
          )}

          {activeUser && !menuOpen ? (
            <span className="topbar__auth-pill" title="Authenticated via osu! OAuth">
              <LuUserCheck />
              <span>osu! verified</span>
            </span>
          ) : null}
        </div>
      </header>
    </>
  );
}
