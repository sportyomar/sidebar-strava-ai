import React, { useState } from 'react';
import styles from './ProjectSelectorModal.module.css';
import { Star, StarOff } from 'lucide-react';

const ProjectSelectorModal = ({ projects = [], onClose, onSelect }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('Recent');
  const [starredProjects, setStarredProjects] = useState(new Set());

  const filteredProjects = projects.filter(project =>
    project.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const toggleStar = (projectId) => {
    setStarredProjects(prev => {
      const newSet = new Set(prev);
      if (newSet.has(projectId)) newSet.delete(projectId);
      else newSet.add(projectId);
      return newSet;
    });
  };

  const getProjectsByTab = () => {
    switch (activeTab) {
      case 'Starred':
        return filteredProjects.filter(p => starredProjects.has(p.id));
      case 'All':
        return filteredProjects;
      case 'Recent':
      default:
        return filteredProjects.slice(0, 5);
    }
  };

  return (
    <div
        className={styles.modalOverlay}
    >
      <div className={styles.modal}>
        <div className={styles.header}>
          <h2>Select a project</h2>
          <input
            type="text"
            placeholder="Search projects and folders"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <div className={styles.tabs}>
            {['Recent', 'Starred', 'All'].map(tab => (
              <button
                key={tab}
                className={activeTab === tab ? styles.activeTab : ''}
                onClick={() => setActiveTab(tab)}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        <div className={styles.projectTable}>
          <div className={styles.tableHeader}>
            <span>Name</span>
            <span>Type</span>
            <span>ID</span>
            <span></span>
          </div>

          <div className={styles.tableBody}>
            {getProjectsByTab().map(project => (
              <div
                key={project.id}
                className={styles.tableRow}
                onClick={() => onSelect(project)}
              >
                <span>{project.name}</span>
                <span>{project.type}</span>
                <span>{project.id}</span>
                <span
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleStar(project.id);
                  }}
                >
                  {starredProjects.has(project.id) ? (
                    <Star className={styles.starIcon} />
                  ) : (
                    <StarOff className={styles.starIcon} />
                  )}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className={styles.footer}>
          <button onClick={onClose}>Cancel</button>
          <button className={styles.primaryButton}>New project</button>
        </div>
      </div>
    </div>
  );
};

export default ProjectSelectorModal;
