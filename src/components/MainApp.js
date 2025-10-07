// Main Dashboard
// App.js holds everything you see on screen.
// It is the central control center
// All things we plug in to the control center are "parts of the screen"
// The control center it controls all screens

// Plug in a report folder by drawer mapping system, so we know which folders belong to which drawer
import folderLabelsByModule from '../constants/folderLabelsByModule';
// import workspaceStructure, { getActiveWorkspaces } from '../constants/workspaceStructure';
import styles from './MainApp.Workspace.css'; // or './App.css'
import VerticalToggle from './VerticalToggle';
// Plug in a report monitoring system (useState) to track what the user clicks on
// Plug in a report data retriever system (useEffect) to track what the user clicks on and pulls data from other sources that are related and would be helpful based on the user preferences or best practices
import {useState, useEffect} from "react";

// Plug in the Sidebar section — like adding a slide to a presentation
import Drawer from './Drawer'

// Plug in the Workspace section — like adding a slide to a presentation
import WorkspaceView from "./WorkspaceView";

// Plug in the AccessBar section - like adding a slide to a presentation
import AccessBar from "./AccessBar";

import LayoutToolsPanel from "./LayoutToolsPanel";
import ProjectSelectorModal from "./ProjectSelectorModal";
import { getAllProjectsAsJSON, getProjectsForWorkspace } from '../constants/projectDataBridge';
import { getActiveWorkspaces } from '../constants/workspaceStructure';

// Need to manage URLs for mode and activeWorkspace
import { useSearchParams } from 'react-router-dom';
import ProjectContext from "../contexts/ProjectContext";
import DocsPanel from "./DocsPanel";
import TutorialPanel from "./TutorialPanel";
import tutorialsContent from "../data/tutorialsContent";


