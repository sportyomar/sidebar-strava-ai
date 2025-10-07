import React, { useState, useRef, useEffect } from 'react';
import { ArrowLeft, Home, Settings, User, Bell, HelpCircle, LogOut } from 'lucide-react';
import styles from './ProfileNavBar.module.css';
import { getStoredUser } from '../utils/getStoredUser';

const ProfileNavBar = ({
  onBackToApp,
  currentSection = 'profile',
  onSectionChange,
  userProfile
}) => {
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const userDropdownRef = useRef(null);

  const profile = userProfile || getStoredUser();

  const profileSections = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'account', label: 'Account', icon: Settings },
    { id: 'modules', label: 'Modules', icon: Settings },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'help', label: 'Help', icon: HelpCircle }
  ];

  // Click outside handler for dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (userDropdownRef.current && !userDropdownRef.current.contains(event.target)) {
        setShowUserDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleBackToApp = () => {
    if (onBackToApp) {
      onBackToApp();
    } else {
      // Default behavior - navigate to app root
      window.location.href = '/app';
    }
  };

  const handleSectionChange = (sectionId) => {
    if (onSectionChange) {
      onSectionChange(sectionId);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('currentUser');
    window.location.href = '/login';
  };

  return (
    <div className={styles.profileNavContainer}>
      <div className={styles.profileNavBar}>
        {/* Left Section - Back to App */}
        <div className={styles.navLeft}>
          <button
            className={styles.backButton}
            onClick={handleBackToApp}
            title="Back to App"
          >
            <ArrowLeft size={20} />
            <span>Back to App</span>
          </button>

          <div className={styles.navDivider} />

          <div className={styles.profileContext}>
            <img
              src={profile.avatar}
              alt={profile.displayName}
              className={styles.profileAvatar}
            />
            <div className={styles.profileInfo}>
              <div className={styles.profileName}>{profile.displayName}</div>
              <div className={styles.profileHandle}>@{profile.username}</div>
            </div>
          </div>
        </div>

        {/* Center Section - Navigation Tabs */}
        <div className={styles.navCenter}>
          <div className={styles.navTabs}>
            {profileSections.map((section) => {
              const IconComponent = section.icon;
              return (
                <button
                  key={section.id}
                  className={`${styles.navTab} ${currentSection === section.id ? styles.active : ''}`}
                  onClick={() => handleSectionChange(section.id)}
                >
                  <IconComponent size={16} />
                  <span>{section.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Section - User Actions */}
        <div className={styles.navRight}>
          <button
            className={styles.homeButton}
            onClick={handleBackToApp}
            title="Home"
          >
            <Home size={20} />
          </button>

          <div className={styles.userMenu} ref={userDropdownRef}>
            <button
              className={styles.userMenuTrigger}
              onClick={() => setShowUserDropdown(!showUserDropdown)}
              title="Account menu"
            >
              <img
                src={profile.avatar}
                alt={profile.displayName}
                className={styles.userMenuAvatar}
              />
            </button>

            {showUserDropdown && (
              <div className={styles.userDropdown}>
                <div className={styles.dropdownHeader}>
                  <img
                    src={profile.avatar}
                    alt={profile.displayName}
                    className={styles.dropdownAvatar}
                  />
                  <div className={styles.dropdownUserInfo}>
                    <div className={styles.dropdownName}>{profile.displayName}</div>
                    <div className={styles.dropdownEmail}>{profile.email}</div>
                  </div>
                </div>

                <div className={styles.dropdownDivider} />

                <button className={styles.dropdownItem}>
                  <User size={16} />
                  <span>Manage Account</span>
                </button>

                <button className={styles.dropdownItem}>
                  <Settings size={16} />
                  <span>Settings</span>
                </button>

                <button className={styles.dropdownItem}>
                  <Bell size={16} />
                  <span>Notifications</span>
                </button>

                <button className={styles.dropdownItem}>
                  <HelpCircle size={16} />
                  <span>Help & Support</span>
                </button>

                <div className={styles.dropdownDivider} />

                <button className={styles.dropdownItem} onClick={handleLogout}>
                  <LogOut size={16} />
                  <span>Sign Out</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfileNavBar;