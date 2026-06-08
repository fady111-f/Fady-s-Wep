/**
 * ============================================================================
 * FADY FAWZY PORTFOLIO - PREMIUM ADMINISTRATIVE ENGINE (admin.js)
 * ============================================================================
 * Purpose: Operates the Google Firebase Auth state loops, secure database 
 * writing (CRUD) pipelines, newsletter subscribers exports, and tab controllers.
 * Enhanced with SweetAlert2 notifications and Feather Icons.
 * ============================================================================
 */

// ===== FIREBASE CONFIGURATION =====
// firebaseConfig is now loaded globally from firebase-config.js

let db = null;
let isFirebaseEnabled = false;

// Initialize Firebase
if (firebaseConfig.apiKey && !firebaseConfig.apiKey.startsWith("PLACEHOLDER") && typeof firebase !== "undefined") {
  try {
    firebase.initializeApp(firebaseConfig);
    db = firebase.firestore();
    isFirebaseEnabled = true;
    console.log("Admin Firebase interface initialized successfully.");
  } catch (error) {
    console.error("Admin Firebase initialization failed: ", error);
  }
} else {
  Swal.fire('Warning', 'Firebase placeholder active. Please configure your firebaseConfig in admin.js to enable dynamic features!', 'warning');
}

// ===== DOM ELEMENT CACHE =====
const loginWrapper = document.getElementById('loginWrapper');
const dashboardWrapper = document.getElementById('dashboardWrapper');
const loginForm = document.getElementById('loginForm');
const adminEmailInput = document.getElementById('adminEmail');
const adminPasswordInput = document.getElementById('adminPassword');
const logoutBtn = document.getElementById('logoutBtn');

// Database caching variables
let loadedProjects = {};
let loadedSubscribers = [];

// SweetAlert2 Toast Configuration
const Toast = Swal.mixin({
  toast: true,
  position: 'top-end',
  showConfirmButton: false,
  timer: 3000,
  timerProgressBar: true,
  background: 'rgba(20, 20, 25, 0.95)',
  color: '#fff',
  iconColor: '#6c63ff'
});

// ===== SECURE AUTHENTICATION STATE TRACKER =====
if (isFirebaseEnabled) {
  firebase.auth().onAuthStateChanged(user => {
    if (user) {
      loginWrapper.classList.add('hide');
      dashboardWrapper.classList.remove('hide');
      
      // Load all dynamic elements from database immediately
      loadStatsData();
      loadProjectsData();
      loadSkillsData();
      loadSubscribersData();
      
      // Initial render for icons
      if(typeof feather !== 'undefined') feather.replace();
    } else {
      loginWrapper.classList.remove('hide');
      dashboardWrapper.classList.add('hide');
    }
  });
}

// Handle Login Submission
loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!isFirebaseEnabled) {
    Toast.fire({ icon: 'error', title: 'Firebase Config Missing' });
    return;
  }

  const email = adminEmailInput.value.trim();
  const password = adminPasswordInput.value.trim();

  const submitBtn = loginForm.querySelector('button[type="submit"]');
  const originalHtml = submitBtn.innerHTML;
  submitBtn.innerHTML = '<span>Verifying...</span>';
  submitBtn.style.pointerEvents = 'none';

  try {
    await firebase.auth().signInWithEmailAndPassword(email, password);
    Toast.fire({ icon: 'success', title: 'Console Unlocked!' });
    loginForm.reset();
  } catch (error) {
    console.error("Login verification failed: ", error);
    Swal.fire('Authentication Failed', error.message, 'error');
  } finally {
    submitBtn.innerHTML = originalHtml;
    submitBtn.style.pointerEvents = '';
    if(typeof feather !== 'undefined') feather.replace();
  }
});

// Handle Logout Trigger
logoutBtn.addEventListener('click', async () => {
  if (!isFirebaseEnabled) return;
  try {
    await firebase.auth().signOut();
    Toast.fire({ icon: 'success', title: 'Console Locked Successfully!' });
  } catch (error) {
    console.error("Error signing out: ", error);
    Swal.fire('Error', 'Failed to lock console.', 'error');
  }
});

// ===== DASHBOARD TABS NAVIGATION SYSTEM =====
const tabButtons = document.querySelectorAll('.admin-tab-btn');
const tabSections = document.querySelectorAll('.admin-panel-section');

tabButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    // De-activate all tabs
    tabButtons.forEach(b => b.classList.remove('active'));
    tabSections.forEach(s => s.classList.remove('active'));

    // Activate selected tab
    btn.classList.add('active');
    const tabName = btn.getAttribute('data-tab');
    const section = document.getElementById(`tab-${tabName}`);
    section.classList.add('active');
    
    // Re-trigger animation by re-inserting the element
    section.style.animation = 'none';
    section.offsetHeight; /* trigger reflow */
    section.style.animation = null; 
  });
});

// ===== 1. QUICK STATS CRUD OPERATOR =====
const statsForm = document.getElementById('statsForm');
const statGPA = document.getElementById('statGPA');
const statRank = document.getElementById('statRank');
const statCount = document.getElementById('statCount');

async function loadStatsData() {
  if (!isFirebaseEnabled || !db) return;
  try {
    const doc = await db.collection("stats").doc("summary").get();
    if (doc.exists) {
      const data = doc.data();
      statGPA.value = data.gpa || "";
      statRank.value = data.rank || "";
      statCount.value = data.projectsCount || "";
    }
  } catch (error) {
    console.error("Error loading stats database: ", error);
  }
}

statsForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!isFirebaseEnabled || !db) return;

  const submitBtn = statsForm.querySelector('button[type="submit"]');
  const originalHtml = submitBtn.innerHTML;
  submitBtn.innerHTML = '<span><i data-feather="loader" class="spin"></i> Saving...</span>';
  submitBtn.style.pointerEvents = 'none';
  if(typeof feather !== 'undefined') feather.replace();

  try {
    await db.collection("stats").doc("summary").set({
      gpa: statGPA.value.trim(),
      rank: statRank.value.trim(),
      projectsCount: parseInt(statCount.value)
    });
    Toast.fire({ icon: 'success', title: 'Statistics Updated Successfully' });
  } catch (error) {
    console.error("Error writing stats database: ", error);
    Swal.fire('Update Failed', 'Failed to write to Firestore database.', 'error');
  } finally {
    submitBtn.innerHTML = originalHtml;
    submitBtn.style.pointerEvents = '';
    if(typeof feather !== 'undefined') feather.replace();
  }
});

// ===== 2. PROJECTS CRUD INVENTORY =====
const projectsTableBody = document.getElementById('projectsTableBody');
const addProjectBtn = document.getElementById('addProjectBtn');
const cancelProjectBtn = document.getElementById('cancelProjectBtn');
const projectFormContainer = document.getElementById('projectFormContainer');
const projectForm = document.getElementById('projectForm');
const projectFormTitle = document.getElementById('projectFormTitle');
const projSubmitBtnText = document.getElementById('projSubmitBtnText');

// Form Inputs
const projectIdInput = document.getElementById('projectId');
const projTitleInput = document.getElementById('projTitle');
const projDescInput = document.getElementById('projDesc');
const projCategoryInput = document.getElementById('projCategory');
const projYearInput = document.getElementById('projYear');
const projIconInput = document.getElementById('projIcon');
const projRepoInput = document.getElementById('projRepo');
const projTagsInput = document.getElementById('projTags');

async function loadProjectsData() {
  if (!isFirebaseEnabled || !db) return;
  try {
    const snapshot = await db.collection("projects").orderBy("year", "desc").get();
    projectsTableBody.innerHTML = "";
    loadedProjects = {};

    if (snapshot.empty) {
      projectsTableBody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--text-muted);">No projects found in database. Click '+ Add New' to start!</td></tr>`;
      return;
    }

    snapshot.forEach(doc => {
      const data = doc.data();
      const id = doc.id;
      loadedProjects[id] = data;

      const iconMarkup = `<i data-feather="${data.icon || 'folder'}" style="width:20px; height:20px; color: var(--accent-primary);"></i>`;
      
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td style="text-align: center;">${iconMarkup}</td>
        <td style="font-weight: 600; color: var(--text-primary);">${data.title}</td>
        <td><span class="project-tag" style="text-transform: uppercase; font-size: 0.65rem;">${data.category}</span></td>
        <td style="font-family: 'JetBrains Mono', monospace; font-size: 0.8rem; color: var(--text-secondary);">${data.year}</td>
        <td style="text-align: right;">
          <button class="action-badge badge-edit" onclick="editProject('${id}')"><i data-feather="edit-2" style="width:12px; height:12px;"></i> Edit</button>
          <button class="action-badge badge-delete" onclick="deleteProject('${id}')"><i data-feather="trash-2" style="width:12px; height:12px;"></i> Delete</button>
        </td>
      `;
      projectsTableBody.appendChild(tr);
    });
    
    // Initialize icons in the new rows
    if(typeof feather !== 'undefined') feather.replace();
    
  } catch (error) {
    console.error("Error loading projects database: ", error);
  }
}

// Open Form for Adding New Project
addProjectBtn.addEventListener('click', () => {
  projectForm.reset();
  projectIdInput.value = "";
  projectFormTitle.textContent = "Add New Project";
  projSubmitBtnText.innerHTML = '<i data-feather="check"></i> Save Project';
  projectFormContainer.classList.remove('hide');
  projectFormContainer.scrollIntoView({ behavior: 'smooth' });
  if(typeof feather !== 'undefined') feather.replace();
});

// Close Project Form
cancelProjectBtn.addEventListener('click', () => {
  projectFormContainer.classList.add('hide');
  projectForm.reset();
});

// Submit Project (Create/Update)
projectForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!isFirebaseEnabled || !db) return;

  const id = projectIdInput.value;
  const tagsArray = projTagsInput.value.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0);

  const payload = {
    title: projTitleInput.value.trim(),
    description: projDescInput.value.trim(),
    category: projCategoryInput.value,
    year: projYearInput.value.trim(),
    icon: projIconInput.value.trim() || "folder",
    repoLink: projRepoInput.value.trim() || "",
    tags: tagsArray
  };

  const submitBtn = projectForm.querySelector('button[type="submit"]');
  submitBtn.innerHTML = '<span><i data-feather="loader" class="spin"></i> Saving...</span>';
  submitBtn.style.pointerEvents = 'none';
  if(typeof feather !== 'undefined') feather.replace();

  try {
    if (id) {
      await db.collection("projects").doc(id).update(payload);
      Toast.fire({ icon: 'success', title: 'Project Updated Successfully' });
    } else {
      await db.collection("projects").add(payload);
      Toast.fire({ icon: 'success', title: 'Project Created Successfully' });
    }

    projectFormContainer.classList.add('hide');
    projectForm.reset();
    loadProjectsData(); 
  } catch (error) {
    console.error("Error writing projects database: ", error);
    Swal.fire('Error', 'Failed to save project details.', 'error');
  } finally {
    submitBtn.innerHTML = `<span><i data-feather="check"></i> ${id ? 'Update Project' : 'Save Project'}</span>`;
    submitBtn.style.pointerEvents = '';
    if(typeof feather !== 'undefined') feather.replace();
  }
});

// Populate Form for Editing Project
window.editProject = function(id) {
  const project = loadedProjects[id];
  if (!project) return;

  projectIdInput.value = id;
  projTitleInput.value = project.title || "";
  projDescInput.value = project.description || "";
  projCategoryInput.value = project.category || "embedded";
  projYearInput.value = project.year || "";
  projIconInput.value = project.icon || "folder";
  projRepoInput.value = project.repoLink || "";
  projTagsInput.value = (project.tags || []).join(', ');

  projectFormTitle.textContent = "Edit Project Details";
  projSubmitBtnText.innerHTML = '<i data-feather="check"></i> Update Project';
  projectFormContainer.classList.remove('hide');
  projectFormContainer.scrollIntoView({ behavior: 'smooth' });
  if(typeof feather !== 'undefined') feather.replace();
};

// Delete Project Document
window.deleteProject = async function(id) {
  const project = loadedProjects[id];
  if (!project) return;

  const result = await Swal.fire({
    title: 'Are you sure?',
    text: `You are about to delete "${project.title}". This cannot be undone!`,
    icon: 'warning',
    showCancelButton: true,
    confirmButtonText: 'Yes, delete it!',
    cancelButtonText: 'Cancel'
  });

  if (result.isConfirmed) {
    try {
      await db.collection("projects").doc(id).delete();
      Swal.fire('Deleted!', 'The project has been deleted.', 'success');
      loadProjectsData(); 
    } catch (error) {
      console.error("Error deleting project: ", error);
      Swal.fire('Error', 'Failed to delete the project.', 'error');
    }
  }
};

// ===== 3. TECHNICAL ARSENAL CRUD OPERATOR =====
const skillsForm = document.getElementById('skillsForm');
const skillsLanguages = document.getElementById('skillsLanguages');
const skillsTools = document.getElementById('skillsTools');
const skillsSoft = document.getElementById('skillsSoft');

async function loadSkillsData() {
  if (!isFirebaseEnabled || !db) return;
  try {
    const snapshot = await db.collection("skills").get();
    if (!snapshot.empty) {
      snapshot.forEach(doc => {
        const data = doc.data();
        const cat = data.category;
        const list = (data.list || []).join(', ');

        if (cat === "languages") skillsLanguages.value = list;
        else if (cat === "tools") skillsTools.value = list;
        else if (cat === "soft") skillsSoft.value = list;
      });
    }
  } catch (error) {
    console.error("Error loading skills database: ", error);
  }
}

skillsForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!isFirebaseEnabled || !db) return;

  const languagesList = skillsLanguages.value.split(',').map(s => s.trim()).filter(s => s.length > 0);
  const toolsList = skillsTools.value.split(',').map(s => s.trim()).filter(s => s.length > 0);
  const softList = skillsSoft.value.split(',').map(s => s.trim()).filter(s => s.length > 0);

  const submitBtn = skillsForm.querySelector('button[type="submit"]');
  const originalHtml = submitBtn.innerHTML;
  submitBtn.innerHTML = '<span><i data-feather="loader" class="spin"></i> Saving...</span>';
  submitBtn.style.pointerEvents = 'none';
  if(typeof feather !== 'undefined') feather.replace();

  try {
    await db.collection("skills").doc("languages").set({ category: "languages", list: languagesList });
    await db.collection("skills").doc("tools").set({ category: "tools", list: toolsList });
    await db.collection("skills").doc("soft").set({ category: "soft", list: softList });
    Toast.fire({ icon: 'success', title: 'Arsenal Synchronized Successfully' });
  } catch (error) {
    console.error("Error writing skills database: ", error);
    Swal.fire('Error', 'Failed to write skills catalog.', 'error');
  } finally {
    submitBtn.innerHTML = originalHtml;
    submitBtn.style.pointerEvents = '';
    if(typeof feather !== 'undefined') feather.replace();
  }
});

// ===== 4. CRM NEWSLETTER SUBSCRIBERS =====
const subscribersTableBody = document.getElementById('subscribersTableBody');
const exportSubscribersBtn = document.getElementById('exportSubscribersBtn');

async function loadSubscribersData() {
  if (!isFirebaseEnabled || !db) return;
  try {
    const snapshot = await db.collection("subscribers").orderBy("timestamp", "desc").get();
    subscribersTableBody.innerHTML = "";
    loadedSubscribers = [];

    if (snapshot.empty) {
      subscribersTableBody.innerHTML = `<tr><td colspan="2" style="text-align: center; color: var(--text-muted);">No email subscribers found in CRM.</td></tr>`;
      return;
    }

    snapshot.forEach(doc => {
      const data = doc.data();
      const email = data.email;
      let timestampText = "Offline Local Record";

      if (data.timestamp) {
        const seconds = data.timestamp.seconds || Math.floor(new Date(data.timestamp).getTime() / 1000);
        timestampText = new Date(seconds * 1000).toLocaleString();
      }

      loadedSubscribers.push({ email: email, subscribedAt: timestampText });

      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td style="font-family: 'JetBrains Mono', monospace; font-weight: 600; color: var(--accent-tertiary);">${email}</td>
        <td style="text-align: right; color: var(--text-secondary); font-size: 0.8rem;">${timestampText}</td>
      `;
      subscribersTableBody.appendChild(tr);
    });
  } catch (error) {
    console.error("Error loading subscribers CRM: ", error);
  }
}