function MainApp_nw() {
    const [searchParams, setSearchParams] = useSearchParams();
    const [selectedSubStages, setSelectedSubStages] = useState([]);
    const [fidelity, setFidelity] = useState('raw');
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [mode, setMode] = useState(localStorage.getItem('mode') || 'executive');
    const [activeWorkspace, setActiveWorkspace] = useState(localStorage.getItem('activeWorkspace') || 'metrics');
    const [selectedFolder, setSelectedFolder] = useState('Portfolio Reporting');
    const [selectedGroup, setSelectedGroup] = useState(null);
    const [selectedItem, setSelectedItem] = useState(null);
    const [showDocsPanel, setShowDocsPanel] = useState(false);
    const [showTutorialPanel, setShowTutorialPanel] = useState(false);
    const [showLayoutPanel, setShowLayoutPanel] = useState(false);
    const [showProjectSelector, setShowProjectSelector] = useState(false);
    const [selectedProject, setSelectedProject] = useState(null);
    const [docsMenuOpen, setDocsMenuOpen] = useState(false);
    const [tutorialMenuOpen, setTutorialMenuOpen] = useState(false);
    const [instanceName, setInstanceName] = useState(process.env.REACT_APP_INSTANCE_NAME || 'projects-db');
    // Test new workspace system
    const [testWorkspaceData, setTestWorkspaceData] = useState(null);
    const [showTestData, setShowTestData] = useState(false);
    const [userInfo, setUserInfo] = useState({
      email: 'user@example.com', // TODO: Replace with actual user email
      name: 'User Name',          // TODO: Replace with actual user name
      avatar: null,
      id: 'user-id'
    });


    // Add navigation handler
    const handleNavigateToStep = (stepNumber) => {
        console.log(`Navigating to step ${stepNumber}`);

        // Update URL parameters
        const newSearchParams = new URLSearchParams(searchParams);
        newSearchParams.set('step', stepNumber);
        setSearchParams(newSearchParams);

        // Map step numbers to the correct dashboard items
        const stepToItemMap = {
            1: 'Step 1 Dashboard',
            2: 'Step 2 Dashboard',
            // Add more steps as needed
        };

        // Navigate within the utilities Workspace structure
        if (stepToItemMap[stepNumber]) {
            // Ensure we're in the utilities Workspace and correct folder
            setActiveWorkspace('utilities');
            setSelectedFolder('Library Discovery & Analysis');

            // Find the correct group for the step
            if (stepNumber === 1) {
                setSelectedGroup('Step 1: Library File System Scanning');
            } else if (stepNumber === 2) {
                setSelectedGroup('Step 2: AST (Abstract Syntax Tree) Parsing');
            }
            // Add more groups as needed

            // Set the specific item/dashboard
            setSelectedItem(stepToItemMap[stepNumber]);
        }
    };

    useEffect(() => {
      console.log("🔍 MainApp showLayoutPanel changed:", showLayoutPanel);
    }, [showLayoutPanel]);

    useEffect(() => {
      localStorage.setItem('mode', mode);
    }, [mode]);

    useEffect(() => {
      localStorage.setItem('activeWorkspace', activeWorkspace);
    }, [activeWorkspace]);


    const username = 'camnewton';

    // Main App controls fidelity of prototype
    useEffect(() => {
      document.body.setAttribute('data-fidelity', fidelity);
    }, [fidelity]);

    useEffect(() => {
      const accessBarHeight = document.querySelector('[data-fidelity="high"]') ? 60 : 80;
      const availableHeight = `calc(100vh - ${accessBarHeight}px)`;

      document.documentElement.style.setProperty('--dashboard-height', availableHeight);
      document.documentElement.style.setProperty('--dashboard-width', '100%');
    }, [fidelity]);

    useEffect(() => {
      const loadFirstProject = async () => {
        try {
          const projects = await getProjectsForWorkspace(activeWorkspace);
          const firstProject = projects[0];

          if (firstProject) {
            setSelectedFolder(firstProject.name);
            setSelectedGroup(null);  // New system doesn't use groups
            setSelectedItem(firstProject.name);
          } else {
            // No projects in workspace
            setSelectedFolder('');
            setSelectedGroup(null);
            setSelectedItem(null);
          }
        } catch (error) {
          console.error('Failed to load workspace projects:', error);
          // Fallback to empty state
          setSelectedFolder('');
          setSelectedGroup(null);
          setSelectedItem(null);
        }
      };

      loadFirstProject();
    }, [activeWorkspace]);

    useEffect(() => {
      console.log("Updating URL with:", { mode, activeWorkspace, selectedFolder, selectedGroup, selectedItem });
      setSearchParams({
        mode,
        Workspace: activeWorkspace,
        ...(selectedFolder ? { folder: selectedFolder } : {}),
        ...(selectedGroup ? { group: selectedGroup } : {}),
        ...(selectedItem ? { item: selectedItem } : {}),
      });
    }, [mode, activeWorkspace, selectedFolder, selectedGroup, selectedItem]);

    // New Hydration
    useEffect(() => {
      const urlMode = searchParams.get('mode');
      const urlWorkspace = searchParams.get('module');
      const urlFolder = searchParams.get('folder');
      const urlGroup = searchParams.get('group');
      const urlItem = searchParams.get('item');

      if (urlMode || urlWorkspace || urlFolder || urlGroup || urlItem) {
        if (urlMode) setMode(urlMode);
        if (urlWorkspace) setActiveWorkspace(urlWorkspace);
        if (urlFolder) setSelectedFolder(urlFolder);
        if (urlGroup) setSelectedGroup(urlGroup);
        if (urlItem) setSelectedItem(urlItem);
      }
    }, []);



    // testing this removal to see if it resolves the Gmail Sign Up issue

    // useEffect(() => {
    //   const folder = folderLabelsByWorkspace[activeWorkspace]?.find(
    //     (item) => typeof item === 'object' && item.label === selectedFolder
    //   );
    //
    //   if (folder && folder.subStages) {
    //     setSelectedSubStages(folder.subStages);
    //   } else {
    //     setSelectedSubStages([]);
    //   }
    // }, [selectedFolder, activeWorkspace]);

    useEffect(() => {
      // New system doesn't use subStages - clear them
      setSelectedSubStages([]);
    }, [selectedFolder, activeWorkspace]);


    // const FidelityToggle = (
    //   <button onClick={() => setFidelity(fidelity === 'high' ? 'raw' : 'high')}>
    //   Switch to {fidelity === 'high' ? 'Raw' : 'High'} Fidelity
    // </button>
    // );

    const FidelityToggle = (
      <VerticalToggle fidelity={fidelity} setFidelity={setFidelity} />
    );

    // In your MainApp.js, add this useEffect:

    useEffect(() => {
      // Sync selectedSubStages when selectedItem changes from navigation
      if (selectedItem && selectedGroup && selectedFolder) {
        setSelectedSubStages({
          label: selectedFolder,
          group: selectedGroup,
          item: selectedItem
        });
      }
    }, [selectedItem, selectedGroup, selectedFolder]);


  return (
      <div className={styles.App} data-fidelity={fidelity}>
          <Drawer
              onSelect={setSelectedFolder}
              mode={mode}
              activeWorkspace={activeWorkspace}
              selectedFolder={selectedFolder}
              selectedSubStages={selectedSubStages}
              setSelectedSubStages={setSelectedSubStages}
              setDrawerOpen={setDrawerOpen}
              isOpen={drawerOpen}
              setIsOpen={setDrawerOpen}
              // ADD THESE PROPS:
              setSelectedGroup={setSelectedGroup}
              setSelectedItem={setSelectedItem}
          />

          {/* Sidebar is the file drawer. The user clicking an item acts like pulling a drawer open. Sidebar uses setActiveView to tell the system which drawer/view was selected. */}

          {/*
    We pass "props" allows the Sidebar (file cabinet)
    These are like labeled memory chips that help the screen remember what to show.

    Props help the screen stay organized by telling it:
    "Only show reports, folders, charts, and other contents that match the current selection"

    In this case we are passing (the property) setActiveView, which lets the Sidebar tell the system which drawer (or report) was opened. That works by pairing a drawer-opener (onSelect) with a view-setter (this prop).

    You can think of it as: action + prop = a screen that reacts (prop) to what the user selects (action).


    In the future, there could be multiple reactions (props) passed in like setActiveView, setMode/setUser all determining screen reactions to actions*/}


          <div className={styles.appMainColumn}>
              {/* wrap components inside a shard main container allows for controlling layout behavior between them. the two components are aware of space and can redistribute space to one another*/}
              <div
                  className={`${styles.workspaceOverlay} ${drawerOpen ? styles.dimmed : ''}`}
                  onClick={() => setDrawerOpen(false)}
              >
                  <div className={styles.accessBarWrapper}>
                      <AccessBar
                          mode={mode}
                          setMode={setMode}
                          activeWorkspace={activeWorkspace}
                          setActiveWorkspace={setActiveWorkspace}
                          extraContent={FidelityToggle}
                          showDocsPanel={showDocsPanel}
                          setShowDocsPanel={setShowDocsPanel}
                          showtutorialPanel={showTutorialPanel}
                          setShowTutorialPanel={setShowTutorialPanel}
                          docsMenuOpen={docsMenuOpen}
                          setDocsMenuOpen={setDocsMenuOpen}
                          tutorialMenuOpen={tutorialMenuOpen}
                          setTutorialMenuOpen={setTutorialMenuOpen}
                          setShowLayoutPanel={setShowLayoutPanel}
                          showLayoutPanel={showLayoutPanel}
                          showProjectSelector={showProjectSelector}
                          setShowProjectSelector={setShowProjectSelector}
                          selectedProject={selectedProject}
                      />
                  </div>

                  <div className={styles.scrollBody}>
                      {/* Workspace is the viewer that shows the contents of the selected drawer/view. It displays different content based on the user's selection. */}
                      <div className={styles.workspaceContainer}>
                          <WorkspaceView
                              selectedFolder={selectedFolder}
                              selectedSubStages={selectedSubStages}
                              selectedGroup={selectedGroup}
                              selectedItem={selectedItem}
                              mode={mode}
                              setSelectedFolder={setSelectedFolder}
                              setSelectedGroup={setSelectedGroup}
                              setSelectedItem={setSelectedItem}
                              setSelectedSubStages={setSelectedSubStages}
                              activeWorkspace={activeWorkspace}
                              onNavigateToStep={handleNavigateToStep}
                              showLayoutPanel={showLayoutPanel}
                              setShowLayoutPanel={setShowLayoutPanel}
                          />

                          {showDocsPanel && (
                              <DocsPanel
                                selectedFolder={selectedFolder}
                                selectedSubStages={selectedSubStages}
                                activeWorkspace={activeWorkspace}
                                mode={mode}
                                setShowDocsPanel={setShowDocsPanel}
                              />
                            )}


                          {showTutorialPanel && (
                              <TutorialPanel
                                selectedFolder={selectedFolder}
                                selectedSubStages={selectedSubStages}
                                activeWorkspace={activeWorkspace}
                                mode={mode}
                                setShowTutorialPanel={setShowTutorialPanel}
                              />
                          )}

                          {showLayoutPanel && (() => {
                              console.log("🔍 MainApp LayoutToolsPanel data:", {
                                hasCurrentDashboardLayout: !!window.currentDashboardLayout,
                                layoutManifest: !!window.currentDashboardLayout?.layoutManifest,
                                project: window.currentDashboardLayout?.project,
                                sectionsCount: window.currentDashboardLayout?.layoutManifest?.layoutSections?.length
                              });

                              return (
                                <LayoutToolsPanel
                                  layoutManifest={window.currentDashboardLayout?.layoutManifest}
                                  // project={window.currentDashboardLayout?.project}
                                  project={selectedProject?.name || window.currentDashboardLayout?.project}
                                  setShowLayoutPanel={setShowLayoutPanel}
                                />
                              );
                          })()}

                          {showProjectSelector && (
                              <ProjectSelectorModal
                                onClose={() => setShowProjectSelector(false)}
                                onSelect={(project) => {
                                  setSelectedProject(project);
                                  setShowProjectSelector(false);
                                }}
                                instanceName={instanceName}
                                userInfo={userInfo}
                              />
                          )}

                      </div>
                  </div>
              </div>
          </div>
      </div>
  );
}

export default MainApp_nw;
