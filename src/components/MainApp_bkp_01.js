// Main Dashboard
// App.js holds everything you see on screen.
// It is the central control center
// All things we plug in to the control center are "parts of the screen"
// The control center it controls all screens

// Plug in a report folder by drawer mapping system, so we know which folders belong to which drawer
import folderLabelsByModule from '../constants/folderLabelsByModule';
// import workspaceStructure, { getActiveWorkspaces } from '../constants/workspaceStructure';
import styles from './MainApp.module.css'; // or './App.css'
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
import { getAllProjectsAsJSON, getWorkspaceProjects } from '../constants/projectDataBridge';
import { getActiveWorkspaces } from '../constants/workspaceStructure';

// Need to manage URLs for mode and activeModule
import { useSearchParams } from 'react-router-dom';
import ProjectContext from "../contexts/ProjectContext";
import DocsPanel from "./DocsPanel";
import TutorialPanel from "./TutorialPanel";
import tutorialsContent from "../data/tutorialsContent";


function MainApp() {

    // Create a memory chip for tracking which file drawer is currently open (e.g. "Metrics") for viewing reports

    // Why activeView / setActiveView

    // - activeView is the "statusScreen". It holds memory of what currently is being viewed. It helps with building trust, visibility, confidence, reassurance about capabilities currently available.
    // - setActiveView is the "remoteController". It allows you to change that memory. It's how the user opens a new drawer (views) and implicitly closes the previous drawer. It provides the power to switch.

    // Together, this creates natural file cabinet behavior:
    // Only one drawer is opened at a time. Switching drawers "closes" / replaces the previous memory automatically because we are using a single memory slot.
    // (If you used multiple memory slots, you'd manage that behavior manually)



    // adding mode and activeModule to URL search params
    const [searchParams, setSearchParams] = useSearchParams();

    // we want to track selected substages for the selectedFolder
    const [selectedSubStages, setSelectedSubStages] = useState([]);

    // const initialMode = localStorage.getItem('mode') || searchParams.get('mode') || 'executive';
    // const initialModule = localStorage.getItem('activeModule') || searchParams.get('module') || 'metrics';

    // const [mode, setMode] = useState(initialMode);
    // const [activeModule, setActiveModule] = useState(initialModule);
    // const initialFolder = searchParams.get('folder') || 'Portfolio Reporting';
    // const initialGroup = searchParams.get('group') || null;
    // const initialItem = searchParams.get('item') || null;
    // Memory chips: track the current folder (view), mode (role), and selected drawer (module)
    // const [selectedFolder, setSelectedFolder] = useState(initialFolder);
    // Create a memory chip for tracking which mode is currently being used (e.g., "Executive) in your report
    // const [selectedGroup, setSelectedGroup] = useState(initialGroup);
    // const [selectedItem, setSelectedItem] = useState(initialItem);


    const [fidelity, setFidelity] = useState('raw');
    const [drawerOpen, setDrawerOpen] = useState(false);

    // New States
    const [mode, setMode] = useState(localStorage.getItem('mode') || 'executive');
    const [activeModule, setActiveModule] = useState(localStorage.getItem('activeModule') || 'metrics');
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

        // Navigate within the utilities module structure
        if (stepToItemMap[stepNumber]) {
            // Ensure we're in the utilities module and correct folder
            setActiveModule('utilities');
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
      localStorage.setItem('activeModule', activeModule);
    }, [activeModule]);


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



    // Assistant's job: when a new drawer is selected, open the first folder inside it.
    // This keeps the interface responsive and reduces manual clicks.
    // It’s only reacting to a change in activeModule
    // It’s doing a static lookup (first item in an array)
    // It updates a single string: setSelectedFolder(...)
    // ✅ It does not depend on any external logic, calculations, or conditionals.
    // useEffect(() => {
    //   const firstFolder = folderLabelsByModule[activeModule]?.[0];
    //
    //   // Handle both strings and objects
    //   const firstFolderLabel = typeof firstFolder === 'string'
    //     ? firstFolder
    //     : firstFolder?.label || '';
    //
    //   // const firstFolderLabel = folderLabelsByModule[activeModule]?.[0] || '';
    //
    //   setSelectedFolder(firstFolderLabel);
    // }, [activeModule]); // activeModule is telling the executive that the firstfolder will change when the active module changes. This means we will monitor the status of the module (activeModule) but not make any changes to the module (not setActiveModule). However, we will make changes to the folder (setSelectedFolder) when the status of the module changes.

    useEffect(() => {
      const firstFolder = folderLabelsByModule[activeModule]?.[0];

      // Handle both strings and objects
      const firstFolderLabel = typeof firstFolder === 'string'
        ? firstFolder
        : firstFolder?.label || '';

      setSelectedFolder(firstFolderLabel);

      // If the first folder is an object with subStages, also set the first group and item
      if (typeof firstFolder === 'object' && firstFolder?.subStages) {
        const firstGroup = firstFolder.subStages[0];

        if (firstGroup) {
          const firstGroupName = firstGroup.group || '';
          const firstItem = firstGroup.items?.[0] || '';

          setSelectedGroup(firstGroupName);
          setSelectedItem(firstItem);
        } else {
          // Clear group and item if no subStages
          setSelectedGroup(null);
          setSelectedItem(null);
        }
      } else {
        // Clear group and item for string-based folders
        setSelectedGroup(null);
        setSelectedItem(null);
      }
    }, [activeModule]); // activeModule is telling the executive that the firstfolder will change when the active module changes. This means we will monitor the status of the module (activeModule) but not make any changes to the module (not setActiveModule). However, we will make changes to the folder (setSelectedFolder), group (setSelectedGroup), and item (setSelectedItem) when the status of the module changes.

    useEffect(() => {
      console.log("Updating URL with:", { mode, activeModule, selectedFolder, selectedGroup, selectedItem });
      setSearchParams({
        mode,
        module: activeModule,
        ...(selectedFolder ? { folder: selectedFolder } : {}),
        ...(selectedGroup ? { group: selectedGroup } : {}),
        ...(selectedItem ? { item: selectedItem } : {}),
      });
    }, [mode, activeModule, selectedFolder, selectedGroup, selectedItem]);


    // Hydration
    // useEffect(() => {
    //   setMode(searchParams.get('mode') || 'executive');
    //   setActiveModule(searchParams.get('module') || 'metrics');
    //   setSelectedFolder(searchParams.get('folder') || 'Portfolio Reporting');
    //   setSelectedGroup(searchParams.get('group'));
    //   setSelectedItem(searchParams.get('item'));
    // }, []);


    // New Hydration
    useEffect(() => {
      const urlMode = searchParams.get('mode');
      const urlModule = searchParams.get('module');
      const urlFolder = searchParams.get('folder');
      const urlGroup = searchParams.get('group');
      const urlItem = searchParams.get('item');

      if (urlMode || urlModule || urlFolder || urlGroup || urlItem) {
        if (urlMode) setMode(urlMode);
        if (urlModule) setActiveModule(urlModule);
        if (urlFolder) setSelectedFolder(urlFolder);
        if (urlGroup) setSelectedGroup(urlGroup);
        if (urlItem) setSelectedItem(urlItem);
      }
    }, []);



    // testing this removal to see if it resolves the Gmail Sign Up issue

    useEffect(() => {
      const folder = folderLabelsByModule[activeModule]?.find(
        (item) => typeof item === 'object' && item.label === selectedFolder
      );

      if (folder && folder.subStages) {
        setSelectedSubStages(folder.subStages);
      } else {
        setSelectedSubStages([]);
      }
    }, [selectedFolder, activeModule]);


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
              activeModule={activeModule}
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
                          activeModule={activeModule}
                          setActiveModule={setActiveModule}
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
                              activeModule={activeModule}
                              onNavigateToStep={handleNavigateToStep}
                              showLayoutPanel={showLayoutPanel}
                              setShowLayoutPanel={setShowLayoutPanel}
                          />

                          {showDocsPanel && (
                              <DocsPanel
                                selectedFolder={selectedFolder}
                                selectedSubStages={selectedSubStages}
                                activeModule={activeModule}
                                mode={mode}
                                setShowDocsPanel={setShowDocsPanel}
                              />
                            )}


                          {showTutorialPanel && (
                              <TutorialPanel
                                selectedFolder={selectedFolder}
                                selectedSubStages={selectedSubStages}
                                activeModule={activeModule}
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

export default MainApp;
