/**
 * ============================================================================
 * FADY FAWZY PORTFOLIO - ADMINISTRATIVE ENGINE (admin.js)
 * ============================================================================
 * Purpose: Operates the Google Firebase Auth state loops, secure database 
 * writing (CRUD) pipelines, newsletter subscribers exports, and tab controllers.
 * ============================================================================
 */

// ===== FIREBASE CONFIGURATION =====
// Note for developer/AI: Replace these credentials with Fady's active Firebase dashboard parameters.
// Once set, this binds the admin dashboard directly to your live Firebase backend.
const firebaseConfig = {
  apiKey: "AIzaSyBVsh0PHmIh_jJQR71UhY0iFvDRNsoO17k",
  authDomain: "fady-portfolio-d955b.firebaseapp.com",
  projectId: "fady-portfolio-d955b",
  storageBucket: "fady-portfolio-d955b.firebasestorage.app",
  messagingSenderId: "229272230743",
  appId: "1:229272230743:web:e8d8cb0d60f968fb5d7c12",
  measurementId: "G-H2BK6F8MXV"
};

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
  alert("⚠️ Firebase placeholder active. Please configure your firebaseConfig in admin.js to enable the dynamic features!");
}

// ===== DOM ELEMENT CACHE =====
const loginWrapper = document.getElementById('loginWrapper');
const dashboardWrapper = document.getElementById('dashboardWrapper');
const loginForm = document.getElementById('loginForm');
const adminEmailInput = document.getElementById('adminEmail');
const adminPasswordInput = document.getElementById('adminPassword');
const logoutBtn = document.getElementById('logoutBtn');
const copyToast = document.getElementById('copyToast');

// Database caching variables
let loadedProjects = {};
let loadedSubscribers = [];

// ===== SECURE AUTHENTICATION STATE TRACKER =====
if (isFirebaseEnabled) {
  // Binds an active auth listener that manages visibility between login and dashboard screens
  firebase.auth().onAuthStateChanged(user => {
    if (user) {
      console.log("Authenticated administrator active: ", user.email);
      loginWrapper.classList.add('hide');
      dashboardWrapper.classList.remove('hide');
      
      // Load all dynamic elements from database immediately
      loadStatsData();
      loadProjectsData();
      loadSkillsData();
      loadSubscribersData();
    } else {
      console.log("No authenticated credentials found. Redirecting to login console.");
      loginWrapper.classList.remove('hide');
      dashboardWrapper.classList.add('hide');
    }
  });
}

// Handle Login Submission
loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!isFirebaseEnabled) {
    showToast("Firebase Config Missing ❌");
    return;
  }

  const email = adminEmailInput.value.trim();
  const password = adminPasswordInput.value.trim();

  const submitBtn = loginForm.querySelector('button[type="submit"]');
  submitBtn.innerHTML = '<span>Verifying...</span>';
  submitBtn.style.pointerEvents = 'none';

  try {
    await firebase.auth().signInWithEmailAndPassword(email, password);
    showToast("Console Unlocked! 🔑", true);
    loginForm.reset();
  } catch (error) {
    console.error("Login verification failed: ", error);
    alert("❌ Error: " + error.message);
  } finally {
    submitBtn.innerHTML = '<span>Unlock Dashboard</span>';
    submitBtn.style.pointerEvents = '';
  }
});

// Handle Logout Trigger
logoutBtn.addEventListener('click', async () => {
  if (!isFirebaseEnabled) return;
  try {
    await firebase.auth().signOut();
    showToast("Console Locked successfully! 🔒");
  } catch (error) {
    console.error("Error signing out: ", error);
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
    document.getElementById(`tab-${tabName}`).classList.add('active');
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
  submitBtn.innerHTML = '<span>Saving...</span>';
  submitBtn.style.pointerEvents = 'none';

  try {
    await db.collection("stats").doc("summary").set({
      gpa: statGPA.value.trim(),
      rank: statRank.value.trim(),
      projectsCount: parseInt(statCount.value)
    });
    showToast("Stats Updated! 📈", true);
  } catch (error) {
    console.error("Error writing stats database: ", error);
    alert("❌ Error: Failed to write to Firestore database.");
  } finally {
    submitBtn.innerHTML = '<span>Update Statistics</span>';
    submitBtn.style.pointerEvents = '';
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
      projectsTableBody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--text-muted);">No projects found in database. Click '+ Add New Project' to start!</td></tr>`;
      return;
    }

    snapshot.forEach(doc => {
      const data = doc.data();
      const id = doc.id;
      loadedProjects[id] = data;

      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td style="font-size: 1.5rem;">${data.icon || '💻'}</td>
        <td style="font-weight: 700; color: var(--text-primary);">${data.title}</td>
        <td><span class="project-tag" style="text-transform: uppercase; font-size: 0.65rem;">${data.category}</span></td>
        <td style="font-family: 'JetBrains Mono', monospace; font-size: 0.8rem;">${data.year}</td>
        <td>
          <button class="action-badge badge-edit" onclick="editProject('${id}')">Edit</button>
          <button class="action-badge badge-delete" onclick="deleteProject('${id}')">Delete</button>
        </td>
      `;
      projectsTableBody.appendChild(tr);
    });
  } catch (error) {
    console.error("Error loading projects database: ", error);
  }
}

// Open Form for Adding New Project
addProjectBtn.addEventListener('click', () => {
  projectForm.reset();
  projectIdInput.value = "";
  projectFormTitle.textContent = "Add New Project Card";
  projSubmitBtnText.textContent = "Save Project";
  projectFormContainer.classList.remove('hide');
  projectFormContainer.scrollIntoView({ behavior: 'smooth' });
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
    icon: projIconInput.value.trim() || "💻",
    repoLink: projRepoInput.value.trim() || "",
    tags: tagsArray
  };

  const submitBtn = projectForm.querySelector('button[type="submit"]');
  submitBtn.innerHTML = '<span>Saving...</span>';
  submitBtn.style.pointerEvents = 'none';

  try {
    if (id) {
      // Update Mode
      await db.collection("projects").doc(id).update(payload);
      showToast("Project Updated! 📁", true);
    } else {
      // Create Mode
      await db.collection("projects").add(payload);
      showToast("Project Created! 🚀", true);
    }

    projectFormContainer.classList.add('hide');
    projectForm.reset();
    loadProjectsData(); // Refresh list
  } catch (error) {
    console.error("Error writing projects database: ", error);
    alert("❌ Error: Failed to save project details.");
  } finally {
    submitBtn.innerHTML = `<span>${id ? 'Save Project' : 'Save Project'}</span>`;
    submitBtn.style.pointerEvents = '';
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
  projIconInput.value = project.icon || "💻";
  projRepoInput.value = project.repoLink || "";
  projTagsInput.value = (project.tags || []).join(', ');

  projectFormTitle.textContent = "Edit Project Card Details";
  projSubmitBtnText.textContent = "Update Details";
  projectFormContainer.classList.remove('hide');
  projectFormContainer.scrollIntoView({ behavior: 'smooth' });
};

// Delete Project Document
window.deleteProject = async function(id) {
  const project = loadedProjects[id];
  if (!project) return;

  if (confirm(`⚠️ Are you absolutely sure you want to delete the project: "${project.title}"?`)) {
    try {
      await db.collection("projects").doc(id).delete();
      showToast("Project Deleted! 🗑️");
      loadProjectsData(); // Refresh list
    } catch (error) {
      console.error("Error deleting project: ", error);
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
  submitBtn.innerHTML = '<span>Saving...</span>';
  submitBtn.style.pointerEvents = 'none';

  try {
    // Write the 3 skill category documents
    await db.collection("skills").doc("languages").set({ category: "languages", list: languagesList });
    await db.collection("skills").doc("tools").set({ category: "tools", list: toolsList });
    await db.collection("skills").doc("soft").set({ category: "soft", list: softList });
    showToast("Skills Synchronized! ⚡", true);
  } catch (error) {
    console.error("Error writing skills database: ", error);
    alert("❌ Error: Failed to write skills catalog.");
  } finally {
    submitBtn.innerHTML = '<span>Update Technical Arsenal</span>';
    submitBtn.style.pointerEvents = '';
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
        // Formspree server timestamp fallback compatibility
        const seconds = data.timestamp.seconds || Math.floor(new Date(data.timestamp).getTime() / 1000);
        timestampText = new Date(seconds * 1000).toLocaleString();
      }

      loadedSubscribers.push({ email: email, subscribedAt: timestampText });

      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td style="font-family: 'JetBrains Mono', monospace; font-weight: 600; color: var(--accent-tertiary);">${email}</td>
        <td style="color: var(--text-secondary); font-size: 0.8rem;">📅 ${timestampText}</td>
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
    alert("❌ No subscriber data available for export.");
    return;
  }

  const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(loadedSubscribers, null, 2))}`;
  const downloadAnchor = document.createElement('a');
  downloadAnchor.setAttribute("href", jsonString);
  downloadAnchor.setAttribute("download", `Subscribers_Backup_${new Date().toISOString().slice(0,10)}.json`);
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
  showToast("JSON Database Exported! 📥", true);
});

// ===== ADMINISTRATIVE UTILITY: TOAST PANEL =====
let toastTimeout = null;
function showToast(message, isSuccess = false) {
  if (copyToast) {
    copyToast.textContent = message;
    
    if (isSuccess) {
      copyToast.classList.add('toast-success');
    } else {
      copyToast.classList.remove('toast-success');
    }
    
    copyToast.classList.add('visible');

    if (toastTimeout) clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => {
      copyToast.classList.remove('visible');
    }, 2500);
  }
}
