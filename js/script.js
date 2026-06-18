// js/script.js
import { siteConfig, experiments } from './data.js';
import { initTheme } from './theme.js';
import { initContributors } from './contributors.js';

document.addEventListener('DOMContentLoaded', () => {
  // 1. Initialize Theme
  initTheme();

  // 2. Setup Mobile Navigation Hamburger
  const hamburger = document.getElementById('hamburger');
  const navLinks = document.getElementById('nav-links');
  if (hamburger && navLinks) {
    hamburger.addEventListener('click', () => {
      navLinks.classList.toggle('active');
    });
  }

  // 3. Populate Global Site Config Data
  populateSiteConfig();

  // 4. Setup Active Navigation Highlighting
  setupActiveNav();

  // 5. Page Specific Logic
  const isHomePage = document.getElementById('experiments-grid');
  const isExperimentPage = document.getElementById('experiment-hero');

  if (isHomePage) {
    renderExperimentsList();
  }

  if (isExperimentPage) {
    setupExperimentPage();
  }
});

function populateSiteConfig() {
  const els = {
    websiteName: document.querySelectorAll('.data-website-name'),
    university: document.querySelectorAll('.data-university'),
    institute: document.querySelectorAll('.data-institute'),
    department: document.querySelectorAll('.data-department'),
    subDepartment: document.querySelectorAll('.data-sub-department'),
    campus: document.querySelectorAll('.data-campus'),
    academicYear: document.querySelectorAll('.data-academic-year'),
    heroSubtitle: document.querySelectorAll('.data-hero-subtitle'),
    heroDescription: document.querySelectorAll('.data-hero-description'),
    mentorName: document.querySelectorAll('.data-mentor-name'),
    mentorDept: document.querySelectorAll('.data-mentor-dept'),
    mentorInst: document.querySelectorAll('.data-mentor-inst'),
    mentorQuote: document.querySelectorAll('.data-mentor-quote'),
  };

  for (const [key, elements] of Object.entries(els)) {
    elements.forEach(el => {
      if (key.startsWith('mentor')) {
        const mentorKey = key.replace('mentor', '').toLowerCase(); // name, dept, inst, quote
        // map keys back to object
        let val = '';
        if (mentorKey === 'name') val = siteConfig.mentor.name;
        if (mentorKey === 'dept') val = siteConfig.mentor.department;
        if (mentorKey === 'inst') val = siteConfig.mentor.institute;
        if (mentorKey === 'quote') val = siteConfig.mentor.quote;
        if (val) el.textContent = val;
      } else {
        if (siteConfig[key]) {
          el.textContent = siteConfig[key];
        }
      }
    });
  }
}

function renderExperimentsList() {
  const grid = document.getElementById('experiments-grid');
  if (!grid) return;

  grid.innerHTML = experiments.map(exp => `
    <div class="experiment-card">
      <div class="experiment-icon">${exp.icon}</div>
      <div class="experiment-number">Experiment ${exp.id}</div>
      <h3 class="experiment-title">${exp.title}</h3>
      <p class="experiment-desc">${exp.shortDesc}</p>
      <div style="margin-top: auto;">
        <a href="experiments/${exp.folder}/index.html" class="btn">Start Experiment <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-arrow-right"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg></a>
      </div>
    </div>
  `).join('');
}

function setupExperimentPage() {
  // Determine current experiment from URL folder name
  const pathParts = window.location.pathname.split('/').filter(p => p.length > 0);
  let folderName = pathParts[pathParts.length - 2]; 
  
  // Local file fallback if path doesn't end with /
  if (window.location.pathname.endsWith('index.html')) {
    folderName = pathParts[pathParts.length - 2];
  } else {
    folderName = pathParts[pathParts.length - 1]; 
  }

  const expData = experiments.find(e => e.folder === folderName);
  
  if (!expData) {
    console.error("Experiment data not found for folder: ", folderName);
    return;
  }

  // Update Page Title
  document.title = `${expData.title} | ${siteConfig.websiteName}`;

  // Populate Experiment Specifics
  const titleEl = document.getElementById('exp-title');
  const descEl = document.getElementById('exp-desc');
  const breadcrumbEl = document.getElementById('exp-breadcrumb');

  if (titleEl) titleEl.textContent = expData.title;
  if (descEl) descEl.textContent = expData.shortDesc;
  if (breadcrumbEl) breadcrumbEl.textContent = expData.title;

  // Init Contributors Accordion
  initContributors(expData);
}

function setupActiveNav() {
  const navLinks = document.querySelectorAll('.nav-link');
  const isHomePage = document.getElementById('experiments-grid');
  
  function updateNav() {
    if (!isHomePage) return;
    
    let scrollY = window.scrollY;
    
    const experimentsSection = document.getElementById('experiments');
    const contactSection = document.getElementById('contact');
    
    // Offset slightly so it highlights before hitting the absolute top
    const expTop = experimentsSection ? experimentsSection.offsetTop - 150 : 0;
    const contactTop = contactSection ? contactSection.offsetTop - 300 : 0;
    
    navLinks.forEach(link => link.classList.remove('active'));
    
    if (contactSection && scrollY >= contactTop) {
      navLinks.forEach(link => { if (link.getAttribute('href').includes('#contact')) link.classList.add('active'); });
    } else if (experimentsSection && scrollY >= expTop) {
      navLinks.forEach(link => { if (link.getAttribute('href').includes('#experiments')) link.classList.add('active'); });
    } else {
      navLinks.forEach(link => { if (link.getAttribute('href').includes('index.html') && !link.getAttribute('href').includes('#')) link.classList.add('active'); });
    }
  }

  // Run on load and scroll if on home page
  if (isHomePage) {
    updateNav();
    window.addEventListener('scroll', updateNav);
  }

  // Smooth UI update on click
  navLinks.forEach(link => {
    link.addEventListener('click', function() {
      // Update immediately if it's an anchor link
      if (this.getAttribute('href').includes('#')) {
        navLinks.forEach(l => l.classList.remove('active'));
        this.classList.add('active');
      }
    });
  });
}