// Export Subscribers List as JSON file download
exportSubscribersBtn.addEventListener('click', () => {
  if (loadedSubscribers.length === 0) {
    Swal.fire('Export Failed', 'No subscriber data available for export.', 'info');
    return;
  }

  const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(loadedSubscribers, null, 2))}`;
  const downloadAnchor = document.createElement('a');
  downloadAnchor.setAttribute("href", jsonString);
  downloadAnchor.setAttribute("download", `CRM_Export_${new Date().toISOString().slice(0,10)}.json`);
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
  
  Toast.fire({ icon: 'success', title: 'Database Exported Successfully' });
});

// ===== AUTO FILL UTILITY (Temporary helper for initial setup) =====
const autoFillBtn = document.getElementById('autoFillBtn');
if (autoFillBtn) {
  autoFillBtn.addEventListener('click', async () => {
    if (!isFirebaseEnabled || !db) return;
    
    const result = await Swal.fire({
      title: 'Auto-Fill Database?',
      text: 'This will automatically push all your projects, skills, and stats from the code to Firebase. It may duplicate entries if you already added them.',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Yes, Fill Data!',
      cancelButtonText: 'Cancel'
    });

    if (result.isConfirmed) {
      Swal.fire({ title: 'Filling Database...', allowOutsideClick: false, didOpen: () => { Swal.showLoading(); } });
      
      try {
        // 1. Stats
        await db.collection("stats").doc("summary").set({
          gpa: "3.94", rank: "3rd", projectsCount: 6
        });

        // 2. Skills
        await db.collection("skills").doc("languages").set({ category: "languages", list: ["C", "C++", "Python", "JavaScript", "HTML", "CSS", "SQL", "Verilog", "ARM Assembly"] });
        await db.collection("skills").doc("tools").set({ category: "tools", list: ["VS Code", "Git", "GitHub", "Keil µVision", "ModelSim", "AutoCAD", "Power BI"] });
        await db.collection("skills").doc("soft").set({ category: "soft", list: ["Leadership", "Adaptability", "Teamwork", "Communication", "Problem Solving", "Arabic (Native)", "English (Very Good)"] });

        // 3. Projects
        const projects = [
          {
            title: "Smart Nurse Robot",
            description: "Fully autonomous medical assistant robot using bare-metal ARM Thumb-2 Assembly on STM32 without HAL libraries. Integrated I2C, SPI, UART, ADC, PWM, Bluetooth, RFID, and ultrasonic navigation. Real-time monitoring of Heart Rate, SpO2, IV drop-rate, and pressure sensing with a custom TFT dashboard.",
            category: "embedded", year: "2026", icon: "cpu", repoLink: "https://github.com/fady111-f", tags: ["ARM Assembly", "STM32", "I2C / SPI", "Bluetooth", "RFID"]
          },
          {
            title: "Flowchart Designer & Simulator",
            description: "Complete flowchart designer and simulator in C++ without UI frameworks. Implemented copy/paste, undo/redo, validation, and automated C++ code generation features for visual algorithm design.",
            category: "software", year: "2025", icon: "pen-tool", repoLink: "https://github.com/fady111-f", tags: ["C++", "Graphics", "Code Gen"]
          },
          {
            title: "Restaurant Management System",
            description: "Restaurant order management simulation system for dine-in, takeaway, and delivery orders. Features dynamic assignment algorithms for chefs, tables, and delivery scooters.",
            category: "software", year: "2026", icon: "coffee", repoLink: "https://github.com/fady111-f", tags: ["C++", "Algorithms", "Simulation"]
          },
          {
            title: "FPGA ALU Logic Design",
            description: "Designed and implemented an Arithmetic Logic Unit (ALU) using Verilog. Supported arithmetic operations, BCD-to-excess-3 conversion, and FPGA-based sequential logic. Simulated and verified on a DE1-SoC FPGA board using ModelSim.",
            category: "embedded", year: "2025", icon: "zap", repoLink: "", tags: ["Verilog", "FPGA", "DE1-SoC", "ModelSim"]
          },
          {
            title: "Innovative Lampshade Project",
            description: "Led a team in designing and building a recyclable PVC-based decorative lampshade. Applied sustainable design principles using reused materials. Received 3rd place and was selected as a showcase model by the department head.",
            category: "design", year: "2026", icon: "sun", repoLink: "", tags: ["Design", "Sustainability", "Leadership"]
          },
          {
            title: "SDG 9 — Industry & Innovation",
            description: "Led a team to research and present Sustainable Development Goal 9. Prepared presentation materials and coordinated public speaking tasks. Received excellent feedback for presentation quality and teamwork.",
            category: "design", year: "2025", icon: "globe", repoLink: "", tags: ["Research", "Presentation", "SDG"]
          }
        ];

        // First, optionally clear existing projects (optional, but safe to avoid duplicates if they click multiple times)
        const snapshot = await db.collection("projects").get();
        const batch = db.batch();
        snapshot.docs.forEach((doc) => { batch.delete(doc.ref); });
        await batch.commit();

        for (let p of projects) {
          await db.collection("projects").add(p);
        }

        // Reload data
        loadStatsData();
        loadSkillsData();
        loadProjectsData();

        Swal.fire('Success!', 'All your hardcoded data has been uploaded to Firebase automatically.', 'success');
      } catch (error) {
        console.error("Auto-Fill Error:", error);
        Swal.fire('Error', 'Failed to upload data.', 'error');
      }
    }
  });
}
