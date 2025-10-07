import React, { useState, useEffect } from 'react';
import styles from './ProjectSelectorModal.module.css';
import { Star, StarOff } from 'lucide-react';

const ProjectSelectorModal = ({ onClose, onSelect, instanceName, userInfo }) => {
 const [searchTerm, setSearchTerm] = useState('');
 const [activeTab, setActiveTab] = useState('Recent');
 const [projects, setProjects] = useState([]);
 const [loading, setLoading] = useState(true);

 useEffect(() => {
   loadProjects();
 }, [activeTab, searchTerm]);

 const loadProjects = async () => {
   setLoading(true);
   try {
     const params = new URLSearchParams({
       instance_name: instanceName,
       user_email: userInfo.email,
       search: searchTerm,
       limit: '50'
     });
     const response = await fetch(`http://localhost:5002/api/projects?${params}`);
     const data = await response.json();
     setProjects(data.projects || []);
   } catch (error) {
     console.error('Failed to load projects:', error);
   } finally {
     setLoading(false);
   }
 };

 const toggleStar = async (project) => {
   try {
     const newStarred = !project.is_starred;
     await fetch(`http://localhost:5002/api/projects/${project.id}/star`, {
       method: 'POST',
       headers: { 'Content-Type': 'application/json' },
       body: JSON.stringify({
         instance_name: instanceName,
         user_email: userInfo.email,
         is_starred: newStarred
       })
     });
     setProjects(prev => prev.map(p =>
       p.id === project.id ? { ...p, is_starred: newStarred } : p
     ));
   } catch (error) {
     console.error('Failed to toggle star:', error);
   }
 };

 const getProjectsByTab = () => {
   switch (activeTab) {
     case 'Starred':
       return projects.filter(p => p.is_starred);
     case 'All':
       return projects;
     case 'Recent':
     default:
       return projects.slice(0, 5);
   }
 };

 return (
   <div className={styles.modalOverlay}>
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
                   toggleStar(project);
                 }}
               >
                 {project.is_starred ? (
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